"use client";
import { useState, useEffect } from "react";
import { TruckIcon, UserGroupIcon } from "@heroicons/react/24/outline";

import { useDispatch } from "react-redux";
import { addToCart } from "../lib/features/todos/cartSlice";

import Footer from "@/app/components/Footer";

const policies = [
  {
    name: "National delivery",
    icon: TruckIcon,
    description: "Get your order within 1-2 Weeks",
  },
  {
    name: "Your support matters",
    icon: UserGroupIcon,
    description: "Thanks for RAGING with us!",
  },
];

function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}

export default function ProductDetails({ product }) {
  const dispatch = useDispatch();
  const [selectedColor, setSelectedColor] = useState("");
  const [selectedSize, setSelectedSize] = useState("");
  const [productPrice, setProductPrice] = useState(0);

  const priceNumber = parseFloat(product.variants[0].price.amount);
  const formattedPrice = priceNumber.toFixed(2);

  // Update productPrice when formattedPrice changes
  useEffect(() => {
    setProductPrice(formattedPrice); // Update productPrice with the formatted price
  }, [formattedPrice]);

  // Ensure product is defined before accessing its properties
  if (!product) {
    return <div>Loading...</div>; // or handle differently while product is loading
  }

  console.log("Product: ", product.images);

  // Destructure necessary fields from product
  const {
    id,
    title,
    images,
    // Add other necessary fields
  } = product;

  const handleAddToCart = (e) => {
    e.preventDefault(); // Prevent form submission

    // Check if all required selections are made
    if (selectedSize && selectedColor) {
      const productToAdd = {
        productId: id,
        images,
        title,
        price: productPrice,
        selectedSize,
        selectedColor,
      };

      console.log("Product Added: ", productToAdd);
      // Implement dispatch or function to add to cart
      dispatch(addToCart(productToAdd));
      setSelectedSize(""); // Reset selectedSize
      setSelectedColor(""); // Reset selectedColor
    } else {
      // Handle the case where not all required selections are made
      if (!selectedSize) {
        window.alert("Please select a size.");
      }
      if (!selectedColor) {
        window.alert("Please select a color.");
      }
    }
  };

  const getColorOptions = () => {
    const colorSet = new Set(); // Set to store unique color options

    product.variants.forEach((variant) => {
      const colorOption = variant.selectedOptions.find(
        (option) => option.name === "Color"
      );
      if (colorOption) {
        colorSet.add(colorOption.value); // Add color value to set (ignores duplicates)
      }
    });

    const colorOptions = Array.from(colorSet).map((color) => ({
      value: color,
      name: product.variants.find((variant) => {
        const option = variant.selectedOptions.find(
          (opt) => opt.name === "Color"
        );
        return option && option.value === color;
      }).title, // Assuming 'title' is the name of the product variant
    }));

    // console.log("Color Options:", colorOptions); // Log all color options

    return colorOptions; // Return the color options array
  };

  const getSizeOptions = () => {
    const sizeSet = new Set();

    product.variants.forEach((variant) => {
      const sizeOption = variant.selectedOptions.find(
        (option) => option.name === "Size"
      );
      if (sizeOption) {
        sizeSet.add(sizeOption.value);
      }
    });

    const sizeOptions = Array.from(sizeSet).map((size) => ({
      value: size,
      name: product.variants.find((variant) => {
        const option = variant.selectedOptions.find(
          (opt) => opt.name === "Size"
        );
        return option && option.value === size;
      }).title,
    }));
    return sizeOptions;
  };

  return (
    <div className="bg-black">
      <div className="pb-8 pt-6 sm:pb-12">
        <div className="mx-auto mt-8 max-w-2xl px-4 sm:px-6 lg:max-w-7xl lg:px-8">
          <div className="lg:grid lg:auto-rows-min lg:grid-cols-10 lg:gap-x-8">
            <div className="lg:col-span-5 lg:col-start-8">
              <div className="flex justify-between">
                <h1 className="text-xl font-medium text-gray-100">
                  {product.title}
                </h1>
                <p className="text-xl font-medium text-gray-100">
                  ${formattedPrice}
                </p>
              </div>
            </div>

            

            {/* Image gallery */}
            <div className="mt-8 lg:col-span-7 lg:col-start-1 lg:row-span-3 lg:row-start-1 lg:mt-0">
              <h2 className="sr-only">Images</h2>

              <div className="grid grid-cols-1 lg:grid-cols-2 lg:grid-rows-3 lg:gap-8">
                {product.images.map((image, index) => (
                  <img
                    key={image.id}
                    src={image.src}
                    alt={image.altText}
                    className={classNames(
                      index === 0
                        ? "lg:col-span-2 lg:row-span-2"
                        : " lg:block lg:col-span-1 lg:row-span-1", // Apply different classes based on index
                      "rounded-lg overflow-hidden"
                    )}
                  />
                ))}
              </div>
            </div>

            <div className="mt-8 lg:col-span-5">
              <form onSubmit={handleAddToCart}>
                {/* Color picker */}
                <div>
                  <h2 className="text-sm font-medium text-gray-100">Color</h2>

                  <fieldset aria-label="Choose a color" className="mt-2">
                    <select
                      value={selectedColor}
                      onChange={(e) => setSelectedColor(e.target.value)}
                      className="px-2 py-2 bordertext-base font-medium text-black  border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      <option value="">Select Color</option>
                      {getColorOptions().map((colorOption) => (
                        <option
                          key={colorOption.value}
                          value={colorOption.value}
                        >
                          {colorOption.value}
                        </option>
                      ))}
                    </select>
                  </fieldset>
                </div>

                {/* Size picker */}
                <div className="mt-8">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-medium text-gray-100">Size</h2>
                  </div>

                  <fieldset aria-label="Choose a color" className="mt-2">
                    <select
                      value={selectedSize}
                      onChange={(e) => setSelectedSize(e.target.value)}
                      className="px-2 py-2 bordertext-base font-medium text-black  border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      <option value="">Select Size</option>
                      {getSizeOptions().map((sizeOption) => (
                        <option key={sizeOption.value} value={sizeOption.value}>
                          {sizeOption.value}
                        </option>
                      ))}
                    </select>
                  </fieldset>
                </div>

                <button
                  type="submit"
                  className="mt-8 flex  items-center justify-center rounded-md border border-gray-100 px-8 py-2 text-base font-medium text-white hover:bg-red-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                >
                  Add to cart
                </button>
              </form>

              {/* Product details */}
              <div className="mt-10">
                <h2 className="text-sm font-medium text-gray-300">
                  Description
                </h2>

                <div
                  className="prose prose-sm mt-4 text-gray-100"
                  dangerouslySetInnerHTML={{ __html: product.description }}
                />
              </div>

              <div className="mt-8 border-t border-gray-200 pt-8" />

              {/* Policies */}
              <section aria-labelledby="policies-heading" className="mt-0">
                <h2 id="policies-heading" className="sr-only">
                  Our Policies
                </h2>

                <dl className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                  {policies.map((policy) => (
                    <div
                      key={policy.name}
                      className="rounded-lg border border-gray-100 bg-black p-6 text-center"
                    >
                      <dt>
                        <policy.icon
                          className="mx-auto h-6 w-6 flex-shrink-0 text-gray-100"
                          aria-hidden="true"
                        />
                        <span className="mt-4 text-sm font-medium text-gray-100">
                          {policy.name}
                        </span>
                      </dt>
                      <dd className="mt-1 text-sm text-gray-300">
                        {policy.description}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
