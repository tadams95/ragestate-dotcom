// firebase.js

import { initializeApp } from 'firebase/app';
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

// App Check is intentionally disabled.
// DeviceCheck + Play Integrity are for native iOS/Android apps only.
// For web, you would need reCAPTCHA — which we've removed.
// If you add a native mobile app later, configure App Check there with native providers.
// For web, consider Cloudflare Turnstile via a custom App Check provider if needed.

// Export the initialized app, auth, db, rtdb, and storage
export { app, auth, db, rtdb, storage };
