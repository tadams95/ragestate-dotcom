#!/usr/bin/env node
/**
 * grantAdminClaim.js
 *
 * Usage:
 *   node scripts/grantAdminClaim.js <uid>
 *
 * Requires one of FIREBASE_SERVICE_ACCOUNT_B64 | FIREBASE_SERVICE_ACCOUNT | FIREBASE_SERVICE_ACCOUNT_FILE.
 */
import { applicationDefault, cert, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import fs from 'fs';

function loadServiceAccount() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  }
  if (process.env.FIREBASE_SERVICE_ACCOUNT_B64) {
    const json = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_B64, 'base64').toString('utf8');
    return JSON.parse(json);
  }
  if (process.env.FIREBASE_SERVICE_ACCOUNT_FILE) {
    const raw = fs.readFileSync(process.env.FIREBASE_SERVICE_ACCOUNT_FILE, 'utf8');
    return JSON.parse(raw);
  }
  return null;
}

async function main() {
  const uid = process.argv[2];
  if (!uid) {
    console.error('Usage: node scripts/grantAdminClaim.js <uid>');
    process.exit(1);
  }
  const svc = loadServiceAccount();
  if (svc) {
    initializeApp({ credential: cert(svc), projectId: svc.project_id });
  } else {
    console.warn('No explicit service account env found; attempting applicationDefault().');
    initializeApp({ credential: applicationDefault() });
  }
  const auth = getAuth();
  const before = await auth.getUser(uid).catch(() => null);
  await auth.setCustomUserClaims(uid, { ...(before?.customClaims || {}), admin: true });
  const after = await auth.getUser(uid);
  console.log(JSON.stringify({ ok: true, uid, claims: after.customClaims }, null, 2));
  console.log('Admin claim set. User must refresh ID token to reflect change.');
}

main().catch((e) => {
  console.error('Failed:', e);
  process.exit(1);
});
