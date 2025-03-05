"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

const images = ["/assets/shopGif1.gif", "/assets/shopGif2.gif"];

export function AutoSliderBanner() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    // Set up the interval for image rotation
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
      console.log("Switching to next image"); // Debug log
    }, 5000); // Change image every 5 seconds

    // Clean up the interval on unmount
    return () => clearInterval(interval);
  }, []); // Empty dependency array ensures this only runs once on mount

  const handleShopClick = () => {
    const productSection = document.getElementById("product-section");
    if (productSection) {
      productSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* Image container - using absolute positioning for full screen coverage */}
      {images.map((src, index) => (
        <div
          key={src}
          className={`absolute top-0 left-0 w-full h-full transition-opacity duration-1000 ${
            index === currentIndex ? "opacity-100" : "opacity-0"
          }`}
        >
          <Image
            src={src}
            alt={`Banner ${index + 1}`}
            fill
            style={{ objectFit: "cover" }}
            priority
            sizes="100vw"
          />
        </div>
      ))}

      {/* Overlay with text and button */}
      <div className="absolute inset-0 bg-black bg-opacity-50 flex flex-col items-center justify-center">
        <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl text-gray-100 text-center mb-4">
          SHOP RAGESTATE
        </h1>
        <p className="text-xl text-gray-300 text-center mb-8">
          Elevate Your Style
        </p>
        <button
          onClick={handleShopClick}
          className="px-6 py-3 text-white rounded-md bg-transparent border border-white hover:bg-white hover:text-black transition-colors duration-300"
        >
          SHOP
        </button>
      </div>
    </div>
  );
}

export default AutoSliderBanner;
