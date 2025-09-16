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
// Requires NEXT_PUBLIC_RECAPTCHA_SITE_KEY to be set in env for the client bundle
try {
  if (typeof window !== 'undefined') {
    const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
    if (siteKey && siteKey.trim().length > 0) {
      initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(siteKey),
        isTokenAutoRefreshEnabled: true,
      });
    } else {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('App Check not initialized: NEXT_PUBLIC_RECAPTCHA_SITE_KEY is missing.');
      }
    }
  }
} catch (err) {
  console.error('App Check initialization error:', err);
}

// Export the initialized app, auth, db, rtdb, and storage
export { app, auth, db, rtdb, storage };
