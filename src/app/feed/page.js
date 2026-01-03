import dynamic from 'next/dynamic';

// Lazy-load heavy feed components - PostComposer loads immediately for interaction,
// Feed can load after since it requires data fetch anyway
const Feed = dynamic(() => import('../components/Feed'), {
  loading: () => (
    <div className="flex justify-center py-8">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
    </div>
  ),
});

const PostComposer = dynamic(() => import('../components/PostComposer'), {
  ssr: false,
  loading: () => <div className="h-32 animate-pulse rounded-xl bg-[var(--bg-elev-1)]" />,
});

export default function FeedPage() {
  return (
    <div className="isolate min-h-screen bg-[var(--bg-root)] px-4 pb-12 pt-24 text-[var(--text-primary)] transition-colors duration-200 supports-[padding:env(safe-area-inset-bottom)]:pb-[max(48px,env(safe-area-inset-bottom))] sm:px-6 sm:pb-24 lg:px-8">
      {/* Header is rendered by layout.js */}
      <h1 className="mb-8 text-center text-[clamp(18px,5vw,20px)] font-bold tracking-tight sm:text-4xl">
        Feed
      </h1>
      <PostComposer />
      <Feed />
    </div>
  );
}
