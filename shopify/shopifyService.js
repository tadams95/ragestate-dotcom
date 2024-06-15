import Client from "shopify-buy";

const client = Client.buildClient({
  domain: "ragestate.myshopify.com",
  storefrontAccessToken: "e4803750ab24a8c8b98cc614e0f34d98",
});

export async function fetchShopifyProducts() {
  try {
    const products = await client.product.fetchAll();
    return products;
  } catch (error) {
    console.error("Error fetching Shopify products:", error);
    throw error;
  }
}

export async function fetchProduct() {
  try {
    // Fetch a single product by ID
    const productId = "gid://shopify/Product/7857989384";

    client.product.fetch(productId).then((product) => {
      // Do something with the product
      console.log(product);
    });
  } catch (error) {
    console.error("Error fetching product:", error);
    throw error;
  }
}
