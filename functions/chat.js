/* eslint-disable */
'use strict';

/**
 * Chat Cloud Functions
 * - onChatCreated: Creates chatSummaries for both DM members
 * - onMessageCreated: Updates lastMessage and unreadCount in chatSummaries
 */

const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const logger = require('firebase-functions/logger');
const { admin, db } = require('./admin');
const { checkContent } = require('./moderation');

/**
 * Helper: Get user display info from profiles + customers collections
 * @param {string} userId
 * @returns {Promise<{displayName: string, photoURL: string|null}>}
 */
async function getUserDisplayInfo(userId) {
  try {
    const [profileSnap, customerSnap] = await Promise.all([
      db.collection('profiles').doc(userId).get(),
      db.collection('customers').doc(userId).get(),
    ]);

    const profile = profileSnap.exists ? profileSnap.data() : {};
    const customer = customerSnap.exists ? customerSnap.data() : {};

    const displayName =
      profile.displayName ||
      customer.displayName ||
      `${customer.firstName || ''} ${customer.lastName || ''}`.trim() ||
      'Anonymous';

    const photoURL =
      profile.photoURL || profile.profilePicture || customer.profilePicture || null;

    return { displayName, photoURL };
  } catch (err) {
    logger.warn('getUserDisplayInfo failed', { userId, err: err.message });
    return { displayName: 'Anonymous', photoURL: null };
  }
}

/**
 * Trigger: When a chat document is created
 * Creates chatSummaries for both members (DM chats)
 */
exports.onChatCreated = onDocumentCreated('chats/{chatId}', async (event) => {
  const chatId = event.params.chatId;
  const chatData = event.data?.data();

  if (!chatData) {
    logger.warn('onChatCreated: No chat data', { chatId });
    return null;
  }

  const { type, members } = chatData;

  // Only handle DM chats for now
  if (type !== 'dm' || !Array.isArray(members) || members.length !== 2) {
    logger.info('onChatCreated: Skipping non-DM or invalid chat', { chatId, type });
    return null;
  }

  const [userId1, userId2] = members;

  try {
    // Fetch display info for both users in parallel
    const [user1Info, user2Info] = await Promise.all([
      getUserDisplayInfo(userId1),
      getUserDisplayInfo(userId2),
    ]);

    const now = admin.firestore.FieldValue.serverTimestamp();

    // Create chat summary for user1 (peer is user2)
    const summary1 = {
      type: 'dm',
      peerId: userId2,
      peerName: user2Info.displayName,
      peerPhoto: user2Info.photoURL,
      lastMessage: null,
      unreadCount: 0,
      muted: false,
      updatedAt: now,
    };

    // Create chat summary for user2 (peer is user1)
    const summary2 = {
      type: 'dm',
      peerId: userId1,
      peerName: user1Info.displayName,
      peerPhoto: user1Info.photoURL,
      lastMessage: null,
      unreadCount: 0,
      muted: false,
      updatedAt: now,
    };

    // Write both summaries in a batch
    const batch = db.batch();
    batch.set(db.doc(`users/${userId1}/chatSummaries/${chatId}`), summary1);
    batch.set(db.doc(`users/${userId2}/chatSummaries/${chatId}`), summary2);
    await batch.commit();

    logger.info('onChatCreated: Created chat summaries', { chatId, userId1, userId2 });
    return null;
  } catch (err) {
    logger.error('onChatCreated: Failed to create summaries', { chatId, err: err.message });
    return null;
  }
});

/**
 * Trigger: When a message is created in a chat
 * Updates lastMessage and increments unreadCount for the recipient
 * Also runs content moderation and flags violating messages
 */
exports.onMessageCreated = onDocumentCreated(
  'chats/{chatId}/messages/{messageId}',
  async (event) => {
    const { chatId, messageId } = event.params;
    const messageData = event.data?.data();

    if (!messageData) {
      logger.warn('onMessageCreated: No message data', { chatId, messageId });
      return null;
    }

    const { senderId, senderName, text, mediaUrl, mediaType, createdAt } = messageData;

    if (!senderId) {
      logger.warn('onMessageCreated: No senderId', { chatId, messageId });
      return null;
    }

    try {
      // Run content moderation on text messages
      let moderationResult = { allowed: true, reasons: [] };
      if (text && typeof text === 'string') {
        moderationResult = checkContent(text);

        if (!moderationResult.allowed) {
          // Flag the message for review (don't delete, allow human review)
          await db.collection('chats').doc(chatId).collection('messages').doc(messageId).update({
            flagged: true,
            flagReasons: moderationResult.reasons,
            flaggedAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          logger.warn('onMessageCreated: Message flagged for moderation', {
            chatId,
            messageId,
            senderId,
            reasons: moderationResult.reasons,
          });
        }
      }

      // Get chat to find all members
      const chatSnap = await db.collection('chats').doc(chatId).get();
      if (!chatSnap.exists) {
        logger.warn('onMessageCreated: Chat not found', { chatId });
        return null;
      }

      const { members, type } = chatSnap.data();
      if (!Array.isArray(members)) {
        logger.warn('onMessageCreated: Invalid members', { chatId });
        return null;
      }

      const now = admin.firestore.FieldValue.serverTimestamp();

      // Prepare lastMessage object
      const lastMessage = {
        text: text || (mediaUrl ? (mediaType === 'video' ? 'Sent a video' : 'Sent an image') : ''),
        senderId,
        senderName: senderName || 'Unknown',
        createdAt: createdAt || now,
        type: mediaUrl ? 'media' : 'text',
      };

      // Update chat document with lastMessage
      await db.collection('chats').doc(chatId).update({
        lastMessage,
        updatedAt: now,
      });

      // Update chat summaries for all members
      const batch = db.batch();

      for (const memberId of members) {
        const summaryRef = db.doc(`users/${memberId}/chatSummaries/${chatId}`);
        const summarySnap = await summaryRef.get();

        if (!summarySnap.exists) {
          // Summary doesn't exist yet (edge case) - skip
          logger.warn('onMessageCreated: Summary not found for member', { chatId, memberId });
          continue;
        }

        const updateData = {
          lastMessage,
          updatedAt: now,
        };

        // Increment unread count only for recipients (not the sender)
        if (memberId !== senderId) {
          const currentUnread = summarySnap.data().unreadCount || 0;
          updateData.unreadCount = currentUnread + 1;
        }

        batch.update(summaryRef, updateData);
      }

      await batch.commit();

      logger.info('onMessageCreated: Updated summaries', {
        chatId,
        messageId,
        memberCount: members.length,
        flagged: !moderationResult.allowed,
      });
      return null;
    } catch (err) {
      logger.error('onMessageCreated: Failed', { chatId, messageId, err: err.message });
      return null;
    }
  },
);
