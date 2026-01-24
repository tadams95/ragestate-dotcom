'use client';

import { browserLocalPersistence, onAuthStateChanged, setPersistence } from 'firebase/auth';
import { getDownloadURL, getStorage, ref as storageRef, uploadBytes } from 'firebase/storage';
import { createContext, useContext, useEffect, useState } from 'react';
import { auth } from '../firebase';

// Create context
const FirebaseContext = createContext();

/**
 * Firebase Provider - Provides authentication state and utility functions
 *
 * NOTE: Data fetching operations have been moved to dedicated service files:
 * - Admin operations: lib/firebase/adminService.js (checkIsAdmin, getAllUsers, getUserCount)
 * - Purchase operations: lib/firebase/purchaseService.js (getAllPurchases, getUserPurchases, getPurchaseDetails, savePurchase)
 * - Event operations: lib/firebase/eventService.js (getEvents, getUpcomingEvents, getUserTickets)
 * - Post operations: lib/firebase/postService.js (getPublicPosts, createPost, likePost, etc.)
 * - Follow operations: lib/firebase/followService.js (follow, unfollow, isFollowing)
 * - User operations: lib/firebase/userService.js (getProfile, updateProfile)
 * - Cached operations: lib/firebase/cachedServices.js (getCachedProfile, getCachedCustomer)
 */
export function FirebaseProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Set persistence to LOCAL when the component mounts
  useEffect(() => {
    setPersistence(auth, browserLocalPersistence).catch((error) => {
      console.error('Error setting auth persistence:', error);
    });
  }, []);

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (authUser) => {
        setUser(authUser);
        setLoading(false);
      },
      (error) => {
        console.error('Auth state error:', error);
        setError(error.message);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  // Value to be provided by the context
  const value = {
    user,
    loading,
    error,
    /**
     * Upload a file to Firebase Storage and get its download URL
     * Used by admin event creation to upload event images
     * @param {File} file - The file to upload
     * @param {string} path - The storage path (e.g., 'events/my-event.jpg')
     * @returns {Promise<string>} The public download URL
     */
    uploadFileAndGetURL: async (file, path) => {
      if (!file) throw new Error('No file provided');
      if (!path || typeof path !== 'string') throw new Error('Invalid storage path');
      try {
        const storage = getStorage();
        const fileRef = storageRef(storage, path);
        await uploadBytes(fileRef, file);
        return await getDownloadURL(fileRef);
      } catch (err) {
        console.error('uploadFileAndGetURL error:', err);
        throw err;
      }
    },
  };

  return <FirebaseContext.Provider value={value}>{children}</FirebaseContext.Provider>;
}

/**
 * Hook to access the Firebase context
 * Provides: user, loading, error, uploadFileAndGetURL
 * @returns {Object} Firebase context value
 */
export function useFirebase() {
  return useContext(FirebaseContext);
}

/**
 * Hook to access authentication state
 * @returns {{ currentUser: Object|null, loading: boolean }}
 */
export function useAuth() {
  const context = useContext(FirebaseContext);
  if (!context) {
    throw new Error('useAuth must be used within a FirebaseProvider');
  }
  return {
    currentUser: context.user,
    loading: context.loading,
  };
}
