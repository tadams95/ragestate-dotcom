import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { deleteToken, getMessaging, getToken, isSupported, onMessage } from 'firebase/messaging';
import { app, db } from '../firebase';

/**
 * Unregister all service workers and clear FCM-related IndexedDB data.
 * This is a nuclear option to fix zombie service worker issues.
 */
async function nukeServiceWorkersAndCache() {
  console.log('[registerWebPush] Nuking all service workers and FCM cache...');

  // 1. Unregister ALL service workers for this origin
  if ('serviceWorker' in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      console.log('[registerWebPush] Found', registrations.length, 'service worker(s)');
      for (const registration of registrations) {
        const scope = registration.scope;
        const unregistered = await registration.unregister();
        console.log('[registerWebPush] Unregistered SW:', scope, '→', unregistered);
      }
    } catch (e) {
      console.warn('[registerWebPush] Failed to unregister service workers:', e.message);
    }
  }

  // 2. Delete FCM-related IndexedDB databases to clear Installation ID
  const dbsToDelete = [
    'firebase-messaging-database',
    'firebase-installations-database',
    'firebase-installations-store',
    'fcm_token_details_db',
  ];

  for (const dbName of dbsToDelete) {
    try {
      const deleteRequest = indexedDB.deleteDatabase(dbName);
      await new Promise((resolve, reject) => {
        deleteRequest.onsuccess = () => {
          console.log('[registerWebPush] Deleted IndexedDB:', dbName);
          resolve();
        };
        deleteRequest.onerror = () => {
          console.warn('[registerWebPush] Failed to delete IndexedDB:', dbName);
          resolve(); // Continue anyway
        };
        deleteRequest.onblocked = () => {
          console.warn('[registerWebPush] IndexedDB delete blocked:', dbName);
          resolve(); // Continue anyway
        };
      });
    } catch (e) {
      console.warn('[registerWebPush] IndexedDB delete error for', dbName, ':', e.message);
    }
  }

  // 3. Small delay to let browser clean up
  await new Promise((r) => setTimeout(r, 500));
  console.log('[registerWebPush] Nuke complete');
}

/**
 * Register Web Push (FCM) for current browser.
 * @param {string} uid - Authenticated user id
 * @param {object} [opts]
 * @param {boolean} [opts.requestPermission=true] - If false, assume permission already granted.
 * @param {boolean} [opts.forceClean=false] - If true, nuke all SWs and cache before registering.
 * @returns {Promise<{ token?: string; status: 'granted'|'blocked'|'unsupported'|'error'; error?: any }>}
 */
export async function registerWebPush(uid, opts = {}) {
  if (!uid) return { status: 'error', error: new Error('Missing uid') };
  if (!(await isSupported())) return { status: 'unsupported' };
  const { requestPermission = true, forceClean = false } = opts;
  try {
    // If forceClean is requested, nuke everything first
    if (forceClean) {
      await nukeServiceWorkersAndCache();
    }

    // Explicitly register our service worker BEFORE initializing messaging
    let swRegistration = null;
    if ('serviceWorker' in navigator) {
      try {
        swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
          scope: '/',
        });

        // Wait for the SW to be fully active
        await navigator.serviceWorker.ready;

        // Double-check we have an active SW
        if (!swRegistration.active) {
          swRegistration = await navigator.serviceWorker.getRegistration('/');
        }

        if (!swRegistration?.active) {
          console.warn('[registerWebPush] No active service worker found');
        }
      } catch (swError) {
        console.error('[registerWebPush] Failed to register service worker:', swError);
      }
    }

    const messaging = getMessaging(app);

    if (requestPermission && Notification.permission === 'default') {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') return { status: 'blocked' };
    }
    if (Notification.permission !== 'granted') {
      return { status: 'blocked' };
    }

    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
    if (!vapidKey) {
      console.error('[registerWebPush] VAPID key missing');
      return { status: 'error', error: new Error('VAPID key not configured') };
    }

    // Delete any existing token to force regeneration
    try {
      await deleteToken(messaging);
    } catch {
      // Ignore - may not have a token yet
    }

    const tokenOptions = { vapidKey };
    if (swRegistration) {
      tokenOptions.serviceWorkerRegistration = swRegistration;
    }
    const token = await getToken(messaging, tokenOptions);
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
    console.error('[registerWebPush] Registration failed:', error);
    return { status: 'error', error };
  }
}

/**
 * Force a complete reset: nuke SWs, clear cache, and re-register.
 * Use this when push notifications are broken.
 */
export async function forceResetAndRegister(uid) {
  return registerWebPush(uid, { requestPermission: false, forceClean: true });
}

/**
 * Disable web push: delete token, unregister SWs, and stop auto-refresh.
 */
export async function disableWebPush(uid) {
  console.log('[registerWebPush] Disabling web push...');

  // 1. Stop auto-refresh if running
  if (_refreshIntervalId) {
    clearInterval(_refreshIntervalId);
    _refreshIntervalId = null;
  }

  // 2. Try to delete token from FCM
  try {
    const messaging = getMessaging(app);
    await deleteToken(messaging);
    console.log('[registerWebPush] Token deleted from FCM');
  } catch (e) {
    console.warn('[registerWebPush] Failed to delete token:', e);
  }

  // 3. Unregister Service Workers
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const registration of registrations) {
      registration.unregister();
    }
  }

  return { status: 'disabled' };
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
    const messaging = getMessaging(app);
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
