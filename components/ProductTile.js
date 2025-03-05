import Link from "next/link";
import Image from "next/image"; // Add this import
import { motion } from 'framer-motion';

export default function ProductTile({ product, viewMode = 'grid' }) {
  const priceNumber = parseFloat(product.variants[0]?.price?.amount || 0);
  const formattedPrice = priceNumber.toFixed(2);

  // console.log("product:", product);

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

  // Updated inventory check
  const isOutOfStock = product.variants.every(variant => 
    !variant.available || variant.quantityAvailable <= 0
  );

  // Render list view with conditional wrapper
  if (viewMode === 'list') {
    const ListContent = (
      <motion.div 
        className={`group relative flex gap-x-6 bg-gray-900/30 p-4 rounded-lg ${
          isOutOfStock ? 'cursor-not-allowed opacity-75' : 'hover:bg-gray-900/50 transition-colors'
        }`}
        whileHover={isOutOfStock ? {} : { scale: 1.02 }}
        whileTap={isOutOfStock ? {} : { scale: 0.98 }}
      >
        <div className="relative h-24 w-24 overflow-hidden rounded-md">
          <img
            src={product.imageSrc}
            alt={product.imageAlt || product.title}
            className={`h-full w-full object-cover object-center ${isOutOfStock ? 'opacity-50' : ''}`}
          />
          {isOutOfStock && (
            <div className="absolute inset-0 flex items-center justify-center bg-opacity-20">
              <span className="bg-red-600 text-white px-2 py-1 text-xs font-bold rounded">
                SOLD OUT
              </span>
            </div>
          )}
        </div>
        <div className="flex flex-col flex-1">
          <h3 className="text-lg font-semibold text-white group-hover:text-red-500 transition-colors">
            {product.title}
          </h3>
          <p className="mt-1 text-sm text-gray-400 line-clamp-2" 
             dangerouslySetInnerHTML={{ __html: product.description }}
          />
          <div className="mt-auto flex items-center">
            <p className="text-base font-medium text-white">${formattedPrice}</p>
            {isOutOfStock && (
              <span className="ml-2 text-sm text-red-700">Out of Stock</span>
            )}
          </div>
        </div>
      </motion.div>
    );
    
    return isOutOfStock ? (
      <div>{ListContent}</div>
    ) : (
      <Link href={`/shop/${formatSlug(product.title)}`}>{ListContent}</Link>
    );
  }
  
  // Render grid view with conditional wrapper
  const GridContent = (
    <motion.div 
      className={`group relative ${isOutOfStock ? 'cursor-not-allowed opacity-75' : ''}`}
      whileHover={isOutOfStock ? {} : { scale: 1.05 }}
      whileTap={isOutOfStock ? {} : { scale: 0.95 }}
    >
      <div className="aspect-h-1 aspect-w-1 w-full overflow-hidden rounded-lg xl:aspect-h-8 xl:aspect-w-7 mt-4">
        <img
          src={product.imageSrc}
          alt={product.imageAlt || product.title}
          className={`h-full w-full object-cover object-center group-hover:opacity-75 ${isOutOfStock ? 'opacity-50' : ''}`}
        />
        {isOutOfStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-opacity-40">
            <span className="bg-red-600 text-white px-3 py-1 text-sm font-bold rounded">
              SOLD OUT
            </span>
          </div>
        )}
      </div>
      <div className="mt-4">
        <h3 className="text-sm font-medium text-white group-hover:text-red-500 transition-colors">
          {product.title}
        </h3>
        <div className="flex items-center gap-2">
          <p className="mt-1 text-lg font-medium text-white">${formattedPrice}</p>
          {isOutOfStock && (
            <span className="text-sm mt-1 text-red-700">Out of Stock</span>
          )}
        </div>
      </div>
    </motion.div>
  );
  
  return isOutOfStock ? (
    <div className="group">{GridContent}</div>
  ) : (
    <Link href={`/shop/${formatSlug(product.title)}`} className="group" onClick={handleLinkClick}>
      {GridContent}
    </Link>
  );
}
