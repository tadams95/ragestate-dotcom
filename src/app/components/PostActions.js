'use client';

import { track } from '@/app/utils/metrics';
import { deleteDoc, doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../../firebase/context/FirebaseContext';
import { db } from '../../../firebase/firebase';

export default function PostActions({ postId, likeCount = 0, commentCount = 0, onOpenComments }) {
  const { currentUser } = useAuth();
  const [optimisticLikes, setOptimisticLikes] = useState(likeCount);
  const [isLiking, setIsLiking] = useState(false);
  const [hasLiked, setHasLiked] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const longPressRef = useRef(null);
  const longPressTimer = useRef(null);
  const [reactions, setReactions] = useState({}); // {"👍": 12, "🔥": 3, "😂": 1}

  // Build like doc id `${postId}_${uid}` when signed in
  const likeDocRef = useMemo(() => {
    if (!postId || !currentUser?.uid) return null;
    return doc(db, 'postLikes', `${postId}_${currentUser.uid}`);
  }, [postId, currentUser?.uid]);

  const checkInitialLike = useCallback(async () => {
    if (!likeDocRef) return false;
    const snap = await getDoc(likeDocRef);
    return snap.exists();
  }, [likeDocRef]);

  // Lazy initialize hasLiked on first interaction to avoid extra reads on mount
  const ensureHasLiked = useCallback(async () => {
    if (hasLiked === false && currentUser && likeDocRef) {
      const exists = await checkInitialLike();
      setHasLiked(exists);
      return exists;
    }
    return hasLiked;
  }, [hasLiked, currentUser, likeDocRef, checkInitialLike]);

  const onToggleLike = useCallback(async () => {
    if (!currentUser) {
      // You can route to login here or show a toast; keep it simple for now
      alert('Please sign in to like posts.');
      return;
    }
    if (!postId || !likeDocRef || isLiking) return;
    setIsLiking(true);
    try {
      const liked = await ensureHasLiked();
      if (liked) {
        // Unlike
        setOptimisticLikes((n) => Math.max(0, n - 1));
        setHasLiked(false);
        await deleteDoc(likeDocRef);
        try {
          track('reaction_add', { postId, type: 'unlike' });
        } catch {}
      } else {
        // Like
        setOptimisticLikes((n) => n + 1);
        setHasLiked(true);
        await setDoc(likeDocRef, {
          postId,
          userId: currentUser.uid,
          timestamp: serverTimestamp(),
        });
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
  }, [currentUser, postId, likeDocRef, isLiking, ensureHasLiked, likeCount]);

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
  const likeIcon = hasLiked ? '❤️' : '🤍';
  const commentIcon = '💬';
  const shareIcon = '↗️';

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

  return (
    <div className="flex items-center space-x-4 text-gray-400">
      {/* Reaction cluster */}
      {topReactions.length > 0 && (
        <div
          className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-1 text-sm"
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
        className={`flex h-11 items-center space-x-1 rounded px-2 hover:text-white active:opacity-80 ${
          hasLiked ? 'text-white' : ''
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
        <span className="text-base leading-none">{likeIcon}</span>
        <span className="text-sm tabular-nums">{formatCount(optimisticLikes)}</span>
      </button>

      <button
        className="flex h-11 items-center space-x-1 rounded px-2 hover:text-white active:opacity-80"
        onClick={onOpenComments}
        aria-label="Comments"
        title="Comments"
      >
        <span className="text-base leading-none">{commentIcon}</span>
        <span className="text-sm tabular-nums">{formatCount(commentCount)}</span>
      </button>

      <button
        className="flex h-11 items-center rounded px-2 hover:text-white active:opacity-80"
        onClick={onShare}
        aria-label="Share"
        title="Share"
      >
        <span className="text-base leading-none">{shareIcon}</span>
      </button>

      {/* Reaction bar overlay */}
      {showReactions && (
        <div
          ref={longPressRef}
          className="absolute ml-2 mt-[-48px] flex items-center gap-2 rounded-full border border-white/10 bg-[#0d0d0f] px-2 py-1 shadow-lg"
          role="dialog"
          aria-label="Add a reaction"
          onMouseLeave={() => setShowReactions(false)}
        >
          {['👍', '🔥', '😂', '👏', '🎉', '❤️'].map((e) => (
            <button
              key={e}
              className="text-lg transition-transform hover:scale-110"
              onClick={() => addReaction(e)}
              aria-label={`React ${e}`}
            >
              {e}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
