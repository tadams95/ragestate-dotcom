"use client";

import React, { useMemo, useState, useCallback } from "react";
import { useAuth } from "../../../firebase/context/FirebaseContext";
import { db } from "../../../firebase/firebase";
import {
  doc,
  setDoc,
  deleteDoc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";

export default function PostActions({
  postId,
  likeCount = 0,
  commentCount = 0,
  onOpenComments,
}) {
  const { currentUser } = useAuth();
  const [optimisticLikes, setOptimisticLikes] = useState(likeCount);
  const [isLiking, setIsLiking] = useState(false);
  const [hasLiked, setHasLiked] = useState(false);

  // Build like doc id `${postId}_${uid}` when signed in
  const likeDocRef = useMemo(() => {
    if (!postId || !currentUser?.uid) return null;
    return doc(db, "postLikes", `${postId}_${currentUser.uid}`);
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
      alert("Please sign in to like posts.");
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
      } else {
        // Like
        setOptimisticLikes((n) => n + 1);
        setHasLiked(true);
        await setDoc(likeDocRef, {
          postId,
          userId: currentUser.uid,
          timestamp: serverTimestamp(),
        });
      }
      // Backend functions will update posts.likeCount; our optimistic UI smooths the UX
    } catch (e) {
      // Revert optimistic change if needed
      setHasLiked((prev) => !prev);
      setOptimisticLikes(likeCount);
      console.error("Failed to toggle like", e);
    } finally {
      setIsLiking(false);
    }
  }, [currentUser, postId, likeDocRef, isLiking, ensureHasLiked, likeCount]);

  const formatCount = (n) => {
    if (n >= 1_000_000)
      return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
    return `${n}`;
  };

  // Regular emojis for actions
  const likeIcon = hasLiked ? "❤️" : "🤍";
  const commentIcon = "💬";
  const shareIcon = "↗️";

  const onShare = async () => {
    try {
      let url = "";
      if (typeof window !== "undefined") {
        const origin = window.location.origin;
        url = postId ? `${origin}/post/${postId}` : window.location.href;
      }
      if (navigator?.share) {
        await navigator.share({ url });
      } else if (navigator?.clipboard) {
        await navigator.clipboard.writeText(url);
        // Optionally show a toast; keeping minimal
      }
    } catch (_) {}
  };

  return (
    <div className="flex items-center space-x-4 text-gray-400">
      <button
        className={`flex items-center space-x-1 hover:text-white ${
          hasLiked ? "text-white" : ""
        }`}
        onClick={onToggleLike}
        disabled={isLiking}
        aria-pressed={hasLiked}
        aria-label={hasLiked ? "Unlike" : "Like"}
        title={hasLiked ? "Unlike" : "Like"}
      >
        <span className="text-base leading-none">{likeIcon}</span>
        <span className="text-sm tabular-nums">
          {formatCount(optimisticLikes)}
        </span>
      </button>

      <button
        className="flex items-center space-x-1 hover:text-white"
        onClick={onOpenComments}
        aria-label="Comments"
        title="Comments"
      >
        <span className="text-base leading-none">{commentIcon}</span>
        <span className="text-sm tabular-nums">
          {formatCount(commentCount)}
        </span>
      </button>

      <button
        className="flex items-center hover:text-white"
        onClick={onShare}
        aria-label="Share"
        title="Share"
      >
        <span className="text-base leading-none">{shareIcon}</span>
      </button>
    </div>
  );
}
