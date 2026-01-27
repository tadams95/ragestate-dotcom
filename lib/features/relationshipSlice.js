/**
 * Relationship Slice - Redux state for blocks and mutes
 */

import { createSlice } from '@reduxjs/toolkit';

/**
 * @typedef {Object} RelationshipState
 * @property {string[]} blockedUserIds - IDs of users the current user has blocked
 * @property {string[]} mutedUserIds - IDs of users the current user has muted
 * @property {string[]} blockedByUserIds - IDs of users who have blocked the current user
 * @property {boolean} isLoading - Whether relationship data is being loaded
 * @property {number} lastFetchedAt - Timestamp of last fetch (for cache invalidation)
 */

/** @type {RelationshipState} */
const initialState = {
  blockedUserIds: [],
  mutedUserIds: [],
  blockedByUserIds: [],
  isLoading: false,
  lastFetchedAt: 0,
};

// Cache TTL in milliseconds (5 minutes)
const CACHE_TTL = 5 * 60 * 1000;

export const relationshipSlice = createSlice({
  name: 'relationship',
  initialState,
  reducers: {
    /**
     * Set loading state
     * @param {RelationshipState} state
     * @param {{ payload: boolean }} action
     */
    setLoading: (state, action) => {
      state.isLoading = action.payload;
    },

    /**
     * Set blocked user IDs
     * @param {RelationshipState} state
     * @param {{ payload: string[] }} action
     */
    setBlockedUserIds: (state, action) => {
      state.blockedUserIds = action.payload;
      state.lastFetchedAt = Date.now();
    },

    /**
     * Set muted user IDs
     * @param {RelationshipState} state
     * @param {{ payload: string[] }} action
     */
    setMutedUserIds: (state, action) => {
      state.mutedUserIds = action.payload;
      state.lastFetchedAt = Date.now();
    },

    /**
     * Set blocked by user IDs
     * @param {RelationshipState} state
     * @param {{ payload: string[] }} action
     */
    setBlockedByUserIds: (state, action) => {
      state.blockedByUserIds = action.payload;
      state.lastFetchedAt = Date.now();
    },

    /**
     * Set all relationship data at once
     * @param {RelationshipState} state
     * @param {{ payload: { blockedUserIds: string[], mutedUserIds: string[], blockedByUserIds: string[] } }} action
     */
    setAllRelationships: (state, action) => {
      state.blockedUserIds = action.payload.blockedUserIds || [];
      state.mutedUserIds = action.payload.mutedUserIds || [];
      state.blockedByUserIds = action.payload.blockedByUserIds || [];
      state.lastFetchedAt = Date.now();
      state.isLoading = false;
    },

    /**
     * Add a blocked user ID (optimistic update)
     * @param {RelationshipState} state
     * @param {{ payload: string }} action
     */
    addBlockedUserId: (state, action) => {
      if (!state.blockedUserIds.includes(action.payload)) {
        state.blockedUserIds.push(action.payload);
      }
    },

    /**
     * Remove a blocked user ID (optimistic update)
     * @param {RelationshipState} state
     * @param {{ payload: string }} action
     */
    removeBlockedUserId: (state, action) => {
      state.blockedUserIds = state.blockedUserIds.filter((id) => id !== action.payload);
    },

    /**
     * Add a muted user ID (optimistic update)
     * @param {RelationshipState} state
     * @param {{ payload: string }} action
     */
    addMutedUserId: (state, action) => {
      if (!state.mutedUserIds.includes(action.payload)) {
        state.mutedUserIds.push(action.payload);
      }
    },

    /**
     * Remove a muted user ID (optimistic update)
     * @param {RelationshipState} state
     * @param {{ payload: string }} action
     */
    removeMutedUserId: (state, action) => {
      state.mutedUserIds = state.mutedUserIds.filter((id) => id !== action.payload);
    },

    /**
     * Clear all relationship data (e.g., on logout)
     * @param {RelationshipState} state
     */
    clearRelationships: (state) => {
      state.blockedUserIds = [];
      state.mutedUserIds = [];
      state.blockedByUserIds = [];
      state.lastFetchedAt = 0;
      state.isLoading = false;
    },
  },
});

// Action exports
export const {
  setLoading,
  setBlockedUserIds,
  setMutedUserIds,
  setBlockedByUserIds,
  setAllRelationships,
  addBlockedUserId,
  removeBlockedUserId,
  addMutedUserId,
  removeMutedUserId,
  clearRelationships,
} = relationshipSlice.actions;

// Selector exports
export const selectBlockedUserIds = (state) => state.relationship.blockedUserIds;
export const selectMutedUserIds = (state) => state.relationship.mutedUserIds;
export const selectBlockedByUserIds = (state) => state.relationship.blockedByUserIds;
export const selectIsLoading = (state) => state.relationship.isLoading;
export const selectLastFetchedAt = (state) => state.relationship.lastFetchedAt;

/**
 * Select all excluded user IDs (blocked + blocked by + muted)
 * @param {Object} state
 * @returns {string[]}
 */
export const selectExcludedUserIds = (state) => {
  const { blockedUserIds, mutedUserIds, blockedByUserIds } = state.relationship;
  const allIds = new Set([...blockedUserIds, ...mutedUserIds, ...blockedByUserIds]);
  return Array.from(allIds);
};

/**
 * Check if a user is blocked
 * @param {string} userId
 * @returns {(state: Object) => boolean}
 */
export const selectIsUserBlocked = (userId) => (state) =>
  state.relationship.blockedUserIds.includes(userId);

/**
 * Check if a user is muted
 * @param {string} userId
 * @returns {(state: Object) => boolean}
 */
export const selectIsUserMuted = (userId) => (state) =>
  state.relationship.mutedUserIds.includes(userId);

/**
 * Check if cache is stale and needs refresh
 * @param {Object} state
 * @returns {boolean}
 */
export const selectIsCacheStale = (state) => {
  const { lastFetchedAt } = state.relationship;
  return Date.now() - lastFetchedAt > CACHE_TTL;
};

export default relationshipSlice.reducer;
