import React from "react";
import PostHeader from "./PostHeader";
import PostContent from "./PostContent";
import PostActions from "./PostActions";

export default function Post({ postData }) {
  // Use dummy data if postData is not provided
  const data = postData || {
    author: "Default User",
    timestamp: "Just now",
    content: "This is a sample post.",
  };

  return (
    <div className="bg-gray-900 p-4 rounded-lg mb-4 border border-gray-700">
      <PostHeader author={data.author} timestamp={data.timestamp} />
      <PostContent content={data.content} />
      <PostActions />
      {/* Optional: CommentSection could go here */}
    </div>
  );
}
