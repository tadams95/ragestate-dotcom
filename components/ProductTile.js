import { motion, useReducedMotion } from 'framer-motion';
import Image from 'next/image'; // Add this import
import Link from 'next/link';
import React from 'react';

function ProductTile({ product, viewMode = 'grid' }) {
  const prefersReducedMotion = useReducedMotion();
  const firstVariant = (product?.variants && product.variants[0]) || {};
  const rawPrice = (firstVariant.priceV2 && firstVariant.priceV2.amount) ?? firstVariant.price ?? 0;
  const priceNumber = parseFloat(rawPrice) || 0;
  const formattedPrice = priceNumber.toFixed(2);

  // console.log("product:", product);

  // Resolve image src/alt with fallbacks
  const resolvedImage =
    (Array.isArray(product?.images) && product.images[0]) ||
    product?.featuredImage ||
    product?.variants?.[0]?.image ||
    null;
  const imageSrc =
    product?.imageSrc || resolvedImage?.src || resolvedImage?.transformedSrc || '/assets/user.png';
  const imageAlt = product?.imageAlt || resolvedImage?.altText || product?.title || 'Product image';

  // Function to format slug
  const formatSlug = (title) => {
    return title
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w\-]+/g, '')
      .replace(/\-\-+/g, '-');
  };

  const handleLinkClick = () => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('selectedProduct', JSON.stringify(product));
      } else {
        console.warn('localStorage is not available.');
      }
    } catch (error) {
      console.error('Failed to save product to localStorage:', error);
    }
  };

  // Updated inventory check (treat missing fields conservatively as available)
  const variants = Array.isArray(product?.variants) ? product.variants : [];
  const anyInStock = variants.some((v) => {
    const available =
      (typeof v.availableForSale === 'boolean' && v.availableForSale) ||
      (typeof v.available === 'boolean' && v.available) ||
      (v.availableForSale == null && v.available == null); // assume available if unknown
    const qtyOk = v.quantityAvailable == null || v.quantityAvailable > 0;
    return available && qtyOk;
  });
  const isOutOfStock = !anyInStock;

  // Render list view with conditional wrapper
  if (viewMode === 'list') {
    const ListContent = (
      <motion.div
        className={`group relative flex gap-x-6 rounded-lg bg-gray-900/30 p-4 ${
          isOutOfStock ? 'cursor-not-allowed opacity-75' : 'transition-colors hover:bg-gray-900/50'
        }`}
        whileHover={isOutOfStock || prefersReducedMotion ? undefined : { scale: 1.02 }}
        whileTap={isOutOfStock || prefersReducedMotion ? undefined : { scale: 0.98 }}
      >
        <div className="relative h-24 w-24 overflow-hidden rounded-md">
          <Image
            src={imageSrc}
            alt={imageAlt}
            fill
            sizes="96px"
            className={`object-cover object-center ${isOutOfStock ? 'opacity-50' : ''}`}
          />
          {isOutOfStock && (
            <div className="absolute inset-0 flex items-center justify-center bg-opacity-20">
              <span className="rounded bg-red-600 px-2 py-1 text-xs font-bold text-white">
                SOLD OUT
              </span>
            </div>
          )}
        </div>
        <div className="flex flex-1 flex-col">
          <h3 className="text-lg font-semibold text-white transition-colors group-hover:text-red-500">
            {product.title}
          </h3>
          <p
            className="mt-1 line-clamp-2 text-sm text-gray-400"
            dangerouslySetInnerHTML={{ __html: product.description }}
          />
          <div className="mt-auto flex items-center">
            <p className="text-base font-medium text-white">${formattedPrice}</p>
            {isOutOfStock && <span className="ml-2 text-sm text-red-700">Out of Stock</span>}
          </div>
        </div>
      </motion.div>
    );

    return isOutOfStock ? (
      <div>{ListContent}</div>
    ) : (
      <Link href={`/shop/${product?.handle || formatSlug(product.title)}`}>{ListContent}</Link>
    );
  }

  // Render grid view with conditional wrapper
  const GridContent = (
    <motion.div
      className={`group relative ${isOutOfStock ? 'cursor-not-allowed opacity-75' : ''}`}
      whileHover={isOutOfStock || prefersReducedMotion ? undefined : { scale: 1.05 }}
      whileTap={isOutOfStock || prefersReducedMotion ? undefined : { scale: 0.95 }}
    >
      <div className="relative mt-4 h-64 w-full overflow-hidden rounded-lg sm:h-72 lg:h-80">
        <Image
          src={imageSrc}
          alt={imageAlt}
          fill
          sizes="(min-width:1280px) 25vw, (min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw"
          className={`object-cover object-center group-hover:opacity-75 ${
            isOutOfStock ? 'opacity-50' : ''
          }`}
        />
        {isOutOfStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-opacity-40">
            <span className="rounded bg-red-600 px-3 py-1 text-sm font-bold text-white">
              SOLD OUT
            </span>
          </div>
        )}
      </div>
      <div className="mt-4">
        <h3 className="text-sm font-medium text-white transition-colors group-hover:text-red-500">
          {product.title}
        </h3>
        <div className="flex items-center gap-2">
          <p className="mt-1 text-lg font-medium text-white">${formattedPrice}</p>
          {isOutOfStock && <span className="mt-1 text-sm text-red-700">Out of Stock</span>}
        </div>
      </div>
    </motion.div>
  );

  return isOutOfStock ? (
    <div className="group">{GridContent}</div>
  ) : (
    <Link
      href={`/shop/${product?.handle || formatSlug(product.title)}`}
      className="group"
      onClick={handleLinkClick}
    >
      {GridContent}
    </Link>
  );
}

export default React.memo(ProductTile, (prev, next) => {
  const prevVariant = prev.product?.variants?.[0];
  const nextVariant = next.product?.variants?.[0];
  const prevPrice = parseFloat(prevVariant?.price?.amount || 0);
  const nextPrice = parseFloat(nextVariant?.price?.amount || 0);

  return (
    prev.viewMode === next.viewMode &&
    prev.product?.id === next.product?.id &&
    prev.product?.title === next.product?.title &&
    prevPrice === nextPrice &&
    prev.product?.imageSrc === next.product?.imageSrc &&
    prev.product?.imageAlt === next.product?.imageAlt &&
    prev.product?.variants?.every((v, i) => {
      const nv = next.product?.variants?.[i];
      return (
        v?.available === nv?.available &&
        (v?.quantityAvailable || 0) === (nv?.quantityAvailable || 0)
      );
    })
  );
});
