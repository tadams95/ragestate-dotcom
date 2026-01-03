'use client';

import Image from 'next/image';
import Link from 'next/link';
import { posts } from '../../../blog-posts/blogPosts';
import BlogStyling from '../components/styling/BlogStyling';

export default function Blog() {
  const handleLinkClick = (post) => {
    localStorage.setItem('selectedBlog', JSON.stringify(post));
  };

  return (
    <>
      <div className="min-h-screen bg-transparent">
        {/* Header is rendered by layout.js */}

        <main className="pb-16 pt-24 sm:pt-32">
          <BlogStyling />

          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto mb-12 max-w-2xl text-center md:mb-16">
              <h2 className="font-custom animate-fade-in mb-4 text-3xl font-bold tracking-tight text-gray-100 md:mb-6 md:text-4xl lg:text-5xl">
                MEMOIRS OF A RAGER
              </h2>
              <p className="prose prose-invert text-lg leading-8 text-gray-300 md:text-xl">
                Recaps from that one time at that one place.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:gap-8 md:grid-cols-2 lg:grid-cols-3">
              {posts.map((post) => (
                <Link
                  href={`/blog/${post.slug}`}
                  key={post.id}
                  onClick={() => handleLinkClick(post)}
                  className="group transform transition-all duration-300 hover:scale-[1.02]"
                >
                  <article className="relative isolate flex h-[400px] flex-col justify-end overflow-hidden rounded-2xl bg-gray-900/50 shadow-xl ring-1 ring-gray-800/10 backdrop-blur-sm md:h-[450px]">
                    <div className="absolute inset-0 overflow-hidden">
                      <Image
                        src={post.imageUrl}
                        alt={`Cover image for ${post.title}`}
                        fill
                        sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                        className="mx-auto my-auto object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 bg-black/30 p-6 backdrop-blur-sm">
                      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-200">
                        <time dateTime={post.datetime} className="font-medium">
                          {post.date}
                        </time>
                        <div className="flex items-center gap-x-2">
                          <span>•</span>
                          <Image
                            src={post.author.imageUrl}
                            alt=""
                            width={24}
                            height={24}
                            className="rounded-full border border-gray-700"
                          />
                          <span className="font-medium">{post.author.name}</span>
                        </div>
                      </div>

                      <h3 className="prose prose-invert text-xl font-semibold leading-tight text-white group-hover:text-gray-100">
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
      {/* Footer is rendered globally in RootLayout */}
    </>
  );
}
