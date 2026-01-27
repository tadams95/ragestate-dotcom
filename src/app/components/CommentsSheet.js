'use client';

import { linkifyAll } from '@/app/utils/linkify';
import { formatDate } from '@/utils/formatters';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { useAuth } from '../../../firebase/context/FirebaseContext';
import { db } from '../../../firebase/firebase';
import { selectUserName } from '../../../lib/features/userSlice';
import { useMentionDetection } from '../../../lib/hooks/useMentionDetection';
import MentionAutocomplete from './MentionAutocomplete';
import { VerifiedBadge } from './PostHeader';
import ReportModal from './ReportModal';

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
  const [likedCommentIds, setLikedCommentIds] = useState(new Set()); // Set of commentIds liked by current user
  const [verifiedUserIds, setVerifiedUserIds] = useState(new Set()); // Set of verified user IDs
  const [reportTarget, setReportTarget] = useState(null); // { commentId, userId } for report modal
  const contentRef = useRef(null);

  // Mention detection for @mentions in comments
  const {
    mentionState,
    handleTextChange: handleMentionChange,
    insertMention,
    closeMention,
    navigateUp,
    navigateDown,
    setSelectedIndex,
  } = useMentionDetection();
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

  // Fetch user's likes for this post
  useEffect(() => {
    if (!postId || !currentUser) {
      setLikedCommentIds(new Set());
      return;
    }
    const fetchLikes = async () => {
      try {
        const q = query(
          collection(db, 'postCommentLikes'),
          where('postId', '==', postId),
          where('userId', '==', currentUser.uid),
        );
        const snap = await getDocs(q);
        const ids = new Set(snap.docs.map((d) => d.data().commentId));
        setLikedCommentIds(ids);
      } catch (e) {
        console.error('Failed to fetch comment likes', e);
      }
    };
    fetchLikes();
  }, [postId, currentUser]);

  // Fetch verification status for commenters
  useEffect(() => {
    if (comments.length === 0) return;
    const userIds = [...new Set(comments.map((c) => c.userId).filter(Boolean))];
    // Only fetch for user IDs we haven't checked yet
    const uncheckedIds = userIds.filter((id) => !verifiedUserIds.has(id));
    if (uncheckedIds.length === 0) return;

    const fetchVerified = async () => {
      const newVerified = new Set(verifiedUserIds);
      await Promise.all(
        uncheckedIds.map(async (uid) => {
          try {
            const snap = await getDoc(doc(db, 'profiles', uid));
            if (snap.exists() && snap.data().isVerified === true) {
              newVerified.add(uid);
            }
          } catch {}
        }),
      );
      if (newVerified.size !== verifiedUserIds.size) {
        setVerifiedUserIds(newVerified);
      }
    };
    fetchVerified();
  }, [comments, verifiedUserIds]);

  // Toggle like on a comment
  const toggleLike = async (comment) => {
    if (!currentUser) {
      alert('Please sign in to like comments.');
      return;
    }
    const commentId = comment.id;
    const isLiked = likedCommentIds.has(commentId);
    const likeId = `${commentId}_${currentUser.uid}`;
    const likeRef = doc(db, 'postCommentLikes', likeId);

    // Optimistic update
    setLikedCommentIds((prev) => {
      const next = new Set(prev);
      if (isLiked) next.delete(commentId);
      else next.add(commentId);
      return next;
    });

    setComments((prev) =>
      prev.map((c) => {
        if (c.id === commentId) {
          return {
            ...c,
            likeCount: (c.likeCount || 0) + (isLiked ? -1 : 1),
          };
        }
        return c;
      }),
    );

    try {
      if (isLiked) {
        await deleteDoc(likeRef);
      } else {
        await setDoc(likeRef, {
          commentId,
          postId,
          userId: currentUser.uid,
          timestamp: serverTimestamp(),
        });
      }
    } catch (e) {
      console.error('Failed to toggle like', e);
      // Revert optimistic update if needed
    }
  };

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

  // Handle textarea change with mention detection
  const handleCommentChange = useCallback(
    (e) => {
      const value = e.target.value;
      setNewComment(value);
      // Update mention state based on cursor position
      const cursorPos = e.target.selectionStart || value.length;
      handleMentionChange(value, cursorPos);
    },
    [handleMentionChange],
  );

  // Handle mention selection
  const handleMentionSelect = useCallback(
    (user) => {
      const { text: newText, cursorPos } = insertMention(newComment, user.username);
      setNewComment(newText);
      closeMention();
      // Focus textarea and set cursor position
      if (textareaRef.current) {
        textareaRef.current.focus();
        // Set cursor after a brief delay to ensure state is updated
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.setSelectionRange(cursorPos, cursorPos);
          }
        }, 0);
      }
    },
    [newComment, insertMention, closeMention],
  );

  // Handle keyboard navigation for mentions
  const handleKeyDown = useCallback(
    (e) => {
      if (!mentionState.isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        navigateDown(9);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        navigateUp();
      } else if (e.key === 'Escape') {
        closeMention();
      }
    },
    [mentionState.isOpen, navigateDown, navigateUp, closeMention],
  );

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
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="comments-title"
    >
      <div className="flex max-h-[90vh] w-full flex-col overflow-hidden rounded-t-2xl border border-[var(--border-subtle)] bg-[var(--bg-elev-1)] pb-[env(safe-area-inset-bottom)] text-[var(--text-primary)] shadow-xl transition-colors duration-200 sm:max-w-2xl sm:rounded-2xl sm:pb-0">
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-4 py-3">
          <h3 id="comments-title" className="text-base font-semibold">
            Comments
          </h3>
          <div className="flex items-center gap-1">
            {/* Open in new tab link */}
            <Link
              href={`/post/${postId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-11 w-11 items-center justify-center rounded-full text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-elev-2)] hover:text-[var(--text-primary)]"
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
              className="flex h-11 w-11 items-center justify-center rounded-full text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-elev-2)] hover:text-[var(--text-primary)]"
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
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--bg-elev-2)]">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="h-6 w-6 text-[var(--text-tertiary)]"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.848 2.771A49.144 49.144 0 0112 2.25c2.43 0 4.817.178 7.152.52 1.978.292 3.348 2.024 3.348 3.97v6.02c0 1.946-1.37 3.678-3.348 3.97a48.901 48.901 0 01-3.476.383.39.39 0 00-.297.17l-2.755 4.133a.75.75 0 01-1.248 0l-2.755-4.133a.39.39 0 00-.297-.17 48.9 48.9 0 01-3.476-.384c-1.978-.29-3.348-2.024-3.348-3.97V6.741c0-1.946 1.37-3.678 3.348-3.97zM6.75 8.25a.75.75 0 01.75-.75h9a.75.75 0 010 1.5h-9a.75.75 0 01-.75-.75zm.75 2.25a.75.75 0 000 1.5H12a.75.75 0 000-1.5H7.5z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <p className="text-sm text-[var(--text-tertiary)]">No comments yet.</p>
              <p className="text-xs text-[var(--text-tertiary)]">
                Be the first to start the conversation.
              </p>
            </div>
          )}
          {comments.length === 0 && loading && (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-start space-x-3">
                  <div className="h-8 w-8 animate-pulse rounded-md bg-[var(--bg-elev-2)]" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-32 animate-pulse rounded bg-[var(--bg-elev-2)]" />
                    <div className="h-3 w-56 animate-pulse rounded bg-[var(--bg-elev-2)]" />
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
              <div key={c.id} className={`space-y-2 ${c._optimistic ? 'animate-slide-in-up' : ''}`}>
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
                      <div className="flex h-full w-full items-center justify-center bg-[var(--bg-elev-2)]">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          className="h-5 w-5 text-[var(--text-tertiary)]"
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
                        <span className="inline-flex items-center">
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
                          {verifiedUserIds.has(c.userId) && <VerifiedBadge />}
                        </span>
                      ) : (
                        <span className="font-semibold">{c.userDisplayName || 'Unknown user'}</span>
                      )}
                      <span className="ml-2 text-[var(--text-tertiary)]">
                        {formatDate(c.timestamp?.toDate ? c.timestamp.toDate() : c.timestamp)}
                      </span>
                    </div>
                    <p className="whitespace-pre-line break-words text-sm text-[var(--text-secondary)]">
                      {linkifyAll(c.content)}
                    </p>
                    {/* Reply & Like buttons */}
                    <div className="-ml-2 mt-1 flex items-center gap-1">
                      {currentUser && (
                        <button
                          onClick={() => handleReply(c)}
                          className="min-h-[44px] px-2 text-xs text-[var(--text-tertiary)] transition-colors duration-150 hover:text-[var(--text-secondary)]"
                        >
                          Reply
                        </button>
                      )}
                      <button
                        onClick={() => toggleLike(c)}
                        className={`flex min-h-[44px] items-center gap-1 px-2 text-xs transition-all duration-150 active:scale-95 ${
                          likedCommentIds.has(c.id)
                            ? 'text-red-500'
                            : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
                        }`}
                        aria-label={likedCommentIds.has(c.id) ? 'Unlike comment' : 'Like comment'}
                      >
                        {likedCommentIds.has(c.id) ? (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            className="h-3.5 w-3.5"
                          >
                            <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
                          </svg>
                        ) : (
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
                              d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
                            />
                          </svg>
                        )}
                        {c.likeCount > 0 && <span>{c.likeCount}</span>}
                      </button>
                      {/* Report button for other users' comments */}
                      {currentUser && currentUser.uid !== c.userId && (
                        <button
                          onClick={() => setReportTarget({ commentId: c.id, userId: c.userId })}
                          className="min-h-[44px] px-2 text-xs text-[var(--text-tertiary)] transition-colors duration-150 hover:text-red-400"
                          title="Report comment"
                        >
                          Report
                        </button>
                      )}
                    </div>
                  </div>
                  {/* Delete button */}
                  {(currentUser?.uid === c.userId || currentUser?.uid === postOwnerId) && (
                    <button
                      onClick={() => handleDeleteComment(c.id)}
                      className="ml-auto flex h-11 w-11 shrink-0 items-center justify-center rounded text-[var(--text-tertiary)] opacity-0 transition-all duration-200 hover:bg-[var(--bg-elev-2)] hover:text-red-400 group-hover:opacity-100"
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
                  <div className="ml-8 space-y-2 border-l border-[var(--border-subtle)] pl-3">
                    {visibleReplies.map((r) => (
                      <div key={r.id} className="group flex items-start space-x-2" role="listitem">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-md bg-[var(--bg-elev-2)]">
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
                            <div className="flex h-full w-full items-center justify-center bg-[var(--bg-elev-2)]">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                                className="h-4 w-4 text-[var(--text-tertiary)]"
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
                              <span className="inline-flex items-center">
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
                                {verifiedUserIds.has(r.userId) && <VerifiedBadge />}
                              </span>
                            ) : (
                              <span className="font-semibold">
                                {r.userDisplayName || 'Unknown user'}
                              </span>
                            )}
                            <span className="ml-2 text-[var(--text-tertiary)]">
                              {formatDate(r.timestamp?.toDate ? r.timestamp.toDate() : r.timestamp)}
                            </span>
                          </div>
                          <p className="whitespace-pre-line break-words text-xs text-[var(--text-secondary)]">
                            {linkifyAll(r.content)}
                          </p>
                          <button
                            onClick={() => toggleLike(r)}
                            className={`-ml-2 mt-0.5 flex min-h-[44px] items-center gap-1 px-2 text-xs transition-all duration-150 active:scale-95 ${
                              likedCommentIds.has(r.id)
                                ? 'text-red-500'
                                : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
                            }`}
                            aria-label={likedCommentIds.has(r.id) ? 'Unlike reply' : 'Like reply'}
                          >
                            {likedCommentIds.has(r.id) ? (
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                                className="h-3 w-3"
                              >
                                <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
                              </svg>
                            ) : (
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={1.5}
                                stroke="currentColor"
                                className="h-3 w-3"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
                                />
                              </svg>
                            )}
                            {r.likeCount > 0 && <span>{r.likeCount}</span>}
                          </button>
                        </div>
                        {/* Delete button for replies */}
                        {(currentUser?.uid === r.userId || currentUser?.uid === postOwnerId) && (
                          <button
                            onClick={() => handleDeleteComment(r.id)}
                            className="ml-auto flex h-11 w-11 shrink-0 items-center justify-center rounded text-[var(--text-tertiary)] opacity-0 transition-all duration-200 hover:bg-[var(--bg-elev-2)] hover:text-red-400 group-hover:opacity-100"
                            title="Delete reply"
                            aria-label="Delete reply"
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
                    className="ml-8 min-h-[44px] px-2 text-xs text-[var(--text-tertiary)] transition-colors duration-150 hover:text-[var(--text-secondary)]"
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
                      className="ml-8 min-h-[44px] px-2 text-xs text-[var(--text-tertiary)] transition-colors duration-150 hover:text-[var(--text-secondary)]"
                    >
                      Collapse replies
                    </button>
                  )}
              </div>
            );
          })}
          {loading && <p className="text-[var(--text-tertiary)]">Loading…</p>}
          {!loading && hasMore && (
            <button
              className="min-h-[44px] px-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              onClick={fetchMore}
            >
              Load more
            </button>
          )}
        </div>

        <form
          onSubmit={onSubmit}
          className="flex shrink-0 flex-col border-t border-[var(--border-subtle)] bg-[var(--bg-elev-1)] p-3"
        >
          {/* Reply indicator */}
          {replyingTo && (
            <div className="mb-2 flex items-center justify-between rounded bg-[var(--bg-elev-2)] px-2 py-1 text-xs text-[var(--text-tertiary)]">
              <span>
                Replying to{' '}
                <span className="font-medium text-[var(--text-primary)]">
                  {replyingTo.usernameLower
                    ? `@${replyingTo.usernameLower}`
                    : replyingTo.userDisplayName}
                </span>
              </span>
              <button
                type="button"
                onClick={cancelReply}
                className="flex h-11 w-11 items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
              >
                ✕
              </button>
            </div>
          )}
          <div className="relative flex items-end space-x-2">
            <div className="relative flex-1">
              <textarea
                ref={textareaRef}
                className="min-h-11 w-full resize-none rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elev-2)] p-3 text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none ring-0 transition-colors focus:border-[#ff1f42] focus:ring-1 focus:ring-[#ff1f42]"
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
                onChange={handleCommentChange}
                onKeyDown={handleKeyDown}
                onSelect={(e) => handleMentionChange(newComment, e.target.selectionStart)}
                disabled={!currentUser}
                inputMode="text"
                enterKeyHint="send"
              />
              {/* Mention autocomplete dropdown */}
              {mentionState.isOpen && (
                <div className="absolute bottom-full left-0 right-0 mb-1">
                  <MentionAutocomplete
                    query={mentionState.query}
                    isOpen={mentionState.isOpen}
                    onSelect={handleMentionSelect}
                    onClose={closeMention}
                    selectedIndex={mentionState.selectedIndex}
                    onSelectedIndexChange={setSelectedIndex}
                  />
                </div>
              )}
            </div>
            <button
              type="submit"
              disabled={!currentUser || newComment.trim().length === 0}
              className="h-11 rounded-lg bg-[#ff1f42] px-4 py-2.5 text-sm font-semibold text-white transition-all duration-150 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </form>

        {/* Report Modal */}
        {reportTarget && (
          <ReportModal
            isOpen={!!reportTarget}
            onClose={() => setReportTarget(null)}
            contentType="comment"
            contentId={reportTarget.commentId}
            reportedUserId={reportTarget.userId}
          />
        )}
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
