'use client';

import { Squares2X2Icon as GridIcon, ListBulletIcon } from '@heroicons/react/24/outline';
import { motion, useReducedMotion } from 'framer-motion';
// import dynamic from 'next/dynamic';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import ProductTile from '../../../components/ProductTile';
import QuickViewModal from '../../../components/QuickViewModal';
import { fetchShopifyProducts } from '../../../shopify/shopifyService';

// const AutoSliderBanner = dynamic(() => import('../../../components/AutoSliderBanner'), {
//   ssr: false,
//   loading: () => null,
// });

export default function ShopClient() {
  const prefersReducedMotion = useReducedMotion();
  const [productsWithHref, setProductsWithHref] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('grid');
  const [quickViewProduct, setQuickViewProduct] = useState(null);
  const setGrid = useCallback(() => setViewMode('grid'), []);
  const setList = useCallback(() => setViewMode('list'), []);

  // Router + URL state for Filters & Sort
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [category, setCategory] = useState('');
  const [size, setSize] = useState('');
  const [color, setColor] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sort, setSort] = useState('');

  // Default to list view on small screens (mobile), grid on larger screens
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isMobile = window.innerWidth < 640; // Tailwind's sm breakpoint
    if (isMobile) {
      setViewMode('list');
    }
  }, []);

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

    // Initialize filters from URL
    const fromParams = () => {
      const get = (k) => searchParams?.get(k) || '';
      setCategory(get('category'));
      setSize(get('size'));
      setColor(get('color'));
      setMinPrice(get('min'));
      setMaxPrice(get('max'));
      setInStockOnly(get('avail') === '1');
      setSort(get('sort'));
    };

    fromParams();
    fetchData();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Write filters to URL on change
  useEffect(() => {
    const params = new URLSearchParams(searchParams?.toString());
    const setOrDel = (key, val) => {
      if (val && String(val).length > 0) params.set(key, String(val));
      else params.delete(key);
    };
    setOrDel('category', category);
    setOrDel('size', size);
    setOrDel('color', color);
    setOrDel('min', minPrice);
    setOrDel('max', maxPrice);
    if (inStockOnly) params.set('avail', '1');
    else params.delete('avail');
    setOrDel('sort', sort);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, size, color, minPrice, maxPrice, inStockOnly, sort]);

  // Derive filter option lists
  const { categories, sizes, colors } = useMemo(() => {
    const cat = new Set();
    const sz = new Set();
    const col = new Set();
    for (const p of productsWithHref) {
      if (p?.productType) cat.add(p.productType);
      if (Array.isArray(p?.variants)) {
        for (const v of p.variants) {
          const opts = v?.selectedOptions || [];
          for (const o of opts) {
            if (o?.name === 'Size' && o?.value) sz.add(o.value);
            if (o?.name === 'Color' && o?.value) col.add(o.value);
          }
        }
      }
    }
    return {
      categories: Array.from(cat).sort(),
      sizes: Array.from(sz).sort(),
      colors: Array.from(col).sort(),
    };
  }, [productsWithHref]);

  // Helpers for price/stock
  const getMinPrice = (p) => {
    const variants = Array.isArray(p?.variants) ? p.variants : [];
    const vals = variants
      .map(
        (v) =>
          parseFloat((v?.priceV2 && v.priceV2.amount) || v?.price?.amount || v?.price || 0) || 0,
      )
      .filter((n) => !Number.isNaN(n));
    return vals.length ? Math.min(...vals) : 0;
  };
  const isAnyInStock = (p) => {
    const variants = Array.isArray(p?.variants) ? p.variants : [];
    return variants.some((v) => {
      const available =
        (typeof v?.availableForSale === 'boolean' && v.availableForSale) ||
        (typeof v?.available === 'boolean' && v.available) ||
        (v?.availableForSale == null && v?.available == null);
      const qtyOk = v?.quantityAvailable == null || v.quantityAvailable > 0;
      return available && qtyOk;
    });
  };

  // Apply filters
  const filteredProducts = useMemo(() => {
    let list = productsWithHref.slice();
    if (category) list = list.filter((p) => p?.productType === category);
    if (size)
      list = list.filter((p) =>
        (p?.variants || []).some((v) =>
          (v?.selectedOptions || []).some((o) => o?.name === 'Size' && o?.value === size),
        ),
      );
    if (color)
      list = list.filter((p) =>
        (p?.variants || []).some((v) =>
          (v?.selectedOptions || []).some((o) => o?.name === 'Color' && o?.value === color),
        ),
      );
    const min = parseFloat(minPrice);
    if (!Number.isNaN(min)) list = list.filter((p) => getMinPrice(p) >= (min || 0));
    const max = parseFloat(maxPrice);
    if (!Number.isNaN(max) && max > 0) list = list.filter((p) => getMinPrice(p) <= max);
    if (inStockOnly) list = list.filter((p) => isAnyInStock(p));

    // Sort
    if (sort === 'price_asc') list.sort((a, b) => getMinPrice(a) - getMinPrice(b));
    else if (sort === 'price_desc') list.sort((a, b) => getMinPrice(b) - getMinPrice(a));
    else if (sort === 'newest')
      list.sort(
        (a, b) =>
          new Date(b?.publishedAt || b?.createdAt || 0) -
          new Date(a?.publishedAt || a?.createdAt || 0),
      );
    return list;
  }, [productsWithHref, category, size, color, minPrice, maxPrice, inStockOnly, sort]);

  const _resultsCount = filteredProducts.length;

  const _resetFilters = () => {
    setCategory('');
    setSize('');
    setColor('');
    setMinPrice('');
    setMaxPrice('');
    setInStockOnly(false);
    setSort('');
  };

  const _showFilters = useMemo(() => {
    if ((productsWithHref || []).length > 1) return true;
    const optionsCount = (categories?.length || 0) + (sizes?.length || 0) + (colors?.length || 0);
    return optionsCount > 1;
  }, [productsWithHref, categories, sizes, colors]);

  return (
    <div className="isolate min-h-screen bg-black">
      {/* Header is rendered by layout.js */}

      {/* Add the AutoSliderBanner */}
      {/* <AutoSliderBanner /> */}

      <div id="product-section" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        {/* View Toggle */}
        <div className="mb-8 flex justify-end">
          <div className="flex gap-2 rounded-md bg-black p-1">
            <button
              onClick={setGrid}
              data-testid="grid-view-button"
              aria-label="Grid view"
              aria-pressed={viewMode === 'grid'}
              className={`${'rounded p-2'} ${viewMode === 'grid' ? 'bg-red-700' : ''}`}
            >
              <GridIcon className="h-5 w-5 text-white" />
            </button>
            <button
              onClick={setList}
              data-testid="list-view-button"
              aria-label="List view"
              aria-pressed={viewMode === 'list'}
              className={`${'rounded p-2'} ${viewMode === 'list' ? 'bg-red-700' : ''}`}
            >
              <ListBulletIcon className="h-5 w-5 text-white" />
            </button>
          </div>
        </div>

        {/* Filters UI intentionally commented while catalog is small */}

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
                  <div className="relative">
                    <ProductTile product={product} viewMode={viewMode} />
                    {/* Quick View button overlays only in grid view */}
                    {viewMode === 'grid' && isAnyInStock(product) && (
                      <button
                        type="button"
                        aria-label={`Quick view ${product.title}`}
                        onClick={() => setQuickViewProduct(product)}
                        className="absolute right-2 top-2 rounded bg-black/60 px-2 py-1 text-xs text-white hover:bg-black/80"
                      >
                        Quick View
                      </button>
                    )}
                  </div>
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

      <QuickViewModal
        open={Boolean(quickViewProduct)}
        onClose={() => setQuickViewProduct(null)}
        product={quickViewProduct}
      />
      {/* Footer is rendered globally in RootLayout */}
      {/* <ShopStyling /> */}
    </div>
  );
}
