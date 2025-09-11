"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogPanel } from "@headlessui/react";
import { useSelector } from "react-redux";
import { selectUserName } from "../../../lib/features/todos/userSlice";
import { useAuth } from "../../../firebase/context/FirebaseContext";
import { db, storage } from "../../../firebase/firebase";
import { collection, doc, serverTimestamp, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

const DRAFT_KEY = "postComposer.draft";

export default function PostComposer() {
  const { currentUser } = useAuth();
  const localUserName = useSelector(selectUserName);
  const [content, setContent] = useState("");
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [savedDraft, setSavedDraft] = useState("");
  const saveTimerRef = useRef(null);

  // Load saved draft (don't auto-apply; offer recovery)
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(DRAFT_KEY);
      if (saved) setSavedDraft(saved);
    } catch {}
  }, []);

  // Debounced autosave ~3s when dirty
  useEffect(() => {
    try {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      const dirty = content.trim().length > 0;
      if (!dirty) {
        // If cleared, also clear storage
        sessionStorage.removeItem(DRAFT_KEY);
        return;
      }
      saveTimerRef.current = setTimeout(() => {
        try {
          sessionStorage.setItem(DRAFT_KEY, content);
          setSavedDraft(content);
        } catch {}
      }, 3000);
    } catch {}
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [content]);

  // Generate preview when file selected
  useEffect(() => {
    if (!file) {
      setPreviewUrl("");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const canSubmit = useMemo(() => {
    const hasText = content.trim().length >= 2;
    const hasMedia = !!file;
    return (hasText || hasMedia) && !submitting;
  }, [content, file, submitting]);

  const onPickFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      setError("Only image files are allowed.");
      return;
    }
    setError("");
    setFile(f);
  };

  const onRemoveFile = () => {
    setFile(null);
    setPreviewUrl("");
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser) {
      alert("Please sign in to post.");
      return;
    }
    if (!canSubmit) return;
    setSubmitting(true);
    setError("");
    try {
      // Create a new post ref to derive postId for storage path
      const postsCol = collection(db, "posts");
      const postRef = doc(postsCol);

      let mediaUrls = [];
      if (file) {
        const storageRef = ref(
          storage,
          `posts/${postRef.id}/${Date.now()}_${file.name.replace(/\s+/g, "_")}`
        );
        const snap = await uploadBytes(storageRef, file);
        const url = await getDownloadURL(snap.ref);
        mediaUrls = [url];
      }

      // Resolve display name and profile image
      let resolvedName = (
        localUserName ||
        currentUser.displayName ||
        ""
      ).trim();
      if (!resolvedName) {
        try {
          const fn = localStorage.getItem("firstName") || "";
          const ln = localStorage.getItem("lastName") || "";
          resolvedName = `${fn} ${ln}`.trim();
        } catch {}
      }
      if (!resolvedName) {
        resolvedName = currentUser.email?.split("@")[0] || "User";
      }

      let resolvedPhoto = currentUser.photoURL || null;
      if (!resolvedPhoto) {
        try {
          const lsPhoto = localStorage.getItem("profilePicture");
          if (lsPhoto) resolvedPhoto = lsPhoto;
        } catch {}
      }

      const payload = {
        userId: currentUser.uid,
        userDisplayName: resolvedName,
        userProfilePicture: resolvedPhoto || null,
        content: content.trim(),
        isPublic: true,
        timestamp: serverTimestamp(),
        likeCount: 0,
        commentCount: 0,
      };
      if (mediaUrls.length) payload.mediaUrls = mediaUrls;

      await setDoc(postRef, payload);

      // Broadcast to feed so it can prepend without a hard refresh
      try {
        const newPost = {
          id: postRef.id,
          author: payload.userDisplayName || payload.userId || "User",
          avatarUrl: payload.userProfilePicture || null,
          timestamp: "Just now",
          content: payload.content,
          likeCount: 0,
          commentCount: 0,
        };
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("feed:new-post", { detail: newPost })
          );
        }
      } catch {}

      // Reset form and draft
      setContent("");
      setFile(null);
      setPreviewUrl("");
      try {
        sessionStorage.removeItem(DRAFT_KEY);
      } catch {}
    } catch (err) {
      console.error("Failed to create post:", err);
      setError("Failed to create post. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!currentUser) return null; // Keep minimal per spec

  return (
    <div className="max-w-2xl mx-auto mb-6">
      {/* Collapsed trigger */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full bg-[#0d0d0f] text-left text-gray-300 hover:text-white p-3 rounded-[14px] border border-white/10 active:opacity-80"
      >
        {savedDraft && !content ? "Continue your draft…" : "Share something…"}
      </button>

      <Dialog open={open} onClose={setOpen} className="relative z-50">
        <div className="fixed inset-0 bg-black/60" aria-hidden="true" />
        <div className="fixed inset-0 flex items-end sm:items-center justify-center supports-[padding:env(safe-area-inset-bottom)]:pb-[env(safe-area-inset-bottom)]">
          <DialogPanel className="w-full sm:max-w-2xl bg-[#0d0d0f] text-white rounded-t-2xl sm:rounded-2xl border border-white/10 shadow-xl p-4 sm:p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-semibold">Create post</h3>
              <button
                onClick={() => setOpen(false)}
                className="text-gray-400 hover:text-white"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            {/* Recovery prompt */}
            {savedDraft && !content && (
              <div className="mb-3 text-sm text-gray-300 bg-white/5 border border-white/10 rounded p-3 flex items-center justify-between">
                <span>We found a saved draft.</span>
                <div className="space-x-2">
                  <button
                    className="text-[#ff1f42] hover:text-[#ff415f] font-semibold"
                    onClick={() => {
                      setContent(savedDraft);
                    }}
                  >
                    Recover
                  </button>
                  <button
                    className="text-gray-400 hover:text-white"
                    onClick={() => {
                      try {
                        sessionStorage.removeItem(DRAFT_KEY);
                      } catch {}
                      setSavedDraft("");
                    }}
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}

            <form onSubmit={onSubmit}>
              <textarea
                className="w-full bg-transparent text-white placeholder-gray-500 outline-none resize-none min-h-[120px]"
                placeholder="What's happening?"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                maxLength={2000}
                autoFocus
              />
              {previewUrl && (
                <div className="mt-3 relative">
                  {/* Using regular img for blob URL preview keeps it simple; set explicit dimensions to reduce CLS */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrl}
                    alt="Selected preview"
                    className="rounded-md object-contain border border-white/10 max-h-[60vh] w-full"
                    loading="eager"
                  />
                  <button
                    type="button"
                    onClick={onRemoveFile}
                    className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded"
                  >
                    Remove
                  </button>
                </div>
              )}
              {error && (
                <p className="text-red-400 text-sm mt-2" role="alert">
                  {error}
                </p>
              )}
              <div className="flex items-center justify-between mt-4">
                <div>
                  <label className="inline-flex items-center gap-2 text-sm text-gray-300 cursor-pointer hover:text-white h-11">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={onPickFile}
                      className="hidden"
                    />
                    <span className="px-3 py-2.5 border border-white/20 rounded hover:bg-white/10 active:opacity-80 inline-flex items-center">
                      Add image
                    </span>
                  </label>
                </div>
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className={`px-4 py-2.5 h-11 rounded font-semibold active:opacity-80 ${
                    canSubmit
                      ? "bg-[#ff1f42] hover:bg-[#ff415f] text-white"
                      : "bg-gray-700 text-gray-400 cursor-not-allowed"
                  }`}
                >
                  {submitting ? "Posting…" : "Post"}
                </button>
              </div>
            </form>
          </DialogPanel>
        </div>
      </Dialog>
    </div>
  );
}
