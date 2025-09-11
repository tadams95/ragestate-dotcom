"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../../firebase/context/FirebaseContext";
import { db } from "../../../firebase/firebase";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";

export default function Followbutton({
  targetUserId,
  onChange,
  compact = false,
}) {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const canFollow = useMemo(
    () => !!currentUser && !!targetUserId && currentUser.uid !== targetUserId,
    [currentUser, targetUserId]
  );

  // Load following state once
  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!canFollow) {
        setIsFollowing(false);
        return;
      }
      try {
        const q = query(
          collection(db, "follows"),
          where("followerId", "==", currentUser.uid),
          where("followedId", "==", targetUserId)
        );
        const snap = await getDocs(q);
        if (!cancelled) setIsFollowing(!snap.empty);
      } catch (e) {
        console.warn("Failed to load follow state", e);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [canFollow, currentUser, targetUserId]);

  const onClick = async () => {
    if (!canFollow) {
      alert("Please sign in to follow users.");
      return;
    }
    if (loading) return;

    setLoading(true);
    const prev = isFollowing;
    setIsFollowing(!prev); // optimistic
    try {
      if (!prev) {
        // Follow: create an edge (allow auto-id for simplicity)
        await addDoc(collection(db, "follows"), {
          followerId: currentUser.uid,
          followedId: targetUserId,
          createdAt: serverTimestamp(),
        });
      } else {
        // Unfollow: find and delete edge(s)
        const q = query(
          collection(db, "follows"),
          where("followerId", "==", currentUser.uid),
          where("followedId", "==", targetUserId)
        );
        const snap = await getDocs(q);
        await Promise.all(
          snap.docs.map((d) => deleteDoc(doc(db, "follows", d.id)))
        );
      }
      onChange?.(!prev);
    } catch (e) {
      console.error("Follow action failed", e);
      setIsFollowing(prev); // revert
    } finally {
      setLoading(false);
    }
  };

  if (!targetUserId || currentUser?.uid === targetUserId) return null;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className={
        compact
          ? `px-3 py-1 text-sm rounded-lg border ${
              isFollowing
                ? "bg-white/10 border-white/20"
                : "border-[#ff1f42] text-white"
            }`
          : `px-4 py-2 text-sm font-semibold rounded-lg ${
              isFollowing
                ? "bg-white/10 text-white border border-white/10 hover:bg-white/15"
                : "bg-[#ff1f42] text-white hover:bg-[#ff415f]"
            }`
      }
      aria-pressed={isFollowing}
    >
      {loading ? "…" : isFollowing ? "Following" : "Follow"}
    </button>
  );
}
