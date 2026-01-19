/**
 * useChatUnreadCount Hook
 * Subscribes to total unread message count across all chats
 * Updates Redux store for global access
 */

import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useAuth } from '../../firebase/context/FirebaseContext';
import { useAppDispatch } from '../hooks';
import { selectUnreadCount, setUnreadCount } from '../features/chatSlice';
import { subscribeToTotalUnread } from '../firebase/chatService';

/**
 * Hook for getting and subscribing to total chat unread count
 * @returns {number} Total unread message count
 */
export function useChatUnreadCount() {
  const { currentUser } = useAuth();
  const dispatch = useAppDispatch();
  const unreadCount = useSelector(selectUnreadCount);

  useEffect(() => {
    if (!currentUser?.uid) {
      dispatch(setUnreadCount(0));
      return;
    }

    const unsubscribe = subscribeToTotalUnread(
      currentUser.uid,
      (count) => {
        dispatch(setUnreadCount(count));
      },
      (err) => {
        console.error('Failed to subscribe to chat unread count:', err);
      }
    );

    return () => unsubscribe();
  }, [currentUser?.uid, dispatch]);

  return unreadCount;
}
