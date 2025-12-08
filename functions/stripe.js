/* eslint-disable */
'use strict';

const { onRequest, onCall, HttpsError } = require('firebase-functions/v2/https');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { defineSecret } = require('firebase-functions/params');
const logger = require('firebase-functions/logger');
const express = require('express');
const cors = require('cors');
const { admin, db } = require('./admin');
const { createShopifyOrder, isShopifyConfigured } = require('./shopifyAdmin');

// Secret Manager: define secrets. Also support process.env for local dev.
const STRIPE_SECRET = defineSecret('STRIPE_SECRET');
const PROXY_KEY = defineSecret('PROXY_KEY');
const SHOPIFY_ADMIN_ACCESS_TOKEN = defineSecret('SHOPIFY_ADMIN_ACCESS_TOKEN');
const SHOPIFY_SHOP_NAME = defineSecret('SHOPIFY_SHOP_NAME');
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

// Metrics helper: increment per-event counters without failing the main path
async function incrementEventMetrics(eventId, increments) {
  try {
    if (!eventId || typeof eventId !== 'string') return;
    const ref = db.collection('metrics').doc('events').collection('events').doc(eventId);
    const payload = Object.assign(
      { lastUpdated: admin.firestore.FieldValue.serverTimestamp() },
      Object.fromEntries(
        Object.entries(increments || {}).map(([k, v]) => [
          k,
          admin.firestore.FieldValue.increment(v),
        ]),
      ),
    );
    await ref.set(payload, { merge: true });
  } catch (e) {
    try {
      logger.warn('incrementEventMetrics failed (non-fatal)', { message: e?.message });
    } catch (_e) {}
  }
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

// Test endpoint to verify Shopify Admin API connection
app.get('/test-shopify', async (req, res) => {
  try {
    // Check proxy key for security
    const expectedProxyKey = PROXY_KEY.value() || process.env.PROXY_KEY;
    if (expectedProxyKey) {
      const provided = req.get('x-proxy-key');
      if (!provided || provided !== expectedProxyKey) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }

    const shopifyConfigured = isShopifyConfigured();

    if (!shopifyConfigured) {
      return res.json({
        ok: false,
        shopifyConfigured: false,
        message:
          'Shopify Admin API not configured. Set SHOPIFY_ADMIN_ACCESS_TOKEN and SHOPIFY_SHOP_NAME secrets.',
      });
    }

    // Try to fetch shop info to verify the connection
    const shopName = process.env.SHOPIFY_SHOP_NAME;
    const accessToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
    const apiVersion = '2024-10';

    const response = await fetch(
      `https://${shopName}.myshopify.com/admin/api/${apiVersion}/shop.json`,
      {
        headers: {
          'X-Shopify-Access-Token': accessToken,
        },
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('[Shopify] Test connection failed', {
        status: response.status,
        error: errorText,
      });
      return res.json({
        ok: false,
        shopifyConfigured: true,
        connectionTest: 'failed',
        status: response.status,
        error: errorText,
      });
    }

    const data = await response.json();
    const shop = data.shop;

    logger.info('[Shopify] Test connection successful', {
      shopName: shop.name,
      domain: shop.domain,
    });

    return res.json({
      ok: true,
      shopifyConfigured: true,
      connectionTest: 'passed',
      shop: {
        name: shop.name,
        email: shop.email,
        domain: shop.domain,
        currency: shop.currency,
        plan: shop.plan_name,
      },
    });
  } catch (error) {
    logger.error('[Shopify] Test connection exception', { error: error.message });
    return res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});

// Test endpoint to create a DRAFT order in Shopify (safe - doesn't affect inventory)
app.post('/test-shopify-draft-order', async (req, res) => {
  try {
    // Check proxy key for security
    const expectedProxyKey = PROXY_KEY.value() || process.env.PROXY_KEY;
    if (expectedProxyKey) {
      const provided = req.get('x-proxy-key');
      if (!provided || provided !== expectedProxyKey) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }

    const shopName = process.env.SHOPIFY_SHOP_NAME;
    const accessToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;

    if (!shopName || !accessToken) {
      return res.json({
        ok: false,
        error: 'Shopify not configured',
      });
    }

    const apiVersion = '2024-10';

    // Create a simple draft order with a custom line item (no real product needed)
    const draftOrderPayload = {
      draft_order: {
        line_items: [
          {
            title: 'TEST ITEM - Delete This Order',
            price: '0.01',
            quantity: 1,
            requires_shipping: true,
          },
        ],
        customer: {
          email: 'test@ragestate.com',
          first_name: 'Test',
          last_name: 'Order',
        },
        shipping_address: {
          first_name: 'Test',
          last_name: 'Order',
          address1: '123 Test Street',
          city: 'Los Angeles',
          province: 'CA',
          zip: '90001',
          country: 'US',
        },
        note: 'TEST DRAFT ORDER - Safe to delete. Created by RAGESTATE integration test.',
        tags: 'test, auto-delete, ragestate-integration-test',
      },
    };

    logger.info('[Shopify] Creating test draft order');

    const response = await fetch(
      `https://${shopName}.myshopify.com/admin/api/${apiVersion}/draft_orders.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': accessToken,
        },
        body: JSON.stringify(draftOrderPayload),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('[Shopify] Draft order creation failed', {
        status: response.status,
        error: errorText,
      });
      return res.json({
        ok: false,
        error: 'Failed to create draft order',
        status: response.status,
        details: errorText,
      });
    }

    const data = await response.json();
    const draftOrder = data.draft_order;

    logger.info('[Shopify] Test draft order created successfully', {
      draftOrderId: draftOrder.id,
      name: draftOrder.name,
    });

    return res.json({
      ok: true,
      message: 'Draft order created successfully! Check your Shopify Admin > Orders > Drafts',
      draftOrder: {
        id: draftOrder.id,
        name: draftOrder.name,
        status: draftOrder.status,
        total_price: draftOrder.total_price,
        created_at: draftOrder.created_at,
        admin_url: `https://${shopName}.myshopify.com/admin/draft_orders/${draftOrder.id}`,
      },
      note: 'This is a TEST draft order. You can safely delete it from Shopify Admin.',
    });
  } catch (error) {
    logger.error('[Shopify] Draft order test exception', { error: error.message });
    return res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
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

// ============================================================================
// ITEM TYPE DETECTION HELPERS
// FIX: Distinguish merchandise (Shopify products) from event tickets (Firestore events)
// Reference: MERCH_CHECKOUT_FIXES.md - Phase 1: Robust item-type detection
// ============================================================================

/**
 * Determines if a product ID represents a Shopify merchandise item.
 * Shopify product IDs contain 'gid://shopify' or are long numeric strings (10+ digits).
 * Event IDs in Firestore are typically shorter alphanumeric strings.
 *
 * @param {string} productId - The product identifier to check
 * @param {object} item - The full cart item for additional context
 * @returns {boolean} - True if this is a Shopify merchandise item
 */
function isShopifyMerchandise(productId, item) {
  if (!productId || typeof productId !== 'string') return false;

  // Check for Shopify GID format (e.g., 'gid://shopify/Product/12345678901')
  if (productId.includes('gid://shopify') || productId.toLowerCase().includes('shopify')) {
    return true;
  }

  // Shopify numeric IDs are typically 10+ digits
  if (/^\d{10,}$/.test(productId)) {
    return true;
  }

  // Check item properties that indicate merchandise
  // Merchandise has isDigital: false and no eventDetails
  if (item) {
    // If explicitly marked as digital (like event tickets), it's not merchandise
    if (item.isDigital === true) {
      return false;
    }
    // If it has eventDetails, it's an event ticket
    if (item.eventDetails != null) {
      return false;
    }
    // If it has a variantId (Shopify variant), it's merchandise
    if (item.variantId && String(item.variantId).includes('gid://shopify')) {
      return true;
    }
    // If it has size/color selections typical of apparel, likely merchandise
    if ((item.selectedSize || item.size) && (item.selectedColor || item.color)) {
      // Could be merchandise, but need to verify it's not an event
      // Events typically don't have both size AND color
    }
  }

  // If productId is short (< 30 chars) and doesn't look like Shopify, assume event
  if (productId.length < 30 && !/^\d+$/.test(productId)) {
    return false;
  }

  // Default: if it looks like a long ID, assume Shopify merchandise
  return productId.length >= 30;
}

/**
 * Categorizes cart items into event tickets and merchandise.
 * @param {Array} items - Array of cart items
 * @returns {{eventItems: Array, merchandiseItems: Array}}
 */
function categorizeCartItems(items) {
  const eventItems = [];
  const merchandiseItems = [];

  for (const item of items) {
    const productId = String(item?.productId || '').trim();
    if (!productId) continue;

    if (isShopifyMerchandise(productId, item)) {
      merchandiseItems.push(item);
    } else {
      eventItems.push(item);
    }
  }

  return { eventItems, merchandiseItems };
}

// Finalize order: verify payment succeeded, then create tickets (ragers) and/or merchandise orders
// FIX: Now properly handles both event tickets AND merchandise items separately
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

    const {
      paymentIntentId,
      firebaseId,
      userEmail,
      userName,
      cartItems,
      addressDetails,
      appliedPromoCode,
    } = req.body || {};
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
    let existingFulfillment = null;
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(fulfillRef);
      if (snap.exists) {
        alreadyFulfilled = true;
        existingFulfillment = snap.data() || null;
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
      const orderNumber = existingFulfillment?.orderNumber || null;
      const createdTickets = existingFulfillment?.createdTickets || 0;
      const createdMerchOrders = existingFulfillment?.createdMerchOrders || 0;
      const details = existingFulfillment?.details || [];
      return res.json({
        ok: true,
        idempotent: true,
        message: 'Already fulfilled',
        orderNumber,
        createdTickets,
        createdMerchOrders,
        details,
      });
    }

    const items = Array.isArray(cartItems) ? cartItems : [];
    const orderNumber = generateOrderNumber();

    // FIX: Categorize items into events vs merchandise BEFORE processing
    // Reference: MERCH_CHECKOUT_FIXES.md - Issue #1: finalize-order treats all items as events
    const { eventItems, merchandiseItems } = categorizeCartItems(items);

    logger.info('Finalize-order: received and categorized items', {
      totalCount: items.length,
      eventCount: eventItems.length,
      merchandiseCount: merchandiseItems.length,
      orderNumber,
      example: items[0]
        ? {
            productId: items[0].productId,
            quantity: items[0].quantity,
            hasEventDetails: !!items[0].eventDetails,
            isShopify: isShopifyMerchandise(items[0].productId, items[0]),
          }
        : null,
    });

    const created = [];
    const merchOrdersCreated = [];
    const errors = [];
    const crypto = require('crypto');
    const generateTicketToken = () => crypto.randomBytes(16).toString('hex');

    // ============================================================================
    // PROCESS EVENT TICKETS
    // This is the original working flow - only process items identified as events
    // ============================================================================
    for (const item of eventItems) {
      const eventId = String(item?.productId || '').trim();
      const qty = Math.max(1, parseInt(item.quantity || 1, 10));
      if (!eventId) continue;

      const eventRef = db.collection('events').doc(eventId);
      logger.info('Finalize-order: processing EVENT ticket', { eventId, qty, orderNumber });
      try {
        await db.runTransaction(async (tx) => {
          const snap = await tx.get(eventRef);
          if (!snap.exists) {
            // FIX: This should only happen for actual event items now
            // If we get here, it means our categorization might have a false negative
            throw new Error(`Event ${eventId} not found - item may have been miscategorized`);
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
          // Update event-user summary totals (userId-first model)
          const summaryRef = db
            .collection('eventUsers')
            .doc(eventId)
            .collection('users')
            .doc(firebaseId);
          tx.set(
            summaryRef,
            {
              totalTickets: admin.firestore.FieldValue.increment(qty),
              lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true },
          );
          created.push({ type: 'event', eventId, ragerId: ragerDoc.id, qty, newQty });
        });
        logger.info('Finalize-order: EVENT ticket created successfully', { eventId, qty });
      } catch (e) {
        // FIX: Log as ERROR not warn for event ticket failures (these are critical)
        logger.error(`Finalize order: FAILED to create event ticket for eventId=${eventId}`, {
          message: e?.message,
          orderNumber,
        });
        errors.push({
          type: 'event',
          productId: eventId,
          error: e?.message || 'Unknown error',
        });
      }
    }

    // ============================================================================
    // PROCESS MERCHANDISE ITEMS
    // FIX: New flow to properly handle Shopify merchandise
    // Reference: MERCH_CHECKOUT_FIXES.md - Phase 1: Create merchandiseOrders collection
    // ============================================================================

    // Collect all merchandise items for a single Shopify order
    const merchItemsForShopify = [];

    for (const item of merchandiseItems) {
      const productId = String(item?.productId || '').trim();
      const qty = Math.max(1, parseInt(item.quantity || 1, 10));
      if (!productId) continue;

      logger.info('Finalize-order: processing MERCHANDISE item', {
        productId,
        variantId: item.variantId,
        title: item.title,
        qty,
        orderNumber,
      });

      try {
        // Build shipping address object
        const shippingAddr = addressDetails
          ? {
              name: addressDetails.name || userName || '',
              line1: addressDetails.address?.line1 || '',
              line2: addressDetails.address?.line2 || '',
              city: addressDetails.address?.city || '',
              state: addressDetails.address?.state || '',
              postalCode: addressDetails.address?.postal_code || '',
              country: addressDetails.address?.country || 'US',
            }
          : null;

        // Create merchandise order document in dedicated collection
        const merchOrderDoc = {
          // Order reference
          orderNumber,
          paymentIntentId: pi.id,
          firebaseId,

          // Product details
          productId,
          variantId: item.variantId || null,
          title: item.title || item.name || productId,
          quantity: qty,
          price:
            typeof item.price === 'number'
              ? item.price
              : typeof item.price === 'string'
                ? parseFloat(item.price)
                : null,
          productImageSrc: item.productImageSrc || item.imageSrc || null,

          // Variant details
          color: item.color || item.selectedColor || null,
          size: item.size || item.selectedSize || null,

          // Customer info
          customerEmail: userEmail || pi.receipt_email || '',
          customerName: userName || '',

          // Shipping address (critical for physical items)
          shippingAddress: shippingAddr,

          // Status tracking
          status: 'pending_fulfillment',
          fulfillmentStatus: 'unfulfilled',
          shopifyOrderId: null,
          shopifyOrderNumber: null,

          // Timestamps
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        // Store in merchandiseOrders collection
        const merchRef = db.collection('merchandiseOrders').doc();
        await merchRef.set(merchOrderDoc);

        // Collect for Shopify batch order
        merchItemsForShopify.push({
          firestoreId: merchRef.id,
          productId,
          variantId: item.variantId || null,
          title: item.title || item.name || productId,
          quantity: qty,
          price: merchOrderDoc.price,
        });

        merchOrdersCreated.push({
          type: 'merchandise',
          orderId: merchRef.id,
          productId,
          variantId: item.variantId || null,
          title: item.title,
          qty,
        });

        logger.info('Finalize-order: MERCHANDISE order created successfully', {
          orderId: merchRef.id,
          productId,
          qty,
          orderNumber,
        });
      } catch (e) {
        // FIX: Log merchandise failures as ERRORS (not warnings) - these need attention
        logger.error(
          `Finalize order: FAILED to create merchandise order for productId=${productId}`,
          {
            message: e?.message,
            orderNumber,
            productId,
          },
        );
        errors.push({
          type: 'merchandise',
          productId,
          error: e?.message || 'Unknown error',
        });
      }
    }

    // ============================================================================
    // CREATE SHOPIFY ORDER (if we have merchandise items and Shopify is configured)
    // ============================================================================
    if (merchItemsForShopify.length > 0) {
      logger.info('Finalize-order: Creating Shopify order for merchandise', {
        orderNumber,
        itemCount: merchItemsForShopify.length,
        shopifyConfigured: isShopifyConfigured(),
      });

      try {
        const shopifyResult = await createShopifyOrder({
          items: merchItemsForShopify,
          email: userEmail || pi.receipt_email || '',
          orderNumber: orderNumber,
          customerName: userName || '',
          shippingAddress: addressDetails
            ? {
                name: addressDetails.name || userName || '',
                line1: addressDetails.address?.line1 || '',
                line2: addressDetails.address?.line2 || '',
                city: addressDetails.address?.city || '',
                state: addressDetails.address?.state || '',
                postalCode: addressDetails.address?.postal_code || '',
                country: addressDetails.address?.country || 'US',
              }
            : null,
        });

        if (shopifyResult && shopifyResult.success) {
          // Update all merchandise orders with Shopify order info
          const batch = db.batch();
          for (const merchItem of merchItemsForShopify) {
            const merchDocRef = db.collection('merchandiseOrders').doc(merchItem.firestoreId);
            batch.update(merchDocRef, {
              shopifyOrderId: shopifyResult.shopifyOrderId,
              shopifyOrderNumber: shopifyResult.shopifyOrderNumber,
              shopifyOrderName: shopifyResult.orderName || null,
              shopifyStatusUrl: shopifyResult.statusUrl || null,
              status: 'sent_to_shopify',
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
          }
          await batch.commit();

          logger.info('Finalize-order: Shopify order created and linked', {
            orderNumber,
            shopifyOrderId: shopifyResult.shopifyOrderId,
            shopifyOrderNumber: shopifyResult.shopifyOrderNumber,
            itemCount: merchItemsForShopify.length,
          });
        } else if (shopifyResult && shopifyResult.reason === 'not_configured') {
          // Shopify not configured - orders remain in Firestore for manual fulfillment
          logger.info(
            'Finalize-order: Shopify not configured, merchandise orders saved to Firestore only',
            {
              orderNumber,
              itemCount: merchItemsForShopify.length,
            },
          );
        } else {
          // Shopify API error - log but don't fail the order (Firestore has the data)
          logger.warn('Finalize-order: Shopify order creation failed, falling back to Firestore', {
            orderNumber,
            shopifyResult,
          });
        }
      } catch (shopifyError) {
        // Non-fatal: Shopify failed but Firestore orders exist
        logger.error('Finalize-order: Shopify order creation exception', {
          orderNumber,
          error: shopifyError?.message,
        });
      }
    }

    // FIX: Check if we had critical failures
    // If ALL items failed, return an error to the client
    const totalItemsProcessed = created.length + merchOrdersCreated.length;
    const totalItemsExpected = eventItems.length + merchandiseItems.length;

    if (totalItemsExpected > 0 && totalItemsProcessed === 0) {
      logger.error('Finalize-order: ALL items failed to process', {
        orderNumber,
        errors,
        eventCount: eventItems.length,
        merchandiseCount: merchandiseItems.length,
      });
      // Update fulfillment status to failed
      try {
        await fulfillRef.set(
          {
            status: 'failed',
            failedAt: admin.firestore.FieldValue.serverTimestamp(),
            errors,
            orderNumber,
          },
          { merge: true },
        );
      } catch (_) {}
      return res.status(500).json({
        ok: false,
        error: 'Failed to process any items in the order',
        orderNumber,
        errors,
      });
    }

    // Build purchase payloads (server-side mirror of client SaveToFirestore)
    const amountTotal = typeof pi.amount === 'number' ? pi.amount : 0;
    const amountStr = (amountTotal / 100).toFixed(2);

    // FIX: Add itemType to each item for better tracking
    // Reference: MERCH_CHECKOUT_FIXES.md - Phase 2: Purchase records now indicate item types
    const sanitizedItems = items.map((i) => ({
      productId: i.productId,
      title: i.title || i.name || i.productId,
      price:
        typeof i.price === 'number'
          ? i.price
          : typeof i.price === 'string'
            ? parseFloat(i.price)
            : null,
      quantity: Math.max(1, parseInt(i.quantity || 1, 10)),
      productImageSrc: i.productImageSrc || i.imageSrc || null,
      color: i.color || i.selectedColor || null,
      size: i.size || i.selectedSize || null,
      eventDetails: i.eventDetails || null,
      // FIX: Add item type for tracking
      itemType: isShopifyMerchandise(i.productId, i) ? 'merchandise' : 'event',
      variantId: i.variantId || null,
    }));

    // FIX: Calculate item type flags for the order
    const hasEventItems = eventItems.length > 0;
    const hasMerchandiseItems = merchandiseItems.length > 0;
    const itemTypes = [];
    if (hasEventItems) itemTypes.push('event');
    if (hasMerchandiseItems) itemTypes.push('merchandise');

    const purchaseDoc = {
      addressDetails: addressDetails || null,
      customerEmail: userEmail || pi.receipt_email || (pi.metadata && pi.metadata.email) || null,
      customerId: firebaseId,
      customerName: userName || (pi.metadata && pi.metadata.name) || null,
      itemCount: sanitizedItems.length,
      items: sanitizedItems,
      orderDate: admin.firestore.FieldValue.serverTimestamp(),
      orderNumber,
      paymentIntentId: pi.id,
      status: 'completed',
      totalAmount: amountStr,
      currency: pi.currency || 'usd',
      discountAmount:
        appliedPromoCode && appliedPromoCode.discountValue ? appliedPromoCode.discountValue : 0,
      promoCodeUsed: appliedPromoCode && appliedPromoCode.id ? appliedPromoCode.id : null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      // FIX: Add item type tracking for easier filtering/reporting
      itemTypes,
      hasEventItems,
      hasMerchandiseItems,
      eventItemCount: eventItems.length,
      merchandiseItemCount: merchandiseItems.length,
    };

    // Write purchases in both collections
    try {
      const purchaseRef = db.collection('purchases').doc(orderNumber);
      await purchaseRef.set(purchaseDoc, { merge: true });

      const userPurchaseRef = db
        .collection('customers')
        .doc(firebaseId)
        .collection('purchases')
        .doc(orderNumber);
      await userPurchaseRef.set(
        Object.assign({}, purchaseDoc, {
          // Legacy compatibility fields used by OrderHistory
          dateTime: admin.firestore.FieldValue.serverTimestamp(),
          name: purchaseDoc.customerName,
          email: purchaseDoc.customerEmail,
          stripeId: pi.id,
          cartItems: sanitizedItems,
          total: amountStr,
        }),
        { merge: true },
      );
    } catch (e) {
      logger.warn('Failed to write purchase documents', e);
    }

    // If promo code applied, update its usage counters (best-effort)
    if (appliedPromoCode && appliedPromoCode.id) {
      try {
        const promoRef = db.collection('promoterCodes').doc(appliedPromoCode.id);
        await db.runTransaction(async (tx) => {
          const snap = await tx.get(promoRef);
          const data = snap.exists ? snap.data() || {} : {};
          const newUses = Number(data.currentUses || 0) + 1;
          tx.set(
            promoRef,
            {
              currentUses: newUses,
              lastUsed: admin.firestore.FieldValue.serverTimestamp(),
              lastOrderNumber: orderNumber,
            },
            { merge: true },
          );
        });
      } catch (e) {
        logger.warn('Promo code update failed (non-fatal)', e);
      }
    }

    try {
      await fulfillRef.set(
        {
          status: 'completed',
          completedAt: admin.firestore.FieldValue.serverTimestamp(),
          createdTickets: created.length,
          // FIX: Include merchandise order info in fulfillment
          createdMerchOrders: merchOrdersCreated.length,
          details: created,
          merchandiseDetails: merchOrdersCreated,
          orderNumber,
          // FIX: Track item types in fulfillment
          itemTypes,
          hasEventItems,
          hasMerchandiseItems,
          // FIX: Include any partial failures
          errors: errors.length > 0 ? errors : null,
          partialSuccess: errors.length > 0 && totalItemsProcessed > 0,
          // backfill summary fields for triggers
          email: (userEmail && String(userEmail).trim()) || pi.receipt_email || '',
          items: items.map((i) => ({
            title: i.title || i.productId,
            productId: i.productId,
            quantity: Math.max(1, parseInt(i.quantity || 1, 10)),
            itemType: isShopifyMerchandise(i.productId, i) ? 'merchandise' : 'event',
          })),
        },
        { merge: true },
      );
    } catch (e) {
      logger.warn('Failed to update fulfillments record', e);
    }

    // FIX: Enhanced logging with merchandise info
    logger.info('Finalize-order: completed', {
      orderNumber,
      createdTickets: created.length,
      createdMerchOrders: merchOrdersCreated.length,
      errors: errors.length,
      itemTypes,
    });

    // FIX: Return comprehensive response including merchandise orders
    return res.json({
      ok: true,
      orderNumber,
      createdTickets: created.length,
      createdMerchOrders: merchOrdersCreated.length,
      details: created,
      merchandiseDetails: merchOrdersCreated,
      itemTypes,
      // Include partial failure info if some items failed
      partialFailure: errors.length > 0 ? { count: errors.length, errors } : null,
    });
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

// Admin utility: manually create a ticket + purchase for a user and event
app.post('/manual-create-ticket', async (req, res) => {
  try {
    const expectedProxyKey = PROXY_KEY.value() || process.env.PROXY_KEY;
    if (expectedProxyKey) {
      const provided = req.get('x-proxy-key');
      if (!provided || provided !== expectedProxyKey) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }

    const {
      uid,
      eventId: rawEventId,
      eventName,
      email,
      name,
      qty,
      priceCents,
      title,
      createFulfillment,
      paymentIntentId,
      orderNumber: providedOrderNumber,
      currency,
    } = req.body || {};

    if (!uid) return res.status(400).json({ error: 'uid required' });

    const quantity = Math.max(1, parseInt(qty || 1, 10));
    const amountCents = Math.max(0, parseInt(priceCents || 0, 10));
    const amountStr = (amountCents / 100).toFixed(2);
    const orderNumber = providedOrderNumber || generateOrderNumber();
    const token = require('crypto').randomBytes(16).toString('hex');
    const nowTs = admin.firestore.FieldValue.serverTimestamp();
    const cur = (currency || 'usd').toLowerCase();

    // Resolve eventId if not provided
    let eventId = (rawEventId && String(rawEventId).trim()) || '';
    if (!eventId && eventName) {
      const snap = await db
        .collection('events')
        .where('name', '==', String(eventName))
        .limit(2)
        .get();
      if (snap.empty) return res.status(404).json({ error: 'event not found by name' });
      if (snap.size > 1)
        return res.status(409).json({ error: 'multiple events match name; pass eventId' });
      eventId = snap.docs[0].id;
    }
    if (!eventId) return res.status(400).json({ error: 'eventId or eventName required' });

    const eventRef = db.collection('events').doc(eventId);
    const ragersCol = eventRef.collection('ragers');
    const ragerDoc = ragersCol.doc();

    // Resolve email/name from customers/{uid} if missing
    let resolvedEmail = (email && String(email)) || '';
    let resolvedName = (name && String(name)) || '';
    if (!resolvedEmail || !resolvedName) {
      try {
        const cust = await db.collection('customers').doc(uid).get();
        const c = cust.exists ? cust.data() || {} : {};
        if (!resolvedEmail) resolvedEmail = c.email || c.customerEmail || '';
        if (!resolvedName) resolvedName = c.name || c.customerName || '';
      } catch (_e) {}
    }

    // Ensure event exists and do atomic writes
    try {
      await db.runTransaction(async (tx) => {
        const evt = await tx.get(eventRef);
        if (!evt.exists) throw new Error('Event not found');
        const data = evt.data() || {};
        const currentQty = typeof data.quantity === 'number' ? data.quantity : 0;
        const newQty = Math.max(0, currentQty - quantity);
        tx.update(eventRef, { quantity: newQty });

        const rager = {
          active: true,
          email: resolvedEmail || '',
          firebaseId: uid,
          owner: resolvedName || '',
          purchaseDate: nowTs,
          orderNumber,
          ticketQuantity: quantity,
          paymentIntentId: paymentIntentId || `pi_manual_${Date.now()}`,
          ticketToken: token,
          usedCount: 0,
        };
        tx.set(ragerDoc, rager);
        tx.set(db.collection('ticketTokens').doc(token), {
          eventId,
          ragerId: ragerDoc.id,
          createdAt: nowTs,
        });
        // Update event-user summary totals (userId-first model)
        const summaryRef = db.collection('eventUsers').doc(eventId).collection('users').doc(uid);
        tx.set(
          summaryRef,
          {
            totalTickets: admin.firestore.FieldValue.increment(quantity),
            lastUpdated: nowTs,
          },
          { merge: true },
        );
      });
    } catch (e) {
      logger.error('manual-create-ticket transaction failed', { message: e?.message });
      return res.status(500).json({ error: 'transaction failed', message: e?.message });
    }

    const purchaseDoc = {
      addressDetails: null,
      customerEmail: resolvedEmail || null,
      customerId: uid,
      customerName: resolvedName || null,
      itemCount: 1,
      items: [
        {
          productId: eventId,
          title: title || eventId,
          price: amountCents / 100,
          quantity,
          productImageSrc: null,
          color: null,
          size: null,
          eventDetails: null,
        },
      ],
      orderDate: nowTs,
      orderNumber,
      paymentIntentId: paymentIntentId || `pi_manual_${Date.now()}`,
      status: 'completed',
      totalAmount: amountStr,
      currency: cur,
      discountAmount: 0,
      promoCodeUsed: null,
      createdAt: nowTs,
    };

    try {
      await db.collection('purchases').doc(orderNumber).set(purchaseDoc, { merge: true });
      await db
        .collection('customers')
        .doc(uid)
        .collection('purchases')
        .doc(orderNumber)
        .set(
          Object.assign({}, purchaseDoc, {
            dateTime: nowTs,
            name: purchaseDoc.customerName,
            email: purchaseDoc.customerEmail,
            stripeId: purchaseDoc.paymentIntentId,
            cartItems: purchaseDoc.items,
            total: amountStr,
          }),
          { merge: true },
        );
    } catch (e) {
      logger.warn('manual-create-ticket: purchase writes failed', { message: e?.message });
    }

    if (createFulfillment) {
      try {
        await db
          .collection('fulfillments')
          .doc(purchaseDoc.paymentIntentId)
          .set(
            {
              status: 'completed',
              completedAt: admin.firestore.FieldValue.serverTimestamp(),
              createdTickets: 1,
              details: [{ eventId, ragerId: ragerDoc.id, qty: quantity, orderNumber }],
              orderNumber,
              email: resolvedEmail || '',
              items: [{ title: title || eventId, productId: eventId, quantity }],
              amount: amountCents,
              currency: cur,
            },
            { merge: true },
          );
      } catch (e) {
        logger.warn('manual-create-ticket: fulfillment write failed (non-fatal)', {
          message: e?.message,
        });
      }
    }

    return res.json({ ok: true, orderNumber, eventId, qty: quantity, email: resolvedEmail });
  } catch (err) {
    logger.error('manual-create-ticket error', err);
    return res.status(500).json({ error: 'Failed' });
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
        try {
          await incrementEventMetrics(expectedEventId, { scanDenials: 1 });
        } catch (_e) {}
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
          try {
            await incrementEventMetrics(parentEventId, { scanDenials: 1 });
          } catch (_e) {}
          return res.status(404).json({
            error: 'Ticket not found',
            message: 'No rager found for user at event',
          });
        }
        // Deterministic selection: choose doc with greatest remaining; tiebreaker earliest purchaseDate then lexicographic id
        const enriched = qs.docs.map((d) => {
          const v = d.data() || {};
          const qty = Math.max(1, parseInt(v.ticketQuantity || 1, 10));
          const used = Math.max(0, parseInt(v.usedCount || 0, 10));
          const remaining = Math.max(0, qty - used);
          return {
            doc: d,
            remaining,
            purchaseDate: v.purchaseDate && v.purchaseDate.toMillis ? v.purchaseDate.toMillis() : 0,
          };
        });
        const remainingTotal = enriched.reduce((acc, e) => acc + e.remaining, 0);
        if (remainingTotal <= 0) {
          const first = enriched[0];
          try {
            await incrementEventMetrics(parentEventId, { scanDenials: 1 });
          } catch (_e) {}
          return res
            .status(409)
            .json({ error: 'Ticket already used', remaining: 0, remainingTotal: 0 });
        }
        enriched.sort((a, b) => {
          if (b.remaining !== a.remaining) return b.remaining - a.remaining;
          if (a.purchaseDate !== b.purchaseDate) return a.purchaseDate - b.purchaseDate;
          return a.doc.id.localeCompare(b.doc.id);
        });
        ragerRef = enriched[0].doc.ref;
        // Stash for later response
        req.__remainingTotalBefore = remainingTotal;
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
      const uidForSummary = data.firebaseId || userId || '';
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
      // Update event-user summary if available (no reads; atomic increment)
      const eventIdForSummary = parentEventId;
      if (eventIdForSummary && uidForSummary) {
        const summaryRef = db
          .collection('eventUsers')
          .doc(eventIdForSummary)
          .collection('users')
          .doc(uidForSummary);
        tx.set(
          summaryRef,
          {
            usedCount: admin.firestore.FieldValue.increment(1),
            lastScanAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
      }
      result = {
        status: 200,
        body: {
          ok: true,
          eventId: parentEventId,
          ragerId: ragerRef.id,
          remaining: Math.max(0, quantity - nextUsed),
          remainingTotal:
            typeof req.__remainingTotalBefore === 'number'
              ? Math.max(0, req.__remainingTotalBefore - 1)
              : undefined,
          status: nextActive ? 'active' : 'inactive',
        },
      };
    });

    if (!result) {
      return res.status(500).json({ error: 'Unknown scan error' });
    }
    try {
      if (result.status === 200) {
        await incrementEventMetrics(parentEventId, { scansAccepted: 1 });
      } else if (parentEventId) {
        await incrementEventMetrics(parentEventId, { scanDenials: 1 });
      }
    } catch (_e) {}
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

// Preview tickets for a user at an event (no mutation)
app.post('/scan-ticket/preview', async (req, res) => {
  try {
    const expectedProxyKey = PROXY_KEY.value() || process.env.PROXY_KEY;
    if (expectedProxyKey) {
      const provided = req.get('x-proxy-key');
      if (!provided || provided !== expectedProxyKey) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }

    const { userId, eventId } = req.body || {};
    if (!userId || !eventId) {
      return res.status(400).json({ error: 'userId and eventId required' });
    }

    const ragersRef = db.collection('events').doc(eventId).collection('ragers');
    const qs = await ragersRef.where('firebaseId', '==', userId).get();
    if (qs.empty) {
      return res.json({ ok: true, eventId, userId, remainingTotal: 0, items: [], next: null });
    }

    const items = qs.docs.map((d) => {
      const v = d.data() || {};
      const qty = Math.max(1, parseInt(v.ticketQuantity || 1, 10));
      const used = Math.max(0, parseInt(v.usedCount || 0, 10));
      const remaining = Math.max(0, qty - used);
      const ts = v.purchaseDate && v.purchaseDate.toMillis ? v.purchaseDate.toMillis() : 0;
      return {
        ragerId: d.id,
        remaining,
        ticketQuantity: qty,
        usedCount: used,
        active: v.active !== false && remaining > 0,
        purchaseDate: ts || null,
      };
    });

    const remainingTotal = items.reduce((acc, i) => acc + i.remaining, 0);
    const sorted = items.slice().sort((a, b) => {
      if (b.remaining !== a.remaining) return b.remaining - a.remaining;
      if ((a.purchaseDate || 0) !== (b.purchaseDate || 0))
        return (a.purchaseDate || 0) - (b.purchaseDate || 0);
      return a.ragerId.localeCompare(b.ragerId);
    });
    const next = sorted.find((i) => i.active) || null;

    try {
      await incrementEventMetrics(eventId, {
        previewRemainingSum: remainingTotal,
        previewCount: 1,
      });
    } catch (_e) {}

    return res.json({ ok: true, eventId, userId, remainingTotal, items, next });
  } catch (err) {
    logger.error('scan-ticket/preview error', { message: err?.message, code: err?.code });
    return res.status(500).json({ error: 'Failed to preview tickets', message: err?.message });
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

// Admin: reconcile eventUsers summaries for a specific event from ragers
app.post('/reconcile-event-users', async (req, res) => {
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

    // Gather per-user aggregates from ragers
    const ragersRef = db.collection('events').doc(eventId).collection('ragers');
    const snap = await ragersRef.get();
    if (snap.empty) {
      return res.json({ ok: true, eventId, processedUsers: 0, updatedUsers: 0, dryRun: !!dryRun });
    }

    const perUser = new Map();
    snap.docs.forEach((d) => {
      const v = d.data() || {};
      const uid = String(v.firebaseId || '').trim();
      if (!uid) return;
      const qty = Math.max(1, parseInt(v.ticketQuantity || 1, 10));
      const used = Math.max(0, parseInt(v.usedCount || 0, 10));
      const lastScanAt = v.lastScanAt || null;
      if (!perUser.has(uid)) {
        perUser.set(uid, {
          totalTickets: 0,
          usedCount: 0,
          lastScanAt: lastScanAt,
        });
      }
      const agg = perUser.get(uid);
      agg.totalTickets += qty;
      agg.usedCount += used;
      if (
        lastScanAt &&
        lastScanAt.toMillis &&
        (!agg.lastScanAt ||
          (agg.lastScanAt.toMillis && lastScanAt.toMillis() > agg.lastScanAt.toMillis()))
      ) {
        agg.lastScanAt = lastScanAt;
      }
    });

    const users = Array.from(perUser.keys());
    let processedUsers = users.length;
    let updatedUsers = 0;
    const samples = [];

    let batch = db.batch();
    let batchCount = 0;

    // For each user, compare with existing summary and write if different
    for (const uid of users) {
      const target = perUser.get(uid);
      const summaryRef = db.collection('eventUsers').doc(eventId).collection('users').doc(uid);
      let prevTotal = null;
      let prevUsed = null;
      try {
        const s = await summaryRef.get();
        if (s.exists) {
          const sd = s.data() || {};
          prevTotal = typeof sd.totalTickets === 'number' ? sd.totalTickets : null;
          prevUsed = typeof sd.usedCount === 'number' ? sd.usedCount : null;
        }
      } catch (_e) {}

      const needsUpdate = prevTotal !== target.totalTickets || prevUsed !== target.usedCount;
      if (needsUpdate) {
        updatedUsers += 1;
        if (samples.length < 10) {
          samples.push({
            uid,
            prev: { totalTickets: prevTotal, usedCount: prevUsed },
            next: { totalTickets: target.totalTickets, usedCount: target.usedCount },
          });
        }
        if (!dryRun) {
          const payload = {
            totalTickets: target.totalTickets,
            usedCount: Math.min(target.totalTickets, target.usedCount),
            lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
          };
          if (target.lastScanAt) payload.lastScanAt = target.lastScanAt;
          batch.set(summaryRef, payload, { merge: true });
          batchCount += 1;
          if (batchCount >= 400) {
            await batch.commit();
            batch = db.batch();
            batchCount = 0;
          }
        }
      }
    }

    if (!dryRun && batchCount > 0) {
      await batch.commit();
    }

    // Write an audit record for non-dry runs
    if (!dryRun) {
      try {
        const runId = `run-${Date.now()}`;
        await db.collection('reconciliations').doc(eventId).collection('runs').doc(runId).set(
          {
            eventId,
            processedUsers,
            updatedUsers,
            samples,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
      } catch (e) {
        logger.warn('reconcile-event-users: failed to write audit record (non-fatal)', {
          message: e?.message,
        });
      }
    }

    logger.info('reconcile-event-users completed', { eventId, processedUsers, updatedUsers });
    return res.json({ ok: true, eventId, processedUsers, updatedUsers, dryRun: !!dryRun, samples });
  } catch (err) {
    logger.error('reconcile-event-users error', err);
    return res.status(500).json({ error: 'Failed to reconcile', message: err?.message });
  }
});

function generateOrderNumber() {
  const prefix = 'ORDER';
  const d = new Date();
  const datePart = d.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${datePart}-${rand}`;
}

exports.stripePayment = onRequest(
  {
    secrets: [STRIPE_SECRET, PROXY_KEY, SHOPIFY_ADMIN_ACCESS_TOKEN, SHOPIFY_SHOP_NAME],
    invoker: 'public',
  },
  app,
);

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

// Scheduled daily reconcile to keep eventUsers summaries fresh
exports.reconcileEventUsersDaily = onSchedule(
  { schedule: 'every day 03:00', timeZone: 'America/Los_Angeles' },
  async () => {
    try {
      const evSnap = await db.collection('events').limit(50).get();
      if (evSnap.empty) return;
      for (const ev of evSnap.docs) {
        const eventId = ev.id;
        try {
          const ragersRef = db.collection('events').doc(eventId).collection('ragers');
          const snap = await ragersRef.get();
          if (snap.empty) continue;

          const perUser = new Map();
          snap.docs.forEach((d) => {
            const v = d.data() || {};
            const uid = String(v.firebaseId || '').trim();
            if (!uid) return;
            const qty = Math.max(1, parseInt(v.ticketQuantity || 1, 10));
            const used = Math.max(0, parseInt(v.usedCount || 0, 10));
            const lastScanAt = v.lastScanAt || null;
            if (!perUser.has(uid)) {
              perUser.set(uid, { totalTickets: 0, usedCount: 0, lastScanAt });
            }
            const agg = perUser.get(uid);
            agg.totalTickets += qty;
            agg.usedCount += used;
            if (
              lastScanAt &&
              lastScanAt.toMillis &&
              (!agg.lastScanAt ||
                (agg.lastScanAt.toMillis && lastScanAt.toMillis() > agg.lastScanAt.toMillis()))
            ) {
              agg.lastScanAt = lastScanAt;
            }
          });

          let batch = db.batch();
          let count = 0;
          for (const [uid, target] of perUser.entries()) {
            const summaryRef = db
              .collection('eventUsers')
              .doc(eventId)
              .collection('users')
              .doc(uid);
            const s = await summaryRef.get();
            let prevTotal = null;
            let prevUsed = null;
            if (s.exists) {
              const d = s.data() || {};
              prevTotal = typeof d.totalTickets === 'number' ? d.totalTickets : null;
              prevUsed = typeof d.usedCount === 'number' ? d.usedCount : null;
            }
            if (prevTotal !== target.totalTickets || prevUsed !== target.usedCount) {
              batch.set(
                summaryRef,
                {
                  totalTickets: target.totalTickets,
                  usedCount: target.usedCount,
                  lastScanAt: target.lastScanAt || admin.firestore.FieldValue.delete(),
                  lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
                },
                { merge: true },
              );
              count += 1;
              if (count >= 400) {
                await batch.commit();
                batch = db.batch();
                count = 0;
              }
            }
          }
          if (count > 0) await batch.commit();

          try {
            await db
              .collection('reconciliations')
              .doc(eventId)
              .collection('runs')
              .doc(`auto-${Date.now()}`)
              .set(
                {
                  eventId,
                  processedUsers: perUser.size,
                  updatedUsers: admin.firestore.FieldValue.increment(0),
                  createdAt: admin.firestore.FieldValue.serverTimestamp(),
                  automated: true,
                },
                { merge: true },
              );
          } catch (_e) {}
        } catch (e) {
          try {
            logger.warn('scheduled reconcile failed for event', { eventId, message: e?.message });
          } catch (_e) {}
        }
      }
    } catch (err) {
      try {
        logger.error('reconcileEventUsersDaily error', { message: err?.message });
      } catch (_e) {}
    }
  },
);
