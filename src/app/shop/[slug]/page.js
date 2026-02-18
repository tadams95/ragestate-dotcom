import { notFound } from 'next/navigation';
import Script from 'next/script';
import {
  fetchAllProductSlugs,
  fetchShopifyProductBySlug,
} from '../../../../shopify/shopifyService';
import ProductDetailClient from './ProductDetailClient';

export const revalidate = 60;
export const dynamicParams = true;

export async function generateStaticParams() {
  // console.log("generateStaticParams: Start");

  try {
    const slugs = await fetchAllProductSlugs();
    // console.log("Product Slugs:", slugs);

    return slugs.map((slug) => ({
      slug,
    }));
  } catch (error) {
    console.error('Error in generateStaticParams:', error);
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
        title: 'Product Not Found',
        description: 'The requested product could not be found.',
      };
    }

    const firstImage =
      product?.images?.[0]?.src || product?.images?.[0]?.transformedSrc || undefined;
    return {
      title: product.title,
      description: product.description,
      alternates: { canonical: `/shop/${slug}` },
      openGraph: {
        title: product.title,
        description: product.description,
        type: 'website',
        images: firstImage ? [{ url: firstImage }] : undefined,
      },
      twitter: {
        card: 'summary_large_image',
        title: product.title,
        description: product.description,
        images: firstImage ? [firstImage] : undefined,
      },
    };
  } catch (error) {
    console.error('Error in generateMetadata:', error);
    // Fallback metadata when product can't be fetched
    return {
      title: 'Product',
      description: 'Product not available',
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
      notFound();
    }

    // console.log("Product Data in ProductDetailPage:", product);

    // Convert product to a plain object
    const plainProduct = JSON.parse(JSON.stringify(product));

    // Product JSON-LD
    const priceAmount = parseFloat(plainProduct?.variants?.[0]?.price?.amount || '0').toFixed(2);
    const currency = plainProduct?.variants?.[0]?.price?.currencyCode || 'USD';
    const firstImage = plainProduct?.images?.[0]?.src || plainProduct?.images?.[0]?.transformedSrc;
    const sku = plainProduct?.variants?.[0]?.sku || plainProduct?.id;
    const jsonLd = {
      '@context': 'https://schema.org/',
      '@type': 'Product',
      name: plainProduct?.title,
      image: firstImage ? [firstImage] : undefined,
      description: plainProduct?.description,
      sku,
      brand: plainProduct?.vendor ? { '@type': 'Brand', name: plainProduct.vendor } : undefined,
      offers: {
        '@type': 'Offer',
        priceCurrency: currency,
        price: priceAmount,
        availability: 'https://schema.org/InStock',
        url: `https://www.ragestate.com/shop/${slug}`,
      },
    };

    return (
      <>
        <Script
          id="product-json-ld"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <ProductDetailClient product={plainProduct} />
      </>
    );
  } catch (error) {
    console.error('Error in ProductDetailPage:', error);
    // Product cannot be loaded - trigger 404
    notFound();
  } finally {
    // console.log("ProductDetailPage: End");
  }
}
