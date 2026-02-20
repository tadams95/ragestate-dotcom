/**
 * Chat Service - Firestore operations for chat functionality
 * Matches mobile app implementation for cross-platform compatibility
 */

import {
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  orderBy,
  limit,
  startAfter,
  onSnapshot,
  serverTimestamp,
  arrayUnion,
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../firebase/firebase';

const CHATS_COLLECTION = 'chats';
const MESSAGES_COLLECTION = 'messages';
const CHAT_SUMMARIES = 'chatSummaries';
const PAGE_SIZE = 50;

// ============================================
// HELPER: Deterministic DM Chat ID
// CRITICAL: Must match mobile implementation exactly
// ============================================

/**
 * Generate deterministic chat ID for DMs
 * Eliminates expensive queries to find existing chats
 * @param {string} userId1
 * @param {string} userId2
 * @returns {string}
 */
export function getDmChatId(userId1, userId2) {
  return `dm_${[userId1, userId2].sort().join('_')}`;
}

// ============================================
// HELPER: User Info (multi-collection pattern)
// ============================================

/**
 * Fetch user display info from customers + profiles collections
 * @param {string} userId
 * @returns {Promise<import('../types/chat').UserInfo>}
 */
export async function getUserDisplayInfo(userId) {
  const [customerDoc, profileDoc] = await Promise.all([
    getDoc(doc(db, 'customers', userId)),
    getDoc(doc(db, 'profiles', userId)),
  ]);

  const customer = customerDoc.exists() ? customerDoc.data() : {};
  const profile = profileDoc.exists() ? profileDoc.data() : {};

  return {
    userId,
    displayName:
      profile.displayName ||
      customer.displayName ||
      `${customer.firstName || ''} ${customer.lastName || ''}`.trim() ||
      'Anonymous',
    photoURL: profile.photoURL || profile.profilePicture || customer.profilePicture || null,
    username: profile.usernameLower || customer.username || null,
  };
}

// ============================================
// DM CHAT OPERATIONS
// ============================================

/**
 * Get or create a DM chat between two users
 * @param {string} currentUserId
 * @param {string} peerId
 * @returns {Promise<string>} Chat ID
 */
export async function getOrCreateDmChat(currentUserId, peerId) {
  const chatId = getDmChatId(currentUserId, peerId);
  const chatRef = doc(db, CHATS_COLLECTION, chatId);
  const chatDoc = await getDoc(chatRef);

  if (chatDoc.exists()) {
    return chatId;
  }

  // Create chat document - Cloud Function creates summaries for both users
  await setDoc(chatRef, {
    type: 'dm',
    members: [currentUserId, peerId].sort(),
    memberCount: 2,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    isActive: true,
    lastMessage: null,
  });

  return chatId;
}

// ============================================
// MEDIA UPLOAD (Web-specific)
// ============================================

/**
 * Extract file extension from a File object
 * @param {File} file
 * @returns {string}
 */
function getFileExtension(file) {
  if (file.name) {
    const parts = file.name.split('.');
    if (parts.length > 1) return parts.pop().toLowerCase();
  }
  const mimeMap = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/heic': 'heic',
  };
  return mimeMap[file.type] || 'jpg';
}

/**
 * Upload chat media (image) to Firebase Storage
 * Web version accepts File object
 * @param {string} chatId
 * @param {File} file
 * @param {(progress: number) => void} [onProgress]
 * @returns {Promise<string>} Download URL
 */
export async function uploadChatMedia(chatId, file, onProgress) {
  const ext = getFileExtension(file);
  const filename = `${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
  const storagePath = `chat-media/${chatId}/${filename}`;
  const storageRef = ref(storage, storagePath);

  return new Promise((resolve, reject) => {
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        onProgress?.(progress);
      },
      (error) => {
        console.error('Upload error:', error);
        reject(error);
      },
      async () => {
        try {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(downloadUrl);
        } catch (error) {
          reject(error);
        }
      },
    );
  });
}

// ============================================
// MESSAGE OPERATIONS
// ============================================

/**
 * Send a message to a chat
 * @param {string} chatId
 * @param {string} senderId
 * @param {string} senderName
 * @param {string|null} senderPhoto
 * @param {string|null} text
 * @param {string} [mediaUrl]
 * @param {'image'|'video'} [mediaType]
 * @returns {Promise<string>} Message ID
 */
export async function sendMessage(
  chatId,
  senderId,
  senderName,
  senderPhoto,
  text,
  mediaUrl,
  mediaType,
) {
  const messagesRef = collection(db, CHATS_COLLECTION, chatId, MESSAGES_COLLECTION);

  const messageData = {
    senderId,
    senderName,
    senderPhoto,
    text: text || null,
    createdAt: serverTimestamp(),
    readBy: [senderId],
  };

  if (mediaUrl) {
    messageData.mediaUrl = mediaUrl;
    messageData.mediaType = mediaType || 'image';
  }

  const messageRef = await addDoc(messagesRef, messageData);
  return messageRef.id;
}

// ============================================
// REAL-TIME SUBSCRIPTIONS
// ============================================

/**
 * Soft-delete a message for the current user
 * @param {string} chatId
 * @param {string} messageId
 * @param {string} userId
 * @returns {Promise<void>}
 */
export async function deleteMessageForMe(chatId, messageId, userId) {
  const messageRef = doc(db, CHATS_COLLECTION, chatId, MESSAGES_COLLECTION, messageId);
  await updateDoc(messageRef, { deletedFor: arrayUnion(userId) });
}

/**
 * Subscribe to messages in a chat (real-time)
 * @param {string} chatId
 * @param {(messages: import('../types/chat').Message[], lastDoc: any) => void} onUpdate
 * @param {(error: Error) => void} onError
 * @param {number} [limitCount]
 * @param {string|null} [currentUserId]
 * @returns {() => void} Unsubscribe function
 */
export function subscribeToMessages(chatId, onUpdate, onError, limitCount = PAGE_SIZE, currentUserId = null) {
  const messagesRef = collection(db, CHATS_COLLECTION, chatId, MESSAGES_COLLECTION);
  const q = query(messagesRef, orderBy('createdAt', 'desc'), limit(limitCount));

  return onSnapshot(
    q,
    (snapshot) => {
      const messages = snapshot.docs
        .map((docSnap) => ({
          id: docSnap.id,
          chatId,
          senderId: docSnap.data().senderId,
          senderName: docSnap.data().senderName,
          senderPhoto: docSnap.data().senderPhoto,
          text: docSnap.data().text,
          mediaUrl: docSnap.data().mediaUrl,
          mediaType: docSnap.data().mediaType,
          createdAt: docSnap.data().createdAt?.toDate() || new Date(),
          deletedFor: docSnap.data().deletedFor || [],
          status: 'sent',
        }))
        .filter((msg) => !currentUserId || !msg.deletedFor.includes(currentUserId));

      const lastDoc = snapshot.docs[snapshot.docs.length - 1] || null;
      // Reverse to show oldest first (for chat display)
      onUpdate(messages.reverse(), lastDoc);
    },
    (error) => {
      console.error('Error subscribing to messages:', error);
      onError(error);
    },
  );
}

/**
 * Fetch older messages for pagination
 * @param {string} chatId
 * @param {any} lastDoc - Last document snapshot
 * @param {number} [limitCount]
 * @param {string|null} [currentUserId]
 * @returns {Promise<{messages: import('../types/chat').Message[], lastDoc: any}>}
 */
export async function fetchOlderMessages(chatId, lastDoc, limitCount = PAGE_SIZE, currentUserId = null) {
  const messagesRef = collection(db, CHATS_COLLECTION, chatId, MESSAGES_COLLECTION);
  const q = query(messagesRef, orderBy('createdAt', 'desc'), startAfter(lastDoc), limit(limitCount));

  const snapshot = await getDocs(q);
  const messages = snapshot.docs
    .map((docSnap) => ({
      id: docSnap.id,
      chatId,
      senderId: docSnap.data().senderId,
      senderName: docSnap.data().senderName,
      senderPhoto: docSnap.data().senderPhoto,
      text: docSnap.data().text,
      mediaUrl: docSnap.data().mediaUrl,
      mediaType: docSnap.data().mediaType,
      createdAt: docSnap.data().createdAt?.toDate() || new Date(),
      deletedFor: docSnap.data().deletedFor || [],
      status: 'sent',
    }))
    .filter((msg) => !currentUserId || !msg.deletedFor.includes(currentUserId));

  const newLastDoc = snapshot.docs[snapshot.docs.length - 1] || null;
  return { messages: messages.reverse(), lastDoc: newLastDoc };
}

/**
 * Subscribe to user's chat list (real-time)
 * @param {string} userId
 * @param {(chats: import('../types/chat').ChatSummary[]) => void} onUpdate
 * @param {(error: Error) => void} onError
 * @returns {() => void} Unsubscribe function
 */
export function subscribeToChatList(userId, onUpdate, onError) {
  const summariesRef = collection(db, `users/${userId}/${CHAT_SUMMARIES}`);
  const q = query(summariesRef, orderBy('updatedAt', 'desc'), limit(PAGE_SIZE));

  return onSnapshot(
    q,
    (snapshot) => {
      const chats = snapshot.docs.map((docSnap) => ({
        chatId: docSnap.id,
        type: docSnap.data().type,
        peerId: docSnap.data().peerId,
        peerName: docSnap.data().peerName,
        peerPhoto: docSnap.data().peerPhoto,
        eventId: docSnap.data().eventId,
        eventName: docSnap.data().eventName,
        lastMessage: docSnap.data().lastMessage
          ? {
              ...docSnap.data().lastMessage,
              createdAt: docSnap.data().lastMessage.createdAt?.toDate() || new Date(),
            }
          : null,
        unreadCount: docSnap.data().unreadCount || 0,
        muted: docSnap.data().muted || false,
        updatedAt: docSnap.data().updatedAt?.toDate() || new Date(),
      }));

      onUpdate(chats);
    },
    (error) => {
      console.error('Error subscribing to chat list:', error);
      onError(error);
    },
  );
}

/**
 * Mark a chat as read (clear unread count)
 * @param {string} userId
 * @param {string} chatId
 * @returns {Promise<void>}
 */
export async function markChatAsRead(userId, chatId) {
  const summaryRef = doc(db, `users/${userId}/${CHAT_SUMMARIES}/${chatId}`);
  await setDoc(summaryRef, { unreadCount: 0 }, { merge: true });
}

/**
 * Toggle mute status for a chat
 * @param {string} userId
 * @param {string} chatId
 * @param {boolean} muted
 * @returns {Promise<void>}
 */
export async function toggleMuteChat(userId, chatId, muted) {
  const summaryRef = doc(db, `users/${userId}/${CHAT_SUMMARIES}/${chatId}`);
  await updateDoc(summaryRef, { muted });
}

/**
 * Subscribe to total unread count across all chats
 * @param {string} userId
 * @param {(count: number) => void} onUpdate
 * @param {(error: Error) => void} onError
 * @returns {() => void} Unsubscribe function
 */
export function subscribeToTotalUnread(userId, onUpdate, onError) {
  const summariesRef = collection(db, `users/${userId}/${CHAT_SUMMARIES}`);

  return onSnapshot(
    summariesRef,
    (snapshot) => {
      const totalUnread = snapshot.docs.reduce((sum, docSnap) => {
        const data = docSnap.data();
        if (data.muted) return sum;
        return sum + (data.unreadCount || 0);
      }, 0);
      onUpdate(totalUnread);
    },
    (error) => {
      console.error('Error subscribing to unread count:', error);
      onError(error);
    },
  );
}
