"use client";
import React, { useEffect, useState } from "react";
import PostHeader from "./PostHeader";
import PostContent from "./PostContent";
import PostActions from "./PostActions";
import CommentsSheet from "./CommentsSheet";
import { db } from "../../../firebase/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { formatDate } from "@/utils/formatters";

export default function Post({ postData }) {
  // Use dummy data if postData is not provided
  const data = postData || {
    author: "Default User",
    timestamp: "Just now",
    content: "This is a sample post.",
  };

  const [showComments, setShowComments] = useState(false);
  const [liveData, setLiveData] = useState(null);

  // Live update for counts and author/avatar while post is mounted
  useEffect(() => {
    if (!postData?.id) return;
    const unsub = onSnapshot(doc(db, "posts", postData.id), (snap) => {
      if (!snap.exists()) return;
      const p = snap.data();
      setLiveData({
        likeCount: typeof p.likeCount === "number" ? p.likeCount : 0,
        commentCount: typeof p.commentCount === "number" ? p.commentCount : 0,
        author: p.userDisplayName || p.userId || data.author,
        avatarUrl: p.userProfilePicture || null,
        content: p.content ?? data.content,
        timestamp:
          formatDate(
            p.timestamp?.toDate ? p.timestamp.toDate() : p.timestamp
          ) || data.timestamp,
      });
    });
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postData?.id]);

  return (
    <div className="bg-[#0d0d0f] p-4 rounded-[14px] mb-4 border border-white/10 shadow-[0_4px_12px_-4px_#000c]">
      <PostHeader
        author={liveData?.author || data.author}
        timestamp={liveData?.timestamp || data.timestamp}
        avatarUrl={liveData?.avatarUrl ?? postData?.avatarUrl}
      />
      <PostContent content={liveData?.content ?? data.content} />
      <PostActions
        postId={postData?.id}
        likeCount={liveData?.likeCount ?? postData?.likeCount}
        commentCount={liveData?.commentCount ?? postData?.commentCount}
        onOpenComments={() => setShowComments(true)}
      />
      {/* Comments modal */}
      {showComments && postData?.id && (
        <CommentsSheet
          postId={postData.id}
          onClose={() => setShowComments(false)}
        />
      )}
    </div>
  );
}
