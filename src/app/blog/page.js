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

        <main className="pt-24 sm:pt-32 pb-16">
          <BlogStyling />

          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center mb-12 md:mb-16">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-gray-100 mb-4 md:mb-6 font-custom animate-fade-in">
                MEMOIRS OF A RAGER
              </h2>
              <p className="text-lg md:text-xl leading-8 text-gray-300 prose prose-invert">
                Recaps from that one time at that one place.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:gap-8 md:grid-cols-2 lg:grid-cols-3">
              {posts.map((post) => (
                <Link
                  href={`/blog/${post.slug}`}
                  key={post.id}
                  onClick={() => handleLinkClick(post)}
                  className="transform transition-all duration-300 hover:scale-[1.02] group"
                >
                  <article className="relative isolate flex flex-col justify-end overflow-hidden rounded-2xl bg-gray-900/50 backdrop-blur-sm shadow-xl ring-1 ring-gray-800/10 h-[400px] md:h-[450px]">
                    <div className="absolute inset-0 overflow-hidden">
                      <img
                        src={post.imageUrl}
                        alt={`Cover image for ${post.title}`}
                        className="absolute inset-0 h-[95%] w-[95%] mx-auto my-auto object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 p-6 backdrop-blur-sm bg-black/30">
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-200 mb-3">
                        <time dateTime={post.datetime} className="font-medium">
                          {post.date}
                        </time>
                        <div className="flex items-center gap-x-2">
                          <span>•</span>
                          <img
                            src={post.author.imageUrl}
                            alt=""
                            className="h-6 w-6 rounded-full border border-gray-700"
                          />
                          <span className="font-medium">
                            {post.author.name}
                          </span>
                        </div>
                      </div>

                      <h3 className="text-xl font-semibold leading-tight text-white group-hover:text-gray-100 prose prose-invert">
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
