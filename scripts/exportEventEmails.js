#!/usr/bin/env node
/*
Export attendee emails for a given event into a CSV.

Reads:
- /eventUsers/{eventName}/users (doc.id or data.firebaseId assumed to be uid)
- /customers/{uid} for email resolution (prefers `email`, falls back to `customerEmail`)

Usage (zsh):
  node scripts/exportEventEmails.js \
    --eventName="Faux Fur House Show" \
    [--out=./exports/faux-fur-house-emails.csv] \
    [--projectId=ragestate-app] \
    [--credentials=/path/to/serviceAccount.json]

Notes:
- Uses firebase-admin; rules do not apply.
- If no --out is supplied, writes to ./exports/<sanitized-event>-emails-<date>.csv
*/

import admin from 'firebase-admin';
import fs from 'fs';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function parseArgs() {
  const out = {};
  for (const a of process.argv.slice(2)) {
    const m = a.match(/^--([^=]+)=(.*)$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

function sanitizeFilePart(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9._-]/g, '')
    .slice(0, 80);
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function resolveAdmin(earlyArgs) {
  if (admin.apps.length) return;
  const opts = {};
  if (earlyArgs.projectId) opts.projectId = earlyArgs.projectId;

  let credPath = earlyArgs.credentials || '';
  if (
    !credPath &&
    process.env.GOOGLE_APPLICATION_CREDENTIALS &&
    fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)
  ) {
    credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
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
      return;
    } catch (e) {
      console.error('Failed to load credentials JSON. Falling back to default ADC.', e.message);
    }
  }
  admin.initializeApp(opts);
}

async function main() {
  const args = parseArgs();
  const eventName = args.eventName || 'Faux Fur House Show';
  const outPathArg = args.out || '';

  resolveAdmin(args);
  const db = admin.firestore();

  const usersCol = db.collection('eventUsers').doc(eventName).collection('users');
  const snap = await usersCol.get();
  console.log(`Found ${snap.size} attendee record(s) for event: ${eventName}`);

  const uids = [];
  snap.forEach((doc) => {
    const data = doc.data() || {};
    const uid = data.firebaseId || doc.id;
    if (uid) uids.push(String(uid));
  });

  const dedupUids = Array.from(new Set(uids));
  console.log(`Unique user IDs: ${dedupUids.length}`);

  // Fetch customer docs in parallel with mild concurrency
  const emailMap = new Map(); // email -> { name }

  const chunkSize = 50;
  for (let i = 0; i < dedupUids.length; i += chunkSize) {
    const chunk = dedupUids.slice(i, i + chunkSize);
    const results = await Promise.all(
      chunk.map(async (uid) => {
        try {
          const cSnap = await db.doc(`customers/${uid}`).get();
          if (!cSnap.exists) return { uid, email: '', name: '' };
          const c = cSnap.data() || {};
          const email = c.email || c.customerEmail || '';
          const name = c.name || c.displayName || '';
          return { uid, email: String(email || ''), name: String(name || '') };
        } catch (e) {
          return { uid, email: '', name: '' };
        }
      }),
    );
    for (const r of results) {
      const email = (r.email || '').trim();
      if (!email) continue;
      if (!emailMap.has(email)) {
        emailMap.set(email, { name: r.name || '' });
      }
    }
  }

  // Prepare CSV (email, name)
  const lines = ['email,name'];
  const sortedEmails = Array.from(emailMap.keys()).sort((a, b) => a.localeCompare(b));
  for (const e of sortedEmails) {
    const { name } = emailMap.get(e) || { name: '' };
    const esc = (v) => {
      const s = String(v || '');
      return s.includes(',') || s.includes('"') || s.includes('\n')
        ? `"${s.replace(/"/g, '""')}"`
        : s;
    };
    lines.push([esc(e), esc(name)].join(','));
  }
  const csv = lines.join('\n') + '\n';

  // Determine output path
  let outPath = outPathArg;
  if (!outPath) {
    const date = new Date().toISOString().slice(0, 10);
    const base = sanitizeFilePart(eventName) || 'event';
    const dir = path.join(__dirname, 'exports');
    ensureDir(dir);
    outPath = path.join(dir, `${base}-emails-${date}.csv`);
  } else {
    const dir = path.dirname(path.resolve(outPath));
    ensureDir(dir);
  }

  fs.writeFileSync(outPath, csv, 'utf8');
  console.log(`Wrote ${sortedEmails.length} unique email(s) to ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
