"use client";

import Link from "next/link";
import Footer from "../components/Footer";
import Header from "../components/Header";
import BlogStyling from "../components/styling/BlogStyling";
import { posts } from "../../../blog-posts/blogPosts";

export default function Blog() {
  const handleLinkClick = (post) => {
    localStorage.setItem("selectedBlog", JSON.stringify(post));
  };

  return (
    <>
      <div className="bg-transparent min-h-screen">
        <Header />

        <main className="pt-28 sm:pt-36 pb-16">
          <BlogStyling />

          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center mb-16">
              <h2 className="text-4xl font-bold tracking-tight text-gray-100 sm:text-5xl mb-6 font-custom animate-fade-in">
                MEMOIRS OF A RAGER
              </h2>
              <p className="text-xl leading-8 text-gray-300">
                Recaps from that one time at that one place.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-8 sm:gap-10 md:grid-cols-2 lg:grid-cols-3">
              {posts.map((post) => (
                <Link
                  href={`/blog/${post.slug}`}
                  key={post.id}
                  onClick={() => handleLinkClick(post)}
                  className="transform transition-all duration-300 hover:scale-[1.02]"
                >
                  <article className="relative isolate flex flex-col justify-end overflow-hidden rounded-2xl bg-gray-900 shadow-xl ring-1 ring-gray-800/10">
                    <div className="h-96 overflow-hidden">
                      <img
                        src={post.imageUrl}
                        alt=""
                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 p-6 backdrop-blur-sm bg-black/30">
                      <div className="flex items-center gap-x-4 text-sm text-gray-200 mb-3">
                        <time dateTime={post.datetime}>{post.date}</time>
                        <div className="flex items-center gap-x-2">
                          <span>•</span>
                          <img
                            src={post.author.imageUrl}
                            alt=""
                            className="h-6 w-6 rounded-full border border-gray-700"
                          />
                          <span>{post.author.name}</span>
                        </div>
                      </div>

                      <h3 className="text-xl font-semibold leading-tight text-white group-hover:text-gray-100">
                        {post.title}
                      </h3>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          </div>
        </main>
      </div>
      <Footer />
    </>
  );
}
