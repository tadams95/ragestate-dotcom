// firebase.js

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";

import { api, key } from "../lib/features/todos/userSlice";

const firebaseConfig = {
  apiKey: api + key,
  authDomain: process.env.authDomain,
  databaseURL: process.env.databaseURL,
  projectId: "ragestate-app",
  storageBucket: "ragestate-app.appspot.com",
  messagingSenderId: process.env.messagingSenderId,
  appId: process.env.appId,
  measurementId: process.env.measurementId,
};

// Initialize Firebase app
const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

// Initialize Firebase Firestore
const db = getFirestore(app);

// Initialize Firebase Realtime Database
const rtdb = getDatabase(app);

// Initialize Firebase Storage
const storage = getStorage(app);

// Export the initialized app, auth, db, rtdb, and storage
export { app, db, rtdb, storage, auth };
