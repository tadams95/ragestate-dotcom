import { memo } from 'react';

/**
 * Skeleton loader for EventTile - matches EventTile structure
 * Uses CSS variables for light/dark theme support
 */
function EventSkeleton() {
  return (
    <div className="mb-8 overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elev-1)] shadow-lg">
      {/* Image placeholder - matches EventTile image container */}
      <div className="relative h-60 w-full animate-shimmer bg-[var(--bg-elev-2)] sm:h-64 lg:h-72" />

      {/* Content - matches EventTile padding and structure */}
      <div className="p-6">
        {/* Title skeleton */}
        <div className="h-7 w-3/4 animate-shimmer rounded-md bg-[var(--bg-elev-2)]" />

        {/* Date/time skeleton */}
        <div className="mt-4 flex items-center">
          <div className="mr-2 h-5 w-5 animate-shimmer rounded-full bg-[var(--bg-elev-2)]" />
          <div className="space-y-1.5">
            <div className="h-4 w-32 animate-shimmer rounded bg-[var(--bg-elev-2)]" />
            <div className="h-3 w-20 animate-shimmer rounded bg-[var(--bg-elev-2)]" />
          </div>
        </div>

        {/* Location skeleton */}
        <div className="mt-3 flex items-center">
          <div className="mr-1 h-4 w-4 animate-shimmer rounded-full bg-[var(--bg-elev-2)]" />
          <div className="h-4 w-40 animate-shimmer rounded bg-[var(--bg-elev-2)]" />
        </div>

        {/* Price and capacity skeleton */}
        <div className="mt-4 flex items-center justify-between">
          <div className="h-6 w-14 animate-shimmer rounded bg-[var(--bg-elev-2)]" />
          <div className="h-4 w-24 animate-shimmer rounded bg-[var(--bg-elev-2)]" />
        </div>
      </div>
    </div>
  );
}

export default memo(EventSkeleton);
