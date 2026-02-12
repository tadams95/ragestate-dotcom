import Client from 'shopify-buy';

const client = Client.buildClient({
  domain: 'ragestate.myshopify.com',
  storefrontAccessToken: 'e4803750ab24a8c8b98cc614e0f34d98',
});

// Function to format slug
const formatSlug = (title) => {
  return title
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
};

// Minimal in-memory cache (session-only), short TTL to avoid stale data
const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes
let cacheAllProducts = { ts: 0, data: null };
const cacheByHandle = new Map(); // handle -> { ts, data }

const now = () => Date.now();
const isFresh = (ts) => now() - ts < CACHE_TTL_MS;

/**
 * Clear all product caches. Call this after uploading new images to Shopify
 * or when you need to force fresh data.
 */
export function clearProductCache() {
  cacheAllProducts = { ts: 0, data: null };
  cacheByHandle.clear();
}

/**
 * Serialize a Shopify SDK Model image object to a plain object.
 * The SDK returns Model objects with getters that may not spread correctly.
 * @param {Object} image - Shopify image Model object
 * @returns {Object|null} - Plain object with image properties
 */
function serializeImage(image) {
  if (!image) return null;
  return {
    src: image.src ?? null,
    transformedSrc: image.transformedSrc ?? null,
    url: image.url ?? null,
    altText: image.altText ?? null,
    width: image.width ?? null,
    height: image.height ?? null,
  };
}

/**
 * Serialize a Shopify SDK product Model to a plain object.
 * This ensures all properties including images are properly extracted
 * from the SDK's Model objects which use getters.
 * @param {Object} product - Shopify product Model object
 * @returns {Object} - Plain object with product data
 */
export function serializeProduct(product) {
  if (!product) return null;

  // Serialize images array
  const images = Array.isArray(product.images)
    ? product.images.map(serializeImage).filter(Boolean)
    : [];

  // Serialize variants with their images
  const variants = Array.isArray(product.variants)
    ? product.variants.map((v) => ({
        id: v.id,
        title: v.title,
        price: v.price,
        priceV2: v.priceV2 ? { amount: v.priceV2.amount, currencyCode: v.priceV2.currencyCode } : null,
        compareAtPrice: v.compareAtPrice,
        compareAtPriceV2: v.compareAtPriceV2
          ? { amount: v.compareAtPriceV2.amount, currencyCode: v.compareAtPriceV2.currencyCode }
          : null,
        available: v.available,
        availableForSale: v.availableForSale,
        quantityAvailable: v.quantityAvailable,
        sku: v.sku,
        weight: v.weight,
        image: serializeImage(v.image),
        selectedOptions: Array.isArray(v.selectedOptions)
          ? v.selectedOptions.map((o) => ({ name: o.name, value: o.value }))
          : [],
      }))
    : [];

  return {
    id: product.id,
    handle: product.handle,
    title: product.title,
    description: product.description,
    descriptionHtml: product.descriptionHtml,
    productType: product.productType,
    vendor: product.vendor,
    tags: Array.isArray(product.tags) ? [...product.tags] : [],
    publishedAt: product.publishedAt,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
    images,
    featuredImage: serializeImage(product.featuredImage),
    variants,
    options: Array.isArray(product.options)
      ? product.options.map((o) => ({
          id: o.id,
          name: o.name,
          values: Array.isArray(o.values) ? [...o.values] : [],
        }))
      : [],
  };
}

export async function fetchShopifyProducts() {
  try {
    if (cacheAllProducts.data && isFresh(cacheAllProducts.ts)) {
      return cacheAllProducts.data;
    }

    const rawProducts = await client.product.fetchAll(250);
    // Serialize products to plain objects to avoid SDK Model getter issues
    const products = rawProducts.map(serializeProduct).filter(Boolean);
    cacheAllProducts = { ts: now(), data: products };
    return products;
  } catch (error) {
    console.error('Error fetching Shopify products:', error);
    // Gracefully handle closed/unavailable shop so builds/pages don't crash
    if (
      error?.message?.toLowerCase?.().includes('unavailable') ||
      error?.message?.toLowerCase?.().includes('payment_required') ||
      error?.status === 402
    ) {
      return [];
    }
    return [];
  }
}

export async function fetchShopifyProductBySlug(slug) {
  try {
    // First, try by handle (most efficient)
    const cached = cacheByHandle.get(slug);
    if (cached && isFresh(cached.ts)) {
      return cached.data;
    }

    try {
      const byHandle = await client.product.fetchByHandle(slug);
      if (byHandle) {
        // Serialize to plain object to avoid SDK Model getter issues
        const serialized = serializeProduct(byHandle);
        cacheByHandle.set(slug, { ts: now(), data: serialized });
        return serialized;
      }
    } catch (_) {
      // fetchByHandle throws if not found; we'll fallback to list
    }

    // Fallback: use cached/all products and match by formatted title
    const products = await fetchShopifyProducts();
    const product = products.find((p) => formatSlug(p.title) === slug);
    if (product) {
      cacheByHandle.set(slug, { ts: now(), data: product });
    }
    return product || null;
  } catch (error) {
    console.error('Error fetching product by slug:', error);
    return null;
  }
}

export async function fetchAllProductSlugs() {
  try {
    // Reuse products cache to avoid repeated heavy calls
    const products = await fetchShopifyProducts();
    return products.map((product) => product?.handle || formatSlug(product.title));
  } catch (error) {
    console.error('Error fetching all product slugs:', error);
    // If the shop is unavailable, return an empty list so static params generation succeeds
    return [];
  }
}
