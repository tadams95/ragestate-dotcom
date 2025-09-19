#!/usr/bin/env node
/*
Bulk inactivate all tickets (ragers) for an event

Sets active=false for every doc under events/{eventId}/ragers and updates lastUpdated.

Usage (zsh):
  # Dry run (default)
  node scripts/inactivateEventRagers.js --eventId=<EVENT_DOC_ID>

  # Live
  node scripts/inactivateEventRagers.js --eventId=<EVENT_DOC_ID> --live

Optional:
  --projectId=ragestate-app
  --credentials=/path/to/serviceAccount.json

Notes:
- Uses firebase-admin. Provide ADC or a service account JSON via --credentials or GOOGLE_APPLICATION_CREDENTIALS.
- This does not touch usedCount; scanning will treat active=false as invalid regardless of remaining.
*/

import admin from 'firebase-admin';
import fs from 'fs';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function parseArgs() {
  const out = { live: false };
  for (const a of process.argv.slice(2)) {
    const m = a.match(/^--([^=]+)=(.*)$/);
    if (m) out[m[1]] = m[2];
    else if (a === '--live') out.live = true;
  }
  return out;
}

function initAdmin() {
  if (admin.apps.length) return admin;
  const early = parseArgs();
  const opts = {};
  if (early.projectId) opts.projectId = early.projectId;
  let credPath = early.credentials || '';
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
      return admin;
    } catch (e) {
      console.error('Failed to load credentials JSON. Falling back to default ADC.', e.message);
      admin.initializeApp(opts);
      return admin;
    }
  }
  admin.initializeApp(opts);
  return admin;
}

async function main() {
  const { eventId, live } = parseArgs();
  if (!eventId || !String(eventId).trim()) {
    console.error('Missing required --eventId');
    process.exit(1);
  }
  initAdmin();
  const db = admin.firestore();

  const eventRef = db.collection('events').doc(eventId);
  const evt = await eventRef.get();
  if (!evt.exists) {
    console.error(`Event ${eventId} not found`);
    process.exit(2);
  }

  console.log(`[inactivate] Scanning ragers for eventId=${eventId} ...`);
  const ragersRef = eventRef.collection('ragers');
  const snap = await ragersRef.get();
  if (snap.empty) {
    console.log('[inactivate] No ragers found.');
    process.exit(0);
  }

  let toUpdate = 0;
  const updates = [];
  let total = 0;
  let alreadyInactive = 0;
  snap.forEach((d) => {
    const v = d.data() || {};
    const currentlyActive = v.active !== false;
    total += 1;
    if (!currentlyActive) {
      alreadyInactive += 1;
      return;
    }
    updates.push({ ref: d.ref });
  });
  toUpdate = updates.length;

  if (toUpdate === 0) {
    console.log(`[inactivate] No candidates. total=${total}, alreadyInactive=${alreadyInactive}`);
    process.exit(0);
  }

  console.log(
    `[inactivate] Will set active=false on ${toUpdate} ragers (of total=${total}, alreadyInactive=${alreadyInactive})`,
  );
  if (!live) {
    console.log('[inactivate] Dry run only. Re-run with --live to apply changes.');
    process.exit(0);
  }

  // Batch in chunks of 400 (leave headroom under 500 op limit)
  const BATCH_SIZE = 400;
  for (let i = 0; i < updates.length; i += BATCH_SIZE) {
    const batch = db.batch();
    const slice = updates.slice(i, i + BATCH_SIZE);
    slice.forEach(({ ref }) =>
      batch.set(
        ref,
        {
          active: false,
          lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      ),
    );
    await batch.commit();
    console.log(`[inactivate] Committed ${slice.length} updates (${i + slice.length}/${toUpdate})`);
  }
  console.log('[inactivate] Done.');
}

main().catch((e) => {
  console.error('Script failed', e);
  process.exit(1);
});
