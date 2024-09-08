import { posts as blogPosts } from "../../../../blog-posts/blogPosts";
import Header from "@/app/components/Header";
import Footer from "@/app/components/Footer";
import BlogStyling from "@/app/components/styling/BlogStyling"
import BlogPostClient from "@/app/blog/BlogPostClient";

export default function BlogPost({ params }) {
  const { slug } = params;
  const blog = blogPosts.find((post) => post.slug === slug);

  if (!blog) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <div className="bg-black px-6 py-32 lg:px-8">
        <Header />
        <div className="mx-auto max-w-3xl text-base leading-7 text-gray-200 isolate">
          <BlogStyling />
          <BlogPostClient blog={blog} />
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
