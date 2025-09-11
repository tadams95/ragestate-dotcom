export default function PostSkeleton() {
  return (
    <div className="bg-[#0d0d0f] p-4 rounded-[14px] mb-4 border border-white/10 overflow-hidden">
      <div className="flex items-center space-x-2 mb-3">
        <div className="w-8 h-8 rounded-md bg-[#1a1a1c] animate-pulse" />
        <div className="flex-1">
          <div className="h-3 w-32 bg-[#1a1a1c] rounded animate-pulse" />
          <div className="h-2 w-24 bg-[#1a1a1c] rounded mt-2 animate-pulse" />
        </div>
      </div>
      <div className="h-3 w-full bg-[#1a1a1c] rounded animate-pulse" />
      <div className="h-3 w-5/6 bg-[#1a1a1c] rounded mt-2 animate-pulse" />
      <div className="h-3 w-2/3 bg-[#1a1a1c] rounded mt-2 animate-pulse" />
    </div>
  );
}
