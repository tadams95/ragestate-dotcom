// firebase.js

import { initializeApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
import { browserLocalPersistence, getAuth, setPersistence } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

import { api, key } from '../lib/features/todos/userSlice';

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

// Initialize Firebase Firestore
const db = getFirestore(app);

// Initialize Firebase Realtime Database
const rtdb = getDatabase(app);

// Initialize Firebase Storage
const storage = getStorage(app);

// Initialize Firebase App Check (reCAPTCHA v3 provider)
// Optional: disable in local dev via NEXT_PUBLIC_DISABLE_APPCHECK=true
try {
  if (typeof window !== 'undefined') {
    const disable = process.env.NEXT_PUBLIC_DISABLE_APPCHECK === 'true';
    const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

    if (disable) {
      if (process.env.NODE_ENV !== 'production') {
        console.info('[AppCheck] Disabled via NEXT_PUBLIC_DISABLE_APPCHECK');
      }
    } else if (siteKey && siteKey.trim()) {
      // Debug token support: set NEXT_PUBLIC_APPCHECK_DEBUG=true to emit token for allow‑listing
      if (process.env.NEXT_PUBLIC_APPCHECK_DEBUG === 'true') {
        // eslint-disable-next-line no-undef
        self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
        console.info('[AppCheck] Debug token mode enabled');
      }
      initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(siteKey.trim()),
        isTokenAutoRefreshEnabled: true,
      });
      if (process.env.NODE_ENV !== 'production') {
        console.info('[AppCheck] Initialized with reCAPTCHA v3 site key');
      }
    } else {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[AppCheck] Not initialized: missing NEXT_PUBLIC_RECAPTCHA_SITE_KEY');
      }
    }
  }
} catch (err) {
  console.error('App Check initialization error (non-fatal):', err);
}

// Export the initialized app, auth, db, rtdb, and storage
export { app, auth, db, rtdb, storage };
