'use client';

import { memo } from 'react';

/**
 * @typedef {Object} ChatListSkeletonProps
 * @property {number} [count=5] - Number of skeleton items to show
 */

/**
 * Skeleton loader for chat list items
 * Displays animated placeholder content while loading
 * @param {ChatListSkeletonProps} props
 */
function ChatListSkeleton({ count = 5 }) {
  return (
    <div className="divide-y divide-[var(--border-subtle)]" aria-busy="true" aria-live="polite">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="flex items-center gap-3 px-4 py-3"
        >
          {/* Avatar skeleton */}
          <div className="h-12 w-12 flex-shrink-0 animate-pulse rounded-full bg-[var(--bg-elev-2)]" />

          {/* Content skeleton */}
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-center justify-between gap-2">
              {/* Name */}
              <div className="h-4 w-32 animate-pulse rounded bg-[var(--bg-elev-2)]" />
              {/* Time */}
              <div className="h-3 w-10 animate-pulse rounded bg-[var(--bg-elev-2)]" />
            </div>
            {/* Message preview */}
            <div className="h-3 w-48 animate-pulse rounded bg-[var(--bg-elev-2)]" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default memo(ChatListSkeleton);
