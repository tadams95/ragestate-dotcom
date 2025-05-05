import React from "react";

export default function PostActions() {
  // Placeholder counts and actions
  const likeCount = 0;
  const commentCount = 0;

  return (
    <div className="flex space-x-4 text-gray-400">
      <button className="hover:text-white">Like ({likeCount})</button>
      <button className="hover:text-white">Comment ({commentCount})</button>
      <button className="hover:text-white">Share</button>
    </div>
  );
}
