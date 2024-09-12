import {
  fetchShopifyProductBySlug,
  fetchAllProductSlugs,
} from "../../../../shopify/shopifyService";
import ProductDetailClient from "./ProductDetailClient";
// Function to format slug
const formatSlug = (title) => {
  return title
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-");
};

export async function generateStaticParams() {
  console.log("generateStaticParams: Start");

  try {
    const slugs = await fetchAllProductSlugs();
    console.log("Product Slugs:", slugs);

    return slugs.map((slug) => ({
      slug,
    }));
  } catch (error) {
    console.error("Error in generateStaticParams:", error);
    throw error;
  } finally {
    console.log("generateStaticParams: End");
  }
}

export async function generateMetadata({ params }) {
  const { slug } = params;

  console.log("generateMetadata: Start", slug);

  try {
    const product = await fetchShopifyProductBySlug(slug);

    if (!product) {
      return {
        notFound: true,
      };
    }

    console.log("Product Data:", product);

    return {
      title: product.title,
      description: product.description,
      props: {
        product,
      },
    };
  } catch (error) {
    console.error("Error in generateMetadata:", error);
    throw error;
  } finally {
    console.log("generateMetadata: End");
  }
}

export default function ProductDetailPage({ product }) {
  // console.log("Initial Product Data:", product);
  return <ProductDetailClient product={product} />;
}
