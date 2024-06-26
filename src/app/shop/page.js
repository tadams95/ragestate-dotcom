"use client";

import { useEffect, useState } from "react";
import { fetchShopifyProducts } from "../../../shopify/shopifyService";
import Footer from "../components/Footer";
import ProductTile from "../../../components/ProductTile";
import Header from "../components/Header";

export default function Shop() {
  const [productsWithHref, setProductsWithHref] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const fetchedProducts = await fetchShopifyProducts();
        const products = fetchedProducts.map((product) => ({
          ...product,
          href: `/product/${product.id}`,
          imageSrc: product.images[0]?.src,
        }));
        setProductsWithHref(products);
      } catch (error) {
        console.error("Error fetching products:", error);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="bg-black isolate">
      <Header />
      <div>
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <div className="mt-6 grid gap-y-10 lg:grid-cols-3 sm:grid-cols-2  sm:gap-x-6 sm:gap-y-0 lg:gap-x-8">
            {productsWithHref.map((product) => (
              <ProductTile key={product.id} product={product} />
            ))}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
