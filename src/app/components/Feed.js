'use client';

import { track } from '@/app/utils/metrics';
import { formatDate } from '@/utils/formatters';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  startAfter,
  where,
} from 'firebase/firestore';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../../firebase/context/FirebaseContext';
import { db } from '../../../firebase/firebase';
import Post from './Post';
import PostSkeleton from './PostSkeleton';

// Firestore 'in' queries accept up to 10 IDs; page size <= 10 is safest
const PAGE_SIZE = 10;

export default function Feed({ forcePublic = false }) {
  const { currentUser, loading: authLoading } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  // 'user' = personalized feed via userFeeds.postIds; 'public' = fallback to latest public posts
  const [feedMode, setFeedMode] = useState('public');
  const [lastPublicDoc, setLastPublicDoc] = useState(null);
  const observer = useRef();
  const topObserver = useRef();
  const topSentinelRef = useRef(null);
  const [isAtTop, setIsAtTop] = useState(true);
  const [pendingNew, setPendingNew] = useState([]);
  const [isOnline, setIsOnline] = useState(true);
  const [loadError, setLoadError] = useState('');

  const resetAndLoad = useCallback(() => {
    setPosts([]);
    setHasMore(true);
    setFeedMode('public');
    setLastPublicDoc(null);
    // personalized mode disabled
  }, []);

  useEffect(() => {
    // Reset feed when auth state changes
    resetAndLoad();
  }, [currentUser, resetAndLoad]);

  // Listen for new posts created locally to prepend without refresh
  useEffect(() => {
    function onNewPost(e) {
      const post = e?.detail;
      if (!post) return;
      if (isAtTop) {
        setPosts((prev) => [post, ...prev.filter((p) => p.id !== post.id)]);
      } else {
        setPendingNew((prev) => [post, ...prev.filter((p) => p.id !== post.id)]);
      }
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('feed:new-post', onNewPost);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('feed:new-post', onNewPost);
      }
    };
    // We intentionally do not include isAtTop here to avoid re-binding the handler per scroll.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Offline/online listener
  useEffect(() => {
    const update = () => setIsOnline(typeof navigator === 'undefined' ? true : navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  // Lightweight real-time: listen for newest items; buffer when not at top
  useEffect(() => {
    let unsub;
    if (forcePublic) {
      // Always public mode listener
      const q = query(
        collection(db, 'posts'),
        where('isPublic', '==', true),
        orderBy('timestamp', 'desc'),
        limit(1),
      );
      unsub = onSnapshot(q, (snap) => {
        snap.docChanges().forEach((chg) => {
          if (chg.type === 'added') {
            const d = chg.doc;
            const p = d.data();
            const mapped = {
              id: d.id,
              userId: p.userId,
              author: p.usernameLower ? p.usernameLower : p.userDisplayName || p.userId,
              avatarUrl: p.userProfilePicture || null,
              usernameLower: p.usernameLower || undefined,
              timestamp: formatDate(p.timestamp?.toDate ? p.timestamp.toDate() : p.timestamp),
              content: p.content || '',
              mediaUrls: Array.isArray(p.mediaUrls) ? p.mediaUrls : [],
              likeCount: typeof p.likeCount === 'number' ? p.likeCount : 0,
              commentCount: typeof p.commentCount === 'number' ? p.commentCount : 0,
            };
            if (isAtTop) {
              setPosts((prev) => [mapped, ...prev.filter((x) => x.id !== mapped.id)]);
            } else {
              setPendingNew((prev) => [mapped, ...prev.filter((x) => x.id !== mapped.id)]);
            }
          }
        });
      });
      return () => unsub && unsub();
    }

    if (feedMode === 'public') {
      const q = query(
        collection(db, 'posts'),
        where('isPublic', '==', true),
        orderBy('timestamp', 'desc'),
        limit(1),
      );
      unsub = onSnapshot(q, (snap) => {
        snap.docChanges().forEach((chg) => {
          if (chg.type === 'added') {
            const d = chg.doc;
            const p = d.data();
            const mapped = {
              id: d.id,
              userId: p.userId,
              author: p.usernameLower ? p.usernameLower : p.userDisplayName || p.userId,
              avatarUrl: p.userProfilePicture || null,
              usernameLower: p.usernameLower || undefined,
              timestamp: formatDate(p.timestamp?.toDate ? p.timestamp.toDate() : p.timestamp),
              content: p.content || '',
              mediaUrls: Array.isArray(p.mediaUrls) ? p.mediaUrls : [],
              likeCount: typeof p.likeCount === 'number' ? p.likeCount : 0,
              commentCount: typeof p.commentCount === 'number' ? p.commentCount : 0,
            };
            if (isAtTop) {
              setPosts((prev) => [mapped, ...prev.filter((x) => x.id !== mapped.id)]);
            } else {
              setPendingNew((prev) => [mapped, ...prev.filter((x) => x.id !== mapped.id)]);
            }
          }
        });
      });
    } else if (feedMode === 'user' && currentUser?.uid) {
      const q = query(
        collection(db, 'userFeeds', currentUser.uid, 'feedItems'),
        orderBy('timestamp', 'desc'),
        limit(1),
      );
      unsub = onSnapshot(q, async (snap) => {
        for (const chg of snap.docChanges()) {
          if (chg.type === 'added') {
            const id = chg.doc.id;
            try {
              const postSnap = await getDoc(doc(db, 'posts', id));
              if (postSnap.exists()) {
                const p = postSnap.data();
                const mapped = {
                  id: postSnap.id,
                  userId: p.userId,
                  author: p.usernameLower ? p.usernameLower : p.userDisplayName || p.userId,
                  avatarUrl: p.userProfilePicture || null,
                  usernameLower: p.usernameLower || undefined,
                  timestamp: formatDate(p.timestamp?.toDate ? p.timestamp.toDate() : p.timestamp),
                  content: p.content || '',
                  mediaUrls: Array.isArray(p.mediaUrls) ? p.mediaUrls : [],
                  likeCount: typeof p.likeCount === 'number' ? p.likeCount : 0,
                  commentCount: typeof p.commentCount === 'number' ? p.commentCount : 0,
                };
                if (isAtTop) {
                  setPosts((prev) => [mapped, ...prev.filter((x) => x.id !== mapped.id)]);
                } else {
                  setPendingNew((prev) => [mapped, ...prev.filter((x) => x.id !== mapped.id)]);
                }
              }
            } catch (e) {
              console.warn('Failed to fetch live post', id, e);
            }
          }
        }
      });
    }

    return () => unsub && unsub();
    // We intentionally ignore isAtTop to avoid thrashing the listener when scrolling
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedMode, currentUser, forcePublic]);

  // Track whether top of list is visible
  useEffect(() => {
    if (!topSentinelRef.current) return;
    if (topObserver.current) topObserver.current.disconnect();
    topObserver.current = new IntersectionObserver(
      (entries) => setIsAtTop(entries[0]?.isIntersecting ?? true),
      { root: null, threshold: 0.01 },
    );
    topObserver.current.observe(topSentinelRef.current);
    return () => topObserver.current && topObserver.current.disconnect();
  }, [topSentinelRef]);

  const applyPending = useCallback(() => {
    if (pendingNew.length === 0) return;
    setPosts((prev) => {
      const existing = new Set(prev.map((p) => p.id));
      const deduped = pendingNew.filter((p) => !existing.has(p.id));
      return [...deduped, ...prev];
    });
    setPendingNew([]);
    try {
      if (typeof window !== 'undefined') {
        const prefersReduced =
          window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        window.scrollTo({ top: 0, behavior: prefersReduced ? 'auto' : 'smooth' });
      }
    } catch {}
    try {
      track('feed_new_banner_click', { count: pendingNew.length });
    } catch {}
  }, [pendingNew]);

  const fetchFeedPage = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      // Determine mode synchronously for this call
      let mode = 'public';
      setFeedMode(mode);

      // PUBLIC mode: show latest posts site-wide
      if (mode === 'public') {
        try {
          const constraints = [
            where('isPublic', '==', true),
            orderBy('timestamp', 'desc'),
            limit(PAGE_SIZE),
          ];
          if (lastPublicDoc) constraints.push(startAfter(lastPublicDoc));
          const qPublic = query(collection(db, 'posts'), ...constraints);
          const snap = await getDocs(qPublic);

          const mapped = snap.docs.map((d) => {
            const p = d.data();
            return {
              id: d.id,
              userId: p.userId,
              author: p.usernameLower ? p.usernameLower : p.userDisplayName || p.userId,
              avatarUrl: p.userProfilePicture || null,
              usernameLower: p.usernameLower || undefined,
              timestamp: formatDate(p.timestamp?.toDate ? p.timestamp.toDate() : p.timestamp),
              content: p.content || '',
              mediaUrls: Array.isArray(p.mediaUrls) ? p.mediaUrls : [],
              likeCount: typeof p.likeCount === 'number' ? p.likeCount : 0,
              commentCount: typeof p.commentCount === 'number' ? p.commentCount : 0,
            };
          });

          // Append without duplicating existing post IDs
          setPosts((prev) => {
            const existing = new Set(prev.map((p) => p.id));
            const deduped = mapped.filter((p) => !existing.has(p.id));
            return [...prev, ...deduped];
          });
          setLastPublicDoc(snap.docs[snap.docs.length - 1] || null);
          if (snap.size < PAGE_SIZE) setHasMore(false);
          setLoadError('');
          return;
        } catch (e) {
          // Missing composite index - log error and show message instead of using unsafe fallback
          // The old fallback queried ALL posts without isPublic filter, causing permission-denied for non-admins
          console.error('Public feed query failed (likely missing index):', e?.code || e);
          setLoadError('Feed temporarily unavailable. Please try again later.');
          return;
        }
      }
    } catch (err) {
      console.error('Failed to fetch feed:', err);
      setLoadError('Failed to load posts. Pull to refresh or try again.');
    } finally {
      setLoading(false);
    }
  }, [hasMore, loading, lastPublicDoc]);

  // Intersection observer for infinite scroll (with debounce via loading guard)
  const lastPostElementRef = useCallback(
    (node) => {
      if (loading) return;
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver(
        (entries) => {
          // Only trigger if visible, has more content, and not already loading
          if (entries[0].isIntersecting && hasMore && !loading) {
            fetchFeedPage();
          }
        },
        { root: null, rootMargin: '400px 0px', threshold: 0 },
      );
      if (node) observer.current.observe(node);
    },
    [loading, hasMore, fetchFeedPage],
  );

  // Initial load once auth settles
  useEffect(() => {
    if (!authLoading || forcePublic) {
      fetchFeedPage();
    }
  }, [authLoading, forcePublic, fetchFeedPage]);

  if (authLoading) {
    return <p className="text-center text-gray-400">Checking auth…</p>;
  }

  // If not signed in, we'll still show public posts

  if (posts.length === 0 && loading) {
    return (
      <div className="mx-auto max-w-2xl">
        {Array.from({ length: 3 }).map((_, i) => (
          <PostSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (posts.length === 0 && !hasMore) {
    return (
      <div className="mx-auto max-w-2xl p-4 text-center text-gray-400">
        {!isOnline && (
          <p className="mb-2 rounded border border-white/10 bg-white/5 p-3">
            You're offline. Showing cached content if available.
          </p>
        )}
        {loadError && (
          <p className="mb-2 rounded border border-red-500/20 bg-red-500/10 p-3 text-red-300">
            {loadError}
          </p>
        )}
        <p>
          No posts yet.{' '}
          {currentUser ? 'Follow creators to see updates.' : 'Sign in to personalize your feed.'}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      {/* Top sentinel to detect if user is at top */}
      <div ref={topSentinelRef} aria-hidden className="h-0" />

      {/* New posts banner */}
      {pendingNew.length > 0 && !isAtTop && (
        <div className="sticky top-2 z-20 mb-2 flex justify-center">
          <button
            onClick={applyPending}
            className="rounded-full bg-[#ff1f42] px-3 py-1.5 text-sm font-semibold text-white shadow hover:bg-[#ff415f] active:opacity-90"
            aria-label={`Show ${pendingNew.length} new ${
              pendingNew.length === 1 ? 'post' : 'posts'
            }`}
            title={`Show ${pendingNew.length} new ${pendingNew.length === 1 ? 'post' : 'posts'}`}
          >
            {pendingNew.length} new {pendingNew.length === 1 ? 'post' : 'posts'}
          </button>
        </div>
      )}
      {!isOnline && (
        <div className="sticky top-2 z-10 mb-2 flex justify-center">
          <div className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-gray-300">
            Offline — actions may be delayed
          </div>
        </div>
      )}
      {posts.map((post, index) => {
        if (posts.length === index + 1) {
          return (
            <div ref={lastPostElementRef} key={post.id}>
              <Post postData={post} hideFollow />
            </div>
          );
        } else {
          return <Post key={post.id} postData={post} hideFollow />;
        }
      })}
      {loading && posts.length > 0 && (
        <div className="py-4">
          <PostSkeleton />
        </div>
      )}
      {!loading && !hasMore && posts.length > 0 && (
        <p className="py-6 text-center text-sm text-gray-500">You&apos;ve reached the end 🎉</p>
      )}
    </div>
  );
}
