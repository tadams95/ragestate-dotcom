'use client';

import { track } from '@/app/utils/metrics';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../../firebase/context/FirebaseContext';
import {
  hasLikedPost,
  likePost,
  unlikePost,
  hasRepostedPost,
  createRepost,
  undoRepost,
} from '../../../lib/firebase/postService';

export default function PostActions({
  postId,
  likeCount = 0,
  commentCount = 0,
  repostCount = 0,
  onOpenComments,
  postData,
}) {
  const { currentUser } = useAuth();
  const [optimisticLikes, setOptimisticLikes] = useState(likeCount);
  const [optimisticReposts, setOptimisticReposts] = useState(repostCount);
  const [isLiking, setIsLiking] = useState(false);
  const [hasLiked, setHasLiked] = useState(false);
  const [hasReposted, setHasReposted] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [showRepostMenu, setShowRepostMenu] = useState(false);
  const longPressRef = useRef(null);
  const longPressTimer = useRef(null);
  const [reactions, setReactions] = useState({}); // {"👍": 12, "🔥": 3, "😂": 1}
  const [likeAnimating, setLikeAnimating] = useState(false);
  const [floatingEmoji, setFloatingEmoji] = useState(null);

  const checkInitialLike = useCallback(async () => {
    if (!postId || !currentUser?.uid) return false;
    return hasLikedPost(postId, currentUser.uid);
  }, [postId, currentUser?.uid]);

  // Get the target post ID for repost operations (handles chain flattening)
  const getRepostTargetId = useCallback(() => {
    // If this is a repost, the target is the original post
    return postData?.repostOf?.postId || postId;
  }, [postId, postData?.repostOf?.postId]);

  const checkInitialRepost = useCallback(async () => {
    const targetId = getRepostTargetId();
    if (!targetId || !currentUser?.uid) return false;
    return hasRepostedPost(targetId, currentUser.uid);
  }, [getRepostTargetId, currentUser?.uid]);

  // Lazy initialize hasLiked on first interaction to avoid extra reads on mount
  const ensureHasLiked = useCallback(async () => {
    if (hasLiked === false && currentUser && postId) {
      const exists = await checkInitialLike();
      setHasLiked(exists);
      return exists;
    }
    return hasLiked;
  }, [hasLiked, currentUser, postId, checkInitialLike]);

  const ensureHasReposted = useCallback(async () => {
    if (hasReposted === false && currentUser && postId) {
      const exists = await checkInitialRepost();
      setHasReposted(exists);
      return exists;
    }
    return hasReposted;
  }, [hasReposted, currentUser, postId, checkInitialRepost]);

  const onToggleLike = useCallback(async () => {
    if (!currentUser) {
      // You can route to login here or show a toast; keep it simple for now
      alert('Please sign in to like posts.');
      return;
    }
    if (!postId || isLiking) return;
    setIsLiking(true);
    try {
      const liked = await ensureHasLiked();
      if (liked) {
        // Unlike
        setOptimisticLikes((n) => Math.max(0, n - 1));
        setHasLiked(false);
        await unlikePost(postId, currentUser.uid);
        try {
          track('reaction_add', { postId, type: 'unlike' });
        } catch {}
      } else {
        // Like
        setOptimisticLikes((n) => n + 1);
        setHasLiked(true);
        setLikeAnimating(true);
        setTimeout(() => setLikeAnimating(false), 400);
        await likePost(postId, currentUser.uid);
        try {
          track('reaction_add', { postId, type: 'like' });
        } catch {}
      }
      // Backend functions will update posts.likeCount; our optimistic UI smooths the UX
    } catch (e) {
      // Revert optimistic change if needed
      setHasLiked((prev) => !prev);
      setOptimisticLikes(likeCount);
      console.error('Failed to toggle like', e);
    } finally {
      setIsLiking(false);
    }
  }, [currentUser, postId, isLiking, ensureHasLiked, likeCount]);

  // Long-press to open reaction bar
  const startLongPress = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    longPressTimer.current = setTimeout(() => setShowReactions(true), 400);
  };
  const cancelLongPress = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  const addReaction = (emoji) => {
    // Optimistic local cluster; wiring to backend can be added later
    setReactions((prev) => ({ ...prev, [emoji]: (prev[emoji] || 0) + 1 }));
    setFloatingEmoji(emoji);
    setTimeout(() => setFloatingEmoji(null), 600);
    setShowReactions(false);
  };

  const topReactions = useMemo(() => {
    const entries = Object.entries(reactions);
    entries.sort((a, b) => (b[1] || 0) - (a[1] || 0));
    return entries.slice(0, 3);
  }, [reactions]);

  const formatCount = (n) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
    return `${n}`;
  };

  // Regular emojis for actions
  const likeIcon = hasLiked ? (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-5 w-5 text-[#ff1f42]"
    >
      <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
    </svg>
  ) : (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className="h-5 w-5"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
      />
    </svg>
  );
  const commentIcon = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className="h-5 w-5"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z"
      />
    </svg>
  );
  const repostIcon = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className="h-5 w-5"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3l-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3l-3 3"
      />
    </svg>
  );
  const shareIcon = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className="h-5 w-5"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z"
      />
    </svg>
  );

  const onShare = async () => {
    try {
      let url = '';
      if (typeof window !== 'undefined') {
        const origin = window.location.origin;
        url = postId ? `${origin}/post/${postId}` : window.location.href;
      }
      if (navigator?.share) {
        await navigator.share({ url });
      } else if (navigator?.clipboard) {
        await navigator.clipboard.writeText(url);
        // Optionally show a toast; keeping minimal
      }
      try {
        track('post_share', { postId });
      } catch {}
    } catch (_) {}
  };

  const onRepostClick = async () => {
    if (!currentUser) {
      alert('Please sign in to repost.');
      return;
    }
    await ensureHasReposted();
    setShowRepostMenu(!showRepostMenu);
  };

  const onSimpleRepost = async () => {
    if (!currentUser || !postId) return;

    // Prevent reposting private posts
    if (postData?.isPublic === false) {
      alert('Cannot repost private posts.');
      setShowRepostMenu(false);
      return;
    }

    // Check for duplicate repost (already reposted)
    const alreadyReposted = await ensureHasReposted();
    if (alreadyReposted) {
      setShowRepostMenu(false);
      return; // User already reposted; menu should show Undo instead
    }

    setShowRepostMenu(false);
    setHasReposted(true);
    setOptimisticReposts((n) => n + 1);

    try {
      // Get target post ID (handles chain flattening)
      const targetPostId = postData?.repostOf?.postId || postId;

      await createRepost({
        postId: targetPostId,
        userId: currentUser.uid,
        userDisplayName: currentUser.displayName || 'Unknown',
        userPhoto: currentUser.photoURL || null,
        originalPost: postData,
      });

      track('repost_add', { postId: targetPostId, type: 'simple' });
    } catch (e) {
      console.error(e);
      setHasReposted(false);
      setOptimisticReposts((n) => Math.max(0, n - 1));
      alert('Failed to repost');
    }
  };

  const onUndoRepost = async () => {
    if (!currentUser || !postId) return;
    setShowRepostMenu(false);
    setHasReposted(false);
    setOptimisticReposts((n) => Math.max(0, n - 1));

    // Get the target post ID (handles chain flattening)
    const targetId = getRepostTargetId();

    try {
      await undoRepost(targetId, currentUser.uid);
      track('repost_remove', { postId: targetId });
    } catch (e) {
      console.error(e);
      setHasReposted(true);
      setOptimisticReposts((n) => n + 1);
      alert('Failed to undo repost');
    }
  };

  const onQuoteRepost = () => {
    // Prevent quoting private posts
    if (postData?.isPublic === false) {
      alert('Cannot quote private posts.');
      setShowRepostMenu(false);
      return;
    }

    setShowRepostMenu(false);
    if (typeof window !== 'undefined') {
      // Flatten repost chain: if this is already a repost, quote the original instead
      const originalRepostOf = postData?.repostOf;
      const quoteData = originalRepostOf
        ? {
            ...postData,
            id: originalRepostOf.postId,
            userId: originalRepostOf.authorId,
            author: originalRepostOf.authorName,
            avatarUrl: originalRepostOf.authorPhoto,
            content: originalRepostOf.content,
            mediaUrls: originalRepostOf.mediaUrls,
            timestamp: originalRepostOf.timestamp,
            repostOf: null, // Clear to prevent further nesting
          }
        : postData;
      window.dispatchEvent(new CustomEvent('feed:quote-post', { detail: quoteData }));
    }
  };

  return (
    <div className="flex items-center space-x-4 text-[var(--text-secondary)]">
      {/* Reaction cluster */}
      {topReactions.length > 0 && (
        <div
          className="flex items-center gap-1 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-elev-2)] px-2 py-1 text-sm transition-colors duration-200"
          aria-label={topReactions.map(([e, c]) => `${e} ${c}`).join(', ')}
        >
          {topReactions.map(([e, c]) => (
            <span key={e} className="inline-flex items-center gap-0.5">
              <span aria-hidden>{e}</span>
              <span className="tabular-nums" aria-label={`${e} ${c}`}>
                {formatCount(c)}
              </span>
            </span>
          ))}
        </div>
      )}
      <button
        className={`flex h-11 items-center space-x-1.5 rounded px-2 transition-all duration-150 hover:text-[var(--text-primary)] active:scale-95 ${
          hasLiked ? 'text-[#ff1f42]' : ''
        }`}
        onClick={onToggleLike}
        onMouseDown={startLongPress}
        onTouchStart={startLongPress}
        onMouseUp={cancelLongPress}
        onMouseLeave={cancelLongPress}
        onTouchEnd={cancelLongPress}
        disabled={isLiking}
        aria-pressed={hasLiked}
        aria-label={hasLiked ? 'Unlike' : 'Like'}
        title={hasLiked ? 'Unlike' : 'Like'}
      >
        <span className={`flex items-center justify-center transition-transform duration-300 ${likeAnimating ? 'scale-125' : 'scale-100'}`}>{likeIcon}</span>
        <span className="text-xs font-medium tabular-nums">{formatCount(optimisticLikes)}</span>
      </button>

      <button
        className="flex h-11 items-center space-x-1.5 rounded px-2 transition-all duration-150 hover:text-[var(--text-primary)] active:scale-95"
        onClick={onOpenComments}
        aria-label="Comments"
        title="Comments"
      >
        <span className="flex items-center justify-center">{commentIcon}</span>
        <span className="text-xs font-medium tabular-nums">{formatCount(commentCount)}</span>
      </button>

      <div className="relative">
        <button
          className={`flex h-11 items-center space-x-1.5 rounded px-2 transition-all duration-150 hover:text-[var(--text-primary)] active:scale-95 ${
            hasReposted ? 'text-green-500' : ''
          }`}
          onClick={onRepostClick}
          aria-label="Repost"
          title="Repost"
        >
          <span className="flex items-center justify-center">{repostIcon}</span>
          <span className="text-xs font-medium tabular-nums">{formatCount(optimisticReposts)}</span>
        </button>
        {showRepostMenu && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setShowRepostMenu(false)}
              aria-hidden="true"
            />
            <div className="absolute bottom-full left-1/2 z-20 mb-2 w-40 -translate-x-1/2 overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elev-2)] shadow-xl transition-colors duration-200">
              {hasReposted ? (
                <button
                  onClick={onUndoRepost}
                  className="flex w-full items-center px-4 py-3 text-sm text-red-500 hover:bg-[var(--bg-elev-1)]"
                >
                  Undo Repost
                </button>
              ) : (
                <>
                  <button
                    onClick={onSimpleRepost}
                    className="flex w-full items-center px-4 py-3 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-elev-1)]"
                  >
                    Repost
                  </button>
                  <button
                    onClick={onQuoteRepost}
                    className="flex w-full items-center px-4 py-3 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-elev-1)]"
                  >
                    Quote Repost
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>

      <button
        className="flex h-11 items-center rounded px-2 transition-all duration-150 hover:text-[var(--text-primary)] active:scale-95"
        onClick={onShare}
        aria-label="Share"
        title="Share"
      >
        <span className="flex items-center justify-center">{shareIcon}</span>
      </button>

      {/* Reaction bar overlay */}
      {showReactions && (
        <div
          ref={longPressRef}
          className="absolute ml-2 mt-[-48px] flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-elev-1)] px-2 py-1 shadow-lg transition-colors duration-200"
          role="dialog"
          aria-label="Add a reaction"
          onMouseLeave={() => setShowReactions(false)}
        >
          {['👍', '🔥', '😂', '👏', '🎉', '❤️'].map((e) => (
            <button
              key={e}
              className="text-lg transition-transform duration-150 hover:scale-125 active:scale-95"
              onClick={() => addReaction(e)}
              aria-label={`React ${e}`}
            >
              {e}
            </button>
          ))}
        </div>
      )}

      {/* Floating emoji animation */}
      {floatingEmoji && (
        <span
          className="pointer-events-none absolute left-4 animate-float-up text-2xl"
          aria-hidden="true"
        >
          {floatingEmoji}
        </span>
      )}
    </div>
  );
}
