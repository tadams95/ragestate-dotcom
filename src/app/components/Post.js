"use client";
import React, { useState } from "react";
import PostHeader from "./PostHeader";
import PostContent from "./PostContent";
import PostActions from "./PostActions";
import CommentsSheet from "./CommentsSheet";

export default function Post({ postData }) {
  // Use dummy data if postData is not provided
  const data = postData || {
    author: "Default User",
    timestamp: "Just now",
    content: "This is a sample post.",
  };

  const [showComments, setShowComments] = useState(false);

  return (
    <div className="bg-[#0d0d0f] p-4 rounded-[14px] mb-4 border border-white/10 shadow-[0_4px_12px_-4px_#000c]">
      <PostHeader author={data.author} timestamp={data.timestamp} />
      <PostContent content={data.content} />
      <PostActions
        postId={postData?.id}
        likeCount={postData?.likeCount}
        commentCount={postData?.commentCount}
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
