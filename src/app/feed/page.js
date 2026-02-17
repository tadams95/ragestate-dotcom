'use client';

import dynamic from 'next/dynamic';
import PostSkeleton from '../components/PostSkeleton';

// Composer-shaped shimmer skeleton matching PostComposer's collapsed trigger layout
function ComposerSkeleton() {
  return (
    <div className="mx-auto mb-4 w-full max-w-2xl">
      <div className="rounded-[14px] border border-[var(--border-subtle)] bg-[var(--bg-elev-1)] p-4 shadow-[var(--shadow-card)]">
        <div className="h-5 w-40 animate-shimmer rounded" />
      </div>
    </div>
  );
}

// Feed shimmer: 3 post skeletons
function FeedSkeleton() {
  return (
    <div>
      <PostSkeleton />
      <PostSkeleton />
      <PostSkeleton />
    </div>
  );
}

// Lazy-load heavy feed components - PostComposer loads immediately for interaction,
// Feed can load after since it requires data fetch anyway
const Feed = dynamic(() => import('../components/Feed'), {
  loading: () => <FeedSkeleton />,
});

const PostComposer = dynamic(() => import('../components/PostComposer'), {
  ssr: false,
  loading: () => <ComposerSkeleton />,
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
