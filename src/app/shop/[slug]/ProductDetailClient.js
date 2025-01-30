"use client";

import { useState, useEffect } from "react";
import Header from "@/app/components/Header";
import ProductDetails from "../../../../components/ProductDetail";

export default function ProductDetailClient({ product: initialProduct }) {
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(initialProduct);

  // console.log("askdljfalksdfj:", initialProduct);

  //I should work on this more

  useEffect(() => {
    if (!initialProduct && typeof window !== "undefined") {
      try {
        const product = JSON.parse(localStorage.getItem("selectedProduct"));
        setSelectedProduct(product);
      } catch (error) {
        console.error(
          "Failed to parse selected product from localStorage:",
          error
        );
      }
    }

    const timer = setTimeout(() => {
      setLoading(false);
    }, 100);

    return () => clearTimeout(timer);
  }, [initialProduct]);

  if (!selectedProduct) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <Header />
      <div
        className={`transition-opacity ${
          loading ? "opacity-0" : "opacity-100 duration-1000"
        } bg-blue px-4 py-20 lg:px-8`}
      >
        <ProductDetails product={selectedProduct} />
      </div>
    </>
  );
}
