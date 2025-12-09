import BlogPostClient from '@/app/blog/BlogPostClient';
import Footer from '@/app/components/Footer';
import BlogStyling from '@/app/components/styling/BlogStyling';
import Link from 'next/link';
import { posts as blogPosts } from '../../../../blog-posts/blogPosts';

export async function generateMetadata({ params }) {
  const { slug } = params;
  const blog = blogPosts.find((post) => post.slug === slug);

  if (!blog) {
    return {
      title: 'Blog Post Not Found - RAGESTATE',
      description: 'The requested blog post could not be found.',
    };
  }

  return {
    title: `${blog.title} - RAGESTATE Blog`,
    description: blog.p1.slice(0, 160),
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://ragestate.com'),
    openGraph: {
      title: blog.title,
      description: blog.p1.slice(0, 160),
      images: [{ url: blog.imageUrl }],
    },
  };
}

export default function BlogPost({ params }) {
  const { slug } = params;
  const blog = blogPosts.find((post) => post.slug === slug);

  // Removed related posts lookup

  if (!blog) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black">
        {/* Header is rendered by layout.js */}
        <div className="mx-auto max-w-3xl px-6 py-32 text-center">
          <div className="rounded-2xl bg-gray-900/70 p-10 shadow-xl backdrop-blur-sm">
            <h1 className="mb-6 text-4xl font-bold text-white">Post Not Found</h1>
            <p className="mb-8 text-lg text-gray-300">
              The blog post you're looking for doesn't exist or has been moved.
            </p>
            <Link
              href="/blog"
              className="inline-flex items-center rounded-md bg-red-600 px-5 py-3 font-medium text-white transition-colors duration-300 hover:bg-red-700"
            >
              <svg
                className="mr-2 h-4 w-4"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M15 19l-7-7 7-7" />
              </svg>
              Return to Blog
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gray-900 via-black to-black">
        <BlogStyling />
        {/* Header is rendered by layout.js */}

        <div className="relative mx-auto max-w-4xl px-4 py-28 sm:px-6 lg:py-32">
          {/* Background pattern */}
          <div className="bg-grid-pattern pointer-events-none absolute inset-0 opacity-5"></div>

          <div className="rounded-2xl bg-gray-900/70 p-6 shadow-2xl ring-1 ring-gray-800/30 backdrop-blur-sm transition-all duration-300 hover:shadow-red-900/10 md:p-10">
            <BlogPostClient blog={blog} />

            {/* Removed Divider and Related Posts sections */}
          </div>
        </div>
        <Footer />
      </div>
    </>
  );
}

export async function generateStaticParams() {
  return blogPosts.map((blog) => ({
    slug: blog.slug,
  }));
}
