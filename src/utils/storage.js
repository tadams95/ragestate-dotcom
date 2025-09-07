// Minimal, safe localStorage helper. No new features, just guards and convenience.

export const storage = {
  get(key) {
    try {
      if (typeof window === "undefined") return null;
      return window.localStorage.getItem(key);
    } catch (_) {
      return null;
    }
  },

  set(key, value) {
    try {
      if (typeof window === "undefined") return;
      window.localStorage.setItem(key, value);
    } catch (_) {}
  },

  remove(key) {
    try {
      if (typeof window === "undefined") return;
      window.localStorage.removeItem(key);
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
};

export default storage;
