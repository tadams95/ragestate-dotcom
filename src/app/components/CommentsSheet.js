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
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { useAuth } from '../../../firebase/context/FirebaseContext';
import { db } from '../../../firebase/firebase';
import { selectUserName } from '../../../lib/features/todos/userSlice';

const PAGE_SIZE = 20;
const REPLIES_PREVIEW_COUNT = 2; // Show this many replies before collapse

export default function CommentsSheet({ postId, postOwnerId, onClose }) {
  const { currentUser } = useAuth();
  const localUserName = useSelector(selectUserName);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [take, setTake] = useState(PAGE_SIZE);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState(null); // { id, userDisplayName } of comment being replied to
  const [collapsedThreads, setCollapsedThreads] = useState(new Set()); // Set of parentIds with collapsed replies
  const contentRef = useRef(null);
  const backdropRef = useRef(null);
  const textareaRef = useRef(null);

  // Lock body scroll when sheet is open
  useEffect(() => {
    const originalStyle = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);

  // Close on backdrop click (not on sheet content click)
  const handleBackdropClick = useCallback(
    (e) => {
      if (e.target === backdropRef.current) {
        onClose();
      }
    },
    [onClose],
  );

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

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
        // Scroll to bottom on first load when small lists
        if (contentRef.current) {
          setTimeout(() => {
            contentRef.current.scrollTop = contentRef.current.scrollHeight;
          }, 0);
        }
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
      // Optimistic prepend (we display in asc order; append makes sense)
      // Resolve usernameLower once for link consistency
      let usernameLower = null;
      let profilePicture = currentUser.photoURL || null;
      try {
        const prof = await getDoc(doc(db, 'profiles', currentUser.uid));
        if (prof.exists()) {
          const profData = prof.data();
          usernameLower = profData?.usernameLower || null;
          // Prefer Firestore profile picture over Auth photoURL
          profilePicture =
            profData?.profilePicture || profData?.photoURL || currentUser.photoURL || null;
        }
      } catch {}

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
      try {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('comments:new', { detail: { postId } }));
        }
      } catch {}
      setComments((prev) => dedupeComments(prev));
    } catch (e) {
      console.error('Failed to post comment', e);
      // Revert optimistic if needed (simple: reload list next open)
    }
  };

  // Delete comment (only by author or post owner)
  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Delete this comment?')) return;
    try {
      await deleteDoc(doc(db, 'postComments', commentId));
      // Optimistically remove from local state
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
    setReplyingTo({
      id: rootId,
      userDisplayName: comment.userDisplayName || 'User',
      usernameLower: comment.usernameLower,
    });
    textareaRef.current?.focus();
  };

  // Cancel reply
  const cancelReply = () => {
    setReplyingTo(null);
  };

  // Toggle thread collapse
  const toggleThreadCollapse = (parentId) => {
    setCollapsedThreads((prev) => {
      const next = new Set(prev);
      if (next.has(parentId)) {
        next.delete(parentId);
      } else {
        next.add(parentId);
      }
      return next;
    });
  };

  // Organize comments into threads: top-level comments + their replies
  const topLevelComments = comments.filter((c) => !c.parentId);
  const repliesByParent = comments.reduce((acc, c) => {
    if (c.parentId) {
      if (!acc[c.parentId]) acc[c.parentId] = [];
      acc[c.parentId].push(c);
    }
    return acc;
  }, {});

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 supports-[padding:env(safe-area-inset-bottom)]:pb-[env(safe-area-inset-bottom)] sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="comments-title"
    >
      <div className="flex max-h-[90vh] w-full flex-col rounded-t-2xl border border-white/10 bg-[#0d0d0f] text-white shadow-xl sm:max-w-2xl sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <h3 id="comments-title" className="text-base font-semibold">
            Comments
          </h3>
          <div className="flex items-center gap-1">
            {/* Open in new tab link */}
            <Link
              href={`/post/${postId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
              title="Open post in new tab"
              onClick={(e) => e.stopPropagation()}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-4 w-4"
              >
                <path
                  fillRule="evenodd"
                  d="M4.25 5.5a.75.75 0 00-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 00.75-.75v-4a.75.75 0 011.5 0v4A2.25 2.25 0 0112.75 17h-8.5A2.25 2.25 0 012 14.75v-8.5A2.25 2.25 0 014.25 4h5a.75.75 0 010 1.5h-5z"
                  clipRule="evenodd"
                />
                <path
                  fillRule="evenodd"
                  d="M6.194 12.753a.75.75 0 001.06.053L16.5 4.44v2.81a.75.75 0 001.5 0v-4.5a.75.75 0 00-.75-.75h-4.5a.75.75 0 000 1.5h2.553l-9.056 8.194a.75.75 0 00-.053 1.06z"
                  clipRule="evenodd"
                />
              </svg>
            </Link>
            <button
              className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
              onClick={onClose}
              aria-label="Close"
              title="Close"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-5 w-5"
              >
                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
              </svg>
            </button>
          </div>
        </div>

        <div ref={contentRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4" role="list">
          {comments.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white/5">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="h-6 w-6 text-gray-500"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.848 2.771A49.144 49.144 0 0112 2.25c2.43 0 4.817.178 7.152.52 1.978.292 3.348 2.024 3.348 3.97v6.02c0 1.946-1.37 3.678-3.348 3.97a48.901 48.901 0 01-3.476.383.39.39 0 00-.297.17l-2.755 4.133a.75.75 0 01-1.248 0l-2.755-4.133a.39.39 0 00-.297-.17 48.9 48.9 0 01-3.476-.384c-1.978-.29-3.348-2.024-3.348-3.97V6.741c0-1.946 1.37-3.678 3.348-3.97zM6.75 8.25a.75.75 0 01.75-.75h9a.75.75 0 010 1.5h-9a.75.75 0 01-.75-.75zm.75 2.25a.75.75 0 000 1.5H12a.75.75 0 000-1.5H7.5z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
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
          {topLevelComments.map((c) => {
            const replies = repliesByParent[c.id] || [];
            const isCollapsed = collapsedThreads.has(c.id);
            const hasMoreReplies = replies.length > REPLIES_PREVIEW_COUNT;
            const visibleReplies = isCollapsed
              ? []
              : hasMoreReplies && !collapsedThreads.has(`${c.id}_expanded`)
                ? replies.slice(0, REPLIES_PREVIEW_COUNT)
                : replies;
            const hiddenCount = isCollapsed
              ? replies.length
              : hasMoreReplies && !collapsedThreads.has(`${c.id}_expanded`)
                ? replies.length - REPLIES_PREVIEW_COUNT
                : 0;

            return (
              <div key={c.id} className="space-y-2">
                {/* Top-level comment */}
                <div className="group flex items-start space-x-3" role="listitem">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md bg-white/10">
                    {c.userProfilePicture ? (
                      <Link
                        href={
                          c.usernameLower ? `/${c.usernameLower}` : `/profile/${c.userId || ''}`
                        }
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
                    <div className="text-sm">
                      {c.userId ? (
                        <Link
                          href={c.usernameLower ? `/${c.usernameLower}` : `/profile/${c.userId}`}
                          prefetch={false}
                          className="font-semibold hover:underline"
                        >
                          {c.userDisplayName ||
                            (c.usernameLower
                              ? `${c.usernameLower}`
                              : currentUser && c.userId === currentUser.uid
                                ? localUserName || currentUser.displayName || 'You'
                                : `uid:${String(c.userId).slice(0, 8)}`)}
                        </Link>
                      ) : (
                        <span className="font-semibold">{c.userDisplayName || 'Unknown user'}</span>
                      )}
                      <span className="ml-2 text-gray-500">
                        {formatDate(c.timestamp?.toDate ? c.timestamp.toDate() : c.timestamp)}
                      </span>
                    </div>
                    <p className="whitespace-pre-line break-words text-sm text-gray-200">
                      {linkifyAll(c.content)}
                    </p>
                    {/* Reply button */}
                    {currentUser && (
                      <button
                        onClick={() => handleReply(c)}
                        className="mt-1 text-xs text-gray-500 hover:text-gray-300"
                      >
                        Reply
                      </button>
                    )}
                  </div>
                  {/* Delete button */}
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

                {/* Replies (indented) */}
                {visibleReplies.length > 0 && (
                  <div className="ml-8 space-y-2 border-l border-white/10 pl-3">
                    {visibleReplies.map((r) => (
                      <div key={r.id} className="group flex items-start space-x-2" role="listitem">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-md bg-white/10">
                          {r.userProfilePicture ? (
                            <Link
                              href={
                                r.usernameLower
                                  ? `/${r.usernameLower}`
                                  : `/profile/${r.userId || ''}`
                              }
                              prefetch={false}
                              className="block"
                              aria-label="View profile"
                            >
                              <Image
                                src={r.userProfilePicture}
                                alt="avatar"
                                width={24}
                                height={24}
                                sizes="24px"
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
                          <div className="text-xs">
                            {r.userId ? (
                              <Link
                                href={
                                  r.usernameLower ? `/${r.usernameLower}` : `/profile/${r.userId}`
                                }
                                prefetch={false}
                                className="font-semibold hover:underline"
                              >
                                {r.userDisplayName ||
                                  (r.usernameLower
                                    ? `${r.usernameLower}`
                                    : currentUser && r.userId === currentUser.uid
                                      ? localUserName || currentUser.displayName || 'You'
                                      : `uid:${String(r.userId).slice(0, 8)}`)}
                              </Link>
                            ) : (
                              <span className="font-semibold">
                                {r.userDisplayName || 'Unknown user'}
                              </span>
                            )}
                            <span className="ml-2 text-gray-500">
                              {formatDate(r.timestamp?.toDate ? r.timestamp.toDate() : r.timestamp)}
                            </span>
                          </div>
                          <p className="whitespace-pre-line break-words text-xs text-gray-200">
                            {linkifyAll(r.content)}
                          </p>
                        </div>
                        {/* Delete button for replies */}
                        {(currentUser?.uid === r.userId || currentUser?.uid === postOwnerId) && (
                          <button
                            onClick={() => handleDeleteComment(r.id)}
                            className="ml-auto flex h-5 w-5 shrink-0 items-center justify-center rounded text-gray-500 opacity-0 transition-opacity hover:bg-white/10 hover:text-red-400 group-hover:opacity-100"
                            title="Delete reply"
                            aria-label="Delete reply"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                              className="h-3 w-3"
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
                  </div>
                )}

                {/* Expand/collapse button for long threads */}
                {replies.length > 0 && (hiddenCount > 0 || isCollapsed) && (
                  <button
                    onClick={() => {
                      if (isCollapsed) {
                        toggleThreadCollapse(c.id);
                      } else if (hiddenCount > 0) {
                        setCollapsedThreads((prev) => new Set([...prev, `${c.id}_expanded`]));
                      }
                    }}
                    className="ml-8 text-xs text-gray-500 hover:text-gray-300"
                  >
                    {isCollapsed
                      ? `Show ${replies.length} ${replies.length === 1 ? 'reply' : 'replies'}`
                      : `Show ${hiddenCount} more ${hiddenCount === 1 ? 'reply' : 'replies'}`}
                  </button>
                )}
                {replies.length > REPLIES_PREVIEW_COUNT &&
                  collapsedThreads.has(`${c.id}_expanded`) &&
                  !isCollapsed && (
                    <button
                      onClick={() => {
                        setCollapsedThreads((prev) => {
                          const next = new Set(prev);
                          next.delete(`${c.id}_expanded`);
                          next.add(c.id);
                          return next;
                        });
                      }}
                      className="ml-8 text-xs text-gray-500 hover:text-gray-300"
                    >
                      Collapse replies
                    </button>
                  )}
              </div>
            );
          })}
          {loading && <p className="text-gray-400">Loading…</p>}
          {!loading && hasMore && (
            <button className="text-sm text-gray-300 hover:text-white" onClick={fetchMore}>
              Load more
            </button>
          )}
        </div>

        <form
          onSubmit={onSubmit}
          className="sticky bottom-0 flex flex-col border-t border-white/10 bg-[#0d0d0f] p-3 supports-[padding:env(safe-area-inset-bottom)]:pb-[env(safe-area-inset-bottom)]"
        >
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
              <button
                type="button"
                onClick={cancelReply}
                className="text-gray-500 hover:text-white"
              >
                ✕
              </button>
            </div>
          )}
          <div className="flex items-end space-x-2">
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
