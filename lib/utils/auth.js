import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import { getDatabase, ref, set, update } from 'firebase/database';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { auth } from '../../firebase/firebase';
import storage from '../../src/utils/storage';
import { handleAuthError } from './authUtils';

// Initialize Firestore and Realtime Database
const db = getFirestore();
const rtdb = getDatabase();

// Google Auth Provider
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

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

      // Create stub public profile (username set later during onboarding)
      setDoc(
        doc(db, 'profiles', userId),
        {
          displayName,
          photoURL: '',
          username: null,
          usernameLower: null,
          bio: '',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      ),
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
    // Get current user before signing out to clean up devices
    const currentUser = auth.currentUser;
    if (currentUser?.uid) {
      // Delete all device tokens to stop push notifications
      try {
        const devicesRef = collection(db, 'users', currentUser.uid, 'devices');
        const devicesSnap = await getDocs(devicesRef);
        await Promise.all(devicesSnap.docs.map((d) => deleteDoc(d.ref)));
      } catch (e) {
        console.warn('Failed to clean up device tokens on logout:', e);
      }
    }
    await signOut(auth);
    // Clear local storage with event dispatch so Header updates instantly
    storage.clearAuth();
    return { success: true };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

/**
 * Sign in with Google (handles both new and existing users)
 * @returns {{ user, userData, isNewUser }}
 */
export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    const isNewUser = result._tokenResponse?.isNewUser ?? false;
    const timestamp = new Date().toISOString();

    // Check if user already exists in customers collection
    const customerDoc = await getDoc(doc(db, 'customers', user.uid));
    let userData = customerDoc.exists() ? customerDoc.data() : null;

    // Parse Google display name
    const displayName = user.displayName || '';
    const nameParts = displayName.split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    if (!customerDoc.exists()) {
      // New user: create customer and profile docs
      userData = {
        email: user.email,
        firstName,
        lastName,
        displayName,
        phoneNumber: user.phoneNumber || '',
        qrCode: user.uid,
        userId: user.uid,
        provider: 'google',
        photoURL: user.photoURL || '',
        createdAt: timestamp,
        lastLogin: timestamp,
        lastUpdated: timestamp,
      };

      // Create customer doc
      await setDoc(doc(db, 'customers', user.uid), userData);

      // Create RTDB user entry
      await set(ref(rtdb, `users/${user.uid}`), {
        email: user.email,
        firstName,
        lastName,
        displayName,
        provider: 'google',
        createdAt: timestamp,
        lastLogin: timestamp,
      });

      // Create public profile
      await setDoc(
        doc(db, 'profiles', user.uid),
        {
          displayName,
          photoURL: user.photoURL || '',
          username: null, // User can set later
          bio: '',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );

      // Create Stripe customer (non-blocking)
      try {
        await fetch('/api/payments/create-customer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uid: user.uid, email: user.email, name: displayName }),
        });
      } catch (e) {
        console.warn('Stripe customer creation skipped:', e);
      }
    } else {
      // Existing user: update last login
      await updateDoc(doc(db, 'customers', user.uid), {
        lastLogin: timestamp,
        lastUpdated: timestamp,
      });

      // Update RTDB last login (best effort)
      try {
        await update(ref(rtdb, `users/${user.uid}`), { lastLogin: timestamp });
      } catch (_) {}
    }

    return { user, userData, isNewUser };
  } catch (error) {
    // Handle specific Google sign-in errors
    if (error.code === 'auth/popup-closed-by-user') {
      throw new Error('Sign-in cancelled. Please try again.');
    }
    if (error.code === 'auth/account-exists-with-different-credential') {
      throw new Error(
        'An account already exists with this email. Please sign in with your original method.',
      );
    }
    const errorMessage = handleAuthError(error);
    throw new Error(errorMessage);
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
