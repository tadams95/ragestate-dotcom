'use client';

import { deleteDoc, doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../../firebase/context/FirebaseContext';
import { db } from '../../../firebase/firebase';

export default function Followbutton({ targetUserId, onChange, variant = 'default' }) {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);

  const disabled = useMemo(() => {
    return !targetUserId || !currentUser || currentUser?.uid === targetUserId || loading || saving;
  }, [currentUser, targetUserId, loading, saving]);

  // Single read to reflect initial state
  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!currentUser?.uid || !targetUserId || currentUser.uid === targetUserId) {
        setLoading(false);
        return;
      }
      try {
        const id = `${currentUser.uid}_${targetUserId}`;
        const snap = await getDoc(doc(db, 'follows', id));
        if (!cancelled) setIsFollowing(snap.exists());
      } catch (e) {
        // Keep silent; default to not following
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [currentUser, targetUserId]);

  const toggleFollow = useCallback(async () => {
    if (!currentUser) {
      try {
        // Nudge sign-in; keep it simple
        window.location.assign('/login');
      } catch {}
      return;
    }
    if (!currentUser.emailVerified) {
      try {
        window.location.assign(
          `/verify-email?email=${encodeURIComponent(currentUser.email || '')}`,
        );
      } catch {}
      return;
    }
    if (!targetUserId || currentUser.uid === targetUserId) return;

    const id = `${currentUser.uid}_${targetUserId}`;
    const ref = doc(db, 'follows', id);
    const next = !isFollowing;
    setSaving(true);
    setIsFollowing(next); // optimistic
    try {
      if (next) {
        await setDoc(ref, {
          followerId: currentUser.uid,
          followedId: targetUserId,
          createdAt: serverTimestamp(),
        });
      } else {
        await deleteDoc(ref);
      }
      if (typeof onChange === 'function') onChange();
    } catch (e) {
      // rollback on error
      setIsFollowing(!next);
    } finally {
      setSaving(false);
    }
  }, [currentUser, targetUserId, isFollowing, onChange]);

  const label = isFollowing ? 'Following' : 'Follow';
  const baseCompact = 'px-2.5 py-1.5 h-8 rounded-md text-xs font-medium active:opacity-80';
  const baseDefault = 'px-4 py-2 h-10 rounded-md font-semibold active:opacity-80';
  const classes = (() => {
    if (variant === 'compact') {
      return isFollowing
        ? `${baseCompact} border border-white/20 text-gray-200 hover:bg-white/10`
        : `${baseCompact} bg-[#ff1f42] hover:bg-[#ff415f] text-white`;
    }
    return isFollowing
      ? `${baseDefault} border border-white/20 text-gray-200 hover:bg-white/10`
      : `${baseDefault} bg-[#ff1f42] hover:bg-[#ff415f] text-white`;
  })();

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={toggleFollow}
      className={`${classes} ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
      aria-pressed={isFollowing}
      aria-label={label}
    >
      {saving ? (isFollowing ? 'Unfollowing…' : 'Following…') : label}
    </button>
  );
}
