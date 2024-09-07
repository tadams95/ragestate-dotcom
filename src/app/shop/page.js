"use client";

import { useEffect, useState } from "react";
import { fetchShopifyProducts } from "../../../shopify/shopifyService";
import Footer from "../components/Footer";
import ProductTile from "../../../components/ProductTile";
import Header from "../components/Header";

export default function Shop() {
  const [productsWithHref, setProductsWithHref] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const fetchedProducts = await fetchShopifyProducts();
        if (isMounted) {
          const products = fetchedProducts.map((product) => ({
            ...product,
            href: `/product/${product.id}`,
            imageSrc: product.images[0]?.src,
            description: product.descriptionHtml,
          }));

          setProductsWithHref(products);
          setLoading(false);
        }
      } catch (error) {
        if (isMounted) {
          console.error("Error fetching products:", error);
          setError("Failed to fetch products. Please try again later.");
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="bg-black isolate">
      <Header />

      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        {loading && <p>Loading...</p>}
        {error && <p>{error}</p>}
        {!loading && !error && (
          <div
            className={`mt-6 grid gap-y-10 lg:grid-cols-3 sm:grid-cols-2 sm:gap-x-6 sm:gap-y-0 lg:gap-x-8 ${
              loading
                ? "opacity-0"
                : "opacity-100 transition-opacity duration-1000"
            }`}
          >
            {productsWithHref.map((product) => (
              <div key={product.id}>
                <ProductTile product={product} />
              </div>
            ))}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
