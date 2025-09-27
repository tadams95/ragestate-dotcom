// Firebase Admin singleton initialization (server-side only)
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// Expect service account JSON via process.env.FIREBASE_SERVICE_ACCOUNT (stringified) OR default creds.
let _app; // underscore to avoid unused var lint rule
if (!getApps().length) {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      const svc = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      _app = initializeApp({ credential: cert(svc) });
    } catch (e) {
      console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT JSON');
      _app = initializeApp();
    }
  } else {
    _app = initializeApp();
  }
}

export const firestoreAdmin = getFirestore();
export const authAdmin = getAuth();
