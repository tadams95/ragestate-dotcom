"use client";

import { useEffect, useState } from "react";
import { fetchShopifyProducts } from "../../../shopify/shopifyService";
import Footer from "../components/Footer";
import ProductTile from "../../../components/ProductTile";
import Header from "../components/Header";
import ShopStyling from "../components/styling/ShopStyling";
import { motion, useReducedMotion } from "framer-motion";
import {
  Squares2X2Icon as GridIcon,
  ListBulletIcon,
} from "@heroicons/react/24/outline";
import AutoSliderBanner from "../../../components/AutoSliderBanner";

export default function Shop() {
  const prefersReducedMotion = useReducedMotion();
  const [productsWithHref, setProductsWithHref] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState("grid"); // Keep the view mode state

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
        }
      } catch (error) {
        if (isMounted) {
          console.error("Error fetching products:", error);
          setError("Shop is currently unavailable. Please check back later.");
        }
      } finally {
        if (isMounted) {
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
    <div className="bg-black isolate min-h-screen">
      <Header />

      {/* Add the AutoSliderBanner */}
      <AutoSliderBanner />

      <div
        id="product-section"
        className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8"
      >
        {/* View Toggle */}
        <div className="flex justify-end mb-8">
          <div className="flex gap-2 bg-black p-1 rounded-md">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded ${
                viewMode === "grid" ? "bg-red-700" : ""
              }`}
            >
              <GridIcon className="h-5 w-5 text-white" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              data-testid="list-view-button"
              className={`p-2 rounded ${
                viewMode === "list" ? "bg-red-700" : ""
              }`}
            >
              <ListBulletIcon className="h-5 w-5 text-white" />
            </button>
          </div>
        </div>

        {/* Loading and Error States */}
        {loading && (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
          </div>
        )}

        {error && <div className="text-red-500 text-center py-8">{error}</div>}

        {/* Products Grid/List */}
        {!loading && !error && (
          <>
            <motion.div
              key={viewMode}
              initial={prefersReducedMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={prefersReducedMotion ? undefined : { opacity: 0 }}
              className={`
                ${
                  viewMode === "grid"
                    ? "grid gap-y-10 lg:grid-cols-3 sm:grid-cols-2 sm:gap-x-6 lg:gap-x-8"
                    : "flex flex-col gap-y-4"
                }
              `}
            >
              {productsWithHref.map((product) => (
                <motion.div
                  key={product.id}
                  layout={prefersReducedMotion ? false : true}
                  initial={prefersReducedMotion ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={prefersReducedMotion ? undefined : { opacity: 0 }}
                >
                  <ProductTile product={product} viewMode={viewMode} />
                </motion.div>
              ))}
            </motion.div>
          </>
        )}

        {/* No Products Message */}
        {!loading && !error && productsWithHref.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            No products available
          </div>
        )}
      </div>

      <Footer />
      {/* <ShopStyling /> */}
    </div>
  );
}
