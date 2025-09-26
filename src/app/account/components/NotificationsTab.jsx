'use client';
// NOTE: batch mark-read optimization: we now have a callable `batchMarkNotificationsRead`.
// Future improvement: replace sequential markAllRead loop with single callable invocation:
// import { getFunctions, httpsCallable } from 'firebase/functions';
// const fn = httpsCallable(getFunctions(), 'batchMarkNotificationsRead');
// await fn({ markAll: true, max: 200 });
// Using relative path because firebase config lives at project root /firebase/firebase.js (not under src)
import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  updateDoc,
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useState } from 'react';
import { db } from '../../../../firebase/firebase';
import {
  initWebPushTokenAutoRefresh,
  registerWebPush,
} from '../../../../firebase/util/registerWebPush';

// Lazy load preferences (not critical for initial paint of list)
const NotificationPreferences = dynamic(
  () => import('./NotificationPreferences').then((m) => m.default),
  { ssr: false },
);

export default function NotificationsTab({ userId, containerStyling, cardStyling }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [end, setEnd] = useState(false);
  const [pushStatus, setPushStatus] = useState(Notification?.permission || 'default');
  const [registering, setRegistering] = useState(false);
  const PAGE_SIZE = 20;

  const load = useCallback(
    async (cursor) => {
      if (!userId) return;
      const base = collection(db, 'users', userId, 'notifications');
      let q = query(base, orderBy('createdAt', 'desc'), limit(PAGE_SIZE));
      if (cursor) {
        q = query(base, orderBy('createdAt', 'desc'), startAfter(cursor), limit(PAGE_SIZE));
      }
      const snap = await getDocs(q);
      if (snap.empty) {
        if (!cursor) setItems([]);
        setEnd(true);
        return;
      }
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setItems((prev) => (cursor ? [...prev, ...docs] : docs));
      if (snap.size < PAGE_SIZE) setEnd(true);
    },
    [userId],
  );

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  // Initialize auto refresh if already granted on mount
  useEffect(() => {
    if (userId && typeof window !== 'undefined' && Notification?.permission === 'granted') {
      initWebPushTokenAutoRefresh(userId, {});
    }
  }, [userId]);

  const markOneRead = useCallback(
    async (n) => {
      if (n.read) return;
      try {
        const fn = httpsCallable(getFunctions(), 'batchMarkNotificationsRead');
        await fn({ notificationIds: [n.id] });
        setItems((prev) =>
          prev.map((x) => (x.id === n.id ? { ...x, read: true, seenAt: new Date() } : x)),
        );
      } catch (e) {
        console.error('Failed to mark read via callable; falling back to direct update', e);
        try {
          const ref = doc(db, 'users', userId, 'notifications', n.id);
          await updateDoc(ref, { read: true, seenAt: new Date() });
          setItems((prev) =>
            prev.map((x) => (x.id === n.id ? { ...x, read: true, seenAt: new Date() } : x)),
          );
        } catch (inner) {
          console.error('Direct fallback mark read failed', inner);
        }
      }
    },
    [userId],
  );

  const markAllRead = useCallback(async () => {
    const unread = items.filter((i) => !i.read);
    if (!unread.length) return;
    try {
      const fn = httpsCallable(getFunctions(), 'batchMarkNotificationsRead');
      await fn({ notificationIds: unread.map((n) => n.id) });
      const now = new Date();
      setItems((prev) => prev.map((n) => (n.read ? n : { ...n, read: true, seenAt: now })));
      // unread counter hook will update via Firestore listener; no manual adjustment needed.
    } catch (e) {
      console.error('Batch mark read failed, falling back to sequential', e);
      for (const n of unread) {
        await markOneRead(n); // eslint-disable-line no-await-in-loop
      }
    }
  }, [items, markOneRead]);

  const loadMore = async () => {
    if (loadingMore || end || !items.length) return;
    setLoadingMore(true);
    try {
      await load(items[items.length - 1].createdAt);
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div className={containerStyling}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Notifications</h2>
        <button
          onClick={markAllRead}
          disabled={!items.some((i) => !i.read)}
          className="rounded border border-gray-700 px-3 py-1 text-sm text-gray-300 transition hover:border-red-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          Mark all read
        </button>
      </div>
      {userId && pushStatus !== 'granted' && (
        <div className="mb-4 rounded border border-yellow-700/40 bg-yellow-900/20 p-3 text-sm text-yellow-200">
          <p className="mb-2 font-medium">Enable push notifications?</p>
          <button
            disabled={registering}
            onClick={async () => {
              setRegistering(true);
              try {
                const res = await registerWebPush(userId, { requestPermission: true });
                if (res.status === 'granted') {
                  setPushStatus('granted');
                  // Start auto refresh loop after successful grant
                  initWebPushTokenAutoRefresh(userId, {});
                } else if (res.status === 'blocked') {
                  setPushStatus('blocked');
                }
              } finally {
                setRegistering(false);
              }
            }}
            className="rounded bg-red-700/30 px-3 py-1 text-xs font-semibold text-red-200 transition hover:bg-red-700/50 disabled:opacity-50"
          >
            {registering ? 'Enabling…' : 'Enable Push'}
          </button>
          {pushStatus === 'blocked' && (
            <p className="mt-2 text-xs text-yellow-300/80">
              Permission denied. Adjust your browser notification settings to enable.
            </p>
          )}
        </div>
      )}
      {loading ? (
        <div className="py-12 text-center text-gray-400">Loading…</div>
      ) : !items.length ? (
        <div className="py-12 text-center text-gray-500">No notifications yet.</div>
      ) : (
        <ul className="space-y-2">
          {items.map((n) => (
            <li
              key={n.id}
              className={`${cardStyling} flex items-start gap-3 border ${n.read ? 'opacity-60' : 'border-red-700/40'} p-4`}
            >
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-white">{n.title || n.type}</p>
                  {!n.read && (
                    <button
                      onClick={() => markOneRead(n)}
                      className="rounded bg-red-700/20 px-2 py-0.5 text-xs text-red-300 hover:bg-red-700/40"
                    >
                      Mark read
                    </button>
                  )}
                </div>
                {n.body && <p className="mt-1 text-xs text-gray-400">{n.body}</p>}
                <p className="mt-2 text-[10px] uppercase tracking-wide text-gray-500">
                  {n.createdAt?.toDate ? n.createdAt.toDate().toLocaleString() : ''}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-4 flex justify-center">
        {!end && !loading && (
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="rounded border border-gray-700 px-4 py-1 text-sm text-gray-300 transition hover:border-red-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loadingMore ? 'Loading…' : 'Load more'}
          </button>
        )}
      </div>
      <div className="mt-10 border-t border-gray-800 pt-6">
        <NotificationPreferences userId={userId} />
      </div>
    </div>
  );
}
