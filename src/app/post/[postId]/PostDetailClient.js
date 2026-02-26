'use client';

import { formatDate } from '@/utils/formatters';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../../firebase/context/FirebaseContext';
import InlineComments from '../../components/InlineComments';
import Post from '../../components/Post';

/**
 * Client component for post detail page.
 * Handles auth checks for private posts and renders inline comments.
 */
export default function PostDetailClient({ postId, initialPost }) {
  const router = useRouter();
  const { currentUser } = useAuth();

  // Check if user can view private post
  const isAuthor = currentUser && initialPost?.userId === currentUser.uid;
  const canView = initialPost?.isPublic || isAuthor;

  // Private post that user can't view
  if (!canView) {
    return (
      <div className="isolate min-h-screen bg-[var(--bg-root)] px-6 py-12 text-[var(--text-primary)] sm:py-24 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mb-4 text-4xl">🔒</div>
          <h1 className="mb-2 text-xl font-semibold">This post is private</h1>
          <p className="mb-6 text-[var(--text-secondary)]">Only the author can view this post.</p>
          <Link
            href="/feed"
            className="inline-block rounded-lg bg-[var(--accent)] px-6 py-3 font-semibold text-white hover:opacity-90"
          >
            Back to Feed
          </Link>
        </div>
      </div>
    );
  }

  // Map initial post data to Post component format
  const postData = {
    id: postId,
    userId: initialPost.userId,
    author:
      initialPost.usernameLower ||
      initialPost.userDisplayName ||
      initialPost.userId?.slice(0, 8) ||
      'User',
    avatarUrl: initialPost.userProfilePicture,
    usernameLower: initialPost.usernameLower,
    timestamp: initialPost.timestamp ? formatDate(new Date(initialPost.timestamp)) : 'Just now',
    content: initialPost.content,
    mediaUrls: initialPost.mediaUrls,
    optimizedMediaUrls: initialPost.optimizedMediaUrls,
    isProcessing: initialPost.isProcessing,
    isPublic: initialPost.isPublic,
    likeCount: initialPost.likeCount,
    commentCount: initialPost.commentCount,
  };

  return (
    <div className="isolate min-h-screen bg-[var(--bg-root)] px-6 pb-12 pt-24 text-[var(--text-primary)] sm:pb-24 sm:pt-32 lg:px-8">
      <div className="mx-auto max-w-2xl">
        {/* Back link */}
        <Link
          href="/feed"
          className="group mb-6 inline-flex items-center gap-2 text-sm text-[var(--text-tertiary)] transition-colors hover:text-[var(--text-primary)]"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-4 w-4 transition-transform group-hover:-translate-x-1"
          >
            <path
              fillRule="evenodd"
              d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z"
              clipRule="evenodd"
            />
          </svg>
          Back to Feed
        </Link>

        {/* Post */}
        <Post postData={postData} hideFollow={false} onDeleted={() => router.push('/feed')} />

        {/* Inline comments (not a sheet) */}
        <InlineComments postId={postId} postOwnerId={initialPost?.userId} />
      </div>
    </div>
  );
}
