"use client";

import Link from "next/link";
import Footer from "../components/Footer";
import Header from "../components/Header";
import BlogStyling from "../components/styling/BlogStyling";
import { posts } from "../../../blog-posts/blogPosts";

export default function Blog() {
  const handleLinkClick = (post) => {
    // Save product to localStorage or sessionStorage
    localStorage.setItem("selectedBlog", JSON.stringify(post));
  };

  return (
    <div className="bg-black py-24 sm:py-32">
      <Header />

      <div className="isolate">
        {/* Hero section */}
        <BlogStyling />

        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-100 sm:text-4xl">
              MEMOIRS OF A RAGER
            </h2>
            <p className="mt-2 text-lg leading-8 text-gray-300">
              Recaps from that one time at that one place.
            </p>
          </div>

          <div className="mx-auto mt-16 grid max-w-2xl auto-rows-fr grid-cols-1 gap-8 sm:mt-20 lg:mx-0 lg:max-w-none lg:grid-cols-3">
            {posts.map((post) => (
              <Link
                href={`/blog/${post.slug}`}
                key={post.id}
                onClick={() => handleLinkClick(post)}
              >
                <article className="relative isolate flex flex-col justify-end overflow-hidden rounded-2xl px-8 pb-8 pt-80 sm:pt-48 lg:pt-80">
                  <img
                    src={post.imageUrl}
                    alt=""
                    className="absolute inset-0 -z-10 h-full w-full object-contain"
                  />
                  <div className="absolute inset-0 -z-10 bg-gradient-to-t from-gray-900 via-red-900/10" />
                  <div className="absolute inset-0 -z-10 rounded-2xl ring-1 ring-inset ring-red-900/10" />

                  <div className="flex flex-wrap items-center gap-y-1 overflow-hidden text-sm leading-6 text-gray-300">
                    <time dateTime={post.datetime} className="mr-8">
                      {post.date}
                    </time>
                    <div className="-ml-4 flex items-center gap-x-4">
                      <svg
                        viewBox="0 0 2 2"
                        className="-ml-0.5 h-0.5 w-0.5 flex-none fill-white/50"
                      >
                        <circle cx={1} cy={1} r={1} />
                      </svg>
                      <div className="flex gap-x-2.5">
                        <img
                          src={post.author.imageUrl}
                          alt=""
                          className="h-6 w-6 flex-none rounded-md bg-white/10"
                        />
                        {post.author.name}
                      </div>
                    </div>
                  </div>
                  <h3 className="mt-3 text-lg font-semibold leading-6 text-white">
                    <span className="absolute inset-0" />
                    {post.title}
                  </h3>
                </article>
              </Link>
            ))}
          </div>

          <Footer />
        </div>
      </div>
    </div>
  );
}
