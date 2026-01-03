export default function PostSkeleton() {
  return (
    <div className="mb-4 overflow-hidden rounded-[14px] border border-[var(--border-subtle)] bg-[var(--bg-elev-1)] p-4 shadow-[var(--shadow-card)] transition-colors duration-200">
      <div className="mb-3 flex items-center space-x-2">
        <div className="h-8 w-8 animate-pulse rounded-md bg-[var(--bg-elev-2)]" />
        <div className="flex-1">
          <div className="h-3 w-32 animate-pulse rounded bg-[var(--bg-elev-2)]" />
          <div className="mt-2 h-2 w-24 animate-pulse rounded bg-[var(--bg-elev-2)]" />
        </div>
      </div>
      <div className="h-3 w-full animate-pulse rounded bg-[var(--bg-elev-2)]" />
      <div className="mt-2 h-3 w-5/6 animate-pulse rounded bg-[var(--bg-elev-2)]" />
      <div className="mt-2 h-3 w-2/3 animate-pulse rounded bg-[var(--bg-elev-2)]" />
    </div>
  );
}
