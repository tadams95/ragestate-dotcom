import React from "react";

export default function PostContent({ content }) {
  return (
    <div className="mb-3">
      <p>{content || "This is the post content."}</p>
      {/* Placeholder for images/videos */}
    </div>
  );
}
