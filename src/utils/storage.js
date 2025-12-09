// Minimal, safe localStorage helper. No new features, just guards and convenience.

// Auth-related keys that trigger same-tab notifications when changed
const AUTH_KEYS = ['idToken', 'refreshToken', 'profilePicture', 'userId', 'email', 'name'];

// Custom event name for same-tab auth state changes
export const AUTH_STORAGE_EVENT = 'auth-storage-change';

// Dispatch custom event for same-tab listeners (native storage event only fires cross-tab)
function dispatchAuthChange(key, value) {
  if (typeof window === 'undefined') return;
  if (AUTH_KEYS.includes(key)) {
    window.dispatchEvent(new CustomEvent(AUTH_STORAGE_EVENT, { detail: { key, value } }));
  }
}

export const storage = {
  get(key) {
    try {
      if (typeof window === 'undefined') return null;
      return window.localStorage.getItem(key);
    } catch (_) {
      return null;
    }
  },

  set(key, value) {
    try {
      if (typeof window === 'undefined') return;
      window.localStorage.setItem(key, value);
      dispatchAuthChange(key, value);
    } catch (_) {}
  },

  remove(key) {
    try {
      if (typeof window === 'undefined') return;
      window.localStorage.removeItem(key);
      dispatchAuthChange(key, null);
    } catch (_) {}
  },

  getJSON(key) {
    try {
      const raw = this.get(key);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (_) {
      return null;
    }
  },

  setJSON(key, value) {
    try {
      const raw = JSON.stringify(value);
      this.set(key, raw);
    } catch (_) {}
  },

  readKeys(keys) {
    const out = {};
    for (const k of keys) {
      out[k] = this.get(k);
    }
    return out;
  },

  /**
   * Clear all auth-related keys and dispatch events for each.
   * This ensures same-tab listeners (like Header) react instantly to logout.
   */
  clearAuth() {
    for (const key of AUTH_KEYS) {
      this.remove(key);
    }
    // Also clear authState used by Redux
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem('authState');
      }
    } catch (_) {}
    // Dispatch a final "cleared" event so listeners know auth is fully cleared
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent(AUTH_STORAGE_EVENT, { detail: { key: 'all', value: null } }),
      );
    }
  },
};

export default storage;
