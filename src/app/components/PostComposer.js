"use client";

import React, { useEffect, useMemo, useState } from "react";
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

  // Load draft from sessionStorage
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(DRAFT_KEY);
      if (saved) setContent(saved);
    } catch {}
  }, []);

  // Save draft on change
  useEffect(() => {
    try {
      sessionStorage.setItem(DRAFT_KEY, content);
    } catch {}
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

  const canSubmit = useMemo(
    () => content.trim().length > 0 && !submitting,
    [content, submitting]
  );

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
    <form onSubmit={onSubmit} className="max-w-2xl mx-auto mb-6">
      <div className="bg-[#0d0d0f] p-4 rounded-[14px] border border-white/10">
        <textarea
          className="w-full bg-transparent text-white placeholder-gray-500 outline-none resize-none min-h-[80px]"
          placeholder="Share something…"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          maxLength={2000}
        />
        {previewUrl && (
          <div className="mt-3 relative">
            <img
              src={previewUrl}
              alt="Selected preview"
              className="rounded-md max-h-64 object-contain border border-white/10"
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
            <label className="inline-flex items-center gap-2 text-sm text-gray-300 cursor-pointer hover:text-white">
              <input
                type="file"
                accept="image/*"
                onChange={onPickFile}
                className="hidden"
              />
              <span className="px-3 py-1.5 border border-white/20 rounded hover:bg-white/10">
                Add image
              </span>
            </label>
          </div>
          <button
            type="submit"
            disabled={!canSubmit}
            className={`px-4 py-1.5 rounded font-semibold ${
              canSubmit
                ? "bg-[#ff1f42] hover:bg-[#ff415f] text-white"
                : "bg-gray-700 text-gray-400 cursor-not-allowed"
            }`}
          >
            {submitting ? "Posting…" : "Post"}
          </button>
        </div>
      </div>
    </form>
  );
}
