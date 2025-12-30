/**
 * Client-side rate limiting utility using localStorage.
 * For abuse prevention on auth flows (signup, login).
 *
 * NOTE: Client-side rate limiting is a first line of defense but can be bypassed.
 * For production, combine with server-side rate limiting (see /api/auth/check-rate-limit).
 */

const STORAGE_PREFIX = 'ragestate_rl_';

/**
 * Get rate limit data from localStorage
 * @param {string} key - The rate limit key (e.g., 'signup', 'login_failed')
 * @returns {{ attempts: number[], blockedUntil: number | null }}
 */
function getRateLimitData(key) {
  if (typeof window === 'undefined') {
    return { attempts: [], blockedUntil: null };
  }

  try {
    const data = localStorage.getItem(`${STORAGE_PREFIX}${key}`);
    if (!data) return { attempts: [], blockedUntil: null };
    return JSON.parse(data);
  } catch {
    return { attempts: [], blockedUntil: null };
  }
}

/**
 * Save rate limit data to localStorage
 * @param {string} key - The rate limit key
 * @param {{ attempts: number[], blockedUntil: number | null }} data
 */
function setRateLimitData(key, data) {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(data));
  } catch {
    // localStorage full or disabled - fail open
  }
}

/**
 * Clear rate limit data (e.g., on successful login)
 * @param {string} key - The rate limit key
 */
export function clearRateLimit(key) {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(`${STORAGE_PREFIX}${key}`);
  } catch {
    // Ignore errors
  }
}

/**
 * Check if an action is rate limited and record the attempt
 * @param {string} key - The rate limit key
 * @param {number} maxAttempts - Maximum attempts allowed in the window
 * @param {number} windowMs - Time window in milliseconds
 * @param {number} [blockDurationMs] - How long to block after exceeding limit (default: windowMs)
 * @returns {{ allowed: boolean, remainingAttempts: number, blockedUntil: Date | null, message: string }}
 */
export function checkRateLimit(key, maxAttempts, windowMs, blockDurationMs = windowMs) {
  const now = Date.now();
  const data = getRateLimitData(key);

  // Check if currently blocked
  if (data.blockedUntil && now < data.blockedUntil) {
    const remainingMs = data.blockedUntil - now;
    const remainingMins = Math.ceil(remainingMs / 60000);
    return {
      allowed: false,
      remainingAttempts: 0,
      blockedUntil: new Date(data.blockedUntil),
      message: `Too many attempts. Please try again in ${remainingMins} minute${remainingMins !== 1 ? 's' : ''}.`,
    };
  }

  // Clear block if expired
  if (data.blockedUntil && now >= data.blockedUntil) {
    data.blockedUntil = null;
    data.attempts = [];
  }

  // Filter attempts within the window
  const windowStart = now - windowMs;
  const recentAttempts = data.attempts.filter((ts) => ts > windowStart);

  // Check if limit exceeded
  if (recentAttempts.length >= maxAttempts) {
    data.blockedUntil = now + blockDurationMs;
    data.attempts = recentAttempts;
    setRateLimitData(key, data);

    const blockMins = Math.ceil(blockDurationMs / 60000);
    return {
      allowed: false,
      remainingAttempts: 0,
      blockedUntil: new Date(data.blockedUntil),
      message: `Too many attempts. Please try again in ${blockMins} minute${blockMins !== 1 ? 's' : ''}.`,
    };
  }

  // Record this attempt
  recentAttempts.push(now);
  data.attempts = recentAttempts;
  data.blockedUntil = null;
  setRateLimitData(key, data);

  return {
    allowed: true,
    remainingAttempts: maxAttempts - recentAttempts.length,
    blockedUntil: null,
    message: '',
  };
}

/**
 * Pre-check rate limit without recording an attempt
 * Useful for disabling UI before user tries
 * @param {string} key - The rate limit key
 * @param {number} maxAttempts - Maximum attempts allowed in the window
 * @param {number} windowMs - Time window in milliseconds
 * @returns {{ allowed: boolean, remainingAttempts: number, blockedUntil: Date | null }}
 */
export function peekRateLimit(key, maxAttempts, windowMs) {
  const now = Date.now();
  const data = getRateLimitData(key);

  // Check if currently blocked
  if (data.blockedUntil && now < data.blockedUntil) {
    return {
      allowed: false,
      remainingAttempts: 0,
      blockedUntil: new Date(data.blockedUntil),
    };
  }

  // Filter attempts within the window
  const windowStart = now - windowMs;
  const recentAttempts = data.attempts.filter((ts) => ts > windowStart);

  return {
    allowed: recentAttempts.length < maxAttempts,
    remainingAttempts: Math.max(0, maxAttempts - recentAttempts.length),
    blockedUntil: null,
  };
}

// Rate limit configurations
export const RATE_LIMITS = {
  // Account creation: 3 attempts per hour
  SIGNUP: {
    key: 'signup',
    maxAttempts: 3,
    windowMs: 60 * 60 * 1000, // 1 hour
    blockDurationMs: 60 * 60 * 1000, // 1 hour block
  },
  // Failed logins: 5 attempts per 15 minutes
  LOGIN_FAILED: {
    key: 'login_failed',
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
    blockDurationMs: 15 * 60 * 1000, // 15 minute block
  },
};
