"use client";

import { useState, useEffect } from "react";

import Header from "@/app/components/Header";
import ProductDetails from "../../../../components/ProductDetail";

//work to incorporte getServerSideProps for direct URL navigation

export default function ProductDetail() {
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
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
      setLoading(false); // Simulate loading completion after 100ms (adjust as needed)
    }, 100); // Adjust the timeout duration as per your requirement

    return () => clearTimeout(timer); // Clean up timeout on component unmount
  }, []);

  return (
    <>
      <Header />
      <div
        className={`transition-opacity ${
          loading ? "opacity-0" : "opacity-100 duration-1000"
        } bg-black px-4 py-20 lg:px-8`}
      >
        <ProductDetails product={selectedProduct} />
      </div>
    </>
  );
}
