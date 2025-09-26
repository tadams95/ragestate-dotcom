#!/usr/bin/env node
/* eslint-disable */
/**
 * Seed a sample notification for a given user using explicit service account credentials.
 * Usage examples:
 *   node scripts/seedNotification.js --uid=USER_ID
 *   node scripts/seedNotification.js --uid=USER_ID --type=post_commented --title="New Comment" --body="Someone commented"
 *
 * Service account loading order (first found wins):
 *   1. --sa=/absolute/path/to/serviceAccount.json
 *   2. Env GOOGLE_APPLICATION_CREDENTIALS
 *   3. ./scripts/.secrets/*.json (first matching ragestate-app-firebase-adminsdk-*.json)
 */

import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function parseArgs() {
  return process.argv.slice(2).reduce((acc, cur) => {
    const [k, v] = cur.startsWith('--') ? cur.slice(2).split('=') : [cur, true];
    acc[k] = v === undefined ? true : v;
    return acc;
  }, {});
}

function resolveServiceAccount(explicitPath) {
  if (explicitPath) {
    if (!fs.existsSync(explicitPath))
      throw new Error(`Service account file not found at ${explicitPath}`);
    return explicitPath;
  }
  if (
    process.env.GOOGLE_APPLICATION_CREDENTIALS &&
    fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)
  ) {
    return process.env.GOOGLE_APPLICATION_CREDENTIALS;
  }
  const secretsDir = path.join(__dirname, '.secrets');
  if (fs.existsSync(secretsDir)) {
    const candidate = fs
      .readdirSync(secretsDir)
      .find((f) => f.startsWith('ragestate-app-firebase-adminsdk') && f.endsWith('.json'));
    if (candidate) return path.join(secretsDir, candidate);
  }
  // Parent .secrets (../.secrets) as used by other scripts
  const parentSecrets = path.join(__dirname, '../.secrets');
  if (fs.existsSync(parentSecrets)) {
    const candidate = fs
      .readdirSync(parentSecrets)
      .find((f) => f.startsWith('ragestate-app-firebase-adminsdk') && f.endsWith('.json'));
    if (candidate) return path.join(parentSecrets, candidate);
  }
  throw new Error(
    'No service account credentials found. Provide --sa or set GOOGLE_APPLICATION_CREDENTIALS.',
  );
}

async function main() {
  const args = parseArgs();
  const uid = args.uid;
  if (!uid) {
    console.error('Missing required --uid');
    process.exit(1);
  }
  const type = args.type || 'post_liked';
  const title = args.title || 'Sample notification';
  const body = args.body || `Demo ${type} notification body`;
  const sendPush = args.sendPush === 'true' || args.sendPush === true;

  const saPath = resolveServiceAccount(args.sa);
  const saJson = JSON.parse(fs.readFileSync(saPath, 'utf8'));
  if (!getApps().length) {
    initializeApp({ credential: cert(saJson) });
  }
  const db = getFirestore();

  const notifRef = db.collection('users').doc(uid).collection('notifications').doc();
  const payload = {
    type,
    title,
    body,
    data: { example: 'true' },
    link: '/',
    deepLink: 'ragestate://home',
    createdAt: FieldValue.serverTimestamp(),
    seenAt: null,
    read: false,
    sendPush,
    pushSentAt: null,
    pushStatus: 'pending',
  };

  await notifRef.set(payload);
  console.log(
    JSON.stringify({
      status: 'ok',
      message: 'Seeded notification',
      uid,
      notificationId: notifRef.id,
      type,
      sendPush,
    }),
  );
}

main().catch((e) => {
  console.error('Failed to seed notification');
  console.error(e);
  process.exit(1);
});
