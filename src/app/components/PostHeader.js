import React from "react";

export default function PostHeader({ author, timestamp, avatarUrl }) {
  return (
    <div className="flex items-center space-x-2 mb-2">
      {/* Avatar */}
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl}
          alt={author || "User"}
          className="w-8 h-8 rounded-full object-cover border border-white/10"
        />
      ) : (
        <div className="w-8 h-8 bg-gray-500 rounded-full" />
      )}
      <div>
        <p className="text-[15px] font-semibold leading-5 text-white">
          {author || "Username"}
        </p>
        <p className="text-xs text-gray-400">{timestamp || "Time ago"}</p>
      </div>
    </div>
  );
}
