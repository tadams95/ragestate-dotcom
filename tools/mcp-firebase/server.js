import cors from 'cors';
import crypto from 'crypto';
import 'dotenv/config';
import express from 'express';
import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { z, ZodError } from 'zod';
import {
  genRequestId,
  normalizeTimestamps,
  redactParams,
  sizeClamp,
  wrapError,
  wrapSuccess,
} from './utils/response.js';

const app = express();
const port = process.env.PORT || 8765;

// --- Firebase Admin Initialization ---
function initializeFirebase() {
  if (admin.apps.length) return admin.firestore();

  const usingEmulator = !!process.env.FIRESTORE_EMULATOR_HOST;
  const credsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (usingEmulator) {
    console.log(`(init) Firestore emulator -> ${process.env.FIRESTORE_EMULATOR_HOST}`);
    admin.initializeApp({ projectId: process.env.GCP_PROJECT || 'ragestate-app' });
    return admin.firestore();
  }

  if (credsPath) {
    const resolved = path.resolve(process.cwd(), credsPath);
    if (!fs.existsSync(resolved)) {
      console.error(`(init) Service account file not found at resolved path: ${resolved}`);
      return null;
    }
    console.log(`(init) Using service account at ${resolved}`);
    try {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId: process.env.GCP_PROJECT,
      });
      return admin.firestore();
    } catch (err) {
      console.error('(init) Failed to initialize Firebase Admin SDK:', err);
      return null;
    }
  }

  console.warn(
    'Firebase Admin SDK not initialized. Missing FIRESTORE_EMULATOR_HOST or GOOGLE_APPLICATION_CREDENTIALS.',
  );
  return null;
}

const db = initializeFirebase();

// --- In-Memory Tool Toggle Cache ---
const toolToggleCache = { data: {}, fetchedAt: 0, ttlMs: 30000 };
async function isToolEnabled(toolName) {
  const now = Date.now();
  if (now - toolToggleCache.fetchedAt > toolToggleCache.ttlMs) {
    toolToggleCache.fetchedAt = now;
    try {
      const snap = await db.collection('mcpConfig').doc('tools').get();
      toolToggleCache.data = snap.exists ? snap.data() : {};
    } catch (e) {
      // On failure, keep old cache; assume enabled
    }
  }
  const entry = toolToggleCache.data[toolName];
  if (entry == null) return true; // default enabled
  if (typeof entry === 'object' && 'enabled' in entry) return entry.enabled !== false;
  if (typeof entry === 'boolean') return entry;
  return true;
}

// --- Logging Helper ---
async function logToolCall(doc) {
  try {
    await db.collection('mcpToolCalls').doc(doc.requestId).set(doc, { merge: true });
  } catch (e) {
    console.warn('(log) failed to write tool call log', e.message);
  }
}

// --- Middleware ---
app.use(cors());
app.use(express.json());
app.use(async (req, res, next) => {
  if (!db) {
    return res.status(503).json({ error: 'Firebase not initialized' });
  }
  if (req.path === '/health' && process.env.MCP_PUBLIC_HEALTH === 'true') {
    return next();
  }
  const apiKey = req.headers['x-mcp-api-key'];
  if (process.env.MCP_API_KEY && apiKey !== process.env.MCP_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});

// --- Tool Definitions ---

const GetFirestoreDocSchema = z.object({
  path: z
    .string()
    .min(1)
    .regex(
      /^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+(\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+)*$/,
      'Invalid Firestore path format',
    ),
});

async function getFirestoreDoc(params) {
  const { path } = GetFirestoreDocSchema.parse(params);
  const docRef = db.doc(path);
  const docSnap = await docRef.get();
  if (!docSnap.exists) {
    return { exists: false, data: null };
  }
  return { exists: true, data: docSnap.data() };
}

const ListCollectionsSchema = z.object({
  path: z.string().optional(),
});

async function listCollections(params) {
  const { path } = ListCollectionsSchema.parse(params);
  let collections;
  if (path) {
    const docRef = db.doc(path);
    collections = await docRef.listCollections();
  } else {
    collections = await db.listCollections();
  }
  return collections.map((col) => col.id);
}

const TOOLS = {
  getFirestoreDoc: {
    schema: GetFirestoreDocSchema,
    handler: getFirestoreDoc,
    description: 'Retrieves a single document from Firestore.',
  },
  listCollections: {
    schema: ListCollectionsSchema,
    handler: listCollections,
    description: 'Lists subcollections of a document or root collections.',
  },
  queryCollection: {
    schema: z.object({
      collection: z
        .string()
        .min(1)
        .regex(/^[a-zA-Z0-9_-]+$/, 'Simple top-level collection only'),
      where: z
        .array(
          z.object({
            field: z.string().min(1).max(100),
            op: z.enum(['==', '<', '<=', '>', '>=', 'array-contains']),
            value: z.any(),
          }),
        )
        .max(5)
        .optional(),
      limit: z.number().int().positive().max(100).default(20),
      orderBy: z
        .array(
          z.object({
            field: z.string().min(1).max(100),
            direction: z.enum(['asc', 'desc']).default('asc'),
          }),
        )
        .max(3)
        .optional(),
    }),
    handler: async (params) => {
      const { collection, where, limit, orderBy } = params;
      let q = db.collection(collection);
      if (where) {
        for (const cond of where) {
          q = q.where(cond.field, cond.op, cond.value);
        }
      }
      if (orderBy) {
        for (const ord of orderBy) {
          q = q.orderBy(ord.field, ord.direction);
        }
      }
      const cappedLimit = Math.min(limit || 20, 100);
      const snap = await q.limit(cappedLimit).get();
      const docs = [];
      snap.forEach((d) => docs.push({ id: d.id, data: d.data() }));
      return { count: docs.length, docs };
    },
    description: 'Queries a top-level collection with simple where/order/limit (max 100 docs).',
  },
};

// --- API Endpoints ---

app.get('/', (req, res) => {
  const requestId = genRequestId();
  const startedAt = Date.now();
  const payload = {
    message: 'RAGESTATE Firebase MCP Server',
    tools: Object.fromEntries(
      Object.entries(TOOLS).map(([name, { description }]) => [name, { description }]),
    ),
  };
  const { result, clamped } = sizeClamp(payload);
  const envelope = wrapSuccess({ requestId, tool: 'root', startedAt, payload: result });
  if (clamped) envelope.result.truncated = true;
  res.json(envelope);
});

app.get('/health', (req, res) => {
  const requestId = genRequestId();
  const startedAt = Date.now();
  const payload = {
    ok: !!db,
    projectId: process.env.GCP_PROJECT || null,
    emulator: !!process.env.FIRESTORE_EMULATOR_HOST,
    hasApiKey: !!process.env.MCP_API_KEY,
    public: process.env.MCP_PUBLIC_HEALTH === 'true',
  };
  res.json(wrapSuccess({ requestId, tool: 'health', startedAt, payload }));
});

app.post('/tools/:toolName', async (req, res) => {
  const startedAt = Date.now();
  const requestId = genRequestId();
  const { toolName } = req.params;
  const tool = TOOLS[toolName];
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || null;
  const ipHash = clientIp
    ? crypto.createHash('sha256').update(String(clientIp)).digest('hex').slice(0, 16)
    : null;

  if (!tool) {
    return res
      .status(404)
      .json(
        wrapError({
          requestId,
          tool: toolName,
          startedAt,
          code: 'NOT_FOUND',
          message: 'Tool not found',
        }),
      );
  }

  // Tool toggle
  if (!(await isToolEnabled(toolName))) {
    return res.status(403).json(
      wrapError({
        requestId,
        tool: toolName,
        startedAt,
        code: 'TOOL_DISABLED',
        message: 'Tool is disabled by configuration',
      }),
    );
  }

  let errorCode = null;
  let logDoc = null;
  try {
    const params = tool.schema.parse(req.body);
    const rawResult = await tool.handler(params);
    const normalized = normalizeTimestamps(rawResult);
    const { result, clamped } = sizeClamp(normalized);
    if (clamped) result.truncated = true;
    const envelope = wrapSuccess({ requestId, tool: toolName, startedAt, payload: result });
    res.json(envelope);
    logDoc = {
      requestId,
      ts: admin.firestore.FieldValue.serverTimestamp(),
      tool: toolName,
      success: true,
      elapsedMs: envelope.elapsedMs,
      errorCode: null,
      ipHash,
      sizeBytes: JSON.stringify(envelope).length,
      truncated: !!result.truncated,
      paramsRedacted: redactParams(req.body || {}),
    };
  } catch (error) {
    if (error instanceof ZodError) {
      errorCode = 'VALIDATION_FAILED';
      const envelope = wrapError({
        requestId,
        tool: toolName,
        startedAt,
        code: errorCode,
        message: 'Invalid input',
        details: error.errors,
      });
      res.status(400).json(envelope);
      logDoc = {
        requestId,
        ts: admin.firestore.FieldValue.serverTimestamp(),
        tool: toolName,
        success: false,
        elapsedMs: envelope.elapsedMs,
        errorCode,
        ipHash,
        sizeBytes: JSON.stringify(envelope).length,
        paramsRedacted: redactParams(req.body || {}),
      };
      return;
    }
    errorCode = 'INTERNAL_ERROR';
    console.error(`Error executing tool '${toolName}':`, error);
    const envelope = wrapError({
      requestId,
      tool: toolName,
      startedAt,
      code: errorCode,
      message: error.message || 'Internal Server Error',
    });
    res.status(500).json(envelope);
    logDoc = {
      requestId,
      ts: admin.firestore.FieldValue.serverTimestamp(),
      tool: toolName,
      success: false,
      elapsedMs: envelope.elapsedMs,
      errorCode,
      ipHash,
      sizeBytes: JSON.stringify(envelope).length,
      paramsRedacted: redactParams(req.body || {}),
    };
  } finally {
    if (logDoc) logToolCall(logDoc);
  }
});

// --- Server Start ---
app.listen(port, () => {
  console.log(`MCP Server listening on http://localhost:${port}`);
});
