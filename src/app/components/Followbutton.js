'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../../firebase/context/FirebaseContext';
import { isFollowing as checkIsFollowing, follow, unfollow } from '../../../lib/firebase/followService';

export default function Followbutton({ targetUserId, onChange, variant = 'default' }) {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [following, setFollowing] = useState(false);

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
        const result = await checkIsFollowing(currentUser.uid, targetUserId);
        if (!cancelled) setFollowing(result);
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

    const willFollow = !following;
    setSaving(true);
    setFollowing(willFollow); // optimistic
    try {
      if (willFollow) {
        await follow(currentUser.uid, targetUserId);
      } else {
        await unfollow(currentUser.uid, targetUserId);
      }
      if (typeof onChange === 'function') onChange();
    } catch (e) {
      // Log the actual error for debugging
      console.error('Follow operation failed:', e?.code || 'unknown', e?.message || e);
      // rollback on error
      setFollowing(!willFollow);
    } finally {
      setSaving(false);
    }
  }, [currentUser, targetUserId, following, onChange]);

  const label = following ? 'Following' : 'Follow';
  const baseCompact = 'px-2.5 py-1.5 h-8 rounded-md text-xs font-medium transition-all duration-200 active:scale-95 hover:scale-105';
  const baseDefault = 'px-4 py-2 h-10 rounded-md font-semibold transition-all duration-200 active:scale-95 hover:scale-105';
  const classes = (() => {
    if (variant === 'compact') {
      return following
        ? `${baseCompact} border border-white/20 text-gray-200 hover:bg-white/10`
        : `${baseCompact} bg-[#ff1f42] hover:bg-[#ff415f] text-white`;
    }
    return following
      ? `${baseDefault} border border-white/20 text-gray-200 hover:bg-white/10`
      : `${baseDefault} bg-[#ff1f42] hover:bg-[#ff415f] text-white`;
  })();

  // Button text during save reflects the action being performed:
  // - following=true (after optimistic update) means we just followed -> "Following…"
  // - following=false (after optimistic update) means we just unfollowed -> "Unfollowing…"
  const savingLabel = following ? 'Following…' : 'Unfollowing…';

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={toggleFollow}
      className={`${classes} ${disabled ? 'cursor-not-allowed opacity-60' : ''} ${saving ? 'animate-pulse' : ''}`}
      aria-pressed={following}
      aria-label={label}
    >
      {saving ? savingLabel : label}
    </button>
  );
}
