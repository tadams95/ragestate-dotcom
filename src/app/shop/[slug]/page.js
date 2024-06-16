"use client";

import Header from "@/app/components/Header";
import ProductDetails from "../../../../components/ProductDetail";

export default function ProductDetail() {
  // Retrieve product from localStorage
  const selectedProduct = JSON.parse(localStorage.getItem("selectedProduct"));

  // console.log(selectedProduct);

  return (
    <>
      <Header />
      <div className="bg-black px-4 py-20 lg:px-8">
        <ProductDetails product={selectedProduct} />
      </div>
    </>
  );
}
