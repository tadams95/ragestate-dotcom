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

// Helpers to read and sanitize public env vars (strip accidental quotes/spaces)
const clean = (v) => (v || "").trim().replace(/^['"]|['"]$/g, "");
const pickEnv = (...names) => {
  for (const n of names) {
    const val = process.env[n];
    if (val && clean(val)) return clean(val);
  }
  return undefined;
};

// Read Firebase web config from environment (no hardcoded defaults); supports our keys and FIREBASE_* aliases.
const firebaseConfig = {
  apiKey: pickEnv("NEXT_PUBLIC_apiKey", "NEXT_PUBLIC_FIREBASE_API_KEY"),
  authDomain: pickEnv(
    "NEXT_PUBLIC_authDomain",
    "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"
  ),
  databaseURL: pickEnv(
    "NEXT_PUBLIC_databaseURL",
    "NEXT_PUBLIC_FIREBASE_DATABASE_URL"
  ),
  projectId: pickEnv(
    "NEXT_PUBLIC_projectId",
    "NEXT_PUBLIC_FIREBASE_PROJECT_ID"
  ),
  storageBucket: pickEnv(
    "NEXT_PUBLIC_storageBucket",
    "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"
  ),
  messagingSenderId: pickEnv(
    "NEXT_PUBLIC_messagingSenderId",
    "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"
  ),
  appId: pickEnv("NEXT_PUBLIC_appId", "NEXT_PUBLIC_FIREBASE_APP_ID"),
  measurementId: pickEnv(
    "NEXT_PUBLIC_measurementId",
    "NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID"
  ),
};

if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error(
    "Missing Firebase env. Ensure NEXT_PUBLIC_apiKey and NEXT_PUBLIC_projectId (or FIREBASE_* aliases) are set."
  );
}

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
