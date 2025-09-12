"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSelector } from "react-redux";
import { selectUserName } from "../../../lib/features/todos/userSlice";
import { db } from "../../../firebase/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useAuth } from "../../../firebase/context/FirebaseContext";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  addDoc,
  serverTimestamp,
  onSnapshot,
} from "firebase/firestore";
import { formatDate } from "@/utils/formatters";

const PAGE_SIZE = 20;

export default function CommentsSheet({ postId, onClose }) {
  const { currentUser } = useAuth();
  const localUserName = useSelector(selectUserName);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [take, setTake] = useState(PAGE_SIZE);
  const [newComment, setNewComment] = useState("");
  const contentRef = useRef(null);

  // Live listener with incremental limit
  useEffect(() => {
    if (!postId) return;
    setLoading(true);
    const q = query(
      collection(db, "postComments"),
      where("postId", "==", postId),
      orderBy("timestamp", "asc"),
      limit(take)
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
        console.error("Comments live listener error", e);
        setLoading(false);
      }
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
      alert("Please sign in to comment.");
      return;
    }
    try {
      setNewComment("");
      // Optimistic prepend (we display in asc order; append makes sense)
      // Resolve usernameLower once for link consistency
      let usernameLower = null;
      try {
        const prof = await getDoc(doc(db, "profiles", currentUser.uid));
        usernameLower = prof.exists() ? prof.data()?.usernameLower || null : null;
      } catch {}

      const optimistic = {
        id: `optimistic_${Date.now()}`,
        postId,
        userId: currentUser.uid,
        userDisplayName: currentUser.displayName || "You",
        userProfilePicture: currentUser.photoURL || "",
        usernameLower: usernameLower || null,
        content: text,
        timestamp: new Date(),
        _optimistic: true,
      };
      setComments((prev) => dedupeComments([...prev, optimistic]));

      await addDoc(collection(db, "postComments"), {
        postId,
        userId: currentUser.uid,
        userDisplayName: currentUser.displayName || null,
        userProfilePicture: currentUser.photoURL || null,
        usernameLower: usernameLower || null,
        content: text,
        timestamp: serverTimestamp(),
      });
      try {
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("comments:new", { detail: { postId } })
          );
        }
      } catch {}
      setComments((prev) => dedupeComments(prev));
    } catch (e) {
      console.error("Failed to post comment", e);
      // Revert optimistic if needed (simple: reload list next open)
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-6 supports-[padding:env(safe-area-inset-bottom)]:pb-[env(safe-area-inset-bottom)]">
      <div className="w-full sm:max-w-2xl bg-[#0d0d0f] text-white rounded-t-2xl sm:rounded-2xl border border-white/10 shadow-xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
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

        <div
          ref={contentRef}
          className="flex-1 overflow-y-auto px-4 py-3 space-y-3"
          role="list"
        >
          {comments.length === 0 && !loading && (
            <p className="text-gray-400">Be the first to comment.</p>
          )}
          {comments.map((c) => (
            <div
              key={c.id}
              className="flex items-start space-x-3"
              role="listitem"
            >
              <div className="w-8 h-8 rounded-md bg-white/10 flex items-center justify-center overflow-hidden">
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
                      className="w-full h-full object-cover"
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
                        (currentUser && c.userId === currentUser.uid
                          ? localUserName || currentUser.displayName || "You"
                          : "User")}
                    </Link>
                  ) : (
                    <span className="font-semibold">
                      {c.userDisplayName || "User"}
                    </span>
                  )}
                  <span className="text-gray-500 ml-2">
                    {formatDate(
                      c.timestamp?.toDate ? c.timestamp.toDate() : c.timestamp
                    )}
                  </span>
                </div>
                <p className="text-sm text-gray-200 whitespace-pre-wrap break-words">
                  {c.content}
                </p>
              </div>
            </div>
          ))}
          {loading && <p className="text-gray-400">Loading…</p>}
          {!loading && hasMore && (
            <button
              className="text-sm text-gray-300 hover:text-white"
              onClick={fetchMore}
            >
              Load more
            </button>
          )}
        </div>

        <form
          onSubmit={onSubmit}
          className="border-t border-white/10 p-3 flex items-end space-x-2 sticky bottom-0 bg-[#0d0d0f] supports-[padding:env(safe-area-inset-bottom)]:pb-[env(safe-area-inset-bottom)]"
        >
          <textarea
            className="flex-1 bg-[#16171a] text-sm text-white placeholder-gray-500 rounded-lg p-3 min-h-11 border border-white/10 focus:outline-none focus:ring-2 focus:ring-[#ff1f42]"
            placeholder={currentUser ? "Add a comment…" : "Sign in to comment"}
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
            className="px-4 py-2.5 h-11 text-sm font-semibold rounded-lg bg-[#ff1f42] text-white disabled:opacity-50 disabled:cursor-not-allowed active:opacity-80"
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
    list
      .filter((c) => !c._optimistic)
      .map((c) => `${c.userId || ""}|${(c.content || "").trim()}`)
  );
  for (const c of list) {
    if (c._optimistic) {
      const sig = `${c.userId || ""}|${(c.content || "").trim()}`;
      if (realSigs.has(sig)) continue;
    }
    if (!byId.has(c.id)) byId.set(c.id, c);
  }
  return Array.from(byId.values());
}
