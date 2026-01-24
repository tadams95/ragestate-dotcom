/**
 * Cached Services
 * Wrappers around Firestore services with LRU caching
 *
 * These functions provide cached versions of frequently-read data
 * to reduce Firestore reads and improve performance.
 *
 * Cache invalidation:
 * - Caches auto-expire based on TTL (5 minutes default)
 * - Call invalidate functions after writes to ensure freshness
 */

import { profileCache, userCache, eventCache, cacheKey } from '../utils/cache';
import { getProfile, getCustomer, getUserDisplayInfo } from './userService';
import { getEvent } from './eventService';

// ============================================
// CACHED PROFILE OPERATIONS
// ============================================

/**
 * Get profile with caching (5 minute TTL)
 * @param {import('../types/common').UserId} userId
 * @returns {Promise<import('../types/user').Profile | null>}
 */
export async function getCachedProfile(userId) {
  if (!userId) return null;

  const key = cacheKey('profile', userId);
  const cached = profileCache.get(key);

  if (cached !== undefined) {
    return cached;
  }

  const profile = await getProfile(userId);

  // Cache even null results to avoid repeated lookups for non-existent profiles
  profileCache.set(key, profile);

  return profile;
}

/**
 * Invalidate cached profile after updates
 * @param {import('../types/common').UserId} userId
 */
export function invalidateProfileCache(userId) {
  if (!userId) return;
  profileCache.invalidate(cacheKey('profile', userId));
  // Also invalidate user display info since it includes profile data
  userCache.invalidate(cacheKey('userInfo', userId));
}

// ============================================
// CACHED USER OPERATIONS
// ============================================

/**
 * Get customer with caching (5 minute TTL)
 * @param {import('../types/common').UserId} userId
 * @returns {Promise<import('../types/user').Customer | null>}
 */
export async function getCachedCustomer(userId) {
  if (!userId) return null;

  const key = cacheKey('customer', userId);
  const cached = userCache.get(key);

  if (cached !== undefined) {
    return cached;
  }

  const customer = await getCustomer(userId);
  userCache.set(key, customer);

  return customer;
}

/**
 * Get user display info with caching (5 minute TTL)
 * Combines profile + customer data for display
 * @param {import('../types/common').UserId} userId
 * @returns {Promise<import('../types/user').UserInfo>}
 */
export async function getCachedUserDisplayInfo(userId) {
  if (!userId) {
    return {
      userId: '',
      displayName: 'Anonymous',
      photoURL: null,
      username: null,
    };
  }

  const key = cacheKey('userInfo', userId);
  const cached = userCache.get(key);

  if (cached !== undefined) {
    return cached;
  }

  const userInfo = await getUserDisplayInfo(userId);
  userCache.set(key, userInfo);

  return userInfo;
}

/**
 * Invalidate cached user/customer data after updates
 * @param {import('../types/common').UserId} userId
 */
export function invalidateUserCache(userId) {
  if (!userId) return;
  userCache.invalidate(cacheKey('customer', userId));
  userCache.invalidate(cacheKey('userInfo', userId));
}

// ============================================
// CACHED EVENT OPERATIONS
// ============================================

/**
 * Get event with caching (10 minute TTL)
 * Events change less frequently, so longer TTL is acceptable
 * @param {string} eventId
 * @returns {Promise<import('../types/event').Event | null>}
 */
export async function getCachedEvent(eventId) {
  if (!eventId) return null;

  const key = cacheKey('event', eventId);
  const cached = eventCache.get(key);

  if (cached !== undefined) {
    return cached;
  }

  const event = await getEvent(eventId);
  eventCache.set(key, event);

  return event;
}

/**
 * Invalidate cached event after updates
 * @param {string} eventId
 */
export function invalidateEventCache(eventId) {
  if (!eventId) return;
  eventCache.invalidate(cacheKey('event', eventId));
}

// ============================================
// BATCH PREFETCHING
// ============================================

/**
 * Prefetch multiple profiles into cache
 * Useful for preparing data before rendering lists
 * @param {import('../types/common').UserId[]} userIds
 * @returns {Promise<Map<string, import('../types/user').Profile | null>>}
 */
export async function prefetchProfiles(userIds) {
  if (!Array.isArray(userIds) || userIds.length === 0) {
    return new Map();
  }

  // Filter out already cached
  const uncached = userIds.filter((id) => !profileCache.has(cacheKey('profile', id)));

  // Fetch uncached in parallel
  const results = await Promise.all(
    uncached.map(async (id) => {
      const profile = await getCachedProfile(id);
      return [id, profile];
    })
  );

  // Build result map including cached entries
  const resultMap = new Map(results);

  for (const id of userIds) {
    if (!resultMap.has(id)) {
      resultMap.set(id, profileCache.get(cacheKey('profile', id)));
    }
  }

  return resultMap;
}

/**
 * Prefetch multiple user display infos into cache
 * @param {import('../types/common').UserId[]} userIds
 * @returns {Promise<Map<string, import('../types/user').UserInfo>>}
 */
export async function prefetchUserDisplayInfos(userIds) {
  if (!Array.isArray(userIds) || userIds.length === 0) {
    return new Map();
  }

  // Filter out already cached
  const uncached = userIds.filter((id) => !userCache.has(cacheKey('userInfo', id)));

  // Fetch uncached in parallel
  const results = await Promise.all(
    uncached.map(async (id) => {
      const info = await getCachedUserDisplayInfo(id);
      return [id, info];
    })
  );

  // Build result map including cached entries
  const resultMap = new Map(results);

  for (const id of userIds) {
    if (!resultMap.has(id)) {
      resultMap.set(id, userCache.get(cacheKey('userInfo', id)));
    }
  }

  return resultMap;
}

// ============================================
// CACHE MANAGEMENT
// ============================================

/**
 * Clear all service caches
 * Use sparingly - mainly for testing or logout
 */
export function clearAllCaches() {
  profileCache.clear();
  userCache.clear();
  eventCache.clear();
}

/**
 * Get cache statistics for monitoring
 * @returns {{ profile: Object, user: Object, event: Object }}
 */
export function getCacheStats() {
  return {
    profile: profileCache.getStats(),
    user: userCache.getStats(),
    event: eventCache.getStats(),
  };
}

/**
 * Run garbage collection on all caches
 * Removes expired entries to free memory
 * @returns {{ profile: number, user: number, event: number }}
 */
export function cleanupCaches() {
  return {
    profile: profileCache.cleanup(),
    user: userCache.cleanup(),
    event: eventCache.cleanup(),
  };
}
