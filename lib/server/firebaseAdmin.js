// Firebase Admin singleton initialization (server-side only)
import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import 'server-only';

// Expect service account JSON via process.env.FIREBASE_SERVICE_ACCOUNT (stringified) OR default creds.
let _app; // underscore to avoid unused var lint rule
if (!getApps().length) {
  const projectId =
    process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || undefined;

  const log = (...args) => {
    if (!process.env.SUPPRESS_FIREBASE_ADMIN_INIT_LOG) console.warn('[firebaseAdmin]', ...args);
  };

  const initWithSvc = (raw, hint) => {
    try {
      const svc = JSON.parse(raw);
      _app = initializeApp({ credential: cert(svc), projectId: svc.project_id || projectId });
      if (!process.env.SUPPRESS_FIREBASE_ADMIN_INIT_LOG) {
        console.info(
          '[firebaseAdmin] Initialized with service account' + (hint ? ` (${hint})` : ''),
        );
      }
      return true;
    } catch (e) {
      console.error(
        '[firebaseAdmin] Failed to parse service account' + (hint ? ` (${hint})` : '') + ':',
        e.message,
      );
      return false;
    }
  };

  let initialized = false;

  // 1. Direct JSON string env
  if (process.env.FIREBASE_SERVICE_ACCOUNT && !initialized) {
    initialized = initWithSvc(process.env.FIREBASE_SERVICE_ACCOUNT, 'FIREBASE_SERVICE_ACCOUNT');
  }

  // 2. Base64 variant
  if (!initialized && process.env.FIREBASE_SERVICE_ACCOUNT_B64) {
    try {
      const decoded = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_B64, 'base64').toString(
        'utf8',
      );
      initialized = initWithSvc(decoded, 'FIREBASE_SERVICE_ACCOUNT_B64');
    } catch (e) {
      console.error('[firebaseAdmin] Failed to decode FIREBASE_SERVICE_ACCOUNT_B64:', e.message);
    }
  }

  // 3. File path variant
  if (!initialized && process.env.FIREBASE_SERVICE_ACCOUNT_FILE) {
    (async () => {
      try {
        const fs = await import('fs');
        const raw = fs.readFileSync(process.env.FIREBASE_SERVICE_ACCOUNT_FILE, 'utf8');
        initialized = initWithSvc(raw, 'FIREBASE_SERVICE_ACCOUNT_FILE');
      } catch (e) {
        console.error('[firebaseAdmin] Could not read FIREBASE_SERVICE_ACCOUNT_FILE:', e.message);
      }
    })();
  }

  // 4. Fallback to applicationDefault / projectId only
  if (!initialized) {
    log(
      'No service account env found; falling back to applicationDefault/projectId only. Custom claims / secure admin operations may fail if credentials are missing in runtime environment.',
    );
    try {
      _app = initializeApp({ credential: applicationDefault(), projectId });
    } catch (e) {
      _app = initializeApp({ projectId });
    }
  }
}

export const firestoreAdmin = getFirestore();
export const authAdmin = getAuth();
