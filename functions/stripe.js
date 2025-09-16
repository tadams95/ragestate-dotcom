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
      return res.json({ id: existingId, ok: true, reused: true });
    }

    // Create a new customer
    const customer = await stripe.customers.create({
      email,
      name,
      metadata: uid ? { uid } : undefined,
    });

    // Persist mapping in Firestore (and best-effort RTDB) when uid is available
    if (uid && typeof uid === 'string' && uid.trim()) {
      try {
        await Promise.all([
          db
            .collection('customers')
            .doc(uid)
            .set(
              { stripeCustomerId: customer.id, lastUpdated: new Date().toISOString() },
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

    return res.json({ id: customer.id, ok: true });
  } catch (err) {
    logger.error('create-customer error', err);
    res.status(500).json({ error: 'Failed to create customer' });
  }
});

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
