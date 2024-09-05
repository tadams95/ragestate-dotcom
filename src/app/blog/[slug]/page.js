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
      <div className="bg-black">
        <Header />
      </div>
      <div>
        <BlogStyling />

        <div className="px-4 py-20 lg:px-8">
          <div className="max-w-7xl mx-auto justify-center">
            {selectedBlog ? (
              <>
                <h1 className="mt-8 text-3xl font-bold tracking-tight text-gray-100 sm:text-4xl text-center">
                  {selectedBlog.title}
                </h1>
                <p className="mt-2 text-lg leading-8 text-gray-300 text-center">
                  {selectedBlog.author.name}
                </p>
                <p className="mt-4 text-lg leading-8 text-gray-300 text-center">
                  {selectedBlog.description}
                </p>
                <div className="mt-8 flex justify-center">
                  <Image
                    src={selectedBlog.imageUrl}
                    alt={selectedBlog.title}
                    width={450}
                    height={450}
                    objectFit="cover"
                    className="rounded-lg"
                    priority
                  />
                </div>
              </>
            ) : (
              <p className="text-center text-gray-300">Loading...</p>
            )}
          </div>
        </div>
        <Footer />
      </div>
    </>
  );
}
