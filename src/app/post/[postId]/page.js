'use client';

import { doc, getDoc } from 'firebase/firestore';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { db } from '../../../../firebase/firebase';

import { formatDate } from '@/utils/formatters';
import Header from '../../components/Header';
import Post from '../../components/Post';
import PostSkeleton from '../../components/PostSkeleton';

export default function PostPermalinkPage() {
  const { postId } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        if (!postId) return;
        const ref = doc(db, 'posts', postId);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          if (isMounted) setPost(undefined);
          return;
        }
        const p = snap.data();
        const mapped = {
          id: snap.id,
          author: p.usernameLower ? p.usernameLower : p.userDisplayName || p.userId || 'User',
          avatarUrl: p.userProfilePicture || null,
          timestamp: formatDate(p.timestamp?.toDate ? p.timestamp.toDate() : p.timestamp),
          content: p.content || '',
          likeCount: typeof p.likeCount === 'number' ? p.likeCount : 0,
          commentCount: typeof p.commentCount === 'number' ? p.commentCount : 0,
        };
        if (isMounted) setPost(mapped);
      } catch (e) {
        console.error('Failed to load post:', e);
        if (isMounted) setError(e);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    load();
    return () => {
      isMounted = false;
    };
  }, [postId]);

  return (
    <div className="isolate min-h-screen bg-black px-6 py-12 text-white sm:py-24 lg:px-8">
      <Header />
      <div className="mx-auto max-w-2xl">
        {loading && <PostSkeleton />}
        {!loading && error && <p className="text-center text-gray-400">Error loading post.</p>}
        {!loading && post === undefined && (
          <p className="text-center text-gray-400">Post not found.</p>
        )}
        {!loading && post && <Post postData={post} />}
      </div>
      {/* <Footer /> */}
    </div>
  );
}
