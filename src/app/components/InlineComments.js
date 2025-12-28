'use client';

import { linkifyAll } from '@/app/utils/linkify';
import { formatDate } from '@/utils/formatters';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
} from 'firebase/firestore';
import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { useAuth } from '../../../firebase/context/FirebaseContext';
import { db } from '../../../firebase/firebase';
import { selectUserName } from '../../../lib/features/todos/userSlice';

const PAGE_SIZE = 20;
const REPLIES_PREVIEW_COUNT = 2; // Show this many replies before collapse

/**
 * Inline comments thread for post detail page (not a modal/sheet).
 * Similar to CommentsSheet but rendered inline below the post.
 */
export default function InlineComments({ postId, postOwnerId }) {
  const { currentUser } = useAuth();
  const localUserName = useSelector(selectUserName);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [take, setTake] = useState(PAGE_SIZE);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState(null); // { id, userDisplayName } of comment being replied to
  const [expandedThreads, setExpandedThreads] = useState(new Set()); // Set of parentIds with expanded replies
  const listRef = useRef(null);
  const textareaRef = useRef(null);

  // Live listener with incremental limit
  useEffect(() => {
    if (!postId) return;
    setLoading(true);
    const q = query(
      collection(db, 'postComments'),
      where('postId', '==', postId),
      orderBy('timestamp', 'asc'),
      limit(take),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setComments(dedupeComments(list));
        setHasMore(snap.size >= take);
        setLoading(false);
      },
      (e) => {
        console.error('Comments live listener error', e);
        setLoading(false);
      },
    );
    return () => unsub();
  }, [postId, take]);

  const fetchMore = useCallback(() => {
    if (!hasMore || loading) return;
    setTake((t) => t + PAGE_SIZE);
  }, [hasMore, loading]);

  const onSubmit = async (e) => {
    e?.preventDefault?.();
    const text = newComment.trim();
    if (!text) return;
    if (!currentUser) {
      alert('Please sign in to comment.');
      return;
    }
    if (!currentUser.emailVerified) {
      try {
        window.location.assign(
          `/verify-email?email=${encodeURIComponent(currentUser.email || '')}`,
        );
      } catch {}
      return;
    }
    try {
      setNewComment('');
      // Resolve usernameLower and profile picture
      let usernameLower = null;
      let profilePicture = currentUser.photoURL || null;
      try {
        const prof = await getDoc(doc(db, 'profiles', currentUser.uid));
        if (prof.exists()) {
          const profData = prof.data();
          usernameLower = profData?.usernameLower || null;
          profilePicture =
            profData?.profilePicture || profData?.photoURL || currentUser.photoURL || null;
        }
      } catch {}

      // Optimistic add
      const parentId = replyingTo?.id || null;
      const optimistic = {
        id: `optimistic_${Date.now()}`,
        postId,
        parentId,
        userId: currentUser.uid,
        userDisplayName: currentUser.displayName || 'You',
        userProfilePicture: profilePicture || '',
        usernameLower: usernameLower || null,
        content: text,
        timestamp: new Date(),
        _optimistic: true,
      };
      setComments((prev) => dedupeComments([...prev, optimistic]));
      setReplyingTo(null); // Clear reply state

      await addDoc(collection(db, 'postComments'), {
        postId,
        postOwnerId: postOwnerId || null,
        parentId, // null = top-level comment; replies use parent comment ID
        userId: currentUser.uid,
        userDisplayName: currentUser.displayName || null,
        userProfilePicture: profilePicture,
        usernameLower: usernameLower || null,
        content: text,
        timestamp: serverTimestamp(),
      });
      setComments((prev) => dedupeComments(prev));
    } catch (e) {
      console.error('Failed to post comment', e);
    }
  };

  // Delete comment (only by author)
  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Delete this comment?')) return;
    try {
      await deleteDoc(doc(db, 'postComments', commentId));
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch (err) {
      console.error('Failed to delete comment', err);
      alert('Could not delete comment. Please try again.');
    }
  };

  // Start replying to a comment
  const handleReply = (comment) => {
    // If replying to a reply, link to the parent instead so it stays in the thread
    const rootId = comment.parentId || comment.id;
    setReplyingTo({ id: rootId, userDisplayName: comment.userDisplayName || 'User' });
    textareaRef.current?.focus();
  };

  // Cancel reply
  const cancelReply = () => {
    setReplyingTo(null);
  };

  // Toggle collapse/expand for a thread
  const toggleThreadExpand = (parentId) => {
    setExpandedThreads((prev) => {
      const next = new Set(prev);
      if (next.has(parentId)) {
        next.delete(parentId);
      } else {
        next.add(parentId);
      }
      return next;
    });
  };

  // Separate top-level comments from replies
  const topLevelComments = useMemo(() => comments.filter((c) => !c.parentId), [comments]);
  const repliesByParent = useMemo(() => {
    const map = {};
    for (const c of comments) {
      if (c.parentId) {
        if (!map[c.parentId]) map[c.parentId] = [];
        map[c.parentId].push(c);
      }
    }
    return map;
  }, [comments]);

  return (
    <div className="mt-6 rounded-[14px] border border-white/10 bg-[#0d0d0f] p-4">
      <h3 className="mb-4 text-base font-semibold text-white">Comments</h3>

      {/* Comments list */}
      <div ref={listRef} className="space-y-4" role="list">
        {comments.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-sm text-gray-400">No comments yet.</p>
            <p className="text-xs text-gray-500">Be the first to start the conversation.</p>
          </div>
        )}
        {comments.length === 0 && loading && (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-start space-x-3">
                <div className="h-8 w-8 animate-pulse rounded-md bg-white/10" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-32 animate-pulse rounded bg-white/10" />
                  <div className="h-3 w-56 animate-pulse rounded bg-white/5" />
                </div>
              </div>
            ))}
          </div>
        )}
        {/* Render top-level comments with nested replies */}
        {topLevelComments.map((c) => {
          const replies = repliesByParent[c.id] || [];
          const isExpanded = expandedThreads.has(c.id);
          const hasMoreReplies = replies.length > REPLIES_PREVIEW_COUNT;
          const visibleReplies = isExpanded ? replies : replies.slice(0, REPLIES_PREVIEW_COUNT);

          return (
            <div key={c.id} className="space-y-3">
              {/* Top-level comment */}
              <div className="group flex items-start space-x-3" role="listitem">
                <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-md bg-white/10">
                  {c.userProfilePicture ? (
                    <Link
                      href={c.usernameLower ? `/${c.usernameLower}` : `/profile/${c.userId || ''}`}
                      prefetch={false}
                      className="block"
                      aria-label="View profile"
                    >
                      <Image
                        src={c.userProfilePicture}
                        alt="avatar"
                        width={32}
                        height={32}
                        sizes="32px"
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    </Link>
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-white/5">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="h-5 w-5 text-gray-400"
                      >
                        <path
                          fillRule="evenodd"
                          d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-col items-start gap-0.5">
                    {c.userId ? (
                      <Link
                        href={c.usernameLower ? `/${c.usernameLower}` : `/profile/${c.userId}`}
                        prefetch={false}
                        className="text-sm font-semibold text-white hover:underline"
                      >
                        {c.userDisplayName ||
                          (c.usernameLower
                            ? `${c.usernameLower}`
                            : currentUser && c.userId === currentUser.uid
                              ? localUserName || currentUser.displayName || 'You'
                              : `uid:${String(c.userId).slice(0, 8)}`)}
                      </Link>
                    ) : (
                      <span className="text-sm font-semibold text-white">
                        {c.userDisplayName || 'Unknown user'}
                      </span>
                    )}
                    <span className="text-xs text-gray-500">
                      {formatDate(c.timestamp?.toDate ? c.timestamp.toDate() : c.timestamp)}
                    </span>
                  </div>
                  <p className="mt-1 whitespace-pre-line break-words text-sm text-gray-200">
                    {linkifyAll(c.content)}
                  </p>
                  {/* Reply button */}
                  <button
                    onClick={() => handleReply(c)}
                    className="mt-1 text-xs text-gray-500 hover:text-gray-300"
                  >
                    ↩ Reply
                  </button>
                </div>
                {/* Delete button – visible on hover for comment author or post owner */}
                {(currentUser?.uid === c.userId || currentUser?.uid === postOwnerId) && (
                  <button
                    onClick={() => handleDeleteComment(c.id)}
                    className="ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded text-gray-500 opacity-0 transition-opacity hover:bg-white/10 hover:text-red-400 group-hover:opacity-100"
                    title="Delete comment"
                    aria-label="Delete comment"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="h-4 w-4"
                    >
                      <path
                        fillRule="evenodd"
                        d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.519.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                )}
              </div>

              {/* Nested replies (indented) */}
              {replies.length > 0 && (
                <div className="ml-6 space-y-3 border-l border-white/10 pl-4">
                  {visibleReplies.map((reply) => (
                    <div
                      key={reply.id}
                      className="group flex items-start space-x-3"
                      role="listitem"
                    >
                      <div className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-md bg-white/10">
                        {reply.userProfilePicture ? (
                          <Link
                            href={
                              reply.usernameLower
                                ? `/${reply.usernameLower}`
                                : `/profile/${reply.userId || ''}`
                            }
                            prefetch={false}
                            className="block"
                            aria-label="View profile"
                          >
                            <Image
                              src={reply.userProfilePicture}
                              alt="avatar"
                              width={28}
                              height={28}
                              sizes="28px"
                              loading="lazy"
                              className="h-full w-full object-cover"
                            />
                          </Link>
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-white/5">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                              className="h-4 w-4 text-gray-400"
                            >
                              <path
                                fillRule="evenodd"
                                d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-col items-start gap-0.5">
                          {reply.userId ? (
                            <Link
                              href={
                                reply.usernameLower
                                  ? `/${reply.usernameLower}`
                                  : `/profile/${reply.userId}`
                              }
                              prefetch={false}
                              className="text-sm font-semibold text-white hover:underline"
                            >
                              {reply.userDisplayName ||
                                (reply.usernameLower
                                  ? `${reply.usernameLower}`
                                  : currentUser && reply.userId === currentUser.uid
                                    ? localUserName || currentUser.displayName || 'You'
                                    : `uid:${String(reply.userId).slice(0, 8)}`)}
                            </Link>
                          ) : (
                            <span className="text-sm font-semibold text-white">
                              {reply.userDisplayName || 'Unknown user'}
                            </span>
                          )}
                          <span className="text-xs text-gray-500">
                            {formatDate(
                              reply.timestamp?.toDate ? reply.timestamp.toDate() : reply.timestamp,
                            )}
                          </span>
                        </div>
                        <p className="mt-1 whitespace-pre-line break-words text-sm text-gray-200">
                          {linkifyAll(reply.content)}
                        </p>
                      </div>
                      {/* Delete button for replies */}
                      {(currentUser?.uid === reply.userId || currentUser?.uid === postOwnerId) && (
                        <button
                          onClick={() => handleDeleteComment(reply.id)}
                          className="ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded text-gray-500 opacity-0 transition-opacity hover:bg-white/10 hover:text-red-400 group-hover:opacity-100"
                          title="Delete comment"
                          aria-label="Delete comment"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            className="h-4 w-4"
                          >
                            <path
                              fillRule="evenodd"
                              d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.519.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                  {/* Collapse/expand control */}
                  {hasMoreReplies && (
                    <button
                      onClick={() => toggleThreadExpand(c.id)}
                      className="text-xs text-gray-400 hover:text-gray-200"
                    >
                      {isExpanded
                        ? 'Hide replies'
                        : `View ${replies.length - REPLIES_PREVIEW_COUNT} more ${
                            replies.length - REPLIES_PREVIEW_COUNT === 1 ? 'reply' : 'replies'
                          }`}
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {loading && comments.length > 0 && <p className="text-sm text-gray-400">Loading…</p>}
        {!loading && hasMore && comments.length > 0 && (
          <button
            className="text-sm text-gray-300 hover:text-white"
            onClick={fetchMore}
            type="button"
          >
            Load more comments
          </button>
        )}
      </div>

      {/* Comment input */}
      <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-2 border-t border-white/5 pt-4">
        {/* Reply indicator */}
        {replyingTo && (
          <div className="mb-2 flex items-center justify-between rounded bg-white/5 px-2 py-1 text-xs text-gray-400">
            <span>
              Replying to{' '}
              <span className="font-medium text-white">
                {replyingTo.usernameLower
                  ? `@${replyingTo.usernameLower}`
                  : replyingTo.userDisplayName}
              </span>
            </span>
            <button type="button" onClick={cancelReply} className="text-gray-500 hover:text-white">
              ✕
            </button>
          </div>
        )}
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            className="min-h-11 flex-1 resize-none rounded-lg border border-white/10 bg-[#16171a] p-3 text-sm text-white placeholder-gray-500 outline-none ring-0 transition-colors focus:border-[#ff1f42] focus:ring-1 focus:ring-[#ff1f42]"
            placeholder={
              currentUser
                ? replyingTo
                  ? 'Write a reply…'
                  : 'Add a comment…'
                : 'Sign in to comment'
            }
            rows={1}
            maxLength={500}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            disabled={!currentUser}
            inputMode="text"
            enterKeyHint="send"
          />
          <button
            type="submit"
            disabled={!currentUser || newComment.trim().length === 0}
            className="h-11 rounded-lg bg-[#ff1f42] px-4 py-2.5 text-sm font-semibold text-white active:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}

// Helper: De-duplicate comments by id and collapse optimistic duplicates
function dedupeComments(list) {
  const byId = new Map();
  const realSigs = new Set(
    list.filter((c) => !c._optimistic).map((c) => `${c.userId || ''}|${(c.content || '').trim()}`),
  );
  for (const c of list) {
    if (c._optimistic) {
      const sig = `${c.userId || ''}|${(c.content || '').trim()}`;
      if (realSigs.has(sig)) continue;
    }
    if (!byId.has(c.id)) byId.set(c.id, c);
  }
  return Array.from(byId.values());
}
