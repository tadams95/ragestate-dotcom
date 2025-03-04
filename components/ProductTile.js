import Link from "next/link";
import Image from "next/image"; // Add this import
import { motion } from 'framer-motion';

export default function ProductTile({ product, viewMode = 'grid' }) {
  const priceNumber = parseFloat(product.variants[0]?.price?.amount || 0);
  const formattedPrice = priceNumber.toFixed(2);

  // Function to format slug
  const formatSlug = (title) => {
    return title
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^\w\-]+/g, "")
      .replace(/\-\-+/g, "-");
  };

  const handleLinkClick = () => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        localStorage.setItem("selectedProduct", JSON.stringify(product));
      } else {
        console.warn("localStorage is not available.");
      }
    } catch (error) {
      console.error("Failed to save product to localStorage:", error);
    }
  };

  if (viewMode === 'list') {
    return (
      <Link href={`/shop/${formatSlug(product.title)}`}>
        <motion.div 
          className="group relative flex gap-x-6 bg-gray-900/30 p-4 rounded-lg hover:bg-gray-900/50 transition-colors"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="relative h-24 w-24 overflow-hidden rounded-md">
            <img  // Changed from Image to img for simpler implementation
              src={product.imageSrc}
              alt={product.imageAlt || product.title}
              className="h-full w-full object-cover object-center"
            />
          </div>
          <div className="flex flex-col flex-1">
            <h3 className="text-lg font-semibold text-white group-hover:text-red-500 transition-colors">
              {product.title}
            </h3>
            <p className="mt-1 text-sm text-gray-400 line-clamp-2" 
               dangerouslySetInnerHTML={{ __html: product.description }}
            />
            <div className="mt-auto">
              <p className="text-base font-medium text-white">${formattedPrice}</p>
            </div>
          </div>
        </motion.div>
      </Link>
    );
  }

  return (
    <Link
      href={`/shop/${formatSlug(product.title)}`}
      className="group"
      onClick={handleLinkClick}
    >
      <motion.div 
        className="group relative"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <div className="aspect-h-1 aspect-w-1 w-full overflow-hidden rounded-lg xl:aspect-h-8 xl:aspect-w-7 mt-4">
          <img  // Changed from Image to img for simpler implementation
            src={product.imageSrc}
            alt={product.imageAlt || product.title}
            className="h-full w-full object-cover object-center group-hover:opacity-75"
          />
        </div>
        <div className="mt-4">
          <h3 className="text-sm font-medium text-white group-hover:text-red-500 transition-colors">
            {product.title}
          </h3>
          <p className="mt-1 text-lg font-medium text-white">${formattedPrice}</p>
        </div>
      </motion.div>
    </Link>
  );
}
