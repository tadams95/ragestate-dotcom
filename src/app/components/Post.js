'use client';
import { track } from '@/app/utils/metrics';
import { formatDate } from '@/utils/formatters';
import { deleteDoc, doc, getDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '../../../firebase/context/FirebaseContext';
import { db } from '../../../firebase/firebase';
import CommentsSheet from './CommentsSheet';
import EditPostModal from './EditPostModal';
import PostActions from './PostActions';
import PostContent from './PostContent';
import PostHeader, { VerifiedBadge } from './PostHeader';

// Embedded card for displaying the original post in a repost
function EmbeddedPost({ repostOf, isVerified = false }) {
  if (!repostOf) return null;

  // Handle deleted/unavailable original posts
  const isUnavailable =
    !repostOf.postId ||
    (!repostOf.content && (!repostOf.mediaUrls || repostOf.mediaUrls.length === 0));

  if (isUnavailable) {
    return (
      <div className="mt-3 flex items-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elev-2)] p-4 text-[var(--text-tertiary)] transition-colors duration-200">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="h-5 w-5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
          />
        </svg>
        <span className="text-sm">Original post unavailable</span>
      </div>
    );
  }

  // Helper to detect video URLs
  const isVideoUrl = (url) => {
    if (!url) return false;
    const lower = url.toLowerCase();
    if (/\.(mp4|mov|webm|avi|mkv|m4v)(\?|$)/i.test(lower)) return true;
    if (lower.includes('video%2f') || lower.includes('video/')) return true;
    return false;
  };

  // Get the first media URL, preferring optimized for videos
  const getMediaUrl = () => {
    const originalUrl = repostOf.mediaUrls?.[0];
    if (!originalUrl) return null;

    // If it's a video and we have optimized URLs, prefer them
    if (isVideoUrl(originalUrl) && repostOf.optimizedMediaUrls?.length > 0) {
      return repostOf.optimizedMediaUrls[0];
    }
    return originalUrl;
  };

  const mediaUrl = getMediaUrl();
  const isVideo = mediaUrl && isVideoUrl(mediaUrl);

  return (
    <Link
      href={`/post/${repostOf.postId}`}
      className="mt-3 block rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elev-2)] p-3 transition-colors duration-200 hover:opacity-80"
    >
      {/* Original author header */}
      <div className="mb-2 flex items-center gap-2">
        {repostOf.authorPhoto ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={repostOf.authorPhoto} alt="" className="h-5 w-5 rounded-full object-cover" />
        ) : (
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-[#ff1f42] to-[#ff6b35] text-[10px] font-bold text-white">
            {(repostOf.authorName || 'U')[0].toUpperCase()}
          </div>
        )}
        <span className="flex items-center text-sm font-semibold text-[var(--text-primary)]">
          {repostOf.authorName || 'Unknown'}
          {isVerified && <VerifiedBadge />}
        </span>
      </div>

      {/* Original content */}
      {repostOf.content && (
        <p className="mb-2 line-clamp-4 whitespace-pre-line break-words text-sm text-[var(--text-secondary)]">
          {repostOf.content}
        </p>
      )}

      {/* Original media */}
      {mediaUrl && (
        <div className="mt-2 overflow-hidden rounded-lg">
          {isVideo ? (
            <video
              src={mediaUrl}
              className="max-h-48 w-full rounded-lg object-cover"
              muted
              playsInline
              preload="metadata"
            />
          ) : (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={mediaUrl} alt="" className="max-h-48 w-full rounded-lg object-cover" />
          )}
          {repostOf.mediaUrls?.length > 1 && (
            <div className="mt-1 text-xs text-[var(--text-tertiary)]">
              +{repostOf.mediaUrls.length - 1} more
            </div>
          )}
        </div>
      )}
    </Link>
  );
}

export default function Post({ postData, hideFollow = false }) {
  // Use dummy data if postData is not provided
  const data = postData || {
    author: 'Default User',
    timestamp: 'Just now',
    content: 'This is a sample post.',
  };

  const [showComments, setShowComments] = useState(false);
  const [liveData, setLiveData] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [originalAuthorVerified, setOriginalAuthorVerified] = useState(false);
  const { currentUser } = useAuth();

  // Fetch author verification status from profile
  useEffect(() => {
    if (!postData?.userId) return;
    getDoc(doc(db, 'profiles', postData.userId))
      .then((snap) => {
        if (snap.exists()) {
          setIsVerified(snap.data().isVerified === true);
        }
      })
      .catch(() => {});
  }, [postData?.userId]);

  // Fetch original post author verification status for reposts
  useEffect(() => {
    const originalAuthorId = liveData?.repostOf?.authorId || postData?.repostOf?.authorId;
    if (!originalAuthorId) return;
    getDoc(doc(db, 'profiles', originalAuthorId))
      .then((snap) => {
        if (snap.exists()) {
          setOriginalAuthorVerified(snap.data().isVerified === true);
        }
      })
      .catch(() => {});
  }, [liveData?.repostOf?.authorId, postData?.repostOf?.authorId]);

  // Minimal view metric on mount
  useEffect(() => {
    try {
      if (postData?.id) track('post_view', { postId: postData.id });
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Live update for counts and author/avatar while post is mounted
  useEffect(() => {
    if (!postData?.id) return;
    const unsub = onSnapshot(doc(db, 'posts', postData.id), (snap) => {
      if (!snap.exists()) return;
      const p = snap.data();
      setLiveData({
        likeCount: typeof p.likeCount === 'number' ? p.likeCount : 0,
        commentCount: typeof p.commentCount === 'number' ? p.commentCount : 0,
        repostCount: typeof p.repostCount === 'number' ? p.repostCount : 0,
        author: p.usernameLower ? p.usernameLower : p.userDisplayName || p.userId || data.author,
        avatarUrl: p.userProfilePicture || null,
        usernameLower: p.usernameLower || postData?.usernameLower,
        content: p.content ?? data.content,
        isPublic: typeof p.isPublic === 'boolean' ? p.isPublic : true,
        edited: !!p.edited,
        mediaUrls: Array.isArray(p.mediaUrls) ? p.mediaUrls : [],
        optimizedMediaUrls: Array.isArray(p.optimizedMediaUrls) ? p.optimizedMediaUrls : [],
        isProcessing: !!p.isProcessing,
        timestamp:
          formatDate(p.timestamp?.toDate ? p.timestamp.toDate() : p.timestamp) || data.timestamp,
        repostOf: p.repostOf || null,
      });
    });
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postData?.id]);

  const isAuthor = !!(currentUser && postData?.userId && currentUser.uid === postData.userId);

  const onSaveEdit = async ({ content, isPublic, mediaUrls }) => {
    if (!postData?.id || !isAuthor) return;
    setSavingEdit(true);
    try {
      const updateData = {
        content,
        isPublic,
        edited: true,
        updatedAt: new Date(),
      };
      // Only include mediaUrls if provided (allows removal)
      if (Array.isArray(mediaUrls)) {
        updateData.mediaUrls = mediaUrls;
      }
      await updateDoc(doc(db, 'posts', postData.id), updateData);
      try {
        track('post_edit', { postId: postData.id });
      } catch {}
      setEditOpen(false);
    } catch (e) {
      console.error('Edit failed', e);
      alert('Failed to save changes');
    } finally {
      setSavingEdit(false);
    }
  };

  const onDelete = async () => {
    if (!postData?.id || !isAuthor) return;
    if (!confirm('Delete this post? This cannot be undone.')) return;
    try {
      await deleteDoc(doc(db, 'posts', postData.id));
      try {
        track('post_delete', { postId: postData.id });
      } catch {}
    } catch (e) {
      console.error('Delete failed', e);
      alert('Failed to delete post');
    }
  };

  return (
    <div className="mb-4 rounded-[14px] border border-[var(--border-subtle)] bg-[var(--bg-elev-1)] p-4 shadow-[var(--shadow-card)] transition-colors duration-200">
      {/* Repost indicator */}
      {(liveData?.repostOf || postData?.repostOf) && (
        <div className="mb-2 flex items-center gap-1.5 text-xs text-[var(--text-tertiary)]">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="h-3.5 w-3.5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3l-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3l-3 3"
            />
          </svg>
          <span>Reposted</span>
        </div>
      )}
      <PostHeader
        author={liveData?.author || data.author}
        timestamp={liveData?.timestamp || data.timestamp}
        avatarUrl={liveData?.avatarUrl ?? postData?.avatarUrl}
        usernameLower={liveData?.usernameLower ?? postData?.usernameLower}
        authorUserId={postData?.userId}
        postId={postData?.id}
        hideFollow={hideFollow}
        isAuthor={isAuthor}
        isPublic={liveData?.isPublic ?? postData?.isPublic ?? true}
        isVerified={isVerified}
        onEdit={() => setEditOpen(true)}
        onTogglePrivacy={async () => {
          if (!postData?.id) return;
          const currentPublic = liveData?.isPublic ?? postData?.isPublic ?? true;
          const nextPublic = !currentPublic;
          try {
            await updateDoc(doc(db, 'posts', postData.id), { isPublic: nextPublic });
            try {
              track('post_toggle_privacy', {
                postId: postData.id,
                next: nextPublic ? 'public' : 'private',
              });
            } catch {}
          } catch (e) {
            console.error('Privacy toggle failed', e);
            alert('Failed to update visibility');
          }
        }}
        onDelete={onDelete}
      />
      {/* Meta badges */}
      <div className="mb-2 flex items-center gap-2">
        {isAuthor && liveData?.isPublic === false && (
          <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-elev-2)] px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-[var(--text-secondary)]">
            <span>🔒</span>
            <span>Private</span>
          </span>
        )}
        {liveData?.edited && <span className="text-xs text-[var(--text-tertiary)]">Edited</span>}
      </div>

      {/* Check if this is a repost */}
      {liveData?.repostOf || postData?.repostOf ? (
        <>
          {/* Show quote text if any (for quote reposts) */}
          {(liveData?.content || postData?.content) && (
            <PostContent
              content={liveData?.content ?? postData?.content}
              mediaUrls={liveData?.mediaUrls ?? postData?.mediaUrls ?? []}
              optimizedMediaUrls={
                liveData?.optimizedMediaUrls ?? postData?.optimizedMediaUrls ?? []
              }
              isProcessing={liveData?.isProcessing ?? postData?.isProcessing ?? false}
            />
          )}
          {/* Embedded original post */}
          <EmbeddedPost
            repostOf={liveData?.repostOf ?? postData?.repostOf}
            isVerified={originalAuthorVerified}
          />
        </>
      ) : (
        <PostContent
          content={liveData?.content ?? postData?.content ?? data.content}
          mediaUrls={liveData?.mediaUrls ?? postData?.mediaUrls ?? []}
          optimizedMediaUrls={liveData?.optimizedMediaUrls ?? postData?.optimizedMediaUrls ?? []}
          isProcessing={liveData?.isProcessing ?? postData?.isProcessing ?? false}
        />
      )}

      <PostActions
        postId={postData?.id}
        likeCount={liveData?.likeCount ?? postData?.likeCount ?? 0}
        commentCount={liveData?.commentCount ?? postData?.commentCount ?? 0}
        repostCount={liveData?.repostCount ?? postData?.repostCount ?? 0}
        postData={{
          id: postData?.id,
          userId: postData?.userId,
          author: liveData?.author ?? postData?.author ?? data.author,
          usernameLower: liveData?.usernameLower ?? postData?.usernameLower,
          avatarUrl: liveData?.avatarUrl ?? postData?.avatarUrl,
          content: liveData?.content ?? postData?.content ?? data.content,
          mediaUrls: liveData?.mediaUrls ?? postData?.mediaUrls ?? [],
          timestamp: liveData?.timestamp ?? postData?.timestamp ?? data.timestamp,
          isPublic: liveData?.isPublic ?? postData?.isPublic ?? true,
          repostOf: liveData?.repostOf ?? postData?.repostOf ?? null,
        }}
        onOpenComments={() => {
          try {
            track('comments_open', { postId: postData?.id });
          } catch {}
          setShowComments(true);
        }}
      />
      {/* Comments modal */}
      {showComments && postData?.id && (
        <CommentsSheet
          postId={postData.id}
          postOwnerId={postData?.userId}
          onClose={() => setShowComments(false)}
        />
      )}
      {/* Edit modal */}
      {isAuthor && (
        <EditPostModal
          open={editOpen}
          onClose={() => setEditOpen(false)}
          initialContent={liveData?.content ?? postData?.content ?? ''}
          initialIsPublic={liveData?.isPublic ?? postData?.isPublic ?? true}
          initialMediaUrls={liveData?.mediaUrls ?? postData?.mediaUrls ?? []}
          saving={savingEdit}
          onSave={onSaveEdit}
        />
      )}
    </div>
  );
}
