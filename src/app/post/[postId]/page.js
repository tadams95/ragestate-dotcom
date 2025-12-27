import { getFirestore } from 'firebase-admin/firestore';
import { notFound } from 'next/navigation';
import 'server-only';
import '../../../../lib/server/firebaseAdmin'; // Initialize admin SDK
import PostDetailClient from './PostDetailClient';

/**
 * Fetch post data server-side for SEO and initial render.
 * Returns null if post doesn't exist or is private (for non-author).
 */
async function getPostData(postId) {
  try {
    const db = getFirestore();
    const snap = await db.collection('posts').doc(postId).get();

    if (!snap.exists) {
      return null;
    }

    const data = snap.data();

    // Private posts: we can't check auth server-side easily,
    // so we return minimal data and let client handle auth check
    const isPublic = data.isPublic !== false;

    return {
      id: snap.id,
      content: data.content || '',
      userId: data.userId || null,
      userDisplayName: data.userDisplayName || null,
      usernameLower: data.usernameLower || null,
      userProfilePicture: data.userProfilePicture || null,
      mediaUrls: Array.isArray(data.mediaUrls) ? data.mediaUrls : [],
      optimizedMediaUrls: Array.isArray(data.optimizedMediaUrls) ? data.optimizedMediaUrls : [],
      isProcessing: !!data.isProcessing,
      isPublic,
      likeCount: typeof data.likeCount === 'number' ? data.likeCount : 0,
      commentCount: typeof data.commentCount === 'number' ? data.commentCount : 0,
      timestamp: data.timestamp?.toDate?.() || data.timestamp || null,
    };
  } catch (err) {
    console.error('Error fetching post:', err);
    return null;
  }
}

/**
 * Generate dynamic SEO metadata from post content and media.
 */
export async function generateMetadata({ params }) {
  const { postId } = await params;

  const post = await getPostData(postId);

  // Default metadata for missing/private posts
  if (!post || !post.isPublic) {
    return {
      title: 'Post • RAGESTATE',
      description: 'Check out this post on RAGESTATE.',
      openGraph: {
        type: 'article',
        title: 'Post • RAGESTATE',
        description: 'Check out this post on RAGESTATE.',
        siteName: 'RAGESTATE',
        images: [{ url: '/assets/RAGESTATE.png', width: 1200, height: 630, alt: 'RAGESTATE' }],
      },
      twitter: {
        card: 'summary_large_image',
        title: 'Post • RAGESTATE',
        description: 'Check out this post on RAGESTATE.',
        images: ['/assets/RAGESTATE.png'],
      },
    };
  }

  // Build title from author
  const authorName = post.usernameLower || post.userDisplayName || 'Someone';
  const title = `${authorName} on RAGESTATE`;

  // Truncate content for description (max 160 chars)
  const rawDescription = post.content || 'Check out this post on RAGESTATE.';
  const description =
    rawDescription.length > 157 ? rawDescription.slice(0, 157) + '...' : rawDescription;

  // Use first media image for og:image, fallback to brand image
  // Prefer optimized if available, else original
  const allMedia = [...(post.optimizedMediaUrls || []), ...(post.mediaUrls || [])];
  const firstImage = allMedia.find(
    (url) => url && !url.match(/\.(mp4|mov|webm|avi|mkv|m4v)(\?|$)/i),
  );
  const ogImage = firstImage || '/assets/RAGESTATE.png';

  return {
    title,
    description,
    alternates: { canonical: `/post/${postId}` },
    openGraph: {
      type: 'article',
      title,
      description,
      url: `/post/${postId}`,
      siteName: 'RAGESTATE',
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  };
}

/**
 * Post detail page - shows single post with inline comments.
 */
export default async function PostDetailPage({ params }) {
  const { postId } = await params;

  const post = await getPostData(postId);

  // 404 if post doesn't exist
  if (!post) {
    notFound();
  }

  // Pass serializable data to client component
  // Convert timestamp to ISO string for serialization
  const serializedPost = {
    ...post,
    timestamp: post.timestamp ? new Date(post.timestamp).toISOString() : null,
  };

  return <PostDetailClient postId={postId} initialPost={serializedPost} />;
}
