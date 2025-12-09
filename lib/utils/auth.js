import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { getDatabase, ref, set, update } from 'firebase/database';
import { doc, getDoc, getFirestore, setDoc, updateDoc } from 'firebase/firestore';
import { auth } from '../../firebase/firebase';
import storage from '../../src/utils/storage';
import { handleAuthError } from './authUtils';

// Initialize Firestore and Realtime Database
const db = getFirestore();
const rtdb = getDatabase();

export async function createUser(
  email,
  password,
  firstName,
  lastName,
  phoneNumber,
  expoPushToken,
  dispatch,
) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);

    const userId = userCredential.user.uid;
    const timestamp = new Date().toISOString();
    const displayName = `${firstName} ${lastName}`;

    const userData = {
      email: email,
      firstName: firstName,
      lastName: lastName,
      displayName: displayName,
      phoneNumber: phoneNumber,
      expoPushToken: expoPushToken || '',
      qrCode: userId,
      userId: userId,
      createdAt: timestamp,
      lastLogin: timestamp,
      lastUpdated: timestamp,
      profilePicture: '',
      stripeCustomerId: '',
      isAdmin: false,
      migratedFromRTDB: false,
    };

    // Save to both databases in parallel using Firebase SDK
    await Promise.all([
      // Save to Realtime Database
      set(ref(rtdb, `users/${userId}`), userData),

      // Save to Firestore
      setDoc(doc(db, 'customers', userId), {
        ...userData,
        migrationDate: '',
      }),
    ]);

    return {
      user: userCredential.user,
      userData,
    };
  } catch (error) {
    const errorMessage = handleAuthError(error);
    throw new Error(errorMessage);
  }
}

export async function loginUser(email, password, dispatch) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    const userId = user.uid;
    const timestamp = new Date().toISOString();

    // Update last login time in both databases
    await Promise.all([
      update(ref(rtdb, `users/${userId}`), { lastLogin: timestamp }),
      updateDoc(doc(db, 'customers', userId), {
        lastLogin: timestamp,
        lastUpdated: timestamp,
      }),
    ]);

    // Get user data from Firestore
    const userDoc = await getDoc(doc(db, 'customers', userId));
    const userData = userDoc.exists() ? userDoc.data() : null;

    return {
      user,
      userData,
    };
  } catch (error) {
    const errorMessage = handleAuthError(error);
    throw new Error(errorMessage);
  }
}

export async function logoutUser() {
  try {
    await signOut(auth);
    // Clear local storage with event dispatch so Header updates instantly
    storage.clearAuth();
    return { success: true };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

export async function forgotPassword(email) {
  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true, message: 'Password reset email sent successfully' };
  } catch (error) {
    const errorMessage = handleAuthError(error);
    return { success: false, message: errorMessage };
  }
}

export async function updateUserData(userId, userData) {
  try {
    const timestamp = new Date().toISOString();
    const updatedData = {
      ...userData,
      lastUpdated: timestamp,
    };

    // Update both databases using Firebase SDK
    await Promise.all([
      // Update RTDB
      update(ref(rtdb, `users/${userId}`), updatedData),

      // Update Firestore
      updateDoc(doc(db, 'customers', userId), updatedData),
    ]);

    return { success: true };
  } catch (error) {
    console.error('Error updating user data:', error);
    return { success: false, message: 'Failed to update user data' };
  }
}

export async function updateUserStripeId(userId, stripeCustomerId) {
  try {
    // Update both databases using Firebase SDK
    await Promise.all([
      // Update RTDB
      update(ref(rtdb, `users/${userId}`), {
        stripeCustomerId: stripeCustomerId,
      }),

      // Update Firestore
      updateDoc(doc(db, 'customers', userId), {
        stripeCustomerId: stripeCustomerId,
        lastUpdated: new Date().toISOString(),
      }),
    ]);

    return { success: true };
  } catch (error) {
    console.error('Error updating Stripe customer ID:', error);
    throw new Error('Failed to update user with Stripe customer ID');
  }
}
