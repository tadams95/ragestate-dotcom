export default function PostSkeleton() {
  return (
    <div className="mb-4 overflow-hidden rounded-[14px] border border-[var(--border-subtle)] bg-[var(--bg-elev-1)] p-4 shadow-[var(--shadow-card)] transition-colors duration-200">
      {/* Header: avatar + name/timestamp */}
      <div className="mb-3 flex items-center space-x-3">
        <div className="h-10 w-10 shrink-0 animate-shimmer rounded-full" />
        <div className="flex-1">
          <div className="h-3.5 w-28 animate-shimmer rounded" />
          <div className="mt-1.5 h-2.5 w-20 animate-shimmer rounded" />
        </div>
      </div>
      {/* Text lines */}
      <div className="h-3 w-full animate-shimmer rounded" />
      <div className="mt-2 h-3 w-5/6 animate-shimmer rounded" />
      <div className="mt-2 h-3 w-2/3 animate-shimmer rounded" />
      {/* Media placeholder */}
      <div className="mt-3 h-48 w-full animate-shimmer rounded-lg" />
      {/* Action bar: like, comment, repost */}
      <div className="mt-3 flex items-center gap-6">
        <div className="h-4 w-12 animate-shimmer rounded" />
        <div className="h-4 w-12 animate-shimmer rounded" />
        <div className="h-4 w-12 animate-shimmer rounded" />
      </div>
    </div>
  );
}
