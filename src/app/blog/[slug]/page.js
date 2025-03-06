import { posts as blogPosts } from "../../../../blog-posts/blogPosts";
import Header from "@/app/components/Header";
import Footer from "@/app/components/Footer";
import BlogStyling from "@/app/components/styling/BlogStyling";
import BlogPostClient from "@/app/blog/BlogPostClient";
import Link from "next/link";

export async function generateMetadata({ params }) {
  const { slug } = params;
  const blog = blogPosts.find((post) => post.slug === slug);
  
  if (!blog) {
    return {
      title: "Blog Post Not Found - RAGESTATE",
      description: "The requested blog post could not be found."
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
      <div className="bg-gradient-to-b from-black via-gray-900 to-black min-h-screen">
        <Header />
        <div className="mx-auto max-w-3xl text-center py-32 px-6">
          <div className="bg-gray-900/70 backdrop-blur-sm rounded-2xl shadow-xl p-10">
            <h1 className="text-4xl font-bold text-white mb-6">Post Not Found</h1>
            <p className="text-gray-300 mb-8 text-lg">The blog post you're looking for doesn't exist or has been moved.</p>
            <Link 
              href="/blog" 
              className="px-5 py-3 bg-red-600 hover:bg-red-700 transition-colors duration-300 rounded-md text-white font-medium inline-flex items-center"
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
        <Header />
        
        <div className="mx-auto max-w-4xl px-4 sm:px-6 py-28 lg:py-32 relative">
          {/* Background pattern */}
          <div className="absolute inset-0 bg-grid-pattern opacity-5 pointer-events-none"></div>
          
          <div 
            className="bg-gray-900/70 backdrop-blur-sm rounded-2xl shadow-2xl ring-1 ring-gray-800/30 p-6 md:p-10 transition-all duration-300 hover:shadow-red-900/10"
          >
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
