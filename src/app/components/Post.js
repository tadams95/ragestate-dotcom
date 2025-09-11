'use client';
import { track } from '@/app/utils/metrics';
import { formatDate } from '@/utils/formatters';
import { doc, onSnapshot } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { db } from '../../../firebase/firebase';
import CommentsSheet from './CommentsSheet';
import PostActions from './PostActions';
import PostContent from './PostContent';
import PostHeader from './PostHeader';

export default function Post({ postData }) {
  // Use dummy data if postData is not provided
  const data = postData || {
    author: 'Default User',
    timestamp: 'Just now',
    content: 'This is a sample post.',
  };

  const [showComments, setShowComments] = useState(false);
  const [liveData, setLiveData] = useState(null);

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
        author: p.userDisplayName || p.userId || data.author,
        avatarUrl: p.userProfilePicture || null,
        content: p.content ?? data.content,
        timestamp:
          formatDate(p.timestamp?.toDate ? p.timestamp.toDate() : p.timestamp) || data.timestamp,
      });
    });
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postData?.id]);

  return (
    <div className="mb-4 rounded-[14px] border border-white/10 bg-[#0d0d0f] p-4 shadow-[0_4px_12px_-4px_#000c]">
      <PostHeader
        author={liveData?.author || data.author}
        timestamp={liveData?.timestamp || data.timestamp}
        avatarUrl={liveData?.avatarUrl ?? postData?.avatarUrl}
        usernameLower={postData?.usernameLower}
        authorUserId={postData?.userId}
      />
      <PostContent content={liveData?.content ?? data.content} />
      <PostActions
        postId={postData?.id}
        likeCount={liveData?.likeCount ?? postData?.likeCount}
        commentCount={liveData?.commentCount ?? postData?.commentCount}
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
    </div>
  );
}
