export default function PostSkeleton() {
  return (
    <div className="mb-4 overflow-hidden rounded-[14px] border border-white/10 bg-[#0d0d0f] p-4 shadow-[0_4px_12px_-4px_#000c]">
      <div className="mb-3 flex items-center space-x-2">
        <div className="h-8 w-8 animate-pulse rounded-md bg-[#1a1a1c]" />
        <div className="flex-1">
          <div className="h-3 w-32 animate-pulse rounded bg-[#1a1a1c]" />
          <div className="mt-2 h-2 w-24 animate-pulse rounded bg-[#1a1a1c]" />
        </div>
      </div>
      <div className="h-3 w-full animate-pulse rounded bg-[#1a1a1c]" />
      <div className="mt-2 h-3 w-5/6 animate-pulse rounded bg-[#1a1a1c]" />
      <div className="mt-2 h-3 w-2/3 animate-pulse rounded bg-[#1a1a1c]" />
    </div>
  );
}
