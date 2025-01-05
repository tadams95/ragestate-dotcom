"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

export default function BlogPostClient({ blog }) {
  const [selectedBlog, setSelectedBlog] = useState(blog);

  useEffect(() => {
    if (!blog && typeof window !== "undefined") {
      const storedBlog = JSON.parse(localStorage.getItem("selectedBlog"));
      if (storedBlog) {
        setSelectedBlog(storedBlog);
      }
    }
  }, [blog]);

  if (!selectedBlog) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <p className="text-base font-semibold leading-7 text-red-600">
        RAGESTATE BLOG
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-100 sm:text-4xl">
        {selectedBlog ? selectedBlog.title : "Loading..."}
      </h1>
      <h2 className="mt-2 text-lg leading-8 text-gray-300">
        {selectedBlog ? selectedBlog.author.name : "Loading..."}
        {" | "}
        {selectedBlog ? selectedBlog.date : "Loading..."}
      </h2>

      <div className="mt-10 max-w-2xl">
        <p>{selectedBlog ? selectedBlog.p1 : "Loading..."}</p>

        <p className="mt-8">{selectedBlog ? selectedBlog.p2 : "Loading..."}</p>

        <p className="mt-6">{selectedBlog ? selectedBlog.p3 : "Loading..."}</p>

        {selectedBlog && selectedBlog.p4 && (
          <p className="mt-6">{selectedBlog.p4}</p>
        )}
        {selectedBlog && selectedBlog.p5 && (
          <p className="mt-6">{selectedBlog.p5}</p>
        )}
        {selectedBlog && selectedBlog.p6 && (
          <p className="mt-6">{selectedBlog.p6}</p>
        )}
      </div>
      <figure className="mt-16 flex justify-center items-center">
        <Image src="/assets/RSLogo2.png" alt="" width={200} height={200} />
      </figure>

      {/* Add more blog content here */}
    </>
  );
}
