#!/usr/bin/env node
/* eslint-disable */
/**
 * Seed a sample notification for a given user using service account credentials.
 * Usage: node scripts/seedNotificationSecure.cjs --uid=USER_ID [--type=post_liked]
 */
import { cert, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function argMap() {
  return process.argv.slice(2).reduce((acc, cur) => {
    const [k, v] = cur.replace(/^--/, '').split('=');
    acc[k] = v === undefined ? true : v;
    return acc;
  }, {});
}

async function main() {
  const args = argMap();
  const uid = args.uid;
  const type = args.type || 'post_liked';
  if (!uid) {
    console.error('Missing --uid');
    process.exit(1);
  }
  const saPath = path.join(__dirname, '../.secrets/ragestate-app-firebase-adminsdk-en4dj-67ffd1c011.json');
  if (!fs.existsSync(saPath)) {
    console.error('Service account file not found:', saPath);
    process.exit(1);
  }
  const sa = JSON.parse(fs.readFileSync(saPath, 'utf8'));
  initializeApp({ credential: cert(sa) });
  const db = getFirestore();

  const notifRef = db.collection('users').doc(uid).collection('notifications').doc();
  const payload = {
    type,
    title: 'Sample notification',
    body: `Demo ${type} notification body`,
    data: { example: 'true' },
    link: '/',
    deepLink: 'ragestate://home',
    createdAt: FieldValue.serverTimestamp(),
    seenAt: null,
    read: false,
    sendPush: false,
    pushSentAt: null,
    pushStatus: 'pending',
  };
  await notifRef.set(payload);
  console.log('Seeded notification', { uid, notificationId: notifRef.id, type });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
