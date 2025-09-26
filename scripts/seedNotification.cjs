#!/usr/bin/env node
/* eslint-disable */
/**
 * Seed a sample notification for a given user.
 * Usage: node scripts/seedNotification.cjs --uid=USER_ID [--type=post_liked]
 */

const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

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
  const notifRef = db.collection('users').doc(uid).collection('notifications').doc();
  const now = admin.firestore.FieldValue.serverTimestamp();
  const payload = {
    type,
    title: 'Sample notification',
    body: `Demo ${type} notification body`,
    data: { example: 'true' },
    link: '/',
    deepLink: 'ragestate://home',
    createdAt: now,
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
