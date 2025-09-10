// firebase.js

import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";

// Read Firebase web config from environment (no hardcoded defaults)
// Supports both the project's existing key names and FIREBASE_* aliases.
const firebaseConfig = {
  apiKey:
    process.env.NEXT_PUBLIC_apiKey || process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain:
    process.env.NEXT_PUBLIC_authDomain ||
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL:
    process.env.NEXT_PUBLIC_databaseURL ||
    process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId:
    process.env.NEXT_PUBLIC_projectId ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket:
    process.env.NEXT_PUBLIC_storageBucket ||
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId:
    process.env.NEXT_PUBLIC_messagingSenderId ||
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:
    process.env.NEXT_PUBLIC_appId || process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId:
    process.env.NEXT_PUBLIC_measurementId ||
    process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase app (avoid duplicate init during hot reload)
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

const auth = getAuth(app);

// Set persistence to local (survives browser refresh); only run in the browser
if (typeof window !== "undefined") {
  setPersistence(auth, browserLocalPersistence).catch((error) => {
    console.error("Auth persistence error:", error);
  });
}

// Initialize Firebase Firestore
const db = getFirestore(app);

// Initialize Firebase Realtime Database
const rtdb = getDatabase(app);

// Initialize Firebase Storage
const storage = getStorage(app);

// Export the initialized app, auth, db, rtdb, and storage
export { app, db, rtdb, storage, auth };
