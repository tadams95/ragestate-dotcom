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

// Firestore 'in' queries accept up to 10 IDs; pick a smaller page size to be safe
const PAGE_SIZE = 5;

export default function Feed() {
  const { currentUser, loading: authLoading } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  // 'user' = personalized feed via userFeeds.postIds; 'public' = fallback to latest public posts
  const [feedMode, setFeedMode] = useState(null);
  const [postIdsCache, setPostIdsCache] = useState(null);
  const [lastPublicDoc, setLastPublicDoc] = useState(null);
  const observer = useRef();

  const resetAndLoad = useCallback(() => {
    setPosts([]);
    setPage(1);
    setHasMore(true);
    setFeedMode(null);
    setPostIdsCache(null);
    setLastPublicDoc(null);
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
      let idsCache = postIdsCache;
      if (!mode) {
        if (!currentUser) {
          mode = "public";
        } else {
          const feedSnap = await getDoc(doc(db, "userFeeds", currentUser.uid));
          const ids = feedSnap.exists() ? feedSnap.data().postIds || [] : [];
          if (ids.length > 0) {
            mode = "user";
            idsCache = ids;
          } else {
            mode = "public";
          }
        }
        // Persist for subsequent calls
        setFeedMode(mode);
        if (idsCache) setPostIdsCache(idsCache);
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

      // USER mode: read post IDs from cache (or fetch once) and page through
      let postIds = idsCache || postIdsCache;
      if (!postIds) {
        const feedSnap = await getDoc(doc(db, "userFeeds", currentUser.uid));
        postIds = feedSnap.exists() ? feedSnap.data().postIds || [] : [];
        setPostIdsCache(postIds);
      }

      const startIndex = (page - 1) * PAGE_SIZE;
      const slice = postIds.slice(startIndex, startIndex + PAGE_SIZE);

      if (slice.length === 0) {
        // If user's feed is empty, gracefully switch to public mode
        setFeedMode("public");
        // Trigger a public fetch on next intersection tick
        setHasMore(true);
        setLoading(false);
        return;
      }

      // Fetch posts by ID in one or more 'in' queries (10 max per query)
      const chunks = [];
      for (let i = 0; i < slice.length; i += 10) {
        chunks.push(slice.slice(i, i + 10));
      }

      const results = [];
      await Promise.all(
        chunks.map(async (ids) => {
          const qIds = query(
            collection(db, "posts"),
            where(documentId(), "in", ids)
          );
          const snap = await getDocs(qIds);
          snap.forEach((d) => results.push({ id: d.id, ...d.data() }));
        })
      );

      // Sort by timestamp desc and map to Post component shape
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
      setPage((prev) => prev + 1);
      if (slice.length < PAGE_SIZE) setHasMore(false);
    } catch (err) {
      console.error("Failed to fetch feed:", err);
    } finally {
      setLoading(false);
    }
  }, [currentUser, page, hasMore, loading]);

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
    if (!authLoading) {
      fetchFeedPage();
    }
  }, [authLoading, fetchFeedPage]);

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
