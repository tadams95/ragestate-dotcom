#!/usr/bin/env node
/*
Manual ticket + purchase creator

Creates:
- events/{eventId}/ragers/{autoId}
- ticketTokens/{token} mapping
- purchases/{orderNumber}
- customers/{uid}/purchases/{orderNumber}
- (optional) fulfillments/{id} summary for email trigger

Usage (zsh):
  node scripts/manualCreateTicket.js \
    --uid=<FIREBASE_UID> \
    --eventId=<EVENT_DOC_ID> \
    --email=<customer@example.com> \
    --name="Customer Name" \
    --qty=1 \
    --priceCents=1500 \
    --title="Faux Fur Ticket" \
    [--createFulfillment] [--paymentIntentId=pi_manual_<timestamp>]
    [--projectId=ragestate-app] [--credentials=/path/to/serviceAccount.json]

Notes:
- This script uses firebase-admin with default credentials. Run where the Firebase Admin SDK can authenticate (e.g., Functions emulator, or set GOOGLE_APPLICATION_CREDENTIALS).
- eventId must match an existing doc under events/.
*/

import crypto from 'crypto';
import admin from 'firebase-admin';
import fs from 'fs';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

if (!admin.apps.length) {
  const opts = {};
  const earlyArgs = (() => {
    const out = {};
    for (const a of process.argv.slice(2)) {
      const m = a.match(/^--([^=]+)=(.*)$/);
      if (m) out[m[1]] = m[2];
    }
    return out;
  })();
  if (earlyArgs.projectId) opts.projectId = earlyArgs.projectId;

  // Resolve credentials path: CLI flag → env var → default .secrets path
  let credPath = earlyArgs.credentials || '';
  if (!credPath) {
    const envCred = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (envCred && fs.existsSync(envCred)) credPath = envCred;
  }
  if (!credPath) {
    const defaultCred = path.join(
      __dirname,
      '../.secrets/ragestate-app-firebase-adminsdk-en4dj-67ffd1c011.json',
    );
    if (fs.existsSync(defaultCred)) credPath = defaultCred;
    else {
      const cwdDefault = path.join(
        process.cwd(),
        '.secrets/ragestate-app-firebase-adminsdk-en4dj-67ffd1c011.json',
      );
      if (fs.existsSync(cwdDefault)) credPath = cwdDefault;
    }
  }

  if (credPath) {
    try {
      const json = fs.readFileSync(credPath, 'utf8');
      const serviceAccount = JSON.parse(json);
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount), ...opts });
    } catch (e) {
      console.error('Failed to load credentials JSON. Falling back to default ADC.', e.message);
      admin.initializeApp(opts);
    }
  } else {
    admin.initializeApp(opts);
  }
}
const db = admin.firestore();

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (const a of args) {
    const m = a.match(/^--([^=]+)=(.*)$/);
    if (m) out[m[1]] = m[2];
    else if (a === '--createFulfillment') out.createFulfillment = true;
  }
  return out;
}

function generateOrderNumber() {
  const prefix = 'ORDER';
  const d = new Date();
  const datePart = d.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${datePart}-${rand}`;
}

function genToken() {
  return crypto.randomBytes(16).toString('hex');
}

async function main() {
  const {
    uid,
    eventId: rawEventId,
    eventName,
    email,
    name,
    qty = '1',
    priceCents = '0',
    title = 'Ticket',
    paymentIntentId,
    createFulfillment,
  } = parseArgs();

  if (!uid) {
    console.error('Missing required --uid');
    process.exit(1);
  }

  const quantity = Math.max(1, parseInt(qty, 10));
  const amountCents = Math.max(0, parseInt(priceCents, 10));
  const amountStr = (amountCents / 100).toFixed(2);
  const orderNumber = generateOrderNumber();
  const token = genToken();
  const now = admin.firestore.FieldValue.serverTimestamp();

  // Resolve eventId if not provided
  let eventId = rawEventId;
  if (!eventId && eventName) {
    const snap = await db.collection('events').where('name', '==', eventName).limit(2).get();
    if (snap.empty) {
      console.error(`No event found with name == "${eventName}"`);
      process.exit(2);
    }
    if (snap.size > 1) {
      console.error(
        `Multiple events found for name == "${eventName}". Please pass --eventId explicitly.`,
      );
      snap.forEach((d) => console.error(`- ${d.id}`));
      process.exit(3);
    }
    eventId = snap.docs[0].id;
    console.log(`Resolved eventName "${eventName}" to eventId: ${eventId}`);
  }
  if (!eventId) {
    console.error('Missing required --eventId (or provide exact --eventName)');
    process.exit(1);
  }

  const eventRef = db.collection('events').doc(eventId);
  const ragersRef = eventRef.collection('ragers');
  const ragerDoc = ragersRef.doc();

  // Verify event exists and capture current quantity
  const eventSnap = await eventRef.get();
  if (!eventSnap.exists) {
    console.error(`Event ${eventId} not found.`);
    process.exit(2);
  }

  // Resolve email/name from customers/{uid} if not provided
  let resolvedEmail = email || null;
  let resolvedName = name || null;
  if (!resolvedEmail || !resolvedName) {
    try {
      const custSnap = await db.collection('customers').doc(uid).get();
      if (custSnap.exists) {
        const c = custSnap.data() || {};
        if (!resolvedEmail) resolvedEmail = c.email || c.customerEmail || null;
        if (!resolvedName) resolvedName = c.name || c.customerName || null;
      }
    } catch {}
  }

  // Build rager document matching finalize-order schema
  const rager = {
    active: true,
    email: resolvedEmail || '',
    firebaseId: uid,
    owner: resolvedName || '',
    purchaseDate: now,
    orderNumber,
    ticketQuantity: quantity,
    paymentIntentId: paymentIntentId || `pi_manual_${Date.now()}`,
    ticketToken: token,
    usedCount: 0,
  };

  // Build purchase document (server-side format)
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
    orderDate: now,
    orderNumber,
    paymentIntentId: rager.paymentIntentId,
    status: 'completed',
    totalAmount: amountStr,
    currency: 'usd',
    discountAmount: 0,
    promoCodeUsed: null,
    createdAt: now,
  };

  const userPurchaseDoc = {
    ...purchaseDoc,
    dateTime: now,
    name: purchaseDoc.customerName,
    email: purchaseDoc.customerEmail,
    stripeId: rager.paymentIntentId,
    cartItems: purchaseDoc.items,
    total: amountStr,
  };

  // Execute writes in a transaction for atomicity of rager + token map, and decrement event quantity
  await db.runTransaction(async (tx) => {
    const evt = await tx.get(eventRef);
    const data = evt.data() || {};
    const currentQty = typeof data.quantity === 'number' ? data.quantity : 0;
    const newQty = Math.max(0, currentQty - quantity);
    tx.update(eventRef, { quantity: newQty });

    tx.set(ragerDoc, rager);
    tx.set(db.collection('ticketTokens').doc(token), {
      eventId,
      ragerId: ragerDoc.id,
      createdAt: now,
    });
  });

  // Purchases outside the transaction
  await db.collection('purchases').doc(orderNumber).set(purchaseDoc, { merge: true });
  await db
    .collection('customers')
    .doc(uid)
    .collection('purchases')
    .doc(orderNumber)
    .set(userPurchaseDoc, { merge: true });

  if (createFulfillment) {
    await db
      .collection('fulfillments')
      .doc(rager.paymentIntentId)
      .set(
        {
          status: 'completed',
          completedAt: new Date(),
          createdTickets: 1,
          details: [{ eventId, ragerId: ragerDoc.id, qty: quantity, orderNumber }],
          orderNumber,
          email: resolvedEmail || '',
          items: [{ title: title || eventId, productId: eventId, quantity }],
          amount: amountCents,
          currency: 'usd',
        },
        { merge: true },
      );
  }

  console.log('Manual ticket created:', {
    orderNumber,
    eventId,
    ragerId: ragerDoc.id,
    token,
    uid,
    email,
    name,
    quantity,
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
