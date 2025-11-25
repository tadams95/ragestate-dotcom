#!/usr/bin/env node
/*
Export all customers to a CSV for Mailchimp import.

Reads: /customers/* with fields like { email, firstName, lastName, phoneNumber, name, displayName, customerEmail, phone }

Columns (in this order): email,firstName,lastName,phoneNumber

Usage (zsh):
  node scripts/exportCustomersForMailchimp.js \
    [--out=./scripts/exports/customers-YYYY-MM-DD.csv] \
    [--projectId=ragestate-app] \
    [--credentials=/path/to/serviceAccount.json]

Notes:
- Uses firebase-admin; rules do not apply.
- If no --out is supplied, writes to ./scripts/exports/customers-<date>.csv
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

function splitNameSafely(full) {
  const s = String(full || '').trim();
  if (!s) return { firstName: '', lastName: '' };
  // Remove extra spaces, split by whitespace
  const parts = s.replace(/\s+/g, ' ').split(' ');
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  const firstName = parts.shift();
  const lastName = parts.join(' ');
  return { firstName, lastName };
}

function pickPhone(obj = {}) {
  return obj.phoneNumber || obj.phone || obj.mobile || obj.tel || '';
}

async function main() {
  const args = parseArgs();
  const outPathArg = args.out || '';

  resolveAdmin(args);
  const db = admin.firestore();

  const snap = await db.collection('customers').get();
  console.log(`Found ${snap.size} customer record(s)`);

  const byEmail = new Map(); // email -> { firstName, lastName, phoneNumber }

  snap.forEach((doc) => {
    const c = doc.data() || {};
    let email = (c.email || c.customerEmail || '').trim();
    if (!email) return; // skip records without an email

    let firstName = c.firstName || '';
    let lastName = c.lastName || '';
    const phoneNumber = String(pickPhone(c) || '').trim();

    if (!firstName && !lastName) {
      const name = c.name || c.displayName || '';
      const split = splitNameSafely(name);
      firstName = split.firstName;
      lastName = split.lastName;
    }

    // Normalize values
    firstName = String(firstName || '').trim();
    lastName = String(lastName || '').trim();

    // Prefer the first occurrence of an email; update empty fields if new data is richer
    if (!byEmail.has(email)) {
      byEmail.set(email, { firstName, lastName, phoneNumber });
    } else {
      const prev = byEmail.get(email);
      byEmail.set(email, {
        firstName: prev.firstName || firstName,
        lastName: prev.lastName || lastName,
        phoneNumber: prev.phoneNumber || phoneNumber,
      });
    }
  });

  // Prepare CSV
  const lines = ['email,firstName,lastName,phoneNumber'];
  const emails = Array.from(byEmail.keys()).sort((a, b) => a.localeCompare(b));
  for (const email of emails) {
    const { firstName, lastName, phoneNumber } = byEmail.get(email) || {};
    const esc = (v) => {
      const s = String(v || '');
      return s.includes(',') || s.includes('"') || s.includes('\n')
        ? `"${s.replace(/"/g, '""')}"`
        : s;
    };
    lines.push([esc(email), esc(firstName), esc(lastName), esc(phoneNumber)].join(','));
  }
  const csv = lines.join('\n') + '\n';

  // Write file
  let outPath = outPathArg;
  if (!outPath) {
    const date = new Date().toISOString().slice(0, 10);
    const dir = path.join(__dirname, 'exports');
    ensureDir(dir);
    outPath = path.join(dir, `customers-${date}.csv`);
  } else {
    const dir = path.dirname(path.resolve(outPath));
    ensureDir(dir);
  }

  fs.writeFileSync(outPath, csv, 'utf8');
  console.log(`Wrote ${emails.length} unique customer email(s) to ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
