"use client";

import { useState, useEffect } from "react";

import Header from "@/app/components/Header";
import ProductDetails from "../../../../components/ProductDetail";

export default function ProductDetail() {
  const [loading, setLoading] = useState(true);

  // Retrieve product from localStorage
  let selectedProduct = null;

  if (typeof window !== "undefined") {
    selectedProduct = JSON.parse(localStorage.getItem("selectedProduct"));
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false); // Simulate loading completion after 2000ms (adjust as needed)
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
