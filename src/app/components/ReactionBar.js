'use client';

import { memo, useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../../firebase/context/FirebaseContext';
import {
  getReactionsForPost,
  getUserReactionsForPost,
  toggleReaction,
} from '../../../lib/firebase/reactionService';

/**
 * @typedef {Object} ReactionBarProps
 * @property {string} postId - The post ID
 * @property {string} postOwnerId - The post owner's user ID (for notifications)
 */

/**
 * Format count for display (1000 -> 1K, etc.)
 * @param {number} n
 * @returns {string}
 */
function formatCount(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  return `${n}`;
}

/**
 * Displays aggregated reactions for a post with interactive toggle
 * @param {ReactionBarProps} props
 */
function ReactionBar({ postId, postOwnerId }) {
  const { currentUser } = useAuth();
  /** @type {[{[emoji: string]: {count: number, users: string[]}}, Function]} */
  const [reactions, setReactions] = useState({});
  const [userReactions, setUserReactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch reactions on mount
  useEffect(() => {
    if (!postId) return;

    let cancelled = false;

    async function fetchReactions() {
      try {
        const [aggregated, userEmojis] = await Promise.all([
          getReactionsForPost(postId),
          currentUser?.uid ? getUserReactionsForPost(postId, currentUser.uid) : [],
        ]);

        if (!cancelled) {
          setReactions(aggregated);
          setUserReactions(userEmojis);
        }
      } catch (error) {
        console.error('Failed to fetch reactions:', error);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchReactions();

    return () => {
      cancelled = true;
    };
  }, [postId, currentUser?.uid]);

  const handleToggleReaction = useCallback(
    async (emoji) => {
      if (!currentUser) {
        alert('Please sign in to react.');
        return;
      }

      if (!postId) return;

      const wasReacted = userReactions.includes(emoji);

      // Optimistic update
      setUserReactions((prev) =>
        wasReacted ? prev.filter((e) => e !== emoji) : [...prev, emoji]
      );
      setReactions((prev) => {
        const current = prev[emoji] || { count: 0, users: [] };
        return {
          ...prev,
          [emoji]: {
            count: wasReacted
              ? Math.max(0, current.count - 1)
              : current.count + 1,
            users: wasReacted
              ? current.users.filter((u) => u !== currentUser.uid)
              : [...current.users, currentUser.uid],
          },
        };
      });

      try {
        await toggleReaction(postId, currentUser.uid, emoji, postOwnerId);
      } catch (error) {
        console.error('Failed to toggle reaction:', error);
        // Revert optimistic update
        setUserReactions((prev) =>
          wasReacted ? [...prev, emoji] : prev.filter((e) => e !== emoji)
        );
        setReactions((prev) => {
          const current = prev[emoji] || { count: 0, users: [] };
          return {
            ...prev,
            [emoji]: {
              count: wasReacted
                ? current.count + 1
                : Math.max(0, current.count - 1),
              users: wasReacted
                ? [...current.users, currentUser.uid]
                : current.users.filter((u) => u !== currentUser.uid),
            },
          };
        });
      }
    },
    [currentUser, postId, postOwnerId, userReactions]
  );

  // Sort reactions by count (descending) and filter out empty ones
  const sortedReactions = Object.entries(reactions)
    .filter(([, data]) => data.count > 0)
    .sort((a, b) => b[1].count - a[1].count);

  // Don't render if no reactions and still loading
  if (isLoading || sortedReactions.length === 0) {
    return null;
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      {sortedReactions.map(([emoji, data]) => {
        const isUserReaction = userReactions.includes(emoji);
        return (
          <button
            key={emoji}
            onClick={() => handleToggleReaction(emoji)}
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-sm transition-all duration-150 hover:scale-105 active:scale-95 ${
              isUserReaction
                ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--text-primary)]'
                : 'border-[var(--border-subtle)] bg-[var(--bg-elev-2)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
            }`}
            aria-label={`${emoji} ${data.count} reactions${isUserReaction ? ', you reacted' : ''}`}
            aria-pressed={isUserReaction}
          >
            <span aria-hidden>{emoji}</span>
            <span className="tabular-nums">{formatCount(data.count)}</span>
          </button>
        );
      })}
    </div>
  );
}

export default memo(ReactionBar);
