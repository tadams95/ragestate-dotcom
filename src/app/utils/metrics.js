'use client';

import va from '@vercel/analytics';

export function track(eventName, data = {}) {
  try {
    va?.track?.(eventName, data);
  } catch (e) {
    if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
      // Non-fatal: fall back to console in dev
      // eslint-disable-next-line no-console
      console.debug('metrics:', eventName, data);
    }
  }
}
