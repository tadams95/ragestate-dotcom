'use client';

import { Squares2X2Icon as GridIcon, ListBulletIcon } from '@heroicons/react/24/outline';
import { motion, useReducedMotion } from 'framer-motion';
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useState } from 'react';
import ProductTile from '../../../components/ProductTile';
import { fetchShopifyProducts } from '../../../shopify/shopifyService';
import Footer from '../components/Footer';
import Header from '../components/Header';
const AutoSliderBanner = dynamic(() => import('../../../components/AutoSliderBanner'), {
  ssr: false,
  loading: () => null,
});

export default function Shop() {
  const prefersReducedMotion = useReducedMotion();
  const [productsWithHref, setProductsWithHref] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // Keep the view mode state
  const setGrid = useCallback(() => setViewMode('grid'), []);
  const setList = useCallback(() => setViewMode('list'), []);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const fetchedProducts = await fetchShopifyProducts();
        if (isMounted) {
          const products = fetchedProducts.map((product) => {
            const primaryImage =
              product?.images?.[0] ||
              product?.featuredImage ||
              product?.variants?.[0]?.image ||
              null;

            const imageSrc = primaryImage?.src || primaryImage?.transformedSrc || null;

            const imageAlt = primaryImage?.altText || product?.title || 'Product image';

            if (!imageSrc) {
              // eslint-disable-next-line no-console
              console.warn('[Shop] Missing product image URL', {
                id: product?.id,
                title: product?.title,
                images: product?.images,
                featuredImage: product?.featuredImage,
                firstVariantImage: product?.variants?.[0]?.image,
                product,
              });
            }

            return {
              ...product,
              imageSrc,
              imageAlt,
              description: product.descriptionHtml,
            };
          });

          setProductsWithHref(products);
        }
      } catch (error) {
        if (isMounted) {
          console.error('Error fetching products:', error);
          setError('Shop is currently unavailable. Please check back later.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="isolate min-h-screen bg-black">
      <Header />

      {/* Add the AutoSliderBanner */}
      <AutoSliderBanner />

      <div id="product-section" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        {/* View Toggle */}
        <div className="mb-8 flex justify-end">
          <div className="flex gap-2 rounded-md bg-black p-1">
            <button
              onClick={setGrid}
              data-testid="grid-view-button"
              aria-label="Grid view"
              aria-pressed={viewMode === 'grid'}
              className={`rounded p-2 ${viewMode === 'grid' ? 'bg-red-700' : ''}`}
            >
              <GridIcon className="h-5 w-5 text-white" />
            </button>
            <button
              onClick={setList}
              data-testid="list-view-button"
              aria-label="List view"
              aria-pressed={viewMode === 'list'}
              className={`rounded p-2 ${viewMode === 'list' ? 'bg-red-700' : ''}`}
            >
              <ListBulletIcon className="h-5 w-5 text-white" />
            </button>
          </div>
        </div>

        {/* Loading and Error States */}
        {loading && (
          <div
            className={
              viewMode === 'grid'
                ? 'grid gap-y-10 sm:grid-cols-2 sm:gap-x-6 lg:grid-cols-3 lg:gap-x-8'
                : 'flex flex-col gap-y-4'
            }
          >
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="animate-pulse">
                {viewMode === 'grid' ? (
                  <div>
                    <div className="h-64 w-full rounded-lg bg-gray-800 sm:h-72 lg:h-80" />
                    <div className="mt-4 h-4 w-2/3 rounded bg-gray-800" />
                    <div className="mt-2 h-4 w-1/3 rounded bg-gray-800" />
                  </div>
                ) : (
                  <div className="relative flex gap-x-6 rounded-lg bg-gray-900/30 p-4">
                    <div className="h-24 w-24 rounded-md bg-gray-800" />
                    <div className="flex-1">
                      <div className="h-4 w-1/2 rounded bg-gray-800" />
                      <div className="mt-2 h-4 w-full rounded bg-gray-800" />
                      <div className="mt-2 h-4 w-2/5 rounded bg-gray-800" />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {error && <div className="py-8 text-center text-red-500">{error}</div>}

        {/* Products Grid/List */}
        {!loading && !error && (
          <>
            <motion.div
              key={viewMode}
              initial={prefersReducedMotion ? false : { opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, amount: 0.2 }}
              exit={prefersReducedMotion ? undefined : { opacity: 0 }}
              className={` ${
                viewMode === 'grid'
                  ? 'grid gap-y-10 sm:grid-cols-2 sm:gap-x-6 lg:grid-cols-3 lg:gap-x-8'
                  : 'flex flex-col gap-y-4'
              } `}
            >
              {productsWithHref.map((product) => (
                <motion.div
                  key={product.id}
                  layout={prefersReducedMotion ? false : true}
                  initial={prefersReducedMotion ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={prefersReducedMotion ? undefined : { opacity: 0 }}
                >
                  <ProductTile product={product} viewMode={viewMode} />
                </motion.div>
              ))}
            </motion.div>
          </>
        )}

        {/* No Products Message */}
        {!loading && !error && productsWithHref.length === 0 && (
          <div className="py-8 text-center text-gray-400">No products available</div>
        )}
      </div>

      <Footer />
      {/* <ShopStyling /> */}
    </div>
  );
}
