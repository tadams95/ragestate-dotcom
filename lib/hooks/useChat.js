/**
 * useChat Hook - Manages a single chat room
 * Handles real-time messages, pagination, and sending
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../firebase/context/FirebaseContext';
import {
  subscribeToMessages,
  sendMessage as sendMessageService,
  fetchOlderMessages,
  markChatAsRead,
  uploadChatMedia,
} from '../firebase/chatService';

const PAGE_SIZE = 50;

/**
 * @typedef {import('../types/chat').Message} Message
 */

/**
 * @typedef {Object} UseChatResult
 * @property {Message[]} messages - Chat messages (oldest first)
 * @property {boolean} isLoading - Initial load in progress
 * @property {boolean} isLoadingMore - Pagination load in progress
 * @property {boolean} hasMore - More messages available
 * @property {Error|null} error - Error state
 * @property {boolean} isSending - Message send in progress
 * @property {(text: string, mediaFile?: File) => Promise<void>} sendMessage - Send a message
 * @property {() => Promise<void>} loadMore - Load older messages
 */

/**
 * Hook for managing a single chat room
 * @param {string} chatId - The chat ID to subscribe to
 * @returns {UseChatResult}
 */
export function useChat(chatId) {
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const lastDocRef = useRef(null);

  // Subscribe to messages
  useEffect(() => {
    if (!chatId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setHasMore(true);
    lastDocRef.current = null;

    const unsubscribe = subscribeToMessages(
      chatId,
      (newMessages, lastDoc) => {
        setMessages(newMessages);
        lastDocRef.current = lastDoc;
        setIsLoading(false);
        setError(null);
      },
      (err) => {
        setError(err);
        setIsLoading(false);
      },
    );

    return () => unsubscribe();
  }, [chatId]);

  // Mark as read when viewing
  useEffect(() => {
    if (chatId && currentUser?.uid) {
      markChatAsRead(currentUser.uid, chatId).catch((err) => {
        console.error('Failed to mark chat as read:', err);
      });
    }
  }, [chatId, currentUser?.uid]);

  // Load older messages (pagination)
  const loadMore = useCallback(async () => {
    if (!hasMore || isLoadingMore || !lastDocRef.current || !chatId) return;

    setIsLoadingMore(true);

    try {
      const { messages: olderMessages, lastDoc } = await fetchOlderMessages(
        chatId,
        lastDocRef.current,
        PAGE_SIZE,
      );

      if (olderMessages.length < PAGE_SIZE) {
        setHasMore(false);
      }

      lastDocRef.current = lastDoc;
      // Prepend older messages
      setMessages((prev) => [...olderMessages, ...prev]);
    } catch (err) {
      setError(err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [chatId, hasMore, isLoadingMore]);

  // Send message (supports text and/or image)
  const sendMessage = useCallback(
    async (text, mediaFile) => {
      if (!currentUser?.uid || !chatId || (!text?.trim() && !mediaFile)) return;

      setIsSending(true);

      // Create optimistic message for immediate UI feedback
      const optimisticMessage = {
        id: `temp-${Date.now()}`,
        chatId,
        senderId: currentUser.uid,
        senderName: currentUser.displayName || 'You',
        senderPhoto: currentUser.photoURL || null,
        text: text?.trim() || null,
        mediaUrl: mediaFile ? URL.createObjectURL(mediaFile) : undefined,
        mediaType: mediaFile ? 'image' : undefined,
        createdAt: new Date(),
        status: 'sending',
      };

      setMessages((prev) => [...prev, optimisticMessage]);

      try {
        // Upload media if provided
        let uploadedMediaUrl;
        if (mediaFile) {
          uploadedMediaUrl = await uploadChatMedia(chatId, mediaFile);
        }

        // Send message
        await sendMessageService(
          chatId,
          currentUser.uid,
          currentUser.displayName || 'Anonymous',
          currentUser.photoURL || null,
          text?.trim() || null,
          uploadedMediaUrl,
          uploadedMediaUrl ? 'image' : undefined,
        );

        // Real-time listener will update with the actual message
      } catch (err) {
        // Remove optimistic message on error
        setMessages((prev) => prev.filter((m) => m.id !== optimisticMessage.id));
        setError(err);
        console.error('Failed to send message:', err);
      } finally {
        setIsSending(false);
        // Clean up blob URL
        if (optimisticMessage.mediaUrl?.startsWith('blob:')) {
          URL.revokeObjectURL(optimisticMessage.mediaUrl);
        }
      }
    },
    [chatId, currentUser],
  );

  return {
    messages,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    isSending,
    sendMessage,
    loadMore,
  };
}
