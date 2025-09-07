import {
  fetchShopifyProductBySlug,
  fetchAllProductSlugs,
} from "../../../../shopify/shopifyService";
import ProductDetailClient from "./ProductDetailClient";

export async function generateStaticParams() {
  // console.log("generateStaticParams: Start");

  try {
    const slugs = await fetchAllProductSlugs();
    // console.log("Product Slugs:", slugs);

    return slugs.map((slug) => ({
      slug,
    }));
  } catch (error) {
    console.error("Error in generateStaticParams:", error);
    // If Shopify is unavailable, return no params to avoid build failure
    return [];
  } finally {
    // console.log("generateStaticParams: End");
  }
}

export async function generateMetadata({ params }) {
  const { slug } = params;

  // console.log("generateMetadata: Start", slug);

  try {
    const product = await fetchShopifyProductBySlug(slug);

    if (!product) {
      return {
        notFound: true,
      };
    }

    // console.log("Product Data:", product);

    return {
      title: product.title,
      description: product.description,
    };
  } catch (error) {
    console.error("Error in generateMetadata:", error);
    // Fallback metadata when product can't be fetched
    return {
      title: "Product",
      description: "Product not available",
    };
  } finally {
    // console.log("generateMetadata: End");
  }
}

export default async function ProductDetailPage({ params }) {
  const { slug } = params;

  // console.log("ProductDetailPage: Start", slug);

  try {
    const product = await fetchShopifyProductBySlug(slug);

    if (!product) {
      return {
        notFound: true,
      };
    }

    // console.log("Product Data in ProductDetailPage:", product);

    // Convert product to a plain object
    const plainProduct = JSON.parse(JSON.stringify(product));

    return <ProductDetailClient product={plainProduct} />;
  } catch (error) {
    console.error("Error in ProductDetailPage:", error);
    // Render a minimal not-found fragment if product cannot be loaded
    return {
      notFound: true,
    };
  } finally {
    // console.log("ProductDetailPage: End");
  }
}
