'use client';

import { track } from '@/app/utils/metrics';
import { formatDate } from '@/utils/formatters';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import {
  collection,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../../firebase/context/FirebaseContext';
import { db } from '../../../firebase/firebase';
import { getPublicPosts } from '../../../lib/firebase/postService';
import { useAppSelector } from '../../../lib/hooks';
import { selectExcludedUserIds } from '../../../lib/features/relationshipSlice';
import Post from './Post';
import PostSkeleton from './PostSkeleton';

// Estimated height for each post in pixels (used for virtual scrolling)
const ESTIMATED_POST_HEIGHT = 350;

// Firestore 'in' queries accept up to 10 IDs; page size <= 10 is safest
const PAGE_SIZE = 10;

/**
 * Map raw post data to the Feed item format
 * @param {Object} post - Raw post data from Firestore or postService
 * @returns {Object} Feed item format
 */
function mapPostToFeedItem(post) {
  return {
    id: post.id,
    userId: post.userId,
    author: post.usernameLower ? post.usernameLower : post.userDisplayName || post.userId,
    avatarUrl: post.userProfilePicture || null,
    usernameLower: post.usernameLower || undefined,
    timestamp: formatDate(post.timestamp?.toDate ? post.timestamp.toDate() : post.timestamp),
    content: post.content || '',
    mediaUrls: Array.isArray(post.mediaUrls) ? post.mediaUrls : [],
    likeCount: typeof post.likeCount === 'number' ? post.likeCount : 0,
    commentCount: typeof post.commentCount === 'number' ? post.commentCount : 0,
  };
}

export default function Feed({ forcePublic = false }) {
  const { currentUser, loading: authLoading } = useAuth();
  const excludedUserIds = useAppSelector(selectExcludedUserIds);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  // 'user' = personalized feed via userFeeds.postIds; 'public' = fallback to latest public posts
  const [feedMode, setFeedMode] = useState('public');
  const [lastPublicDoc, setLastPublicDoc] = useState(null);
  const topObserver = useRef();
  const topSentinelRef = useRef(null);
  const [isAtTop, setIsAtTop] = useState(true);
  const [pendingNew, setPendingNew] = useState([]);
  const [isOnline, setIsOnline] = useState(true);
  const [loadError, setLoadError] = useState('');

  // Pull-to-refresh state
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const touchStartY = useRef(0);
  const feedContainerRef = useRef(null);
  const PULL_THRESHOLD = 80;

  const resetAndLoad = useCallback(() => {
    setPosts([]);
    setHasMore(true);
    setFeedMode('public');
    setLastPublicDoc(null);
    // personalized mode disabled
  }, []);

  // Pull-to-refresh: refresh function
  const handleRefresh = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    setPullDistance(0);
    setIsPulling(false);

    try {
      // Reset pagination and fetch fresh posts
      const { posts: rawPosts, lastDoc } = await getPublicPosts(null, PAGE_SIZE);
      const mapped = rawPosts.map(mapPostToFeedItem);
      setPosts(mapped);
      setLastPublicDoc(lastDoc);
      setHasMore(rawPosts.length >= PAGE_SIZE);
      setPendingNew([]);
      setLoadError('');
      track('feed_pull_refresh', { postCount: mapped.length });
    } catch (err) {
      console.error('Refresh failed:', err);
      setLoadError('Failed to refresh. Please try again.');
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing]);

  // Pull-to-refresh: touch handlers
  const handleTouchStart = useCallback(
    (e) => {
      // Only enable pull-to-refresh when at the top of the page
      if (!isAtTop || isRefreshing) return;
      touchStartY.current = e.touches[0].clientY;
      setIsPulling(true);
    },
    [isAtTop, isRefreshing]
  );

  const handleTouchMove = useCallback(
    (e) => {
      if (!isPulling || isRefreshing) return;

      const currentY = e.touches[0].clientY;
      const diff = currentY - touchStartY.current;

      // Only track downward pulls when at top
      if (diff > 0 && isAtTop) {
        // Apply resistance to make it feel natural (diminishing returns)
        const resistance = 0.4;
        const distance = Math.min(diff * resistance, PULL_THRESHOLD * 1.5);
        setPullDistance(distance);
      } else {
        setPullDistance(0);
      }
    },
    [isPulling, isRefreshing, isAtTop, PULL_THRESHOLD]
  );

  const handleTouchEnd = useCallback(() => {
    if (!isPulling) return;

    if (pullDistance >= PULL_THRESHOLD && !isRefreshing) {
      handleRefresh();
    } else {
      setPullDistance(0);
    }
    setIsPulling(false);
  }, [isPulling, pullDistance, PULL_THRESHOLD, isRefreshing, handleRefresh]);

  // Computed pull progress (0 to 1)
  const pullProgress = useMemo(
    () => Math.min(pullDistance / PULL_THRESHOLD, 1),
    [pullDistance, PULL_THRESHOLD]
  );

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
            const mapped = mapPostToFeedItem({ id: d.id, ...d.data() });
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
            const mapped = mapPostToFeedItem({ id: d.id, ...d.data() });
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
                const mapped = mapPostToFeedItem({ id: postSnap.id, ...postSnap.data() });
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

      // PUBLIC mode: show latest posts site-wide (using postService)
      if (mode === 'public') {
        try {
          const { posts: rawPosts, lastDoc } = await getPublicPosts(lastPublicDoc, PAGE_SIZE);
          const mapped = rawPosts.map(mapPostToFeedItem);

          // Append without duplicating existing post IDs
          setPosts((prev) => {
            const existing = new Set(prev.map((p) => p.id));
            const deduped = mapped.filter((p) => !existing.has(p.id));
            return [...prev, ...deduped];
          });
          setLastPublicDoc(lastDoc);
          if (rawPosts.length < PAGE_SIZE) setHasMore(false);
          setLoadError('');
          return;
        } catch (e) {
          // Missing composite index - log error and show message instead of using unsafe fallback
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

  // Initial load once auth settles
  useEffect(() => {
    if (!authLoading || forcePublic) {
      fetchFeedPage();
    }
  }, [authLoading, forcePublic, fetchFeedPage]);

  // Filter out posts from blocked/muted users
  const filteredPosts = useMemo(() => {
    if (excludedUserIds.length === 0) return posts;
    return posts.filter((post) => !excludedUserIds.includes(post.userId));
  }, [posts, excludedUserIds]);

  // Virtual scrolling for performance with large lists
  const virtualizer = useWindowVirtualizer({
    count: filteredPosts.length,
    estimateSize: () => ESTIMATED_POST_HEIGHT,
    overscan: 3, // Render 3 extra items above/below viewport
  });

  const virtualItems = virtualizer.getVirtualItems();

  // Trigger infinite scroll when near the end of virtual items
  useEffect(() => {
    if (virtualItems.length === 0 || loading || !hasMore) return;

    const lastVirtualItem = virtualItems[virtualItems.length - 1];
    // Load more when within 3 items of the end
    if (lastVirtualItem && lastVirtualItem.index >= filteredPosts.length - 3) {
      fetchFeedPage();
    }
  }, [virtualItems, filteredPosts.length, loading, hasMore, fetchFeedPage]);

  if (authLoading) {
    return <p className="text-center text-gray-400">Checking auth…</p>;
  }

  // If not signed in, we'll still show public posts

  if (filteredPosts.length === 0 && loading) {
    return (
      <div className="mx-auto max-w-2xl">
        {Array.from({ length: 3 }).map((_, i) => (
          <PostSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (filteredPosts.length === 0 && !hasMore) {
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
    <div
      ref={feedContainerRef}
      className="mx-auto max-w-2xl"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull-to-refresh indicator */}
      {(pullDistance > 0 || isRefreshing) && (
        <div
          className="flex items-center justify-center overflow-hidden transition-[height] duration-200"
          style={{ height: isRefreshing ? 48 : pullDistance }}
        >
          <div
            className={`flex items-center gap-2 text-sm text-[var(--text-secondary)] ${
              isRefreshing ? 'animate-pulse' : ''
            }`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className={`h-5 w-5 transition-transform duration-200 ${
                isRefreshing ? 'animate-spin' : ''
              }`}
              style={{
                transform: isRefreshing
                  ? undefined
                  : `rotate(${pullProgress * 180}deg)`,
              }}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
              />
            </svg>
            <span>
              {isRefreshing
                ? 'Refreshing...'
                : pullProgress >= 1
                  ? 'Release to refresh'
                  : 'Pull to refresh'}
            </span>
          </div>
        </div>
      )}

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
      {/* Virtual scrolling container */}
      <div
        style={{
          height: virtualizer.getTotalSize(),
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualItems.map((virtualRow) => {
          const post = filteredPosts[virtualRow.index];
          if (!post) return null;

          return (
            <div
              key={post.id}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <Post postData={post} hideFollow />
            </div>
          );
        })}
      </div>
      {loading && filteredPosts.length > 0 && (
        <div className="py-4">
          <PostSkeleton />
        </div>
      )}
      {!loading && !hasMore && filteredPosts.length > 0 && (
        <p className="py-6 text-center text-sm text-gray-500">You&apos;ve reached the end 🎉</p>
      )}
    </div>
  );
}
