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

export async function fetchShopifyProducts() {
  try {
    const products = await client.product.fetchAll();
    return products;
  } catch (error) {
    console.error("Error fetching Shopify products:", error);
    throw error;
  }
}

export async function fetchShopifyProductBySlug(slug) {
  try {
    const products = await client.product.fetchAll();
    const product = products.find(
      (product) => formatSlug(product.title) === slug
    );
    return product || null;
  } catch (error) {
    console.error("Error fetching product by slug:", error);
    throw error;
  }
}

export async function fetchAllProductSlugs() {
  try {
    const products = await client.product.fetchAll();
    return products.map((product) => formatSlug(product.title));
  } catch (error) {
    console.error("Error fetching all product slugs:", error);
    throw error;
  }
}
