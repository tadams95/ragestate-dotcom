// chatSlice.js

import { createSlice } from '@reduxjs/toolkit';

/**
 * @typedef {Object} ChatState
 * @property {number} unreadCount - Total unread messages across all chats
 * @property {string|null} activeChatId - Currently open chat (for tracking)
 */

/** @type {ChatState} */
const initialState = {
  unreadCount: 0,
  activeChatId: null,
};

export const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    /**
     * Set the total unread count
     * @param {ChatState} state
     * @param {{ payload: number }} action
     */
    setUnreadCount: (state, action) => {
      state.unreadCount = action.payload;
    },

    /**
     * Increment unread count by a given amount
     * @param {ChatState} state
     * @param {{ payload: number }} action
     */
    incrementUnread: (state, action) => {
      state.unreadCount += action.payload || 1;
    },

    /**
     * Clear all unread counts (e.g., on logout)
     * @param {ChatState} state
     */
    clearUnread: (state) => {
      state.unreadCount = 0;
    },

    /**
     * Set the currently active chat
     * @param {ChatState} state
     * @param {{ payload: string | null }} action
     */
    setActiveChatId: (state, action) => {
      state.activeChatId = action.payload;
    },
  },
});

// Action exports
export const { setUnreadCount, incrementUnread, clearUnread, setActiveChatId } = chatSlice.actions;

// Selector exports
export const selectUnreadCount = (state) => state.chat.unreadCount;
export const selectActiveChatId = (state) => state.chat.activeChatId;

export default chatSlice.reducer;
