"use client";

import React, { useState, useEffect, useRef, useCallback } from "react"; // Import useRef and useCallback
import Post from "./Post";

// Simulate an API call that returns paginated data
const fetchDummyPosts = async (page = 1, limit = 3) => {
  console.log(`Fetching page ${page}`);
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 1000));

  const allPosts = [
    {
      id: 1,
      author: "User One",
      timestamp: "2h ago",
      content: "This is just a placeholder post.",
    },
    {
      id: 2,
      author: "User Two",
      timestamp: "1h ago",
      content: "This is what the feed may look like.",
    },
    {
      id: 3,
      author: "User Three",
      timestamp: "30m ago",
      content: "Testing in prod is not the best idea but here we are.",
    },
    {
      id: 4,
      author: "User Four",
      timestamp: "3h ago",
      content: "More content loading.",
    },
    {
      id: 5,
      author: "User Five",
      timestamp: "4h ago",
      content: "Infinite scroll is cool.",
    },
    {
      id: 6,
      author: "User Six",
      timestamp: "5h ago",
      content: "Almost at the end?",
    },
    {
      id: 7,
      author: "User Seven",
      timestamp: "6h ago",
      content: "Keep scrolling...",
    },
    {
      id: 8,
      author: "User Eight",
      timestamp: "7h ago",
      content: "Another one.",
    },
    {
      id: 9,
      author: "User Nine",
      timestamp: "8h ago",
      content: "The final simulated post.",
    },
  ];

  const start = (page - 1) * limit;
  const end = start + limit;
  const posts = allPosts.slice(start, end);
  const hasMore = end < allPosts.length; // Check if there are more posts available

  return { posts, hasMore };
};

export default function Feed() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false); // Initially false, true only during fetch
  const [page, setPage] = useState(1); // Track current page
  const [hasMore, setHasMore] = useState(true); // Track if more posts are available
  const observer = useRef(); // Ref for the IntersectionObserver

  const loadMorePosts = useCallback(async () => {
    if (loading || !hasMore) return; // Don't fetch if already loading or no more posts
    setLoading(true);
    try {
      const { posts: newPosts, hasMore: moreAvailable } = await fetchDummyPosts(
        page
      );
      setPosts((prevPosts) => [...prevPosts, ...newPosts]);
      setPage((prevPage) => prevPage + 1);
      setHasMore(moreAvailable);
    } catch (error) {
      console.error("Failed to fetch posts:", error);
      // Handle error state if needed
    } finally {
      setLoading(false);
    }
  }, [page, loading, hasMore]); // Dependencies for the callback

  // Ref for the sentinel element
  const lastPostElementRef = useCallback(
    (node) => {
      if (loading) return; // Don't observe while loading
      if (observer.current) observer.current.disconnect(); // Disconnect previous observer

      observer.current = new IntersectionObserver((entries) => {
        // If the sentinel element is intersecting (visible) and there are more posts
        if (entries[0].isIntersecting && hasMore) {
          loadMorePosts();
        }
      });

      if (node) observer.current.observe(node); // Observe the new sentinel node
    },
    [loading, hasMore, loadMorePosts]
  ); // Dependencies for the ref callback

  // Initial data load
  useEffect(() => {
    loadMorePosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

  // Initial loading state before any posts are loaded
  if (posts.length === 0 && loading) {
    return <p className="text-center text-gray-400">Loading feed...</p>;
  }

  if (posts.length === 0 && !hasMore) {
    return <p className="text-center text-gray-400">No posts yet.</p>;
  }

  return (
    <div className="max-w-2xl mx-auto">
      {posts.map((post, index) => {
        // If it's the last post, attach the ref to it
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
      {/* Show loading indicator at the bottom while fetching more */}
      {loading && (
        <p className="text-center text-gray-400 py-4">Loading more posts...</p>
      )}
      {/* Show message when all posts are loaded */}
      {!loading && !hasMore && posts.length > 0 && (
        <p className="text-center text-gray-500 py-4">
          You've reached the end!
        </p>
      )}
    </div>
  );
}
