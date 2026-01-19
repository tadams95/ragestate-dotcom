/**
 * useChatList Hook - Manages the user's chat list
 * Subscribes to chat summaries and manages global unread count
 */

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../firebase/context/FirebaseContext';
import { useAppDispatch } from '../hooks';
import { setUnreadCount } from '../features/chatSlice';
import { subscribeToChatList } from '../firebase/chatService';

/**
 * @typedef {import('../types/chat').ChatSummary} ChatSummary
 */

/**
 * @typedef {Object} UseChatListResult
 * @property {ChatSummary[]} chats - List of chat summaries
 * @property {boolean} isLoading - Loading state
 * @property {Error|null} error - Error state
 * @property {number} totalUnread - Total unread count
 * @property {() => void} refetch - Trigger refetch
 */

/**
 * Hook for managing the chat list
 * @returns {UseChatListResult}
 */
export function useChatList() {
  const { currentUser } = useAuth();
  const dispatch = useAppDispatch();
  const [chats, setChats] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refetch = useCallback(() => {
    setIsLoading(true);
    setError(null);
    setRefreshKey((prev) => prev + 1);
  }, []);

  useEffect(() => {
    if (!currentUser?.uid) {
      setChats([]);
      setIsLoading(false);
      dispatch(setUnreadCount(0));
      return;
    }

    setIsLoading(true);

    const unsubscribe = subscribeToChatList(
      currentUser.uid,
      (newChats) => {
        setChats(newChats);
        setIsLoading(false);
        setError(null);

        // Update global unread count in Redux
        const total = newChats.reduce((sum, chat) => sum + chat.unreadCount, 0);
        dispatch(setUnreadCount(total));
      },
      (err) => {
        setError(err);
        setIsLoading(false);
      },
    );

    return () => unsubscribe();
  }, [currentUser?.uid, refreshKey, dispatch]);

  const totalUnread = chats.reduce((sum, chat) => sum + chat.unreadCount, 0);

  return { chats, isLoading, error, totalUnread, refetch };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get recent DM contacts from chat list
 * @param {ChatSummary[]} chats
 * @param {number} [maxCount=5]
 * @returns {ChatSummary[]}
 */
export function getRecentDmContacts(chats, maxCount = 5) {
  return chats
    .filter((chat) => chat.type === 'dm' && chat.peerId && chat.peerName)
    .slice(0, maxCount);
}

/**
 * Get set of existing DM peer IDs (to filter from new chat search)
 * @param {ChatSummary[]} chats
 * @returns {Set<string>}
 */
export function getExistingDmPeerIds(chats) {
  return new Set(
    chats.filter((chat) => chat.type === 'dm' && chat.peerId).map((chat) => chat.peerId),
  );
}
