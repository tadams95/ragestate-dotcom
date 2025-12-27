'use client';
import { track } from '@/app/utils/metrics';
import { formatDate } from '@/utils/formatters';
import { deleteDoc, doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { useAuth } from '../../../firebase/context/FirebaseContext';
import { db } from '../../../firebase/firebase';
import CommentsSheet from './CommentsSheet';
import EditPostModal from './EditPostModal';
import PostActions from './PostActions';
import PostContent from './PostContent';
import PostHeader from './PostHeader';

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
  const { currentUser } = useAuth();

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
        author: p.usernameLower ? p.usernameLower : p.userDisplayName || p.userId || data.author,
        avatarUrl: p.userProfilePicture || null,
        usernameLower: p.usernameLower || postData?.usernameLower,
        content: p.content ?? data.content,
        isPublic: typeof p.isPublic === 'boolean' ? p.isPublic : true,
        edited: !!p.edited,
        mediaUrls: Array.isArray(p.mediaUrls) ? p.mediaUrls : [],
        timestamp:
          formatDate(p.timestamp?.toDate ? p.timestamp.toDate() : p.timestamp) || data.timestamp,
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
    <div className="mb-4 rounded-[14px] border border-white/10 bg-[#0d0d0f] p-4 shadow-[0_4px_12px_-4px_#000c]">
      <PostHeader
        author={liveData?.author || data.author}
        timestamp={liveData?.timestamp || data.timestamp}
        avatarUrl={liveData?.avatarUrl ?? postData?.avatarUrl}
        usernameLower={liveData?.usernameLower ?? postData?.usernameLower}
        authorUserId={postData?.userId}
        hideFollow={hideFollow}
        isAuthor={isAuthor}
        isPublic={liveData?.isPublic ?? postData?.isPublic ?? true}
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
      <div className="mb-2">
        {isAuthor && liveData?.isPublic === false && (
          <span className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-gray-300">
            Private
          </span>
        )}
        {liveData?.edited && <span className="ml-2 text-xs text-gray-400">Edited</span>}
      </div>

      <PostContent
        content={liveData?.content ?? postData?.content ?? data.content}
        mediaUrls={liveData?.mediaUrls ?? postData?.mediaUrls ?? []}
      />

      <PostActions
        postId={postData?.id}
        likeCount={liveData?.likeCount ?? postData?.likeCount ?? 0}
        commentCount={liveData?.commentCount ?? postData?.commentCount ?? 0}
        onOpenComments={() => {
          try {
            track('comments_open', { postId: postData?.id });
          } catch {}
          setShowComments(true);
        }}
      />
      {/* Comments modal */}
      {showComments && postData?.id && (
        <CommentsSheet postId={postData.id} onClose={() => setShowComments(false)} />
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
