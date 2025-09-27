import cors from 'cors';
import 'dotenv/config';
import express from 'express';
import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { z, ZodError } from 'zod';

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

// --- Middleware ---
app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  if (!db) {
    return res.status(503).json({ error: 'Firebase not initialized' });
  }
  // Simple API Key auth
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
  res.json({
    message: 'RAGESTATE Firebase MCP Server',
    tools: Object.fromEntries(
      Object.entries(TOOLS).map(([name, { description }]) => [name, { description }]),
    ),
  });
});

app.get('/health', (req, res) => {
  res.json({
    ok: !!db,
    projectId: process.env.GCP_PROJECT || null,
    emulator: !!process.env.FIRESTORE_EMULATOR_HOST,
    hasApiKey: !!process.env.MCP_API_KEY,
  });
});

app.post('/tools/:toolName', async (req, res) => {
  const { toolName } = req.params;
  const tool = TOOLS[toolName];

  if (!tool) {
    return res.status(404).json({ error: `Tool '${toolName}' not found.` });
  }

  try {
    const params = tool.schema.parse(req.body);
    const result = await tool.handler(params);
    res.json({ result });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error(`Error executing tool '${toolName}':`, error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
});

// --- Server Start ---
app.listen(port, () => {
  console.log(`MCP Server listening on http://localhost:${port}`);
});
