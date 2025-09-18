/* eslint-disable */
'use strict';

const { onRequest, onCall, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const logger = require('firebase-functions/logger');
const express = require('express');
const cors = require('cors');
const { admin, db } = require('./admin');

// Secret Manager: define STRIPE_SECRET. Also support process.env for local dev.
const STRIPE_SECRET = defineSecret('STRIPE_SECRET');
const PROXY_KEY = defineSecret('PROXY_KEY');
let stripeClient;
function getStripe() {
  const key = STRIPE_SECRET.value() || process.env.STRIPE_SECRET;
  if (!key) return null;
  if (!stripeClient || stripeClient._apiKey !== key) {
    stripeClient = require('stripe')(key);
    stripeClient._apiKey = key;
  }
  return stripeClient;
}

const app = express();
// CORS: allow all origins in development and valid origins in prod via Firebase hosting/proxy.
const corsMiddleware = cors({ origin: true });
app.use(corsMiddleware);
// Respond to preflight requests so the browser receives CORS headers
app.options('*', corsMiddleware);
app.use(express.json());

// Lightweight request logger to help debug routing vs. handler logic
app.use((req, _res, next) => {
  try {
    logger.info('incoming request', {
      method: req.method,
      path: req.path,
      origin: req.get('origin') || '',
      ua: req.get('user-agent') || '',
    });
  } catch (_e) {
    // no-op
  }
  next();
});

app.get('/health', (_req, res) => {
  const configured = Boolean(STRIPE_SECRET.value() || process.env.STRIPE_SECRET);
  res.json({ ok: true, stripeConfigured: configured });
});

// Example placeholder; add endpoints when Stripe is reactivated
app.post('/create-payment-intent', async (req, res) => {
  try {
    const stripe = getStripe();
    if (!stripe) return res.status(503).json({ error: 'Stripe disabled' });
    // Enforce that requests come via our Next.js proxy when configured
    const expectedProxyKey = PROXY_KEY.value() || process.env.PROXY_KEY;
    if (expectedProxyKey) {
      const provided = req.get('x-proxy-key');
      if (!provided || provided !== expectedProxyKey) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }
    const { amount, currency = 'usd', customerEmail, name, firebaseId, cartItems } = req.body || {};

    // Basic input validation (server-side)
    const parsedAmount = Number.isFinite(amount) ? Math.floor(Number(amount)) : 0;
    const MIN_AMOUNT = 50; // 50 cents
    if (!parsedAmount || parsedAmount < MIN_AMOUNT) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    const idempotencyKey = req.get('x-idempotency-key') || undefined;

    const pi = await stripe.paymentIntents.create(
      {
        amount: parsedAmount,
        currency,
        automatic_payment_methods: { enabled: true },
        metadata: {
          firebaseId: firebaseId || '',
          email: customerEmail || '',
          name: name || '',
          cartSize: Array.isArray(cartItems) ? String(cartItems.length) : '0',
        },
      },
      idempotencyKey ? { idempotencyKey } : undefined,
    );
    res.json({ client_secret: pi.client_secret });
  } catch (err) {
    logger.error('create-payment-intent error', err);
    res.status(500).json({ error: 'Failed to create payment intent' });
  }
});

// HTTPS endpoint to create (or reuse) a Stripe customer, gated by PROXY_KEY
app.post('/create-customer', async (req, res) => {
  try {
    const stripe = getStripe();
    if (!stripe) return res.status(503).json({ error: 'Stripe disabled' });

    // Enforce that requests come via our Next.js proxy when configured
    const expectedProxyKey = PROXY_KEY.value() || process.env.PROXY_KEY;
    if (expectedProxyKey) {
      const provided = req.get('x-proxy-key');
      if (!provided || provided !== expectedProxyKey) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }

    const { uid, email, name } = req.body || {};
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Email required' });
    }

    // If we have a uid, reuse existing mapping from Firestore if present
    let existingId = '';
    if (uid && typeof uid === 'string' && uid.trim()) {
      try {
        const custRef = db.collection('customers').doc(uid);
        const snap = await custRef.get();
        if (snap.exists && snap.data() && snap.data().stripeCustomerId) {
          existingId = snap.data().stripeCustomerId;
        }
      } catch (e) {
        logger.warn('Firestore read failed when checking existing customer (non-fatal)', e);
      }
    }

    if (existingId) {
      const description =
        uid && String(uid).trim() ? `${email} — ${uid}` : `${email} — ${existingId}`;
      // Best-effort enrich existing mapping and Stripe record
      try {
        await stripe.customers.update(existingId, {
          description,
          metadata: Object.assign({}, uid ? { uid } : {}, {
            app: 'ragestate',
            source: 'firebase-functions-v2',
          }),
        });
      } catch (e) {
        logger.warn('Stripe customer update (reuse) failed (non-fatal)', e);
      }
      if (uid && typeof uid === 'string' && uid.trim()) {
        try {
          await db
            .collection('customers')
            .doc(uid)
            .set(
              { email, name, description, lastUpdated: new Date().toISOString() },
              { merge: true },
            );
        } catch (e) {
          logger.warn('Failed to update customer doc on reuse (non-fatal)', e);
        }
      }
      return res.json({ id: existingId, ok: true, reused: true, description });
    }

    // Create a new customer (metadata will be enriched after we have the id)
    const customer = await stripe.customers.create({
      email,
      name,
      metadata: uid ? { uid } : undefined,
    });

    // Add a helpful description and enrich metadata (uid/app/source). Include uid if available, else customer id.
    const description =
      uid && String(uid).trim() ? `${email} — ${uid}` : `${email} — ${customer.id}`;
    try {
      await stripe.customers.update(customer.id, {
        description,
        metadata: Object.assign({}, uid ? { uid } : {}, {
          app: 'ragestate',
          source: 'firebase-functions-v2',
        }),
      });
    } catch (e) {
      logger.warn('Stripe customer update (description/metadata) failed (non-fatal)', e);
    }

    // Persist mapping in Firestore (and best-effort RTDB) when uid is available
    if (uid && typeof uid === 'string' && uid.trim()) {
      try {
        await Promise.all([
          db.collection('customers').doc(uid).set(
            {
              stripeCustomerId: customer.id,
              email,
              name,
              description,
              createdAt: new Date().toISOString(),
              lastUpdated: new Date().toISOString(),
            },
            { merge: true },
          ),
          (async () => {
            try {
              await admin.database().ref(`users/${uid}/stripeCustomerId`).set(customer.id);
            } catch (e) {
              logger.warn('RTDB write failed (non-fatal)', e);
            }
          })(),
        ]);
      } catch (e) {
        logger.warn('Failed to persist Stripe customer mapping (non-fatal)', e);
      }
    }

    return res.json({ id: customer.id, ok: true, description });
  } catch (err) {
    logger.error('create-customer error', err);
    res.status(500).json({ error: 'Failed to create customer' });
  }
});

// Finalize order: verify payment succeeded, then create tickets (ragers) and decrement inventory
app.post('/finalize-order', async (req, res) => {
  try {
    const stripe = getStripe();
    if (!stripe) return res.status(503).json({ error: 'Stripe disabled' });

    const expectedProxyKey = PROXY_KEY.value() || process.env.PROXY_KEY;
    if (expectedProxyKey) {
      const provided = req.get('x-proxy-key');
      if (!provided || provided !== expectedProxyKey) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }

    const { paymentIntentId, firebaseId, userEmail, userName, cartItems } = req.body || {};
    if (!paymentIntentId || !firebaseId) {
      return res.status(400).json({ error: 'paymentIntentId and firebaseId are required' });
    }

    let pi;
    try {
      pi = await stripe.paymentIntents.retrieve(paymentIntentId);
    } catch (e) {
      logger.error('Failed to retrieve PaymentIntent', e);
      return res.status(400).json({ error: 'Invalid paymentIntentId' });
    }

    if (!pi || pi.status !== 'succeeded') {
      return res.status(409).json({ error: 'Payment not in succeeded state' });
    }

    if (
      pi.metadata &&
      pi.metadata.firebaseId &&
      String(pi.metadata.firebaseId) !== String(firebaseId)
    ) {
      return res.status(403).json({ error: 'Payment does not belong to this user' });
    }

    // Idempotency guard: ensure we only fulfill once per PaymentIntent
    const fulfillRef = db.collection('fulfillments').doc(pi.id);
    let alreadyFulfilled = false;
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(fulfillRef);
      if (snap.exists) {
        alreadyFulfilled = true;
        return;
      }
      // Derive a recipient email from request payload or PI metadata as a fallback
      const derivedEmail =
        (userEmail && String(userEmail).trim()) ||
        (pi.receipt_email && String(pi.receipt_email).trim()) ||
        (pi.metadata && String(pi.metadata.email || '').trim()) ||
        '';
      tx.set(fulfillRef, {
        status: 'processing',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        firebaseId,
        userEmail: derivedEmail,
        amount: pi.amount,
        currency: pi.currency,
      });
    });

    if (alreadyFulfilled) {
      return res.json({ ok: true, idempotent: true, message: 'Already fulfilled' });
    }

    const items = Array.isArray(cartItems) ? cartItems : [];
    const orderNumber = generateOrderNumber();
    logger.info('Finalize-order: received items', {
      count: items.length,
      example: items[0]
        ? {
            productId: items[0].productId,
            quantity: items[0].quantity,
            hasEventDetails: !!items[0].eventDetails,
          }
        : null,
    });

    const created = [];
    const crypto = require('crypto');
    const generateTicketToken = () => crypto.randomBytes(16).toString('hex');
    for (const item of items) {
      const eventId = String(item?.productId || '').trim();
      const qty = Math.max(1, parseInt(item.quantity || 1, 10));
      if (!eventId) continue;

      const eventRef = db.collection('events').doc(eventId);
      logger.info('Finalize-order: processing potential event', { eventId, qty });
      try {
        await db.runTransaction(async (tx) => {
          const snap = await tx.get(eventRef);
          if (!snap.exists) {
            throw new Error(`Event ${eventId} not found`);
          }
          const data = snap.data() || {};
          const currentQty = typeof data.quantity === 'number' ? data.quantity : 0;
          const newQty = Math.max(0, currentQty - qty);
          tx.update(eventRef, { quantity: newQty });

          const ragersRef = eventRef.collection('ragers');
          const token = generateTicketToken();
          const rager = {
            active: true,
            email: userEmail || pi.receipt_email || '',
            firebaseId: firebaseId,
            owner: userName || '',
            purchaseDate: admin.firestore.FieldValue.serverTimestamp(),
            orderNumber,
            ticketQuantity: qty,
            paymentIntentId: pi.id,
            ticketToken: token,
            usedCount: 0,
          };
          const ragerDoc = ragersRef.doc();
          tx.set(ragerDoc, rager);
          // Map token → eventId/ragerId for fast lookup during scanning
          const mapRef = db.collection('ticketTokens').doc(token);
          tx.set(mapRef, {
            eventId,
            ragerId: ragerDoc.id,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          created.push({ eventId, ragerId: ragerDoc.id, qty, newQty });
        });
      } catch (e) {
        logger.warn(`Finalize order: failed for productId=${eventId}`, e);
      }
    }

    try {
      await fulfillRef.set(
        {
          status: 'completed',
          completedAt: admin.firestore.FieldValue.serverTimestamp(),
          createdTickets: created.length,
          details: created,
          orderNumber,
          // backfill summary fields for triggers
          email: (userEmail && String(userEmail).trim()) || pi.receipt_email || '',
          items: items.map((i) => ({
            title: i.title || i.productId,
            productId: i.productId,
            quantity: Math.max(1, parseInt(i.quantity || 1, 10)),
          })),
        },
        { merge: true },
      );
    } catch (e) {
      logger.warn('Failed to update fulfillments record', e);
    }

    logger.info('Finalize-order: completed', { createdTickets: created.length });
    return res.json({ ok: true, createdTickets: created.length, details: created });
  } catch (err) {
    logger.error('finalize-order error', err);
    res.status(500).json({ error: 'Failed to finalize order' });
  }
});

// Test utility: create a completed fulfillment to trigger email
app.post('/test-send-purchase-email', async (req, res) => {
  try {
    const expectedProxyKey = PROXY_KEY.value() || process.env.PROXY_KEY;
    if (expectedProxyKey) {
      const provided = req.get('x-proxy-key');
      if (!provided || provided !== expectedProxyKey) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }

    const { email, piId, items } = req.body || {};
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'email is required' });
    }

    const id = piId && String(piId).trim() ? String(piId).trim() : `test-${Date.now()}`;
    const payloadItems =
      Array.isArray(items) && items.length ? items : [{ title: 'Test Ticket', quantity: 1 }];

    const fulfillRef = db.collection('fulfillments').doc(id);
    const cleanedItems = payloadItems.map((i) => {
      const base = {
        title: i.title || i.name || 'Item',
        quantity: Math.max(1, parseInt(i.quantity || 1, 10)),
      };
      if (i.productId) base.productId = i.productId;
      return base;
    });

    await fulfillRef.set(
      {
        status: 'completed',
        email,
        items: cleanedItems,
        orderNumber: `ORDER-TEST-${Date.now()}`,
        amount: 500,
        currency: 'usd',
        completedAt: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    logger.info('Test fulfillment created for email trigger', { id, email });
    return res.json({ ok: true, id });
  } catch (err) {
    logger.error('test-send-purchase-email error', err);
    return res.status(500).json({ error: 'Failed to create test fulfillment' });
  }
});

// Scan ticket: atomically consume one use for a rager identified by ticketToken
app.post('/scan-ticket', async (req, res) => {
  try {
    const expectedProxyKey = PROXY_KEY.value() || process.env.PROXY_KEY;
    if (expectedProxyKey) {
      const provided = req.get('x-proxy-key');
      if (!provided || provided !== expectedProxyKey) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }

    const { token, userId, scannerId, eventId: expectedEventId } = req.body || {};

    let ragerRef;
    let parentEventId = '';

    if (token && typeof token === 'string') {
      // Fast lookup via token mapping
      let eventIdFromMap = '';
      let ragerIdFromMap = '';
      try {
        const mapSnap = await db.collection('ticketTokens').doc(token).get();
        if (!mapSnap.exists) {
          try {
            logger.info('scan-ticket: token mapping not found', {
              tokenPrefix: typeof token === 'string' ? token.slice(0, 8) : '',
              tokenLength: typeof token === 'string' ? token.length : 0,
            });
          } catch (_e) {}
          return res
            .status(404)
            .json({ error: 'Ticket not found', message: 'No mapping for token' });
        }
        const m = mapSnap.data() || {};
        eventIdFromMap = String(m.eventId || '');
        ragerIdFromMap = String(m.ragerId || '');
        if (!eventIdFromMap || !ragerIdFromMap) {
          try {
            logger.warn('scan-ticket: mapping incomplete', {
              eventId: eventIdFromMap,
              ragerId: ragerIdFromMap,
            });
          } catch (_e) {}
          return res.status(404).json({
            error: 'Ticket mapping incomplete',
            message: 'Mapping missing eventId or ragerId',
          });
        }
      } catch (e) {
        logger.error('scan-ticket map lookup error', { message: e?.message, code: e?.code });
        return res.status(500).json({ error: 'Lookup failed', message: e?.message, code: e?.code });
      }

      ragerRef = db
        .collection('events')
        .doc(eventIdFromMap)
        .collection('ragers')
        .doc(ragerIdFromMap);
      parentEventId = eventIdFromMap;

      if (expectedEventId && expectedEventId !== parentEventId) {
        return res.status(409).json({ error: 'Wrong event for ticket' });
      }
    } else if (userId && typeof userId === 'string') {
      // Scan by firebaseId requires explicit eventId to avoid collection group indexes
      if (!expectedEventId || typeof expectedEventId !== 'string') {
        return res.status(400).json({
          error: 'eventId required',
          message: 'Provide eventId when scanning by userId',
        });
      }

      parentEventId = expectedEventId;
      try {
        const ragersRef = db.collection('events').doc(parentEventId).collection('ragers');
        const qs = await ragersRef.where('firebaseId', '==', userId).get();
        if (qs.empty) {
          return res.status(404).json({
            error: 'Ticket not found',
            message: 'No rager found for user at event',
          });
        }
        // Choose the first active doc with remaining uses; if none remain, use the first for conflict response
        let chosenDoc = null;
        let fallbackDoc = qs.docs[0];
        for (const d of qs.docs) {
          const data = d.data() || {};
          const qty = Math.max(1, parseInt(data.ticketQuantity || 1, 10));
          const used = Math.max(0, parseInt(data.usedCount || 0, 10));
          const active = data.active !== false && used < qty;
          if (active) {
            chosenDoc = d;
            break;
          }
        }
        if (!chosenDoc) {
          // None available to use
          const data = fallbackDoc.data() || {};
          const qty = Math.max(1, parseInt(data.ticketQuantity || 1, 10));
          const used = Math.max(0, parseInt(data.usedCount || 0, 10));
          const remaining = Math.max(0, qty - used);
          return res.status(409).json({ error: 'Ticket already used', remaining });
        }
        ragerRef = chosenDoc.ref;
      } catch (e) {
        logger.error('scan-ticket query by userId failed', { message: e?.message, code: e?.code });
        return res.status(500).json({ error: 'Lookup failed', message: e?.message, code: e?.code });
      }
    } else {
      return res.status(400).json({
        error: 'input required',
        message: 'Provide either token or userId in JSON body',
      });
    }

    let result;
    await db.runTransaction(async (tx) => {
      const fresh = await tx.get(ragerRef);
      if (!fresh.exists) throw new Error('Ticket missing');
      const data = fresh.data() || {};
      const quantity = Math.max(1, parseInt(data.ticketQuantity || 1, 10));
      const usedCount = Math.max(0, parseInt(data.usedCount || 0, 10));
      const active = data.active !== false && usedCount < quantity;
      if (!active) {
        result = { status: 409, body: { error: 'Ticket already used', remaining: 0 } };
        return;
      }
      const nextUsed = usedCount + 1;
      const nextActive = nextUsed < quantity;
      const update = {
        usedCount: nextUsed,
        active: nextActive,
        lastScanAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      if (scannerId && typeof scannerId === 'string') {
        update.lastScannedBy = scannerId;
      }
      tx.update(ragerRef, update);
      result = {
        status: 200,
        body: {
          ok: true,
          eventId: parentEventId,
          ragerId: ragerRef.id,
          remaining: Math.max(0, quantity - nextUsed),
          status: nextActive ? 'active' : 'inactive',
        },
      };
    });

    if (!result) {
      return res.status(500).json({ error: 'Unknown scan error' });
    }
    return res.status(result.status).json(result.body);
  } catch (err) {
    logger.error('scan-ticket error', {
      message: err?.message,
      code: err?.code,
      stack: err?.stack,
    });
    return res
      .status(500)
      .json({ error: 'Failed to scan ticket', message: err?.message, code: err?.code });
  }
});

// Admin: backfill ticketToken/usedCount for an event's ragers and ensure token mapping
app.post('/backfill-ticket-tokens', async (req, res) => {
  try {
    const expectedProxyKey = PROXY_KEY.value() || process.env.PROXY_KEY;
    if (expectedProxyKey) {
      const provided = req.get('x-proxy-key');
      if (!provided || provided !== expectedProxyKey) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }

    const { eventId, dryRun } = req.body || {};
    if (!eventId || typeof eventId !== 'string') {
      return res.status(400).json({ error: 'eventId required' });
    }

    const eventRef = db.collection('events').doc(eventId);
    const ragersRef = eventRef.collection('ragers');
    const snap = await ragersRef.get();
    if (snap.empty) {
      return res.json({ ok: true, eventId, processed: 0, updated: 0 });
    }

    const crypto = require('crypto');
    const gen = () => crypto.randomBytes(16).toString('hex');

    let processed = 0;
    let updated = 0;
    let mappingsCreated = 0;
    const samples = [];
    let batch = db.batch();
    let batchCount = 0;

    snap.docs.forEach((doc) => {
      processed += 1;
      const data = doc.data() || {};
      const updates = {};
      if (!data.ticketToken || typeof data.ticketToken !== 'string') {
        updates.ticketToken = gen();
      }
      if (typeof data.usedCount !== 'number') {
        updates.usedCount = 0;
      }
      // If active is missing, derive from usedCount/ticketQuantity; else leave as-is
      if (typeof data.active !== 'boolean') {
        const qty = Math.max(1, parseInt(data.ticketQuantity || 1, 10));
        const used = Math.max(0, parseInt(data.usedCount || 0, 10));
        updates.active = used < qty;
      }

      const finalToken = updates.ticketToken || data.ticketToken;
      const eventId = doc.ref.parent.parent.id;
      const needsMap = !!finalToken;

      if (Object.keys(updates).length > 0) {
        updated += 1;
        if (samples.length < 5) {
          samples.push({
            ragerId: doc.id,
            updates: Object.assign({}, updates, {
              ticketToken: finalToken,
            }),
          });
        }
        if (!dryRun) {
          batch.update(doc.ref, updates);
          batchCount += 1;
          if (batchCount >= 400) {
            // Commit and reset batch to avoid limits
            batch.commit();
            batch = db.batch();
            batchCount = 0;
          }
        }
      }

      // Ensure token mapping exists
      if (needsMap && !dryRun) {
        const mapRef = db.collection('ticketTokens').doc(finalToken);
        batch.set(
          mapRef,
          {
            eventId,
            ragerId: doc.id,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
        mappingsCreated += 1;
        batchCount += 1;
        if (batchCount >= 400) {
          batch.commit();
          batch = db.batch();
          batchCount = 0;
        }
      }
    });

    if (!dryRun && batchCount > 0) {
      await batch.commit();
    }

    return res.json({
      ok: true,
      eventId,
      processed,
      updated,
      mappingsCreated,
      dryRun: !!dryRun,
      samples,
    });
  } catch (err) {
    logger.error('backfill-ticket-tokens error', err);
    return res.status(500).json({ error: 'Failed to backfill' });
  }
});

function generateOrderNumber() {
  const prefix = 'ORDER';
  const d = new Date();
  const datePart = d.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${datePart}-${rand}`;
}

exports.stripePayment = onRequest({ secrets: [STRIPE_SECRET, PROXY_KEY], invoker: 'public' }, app);

// Callable function to create a Stripe customer for the authenticated, verified user
exports.createStripeCustomer = onCall(
  { enforceAppCheck: true, secrets: [STRIPE_SECRET] },
  async (request) => {
    if (!request.app) {
      throw new HttpsError('failed-precondition', 'App Check required');
    }
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required');
    }

    const stripe = getStripe();
    if (!stripe) {
      throw new HttpsError(
        'unavailable',
        'Stripe is not configured. Set the STRIPE_SECRET secret.',
      );
    }

    const uid = request.auth.uid;
    const email = request.auth.token.email || undefined;
    const emailVerified = request.auth.token.email_verified === true;
    if (!emailVerified) {
      throw new HttpsError('permission-denied', 'Email verification required');
    }

    try {
      const custRef = db.collection('customers').doc(uid);
      const existing = await custRef.get();
      if (existing.exists && existing.data() && existing.data().stripeCustomerId) {
        return { id: existing.data().stripeCustomerId, ok: true, reused: true };
      }

      const name = request.data && request.data.name ? request.data.name : undefined;
      const customer = await stripe.customers.create({ email, name, metadata: { uid } });

      await Promise.all([
        custRef.set(
          { stripeCustomerId: customer.id, lastUpdated: new Date().toISOString() },
          { merge: true },
        ),
        // Best-effort RTDB write; ignore if RTDB is not enabled
        (async () => {
          try {
            await admin.database().ref(`users/${uid}/stripeCustomerId`).set(customer.id);
          } catch (e) {
            logger.warn('RTDB write failed (non-fatal)', e);
          }
        })(),
      ]);

      return { id: customer.id, ok: true };
    } catch (err) {
      logger.error('createStripeCustomer failed', err);
      throw new HttpsError('internal', 'Failed to create Stripe customer');
    }
  },
);
