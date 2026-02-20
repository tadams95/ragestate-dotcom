// chatSlice.js

import { createSlice } from '@reduxjs/toolkit';

/**
 * @typedef {Object} ChatState
 * @property {number} unreadCount - Total unread messages across all chats
 */

/** @type {ChatState} */
const initialState = {
  unreadCount: 0,
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
     * Clear all unread counts (e.g., on logout)
     * @param {ChatState} state
     */
    clearUnread: (state) => {
      state.unreadCount = 0;
    },
  },
});

// Action exports
export const { setUnreadCount, clearUnread } = chatSlice.actions;

// Selector exports
export const selectUnreadCount = (state) => state.chat.unreadCount;

export default chatSlice.reducer;
