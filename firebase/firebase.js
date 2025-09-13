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
  authDomain: process.env.authDomain,
  databaseURL: process.env.databaseURL,
  projectId: 'ragestate-app',
  storageBucket: 'ragestate-app.appspot.com',
  messagingSenderId: process.env.messagingSenderId,
  appId: process.env.appId,
  measurementId: process.env.measurementId,
};

// Initialize Firebase app
const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

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
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || ''),
      isTokenAutoRefreshEnabled: true,
    });
  }
} catch (err) {
  console.error('App Check initialization error:', err);
}

// Export the initialized app, auth, db, rtdb, and storage
export { app, auth, db, rtdb, storage };
