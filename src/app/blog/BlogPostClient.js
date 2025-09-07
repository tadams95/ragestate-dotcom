"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import storage from "@/utils/storage";

function LoadingSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-4 w-24 bg-gray-700 rounded mb-4" />
      <div className="h-8 w-3/4 bg-gray-700 rounded mb-4" />
      <div className="h-4 w-48 bg-gray-700 rounded mb-8" />
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-4 bg-gray-700 rounded w-full" />
        ))}
      </div>
    </div>
  );
}

export default function BlogPostClient({ blog }) {
  const [selectedBlog, setSelectedBlog] = useState(blog);
  const [readingTime, setReadingTime] = useState("");

  useEffect(() => {
    if (!blog && typeof window !== "undefined") {
      const storedBlog = storage.getJSON("selectedBlog");
      if (storedBlog) setSelectedBlog(storedBlog);
    }

    // Calculate reading time
    if (selectedBlog) {
      const wordCount = Object.keys(selectedBlog)
        .filter((key) => key.startsWith("p"))
        .reduce(
          (count, key) => count + (selectedBlog[key]?.split(" ").length || 0),
          0
        );
      const timeInMinutes = Math.ceil(wordCount / 200); // Assuming average reading speed of 200 words/minute
      setReadingTime(`${timeInMinutes} min read`);
    }
  }, [blog, selectedBlog]);

  if (!selectedBlog) {
    return <LoadingSkeleton />;
  }

  return (
    <article className="prose prose-invert prose-lg max-w-none">
      <div className="mb-8">
        <Link
          href="/blog"
          className="inline-flex items-center text-sm font-medium text-gray-300 hover:text-white transition-colors duration-200 no-underline"
        >
          <svg
            className="mr-2 w-4 h-4"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path d="M15 19l-7-7 7-7" />
          </svg>
          Back to Blog
        </Link>
      </div>

      <div className="mb-12">
        <p className="text-base font-semibold leading-7 text-red-600 mb-2">
          RAGESTATE BLOG
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-100 sm:text-4xl mb-4">
          {selectedBlog.title}
        </h1>
        <div className="flex items-center gap-4 text-gray-300 text-sm">
          <div className="flex items-center gap-2">
            <img
              src={selectedBlog.author.imageUrl}
              alt={selectedBlog.author.name}
              className="h-8 w-8 rounded-full border border-gray-700"
            />
            <span>{selectedBlog.author.name}</span>
          </div>
          <span>•</span>
          <time>{selectedBlog.date}</time>
          <span>•</span>
          <span>{readingTime}</span>
        </div>
      </div>

      <div className="space-y-6">
        <p>{selectedBlog.p1}</p>
        <p>{selectedBlog.p2}</p>
        <p>{selectedBlog.p3}</p>
        {selectedBlog.p4 && <p>{selectedBlog.p4}</p>}
        {selectedBlog.p5 && <p>{selectedBlog.p5}</p>}
        {selectedBlog.p6 && <p>{selectedBlog.p6}</p>}
      </div>

      <figure className="mt-16 flex justify-center items-center">
        <Image
          src="/assets/RSLogo2.png"
          alt="Ragestate Logo"
          width={150}
          height={150}
          className="opacity-80 hover:opacity-100 transition-opacity duration-300"
        />
      </figure>
    </article>
  );
}
