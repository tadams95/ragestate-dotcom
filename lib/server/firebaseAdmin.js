// Firebase Admin singleton initialization (server-side only)
import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// Expect service account JSON via process.env.FIREBASE_SERVICE_ACCOUNT (stringified) OR default creds.
let _app; // underscore to avoid unused var lint rule
if (!getApps().length) {
  const projectId =
    process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || undefined;
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      const svc = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      _app = initializeApp({ credential: cert(svc), projectId: svc.project_id || projectId });
    } catch (e) {
      console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT JSON – falling back to ADC');
      try {
        _app = initializeApp({ credential: applicationDefault(), projectId });
      } catch (e2) {
        _app = initializeApp({ projectId });
      }
    }
  } else {
    // No explicit service account – rely on Application Default Credentials (e.g. running in GCP) or projectId-only init
    if (!process.env.SUPPRESS_FIREBASE_ADMIN_INIT_LOG) {
      console.warn(
        'firebaseAdmin: FIREBASE_SERVICE_ACCOUNT not set; using applicationDefault/projectId fallback.',
      );
    }
    try {
      _app = initializeApp({ credential: applicationDefault(), projectId });
    } catch (e) {
      _app = initializeApp({ projectId });
    }
  }
}

export const firestoreAdmin = getFirestore();
export const authAdmin = getAuth();
