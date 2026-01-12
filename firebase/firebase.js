// firebase.js

import { initializeApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';
import { browserLocalPersistence, getAuth, setPersistence } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

import { api, key } from '../lib/features/userSlice';

const firebaseConfig = {
  apiKey: api + key,
  authDomain:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ||
    process.env.authDomain ||
    'ragestate-app.firebaseapp.com',
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || process.env.databaseURL,
  projectId: 'ragestate-app',
  storageBucket: 'ragestate-app.appspot.com',
  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || process.env.messagingSenderId,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || process.env.appId,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || process.env.measurementId,
};

// Initialize Firebase app
const app = initializeApp(firebaseConfig);

// Initialize App Check FIRST (before other services) so tokens attach to requests
// Only initialize on client-side (browser)
let appCheck = null;
if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY) {
  // Enable debug token in development for localhost testing
  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-restricted-globals
    self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
  }
  try {
    appCheck = initializeAppCheck(app, {
      provider: new ReCaptchaEnterpriseProvider(process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY),
      isTokenAutoRefreshEnabled: true,
    });
    console.log('[AppCheck] Initialized successfully');
  } catch (e) {
    console.error('[AppCheck] Failed to initialize:', e);
  }
} else if (typeof window !== 'undefined') {
  console.warn('[AppCheck] NEXT_PUBLIC_RECAPTCHA_SITE_KEY not set, App Check disabled');
}

const auth = getAuth(app);
// Prefer device language for auth emails/flows
try {
  auth.languageCode =
    typeof navigator !== 'undefined' && navigator.language ? navigator.language : 'en';
} catch (_) {
  // no-op
}

// Set persistence to local (survives browser refresh)
setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error('Auth persistence error:', error);
});

// Initialize Firebase Firestore with offline persistence
// - persistentLocalCache: caches all reads in IndexedDB for offline access
// - persistentMultipleTabManager: syncs cache across browser tabs
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});

// Initialize Firebase Realtime Database
const rtdb = getDatabase(app);

// Initialize Firebase Storage
const storage = getStorage(app);

// Export the initialized app, auth, db, rtdb, storage, and appCheck
export { app, appCheck, auth, db, rtdb, storage };
