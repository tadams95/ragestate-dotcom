import Client from "shopify-buy";

const client = Client.buildClient({
  domain: "ragestate.myshopify.com",
  storefrontAccessToken: "e4803750ab24a8c8b98cc614e0f34d98",
});

// Function to format slug
const formatSlug = (title) => {
  return title
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-");
};

// Minimal in-memory cache (session-only), short TTL to avoid stale data
const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes
let cacheAllProducts = { ts: 0, data: null };
const cacheByHandle = new Map(); // handle -> { ts, data }

const now = () => Date.now();
const isFresh = (ts) => now() - ts < CACHE_TTL_MS;

export async function fetchShopifyProducts() {
  try {
    if (cacheAllProducts.data && isFresh(cacheAllProducts.ts)) {
      return cacheAllProducts.data;
    }

    const products = await client.product.fetchAll();
    cacheAllProducts = { ts: now(), data: products };
    return products;
  } catch (error) {
    console.error("Error fetching Shopify products:", error);
    // Gracefully handle closed/unavailable shop so builds/pages don't crash
    if (
      error?.message?.toLowerCase?.().includes("unavailable") ||
      error?.message?.toLowerCase?.().includes("payment_required") ||
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
        cacheByHandle.set(slug, { ts: now(), data: byHandle });
        return byHandle;
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
    console.error("Error fetching product by slug:", error);
    return null;
  }
}

export async function fetchAllProductSlugs() {
  try {
    // Reuse products cache to avoid repeated heavy calls
    const products = await fetchShopifyProducts();
    return products.map((product) => formatSlug(product.title));
  } catch (error) {
    console.error("Error fetching all product slugs:", error);
    // If the shop is unavailable, return an empty list so static params generation succeeds
    return [];
  }
}
