"use client";

import Header from "@/app/components/Header";
import ProductDetails from "../../../../components/ProductDetail";

// import { useState } from "react";
// import { StarIcon } from "@heroicons/react/20/solid";
// import { Radio, RadioGroup } from "@headlessui/react";
// import {
//   CurrencyDollarIcon,
//   GlobeAmericasIcon,
// } from "@heroicons/react/24/outline";

// import { usePathname, useSearchParams } from "next/navigation";

export default function ProductDetail({ params }) {
  // const [selectedColor, setSelectedColor] = useState(product.colors[0]);
  // const [selectedSize, setSelectedSize] = useState(product.sizes[2]);

  console.log("Params: ", params);
  return (
    <>
      <Header />
      <div className="bg-black px-4 py-20 lg:px-8">
        {/* <p>{params.slug}</p> */}
        <ProductDetails />
      </div>
    </>
  );
}
