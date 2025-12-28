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
    console.log('[registerWebPush] Starting registration for uid:', uid);

    // If forceClean is requested, nuke everything first
    if (forceClean) {
      await nukeServiceWorkersAndCache();
    }

    // Explicitly register our service worker BEFORE initializing messaging
    // This ensures the correct SW is in place after a nuclear reset
    let swRegistration = null;
    if ('serviceWorker' in navigator) {
      try {
        console.log('[registerWebPush] Registering firebase-messaging-sw.js...');
        swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
          scope: '/',
        });
        console.log('[registerWebPush] Service worker registered:', swRegistration.scope);
        console.log(
          '[registerWebPush] SW state - active:',
          !!swRegistration.active,
          'installing:',
          !!swRegistration.installing,
          'waiting:',
          !!swRegistration.waiting,
        );

        // Wait for the SW to be fully active
        await navigator.serviceWorker.ready;
        console.log('[registerWebPush] navigator.serviceWorker.ready resolved');

        // Double-check we have an active SW
        if (!swRegistration.active) {
          // Re-fetch the registration to get the active SW
          swRegistration = await navigator.serviceWorker.getRegistration('/');
          console.log(
            '[registerWebPush] Re-fetched registration, active:',
            !!swRegistration?.active,
          );
        }

        if (swRegistration?.active) {
          console.log(
            '[registerWebPush] Service worker is active:',
            swRegistration.active.scriptURL,
          );
        } else {
          console.warn('[registerWebPush] No active service worker found after ready!');
        }
      } catch (swError) {
        console.error('[registerWebPush] Failed to register service worker:', swError);
        // Continue anyway - getToken will try to register its own
      }
    }

    const messaging = getMessaging(app);
    console.log('[registerWebPush] Messaging instance created');
    console.log('[registerWebPush] App Config SenderID:', app.options.messagingSenderId);

    if (requestPermission && Notification.permission === 'default') {
      console.log('[registerWebPush] Requesting permission...');
      const perm = await Notification.requestPermission();
      console.log('[registerWebPush] Permission result:', perm);
      if (perm !== 'granted') return { status: 'blocked' };
    }
    if (Notification.permission !== 'granted') {
      console.log('[registerWebPush] Permission not granted, current:', Notification.permission);
      return { status: 'blocked' };
    }

    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
    console.log(
      '[registerWebPush] Using VAPID Key:',
      vapidKey ? vapidKey.slice(0, 10) + '...' : 'MISSING!',
    );

    // Delete any existing token to force regeneration with new VAPID key
    console.log('[registerWebPush] Deleting any existing token...');
    try {
      await deleteToken(messaging);
      console.log('[registerWebPush] Existing token deleted');
    } catch (e) {
      console.log('[registerWebPush] No existing token to delete or delete failed:', e.message);
    }

    console.log('[registerWebPush] Calling getToken...');
    const tokenOptions = { vapidKey };
    // If we explicitly registered a SW, pass it to getToken
    if (swRegistration) {
      tokenOptions.serviceWorkerRegistration = swRegistration;
      console.log('[registerWebPush] Using explicit SW registration for getToken');
    }
    const token = await getToken(messaging, tokenOptions);
    console.log('[registerWebPush] getToken result:', token ? 'success' : 'no token');
    if (!token) return { status: 'error', error: new Error('No token returned') };

    const deviceId = `web_${token.slice(-10)}`;
    console.log('[registerWebPush] Storing device document:', deviceId);
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
    console.log('[registerWebPush] Device document stored successfully');

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
