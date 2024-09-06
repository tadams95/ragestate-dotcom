"use client";

import Header from "@/app/components/Header";
import Footer from "@/app/components/Footer";
import BlogStyling from "@/app/components/styling/BlogStyling";
import { useState, useEffect } from "react";
import Image from "next/image";

export default function BlogPost() {
  const [selectedBlog, setSelectedBlog] = useState(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedBlog = JSON.parse(localStorage.getItem("selectedBlog"));
      if (storedBlog) {
        setSelectedBlog(storedBlog);
      }
    }
  }, []);

  console.log("Selected Blog: ", selectedBlog);
  return (
    <>
      <div className="bg-black px-6 py-32 lg:px-8">
        <Header />
        <div className="mx-auto max-w-3xl text-base leading-7 text-gray-200 isolate">
          <BlogStyling />
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

            <p className="mt-8">
              {selectedBlog ? selectedBlog.p2 : "Loading..."}
            </p>

            <p className="mt-6">
              {selectedBlog ? selectedBlog.p3 : "Loading..."}
            </p>
          </div>
          <figure className="mt-16 flex justify-center items-center">
            <Image src="/assets/RSLogoW.png" alt="" width={200} height={200} />
          </figure>
        </div>
      </div>
      <Footer />
    </>
  );
}
