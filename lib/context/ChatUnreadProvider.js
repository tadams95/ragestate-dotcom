'use client';

/**
 * ChatUnreadProvider
 * Global provider that subscribes to chat unread count when user is authenticated.
 * Place this component high in the component tree (e.g., in layout.js) to ensure
 * the subscription is always active.
 */

import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useAuth } from '../../firebase/context/FirebaseContext';
import { setUnreadCount, clearUnread } from '../features/chatSlice';
import { subscribeToTotalUnread } from '../firebase/chatService';

/**
 * Provider component that manages global chat unread count subscription
 * @param {{ children: React.ReactNode }} props
 */
export function ChatUnreadProvider({ children }) {
  const { currentUser, loading } = useAuth();
  const dispatch = useDispatch();

  useEffect(() => {
    // Don't subscribe while auth is loading
    if (loading) return;

    // Clear unread count when user logs out
    if (!currentUser?.uid) {
      dispatch(clearUnread());
      return;
    }

    // Subscribe to unread count changes
    const unsubscribe = subscribeToTotalUnread(
      currentUser.uid,
      (count) => {
        dispatch(setUnreadCount(count));
      },
      (error) => {
        console.error('[ChatUnreadProvider] Failed to subscribe to unread count:', error);
      }
    );

    // Cleanup subscription on logout or unmount
    return () => {
      unsubscribe();
    };
  }, [currentUser?.uid, loading, dispatch]);

  return children;
}
