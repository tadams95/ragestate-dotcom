import React from "react";

export default function PostHeader({ author, timestamp }) {
  return (
    <div className="flex items-center space-x-2 mb-2">
      {/* Placeholder for avatar */}
      <div className="w-8 h-8 bg-gray-500 rounded-full"></div>
      <div>
        <p className="text-[15px] font-semibold leading-5 text-white">
          {author || "Username"}
        </p>
        <p className="text-xs text-gray-400">{timestamp || "Time ago"}</p>
      </div>
    </div>
  );
}
