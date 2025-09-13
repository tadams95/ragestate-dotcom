'use client';

import { linkifyAll } from '@/app/utils/linkify';
import { formatDate } from '@/utils/formatters';
import {
  addDoc,
  collection,
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

export default function CommentsSheet({ postId, onClose }) {
  const { currentUser } = useAuth();
  const localUserName = useSelector(selectUserName);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [take, setTake] = useState(PAGE_SIZE);
  const [newComment, setNewComment] = useState('');
  const contentRef = useRef(null);

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
      try {
        const prof = await getDoc(doc(db, 'profiles', currentUser.uid));
        usernameLower = prof.exists() ? prof.data()?.usernameLower || null : null;
      } catch {}

      const optimistic = {
        id: `optimistic_${Date.now()}`,
        postId,
        userId: currentUser.uid,
        userDisplayName: currentUser.displayName || 'You',
        userProfilePicture: currentUser.photoURL || '',
        usernameLower: usernameLower || null,
        content: text,
        timestamp: new Date(),
        _optimistic: true,
      };
      setComments((prev) => dedupeComments([...prev, optimistic]));

      await addDoc(collection(db, 'postComments'), {
        postId,
        userId: currentUser.uid,
        userDisplayName: currentUser.displayName || null,
        userProfilePicture: currentUser.photoURL || null,
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

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 supports-[padding:env(safe-area-inset-bottom)]:pb-[env(safe-area-inset-bottom)] sm:items-center sm:p-6">
      <div className="flex max-h-[90vh] w-full flex-col rounded-t-2xl border border-white/10 bg-[#0d0d0f] text-white shadow-xl sm:max-w-2xl sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <h3 className="text-base font-semibold">Comments</h3>
          <button
            className="text-gray-400 hover:text-white"
            onClick={onClose}
            aria-label="Close"
            title="Close"
          >
            ✕
          </button>
        </div>

        <div ref={contentRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3" role="list">
          {comments.length === 0 && !loading && (
            <p className="text-gray-400">Be the first to comment.</p>
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
          {comments.map((c) => (
            <div key={c.id} className="flex items-start space-x-3" role="listitem">
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
                  <span className="text-xs text-gray-300">👤</span>
                )}
              </div>
              <div className="min-w-0">
                <div className="text-sm">
                  {c.userId ? (
                    <Link
                      href={c.usernameLower ? `/${c.usernameLower}` : `/profile/${c.userId}`}
                      prefetch={false}
                      className="font-semibold hover:underline"
                    >
                      {c.userDisplayName ||
                        (c.usernameLower
                          ? `@${c.usernameLower}`
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
              </div>
            </div>
          ))}
          {loading && <p className="text-gray-400">Loading…</p>}
          {!loading && hasMore && (
            <button className="text-sm text-gray-300 hover:text-white" onClick={fetchMore}>
              Load more
            </button>
          )}
        </div>

        <form
          onSubmit={onSubmit}
          className="sticky bottom-0 flex items-end space-x-2 border-t border-white/10 bg-[#0d0d0f] p-3 supports-[padding:env(safe-area-inset-bottom)]:pb-[env(safe-area-inset-bottom)]"
        >
          <textarea
            className="min-h-11 flex-1 rounded-lg border border-white/10 bg-[#16171a] p-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#ff1f42]"
            placeholder={currentUser ? 'Add a comment…' : 'Sign in to comment'}
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
