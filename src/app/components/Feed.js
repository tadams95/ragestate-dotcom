"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../../../firebase/context/FirebaseContext";
import { db } from "../../../firebase/firebase";
import Post from "./Post";
import PostSkeleton from "./PostSkeleton";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  documentId,
  orderBy,
  limit,
  startAfter,
} from "firebase/firestore";
import { formatDate } from "@/utils/formatters";

// Firestore 'in' queries accept up to 10 IDs; page size <= 10 is safest
const PAGE_SIZE = 10;

export default function Feed({ forcePublic = false }) {
  const { currentUser, loading: authLoading } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  // 'user' = personalized feed via userFeeds.postIds; 'public' = fallback to latest public posts
  const [feedMode, setFeedMode] = useState(null);
  const [lastPublicDoc, setLastPublicDoc] = useState(null);
  const [lastPersonalDoc, setLastPersonalDoc] = useState(null);
  const observer = useRef();

  const resetAndLoad = useCallback(() => {
    setPosts([]);
    setHasMore(true);
    setFeedMode(null);
    setLastPublicDoc(null);
    setLastPersonalDoc(null);
  }, []);

  useEffect(() => {
    // Reset feed when auth state changes
    resetAndLoad();
  }, [currentUser, resetAndLoad]);

  const fetchFeedPage = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      // Determine mode synchronously for this call
      let mode = feedMode;
      if (forcePublic) {
        mode = "public";
        setFeedMode(mode);
      }

      if (!mode) {
        if (!currentUser) {
          mode = "public";
        } else {
          // Try personalized feed first by peeking at one feedItems doc
          const firstPageQ = query(
            collection(db, "userFeeds", currentUser.uid, "feedItems"),
            orderBy("timestamp", "desc"),
            limit(PAGE_SIZE)
          );
          const peek = await getDocs(firstPageQ);
          mode = peek.size > 0 ? "user" : "public";
        }
        // Persist for subsequent calls
        setFeedMode(mode);
      }

      // PUBLIC mode: show latest posts site-wide
      if (!currentUser || mode === "public") {
        try {
          const constraints = [
            where("isPublic", "==", true),
            orderBy("timestamp", "desc"),
            limit(PAGE_SIZE),
          ];
          if (lastPublicDoc) constraints.push(startAfter(lastPublicDoc));
          const qPublic = query(collection(db, "posts"), ...constraints);
          const snap = await getDocs(qPublic);

          const mapped = snap.docs.map((d) => {
            const p = d.data();
            return {
              id: d.id,
              author: p.userDisplayName || p.userId || "User",
              timestamp: formatDate(
                p.timestamp?.toDate ? p.timestamp.toDate() : p.timestamp
              ),
              content: p.content || "",
            };
          });

          setPosts((prev) => [...prev, ...mapped]);
          setLastPublicDoc(snap.docs[snap.docs.length - 1] || null);
          if (snap.size < PAGE_SIZE) setHasMore(false);
          return;
        } catch (e) {
          // Likely missing composite index: fall back to timestamp-only query and filter client-side
          console.warn(
            "Public feed index missing, falling back to timestamp-only query",
            e?.code || e
          );
          const constraints = [orderBy("timestamp", "desc"), limit(PAGE_SIZE)];
          if (lastPublicDoc) constraints.push(startAfter(lastPublicDoc));
          const qFallback = query(collection(db, "posts"), ...constraints);
          const snap = await getDocs(qFallback);
          const mapped = snap.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .filter((p) => p.isPublic)
            .map((p) => ({
              id: p.id,
              author: p.userDisplayName || p.userId || "User",
              timestamp: formatDate(
                p.timestamp?.toDate ? p.timestamp.toDate() : p.timestamp
              ),
              content: p.content || "",
            }));

          setPosts((prev) => [...prev, ...mapped]);
          setLastPublicDoc(snap.docs[snap.docs.length - 1] || null);
          if (snap.size < PAGE_SIZE) setHasMore(false);
          return;
        }
      }

      // USER mode: read from userFeeds/{uid}/feedItems ordered by timestamp desc
      const constraints = [orderBy("timestamp", "desc"), limit(PAGE_SIZE)];
      if (lastPersonalDoc) constraints.push(startAfter(lastPersonalDoc));
      const feedItemsQ = query(
        collection(db, "userFeeds", currentUser.uid, "feedItems"),
        ...constraints
      );
      const feedSnap = await getDocs(feedItemsQ);

      if (feedSnap.empty) {
        // If no personalized items, gracefully switch to public mode
        setFeedMode("public");
        setLastPersonalDoc(null);
        setLoading(false);
        // Trigger a public fetch on next intersection
        return;
      }

      const ids = feedSnap.docs.map((d) => d.id);
      // Fetch posts in chunks of 10
      const chunks = [];
      for (let i = 0; i < ids.length; i += 10)
        chunks.push(ids.slice(i, i + 10));

      const results = [];
      for (const group of chunks) {
        const qIds = query(
          collection(db, "posts"),
          where(documentId(), "in", group)
        );
        const snap = await getDocs(qIds);
        snap.forEach((d) => results.push({ id: d.id, ...d.data() }));
      }

      // Sort by timestamp desc and map
      results.sort((a, b) => {
        const ta = a.timestamp?.toDate ? a.timestamp.toDate().getTime() : 0;
        const tb = b.timestamp?.toDate ? b.timestamp.toDate().getTime() : 0;
        return tb - ta;
      });

      const mapped = results.map((p) => ({
        id: p.id,
        author: p.userDisplayName || p.userId || "User",
        timestamp: formatDate(
          p.timestamp?.toDate ? p.timestamp.toDate() : p.timestamp
        ),
        content: p.content || "",
      }));

      setPosts((prev) => [...prev, ...mapped]);
      setLastPersonalDoc(feedSnap.docs[feedSnap.docs.length - 1] || null);
      if (feedSnap.size < PAGE_SIZE) setHasMore(false);
    } catch (err) {
      console.error("Failed to fetch feed:", err);
    } finally {
      setLoading(false);
    }
  }, [currentUser, hasMore, loading, feedMode, lastPublicDoc, lastPersonalDoc]);

  // Intersection observer for infinite scroll
  const lastPostElementRef = useCallback(
    (node) => {
      if (loading) return;
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          fetchFeedPage();
        }
      });
      if (node) observer.current.observe(node);
    },
    [loading, hasMore, fetchFeedPage]
  );

  // Initial load once auth settles
  useEffect(() => {
    if (!authLoading || forcePublic) {
      fetchFeedPage();
    }
  }, [authLoading, forcePublic, fetchFeedPage]);

  if (authLoading) {
    return <p className="text-center text-gray-400">Checking auth…</p>;
  }

  // If not signed in, we'll still show public posts

  if (posts.length === 0 && loading) {
    return (
      <div className="max-w-2xl mx-auto">
        {Array.from({ length: 3 }).map((_, i) => (
          <PostSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (posts.length === 0 && !hasMore) {
    return (
      <p className="text-center text-gray-400">
        No posts yet.{" "}
        {currentUser
          ? "Follow creators to see updates."
          : "Sign in to personalize your feed."}
      </p>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {posts.map((post, index) => {
        if (posts.length === index + 1) {
          return (
            <div ref={lastPostElementRef} key={post.id}>
              <Post postData={post} />
            </div>
          );
        } else {
          return <Post key={post.id} postData={post} />;
        }
      })}
      {loading && (
        <p className="text-center text-gray-400 py-4">Loading more posts...</p>
      )}
      {!loading && !hasMore && posts.length > 0 && (
        <p className="text-center text-gray-500 py-4">
          You've reached the end!
        </p>
      )}
    </div>
  );
}
