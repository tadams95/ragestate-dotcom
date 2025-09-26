import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { getMessaging, getToken, isSupported, onMessage } from 'firebase/messaging';
import { db } from '../firebase';

/**
 * Register Web Push (FCM) for current browser.
 * @param {string} uid - Authenticated user id
 * @param {object} [opts]
 * @param {boolean} [opts.requestPermission=true] - If false, assume permission already granted.
 * @returns {Promise<{ token?: string; status: 'granted'|'blocked'|'unsupported'|'error'; error?: any }>}
 */
export async function registerWebPush(uid, opts = {}) {
  if (!uid) return { status: 'error', error: new Error('Missing uid') };
  if (!(await isSupported())) return { status: 'unsupported' };
  const { requestPermission = true } = opts;
  try {
    const messaging = getMessaging();
    if (requestPermission && Notification.permission === 'default') {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') return { status: 'blocked' };
    }
    if (Notification.permission !== 'granted') return { status: 'blocked' };

    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
    const token = await getToken(messaging, { vapidKey });
    if (!token) return { status: 'error', error: new Error('No token returned') };

    const deviceId = `web_${token.slice(-10)}`;
    await setDoc(
      doc(db, 'users', uid, 'devices', deviceId),
      {
        platform: 'web',
        provider: 'fcm',
        token,
        enabled: true,
        lastSeenAt: serverTimestamp(),
      },
      { merge: true },
    );

    // Foreground messages (optional hook for UI toast)
    onMessage(messaging, () => {
      // TODO: integrate toast/indicator
    });

    return { status: 'granted', token };
  } catch (error) {
    console.error('registerWebPush failed', error);
    return { status: 'error', error };
  }
}

/**
 * TODO (token refresh): In modular SDK v9, use onTokenRefresh equivalent (deprecated in legacy).
 * For now, re-call registerWebPush after app start or user focus intervals to refresh stored token.
 */
let _refreshIntervalId;
let _lastToken = null;
let _lastUid = null;

async function fetchAndPersistToken(uid) {
  try {
    if (!(await isSupported())) return;
    const messaging = getMessaging();
    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
    const token = await getToken(messaging, { vapidKey });
    if (!token) return;
    if (token === _lastToken && uid === _lastUid) {
      return; // no change
    }
    _lastToken = token;
    _lastUid = uid;
    const deviceId = `web_${token.slice(-10)}`;
    await setDoc(
      doc(db, 'users', uid, 'devices', deviceId),
      {
        platform: 'web',
        provider: 'fcm',
        token,
        enabled: true,
        lastSeenAt: serverTimestamp(),
      },
      { merge: true },
    );
  } catch (e) {
    // Swallow transient errors; they'll retry on next cycle
    console.warn('token refresh attempt failed', e?.message || e);
  }
}

/**
 * Initialize lightweight auto refresh: on visibility gain + periodic interval.
 * Intentionally minimal to avoid background battery/network drain.
 * @param {string} uid
 * @param {object} [opts]
 * @param {number} [opts.intervalMs=60_000 * 60 * 4] - default every 4h
 */
export function initWebPushTokenAutoRefresh(uid, opts = {}) {
  if (!uid) return;
  const intervalMs = opts.intervalMs || 60_000 * 60 * 4;
  // Immediate attempt (without requesting permission again)
  fetchAndPersistToken(uid);
  if (typeof window !== 'undefined') {
    const visHandler = () => {
      if (document.visibilityState === 'visible') fetchAndPersistToken(uid);
    };
    document.addEventListener('visibilitychange', visHandler);
    if (_refreshIntervalId) clearInterval(_refreshIntervalId);
    _refreshIntervalId = setInterval(() => fetchAndPersistToken(uid), intervalMs);
  }
}

export function stopWebPushTokenAutoRefresh() {
  if (_refreshIntervalId) clearInterval(_refreshIntervalId);
  _refreshIntervalId = null;
}
