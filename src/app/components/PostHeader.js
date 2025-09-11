import React from "react";
import Link from "next/link";
import Image from "next/image";

export default function PostHeader({
  author,
  timestamp,
  avatarUrl,
  usernameLower,
}) {
  return (
    <div className="flex items-center space-x-2 mb-2">
      {/* Avatar */}
      {usernameLower ? (
        <Link
          href={`/u/${usernameLower}`}
          prefetch={false}
          className="block active:opacity-80"
        >
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={author || "User"}
              width={32}
              height={32}
              sizes="32px"
              loading="lazy"
              className="w-8 h-8 rounded-md object-cover border border-white/10"
            />
          ) : (
            <div className="w-8 h-8 bg-gray-500 rounded-md" />
          )}
        </Link>
      ) : avatarUrl ? (
        <Image
          src={avatarUrl}
          alt={author || "User"}
          width={32}
          height={32}
          sizes="32px"
          loading="lazy"
          className="w-8 h-8 rounded-md object-cover border border-white/10"
        />
      ) : (
        <div className="w-8 h-8 bg-gray-500 rounded-md" />
      )}
      <div>
        {usernameLower ? (
          <Link
            href={`/u/${usernameLower}`}
            prefetch={false}
            className="text-[15px] font-semibold leading-5 text-white hover:underline active:opacity-90"
          >
            {author || "Username"}
          </Link>
        ) : (
          <p className="text-[15px] font-semibold leading-5 text-white">
            {author || "Username"}
          </p>
        )}
        <p className="text-xs text-gray-400">{timestamp || "Time ago"}</p>
      </div>
    </div>
  );
}
