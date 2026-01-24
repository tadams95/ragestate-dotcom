/**
 * LRU Cache with TTL Support
 * A generic least-recently-used cache with time-to-live expiration
 *
 * Features:
 * - LRU eviction when max size is reached
 * - TTL-based expiration for entries
 * - Optional callbacks for cache events
 * - Memory-efficient using Map (maintains insertion order)
 */

/**
 * @template T
 * @typedef {Object} CacheEntry
 * @property {T} value - Cached value
 * @property {number} expiresAt - Timestamp when entry expires
 */

/**
 * @template T
 */
export class LRUCache {
  /**
   * Create a new LRU cache
   * @param {Object} [options]
   * @param {number} [options.maxSize=100] - Maximum number of entries
   * @param {number} [options.ttlMs=300000] - Time-to-live in milliseconds (default 5 minutes)
   * @param {(key: string, value: T) => void} [options.onEvict] - Callback when entry is evicted
   */
  constructor(options = {}) {
    const { maxSize = 100, ttlMs = 5 * 60 * 1000, onEvict } = options;

    /** @type {Map<string, CacheEntry<T>>} */
    this.cache = new Map();

    /** @type {number} */
    this.maxSize = maxSize;

    /** @type {number} */
    this.ttlMs = ttlMs;

    /** @type {((key: string, value: T) => void) | undefined} */
    this.onEvict = onEvict;

    // Stats for monitoring
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
    };
  }

  /**
   * Get a value from the cache
   * Returns undefined if not found or expired
   * @param {string} key
   * @returns {T | undefined}
   */
  get(key) {
    const entry = this.cache.get(key);

    // Not found
    if (!entry) {
      this.stats.misses++;
      return undefined;
    }

    // Check expiration
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.stats.misses++;
      return undefined;
    }

    // Move to end (most recently used) by re-inserting
    this.cache.delete(key);
    this.cache.set(key, entry);

    this.stats.hits++;
    return entry.value;
  }

  /**
   * Set a value in the cache
   * @param {string} key
   * @param {T} value
   * @param {number} [customTtlMs] - Optional custom TTL for this entry
   */
  set(key, value, customTtlMs) {
    // If key exists, delete it first (to update position)
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    // Evict oldest entries if at max size
    while (this.cache.size >= this.maxSize) {
      this._evictOldest();
    }

    const ttl = customTtlMs !== undefined ? customTtlMs : this.ttlMs;

    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttl,
    });
  }

  /**
   * Check if a key exists and is not expired
   * @param {string} key
   * @returns {boolean}
   */
  has(key) {
    const entry = this.cache.get(key);
    if (!entry) return false;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Invalidate (remove) a specific key
   * @param {string} key
   * @returns {boolean} - True if key was found and removed
   */
  invalidate(key) {
    return this.cache.delete(key);
  }

  /**
   * Invalidate all keys matching a prefix
   * Useful for invalidating related entries (e.g., all user-related cache)
   * @param {string} prefix
   * @returns {number} - Number of entries removed
   */
  invalidatePrefix(prefix) {
    let count = 0;
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
        count++;
      }
    }
    return count;
  }

  /**
   * Clear all entries from the cache
   */
  clear() {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0, evictions: 0 };
  }

  /**
   * Get current cache size
   * @returns {number}
   */
  get size() {
    return this.cache.size;
  }

  /**
   * Get cache statistics
   * @returns {{ hits: number, misses: number, evictions: number, size: number, hitRate: number }}
   */
  getStats() {
    const total = this.stats.hits + this.stats.misses;
    return {
      ...this.stats,
      size: this.cache.size,
      hitRate: total > 0 ? this.stats.hits / total : 0,
    };
  }

  /**
   * Remove expired entries (garbage collection)
   * Call periodically if needed for memory cleanup
   * @returns {number} - Number of expired entries removed
   */
  cleanup() {
    const now = Date.now();
    let count = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        count++;
      }
    }

    return count;
  }

  /**
   * Evict the oldest (least recently used) entry
   * @private
   */
  _evictOldest() {
    const oldestKey = this.cache.keys().next().value;
    if (oldestKey !== undefined) {
      const entry = this.cache.get(oldestKey);
      this.cache.delete(oldestKey);
      this.stats.evictions++;

      if (this.onEvict && entry) {
        this.onEvict(oldestKey, entry.value);
      }
    }
  }
}

// ============================================
// SINGLETON INSTANCES
// ============================================

/**
 * Shared cache instances for common use cases
 * Use these for consistent caching across the app
 */

/** Profile cache - 5 minute TTL, 100 entries */
export const profileCache = new LRUCache({ maxSize: 100, ttlMs: 5 * 60 * 1000 });

/** User cache - 5 minute TTL, 100 entries */
export const userCache = new LRUCache({ maxSize: 100, ttlMs: 5 * 60 * 1000 });

/** Event cache - 10 minute TTL, 50 entries */
export const eventCache = new LRUCache({ maxSize: 50, ttlMs: 10 * 60 * 1000 });

/** Post cache - 2 minute TTL, 200 entries (more volatile) */
export const postCache = new LRUCache({ maxSize: 200, ttlMs: 2 * 60 * 1000 });

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Create a cache key from multiple parts
 * @param {...string} parts
 * @returns {string}
 * @example
 * cacheKey('profile', userId) // returns 'profile:abc123'
 */
export function cacheKey(...parts) {
  return parts.filter(Boolean).join(':');
}

/**
 * Wrap an async function with caching
 * @template T
 * @param {LRUCache<T>} cache - Cache instance to use
 * @param {string} keyPrefix - Prefix for cache keys
 * @param {(...args: any[]) => Promise<T>} fn - Async function to wrap
 * @returns {(...args: any[]) => Promise<T>}
 * @example
 * const cachedGetProfile = withCache(profileCache, 'profile', getProfile);
 * const profile = await cachedGetProfile(userId);
 */
export function withCache(cache, keyPrefix, fn) {
  return async (...args) => {
    const key = cacheKey(keyPrefix, ...args.map(String));
    const cached = cache.get(key);

    if (cached !== undefined) {
      return cached;
    }

    const result = await fn(...args);

    if (result !== null && result !== undefined) {
      cache.set(key, result);
    }

    return result;
  };
}
