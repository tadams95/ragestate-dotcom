'use client';

import Header from '@/app/components/Header';
import storage from '@/utils/storage';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import ProductDetails from '../../../../components/ProductDetail';
import RelatedProducts from '../../../../components/RelatedProducts';

export default function ProductDetailClient({ product: initialProduct }) {
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(initialProduct);
  const restoreFocusEl = useRef(null);

  // console.log("askdljfalksdfj:", initialProduct);

  //I should work on this more and make more tweaks

  useEffect(() => {
    // Measure header height for sticky offset CSS var
    try {
      const hdr = document.querySelector('header, [role="banner"]');
      const h = hdr?.getBoundingClientRect?.().height || 96;
      document.documentElement.style.setProperty('--header-h', `${Math.round(h)}px`);
    } catch (_) {}
    const onResize = () => {
      try {
        const hdr = document.querySelector('header, [role="banner"]');
        const h = hdr?.getBoundingClientRect?.().height || 96;
        document.documentElement.style.setProperty('--header-h', `${Math.round(h)}px`);
      } catch (_) {}
    };
    window.addEventListener('resize', onResize);

    if (!initialProduct && typeof window !== 'undefined') {
      const product = storage.getJSON('selectedProduct');
      setSelectedProduct(product);
    }

    const timer = setTimeout(() => {
      setLoading(false);
    }, 100);

    return () => {
      window.removeEventListener('resize', onResize);
      clearTimeout(timer);
    };
  }, [initialProduct]);

  if (!selectedProduct) {
    return (
      <>
        <Header />
        <div className="px-4 py-20 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-10">
              <div className="lg:col-span-7">
                <div className="grid animate-pulse grid-cols-2 gap-4">
                  <div className="col-span-2 h-[28rem] rounded-lg bg-gray-800 sm:h-[32rem]" />
                  <div className="h-64 rounded-lg bg-gray-800 sm:h-72" />
                  <div className="h-64 rounded-lg bg-gray-800 sm:h-72" />
                </div>
              </div>
              <div className="lg:col-span-3">
                <div className="animate-pulse">
                  <div className="h-6 w-2/3 rounded bg-gray-800" />
                  <div className="mt-4 h-6 w-1/3 rounded bg-gray-800" />
                  <div className="mt-6 h-10 w-48 rounded bg-gray-800" />
                  <div className="mt-8 h-40 w-full rounded bg-gray-800" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div
        className={`transition-opacity ${loading ? 'opacity-0' : 'opacity-100 duration-1000'} px-4 pb-20 lg:px-8`}
        style={{ paddingTop: 'calc(var(--header-h, 96px) + 16px)' }}
      >
        {/* Share handler */}
        {(() => {
          // no-op wrapper to keep handler close by without re-creating per render
          // eslint-disable-next-line no-unused-vars
          const _ = null;
        })()}
        {/* Breadcrumbs + Share */}
        <div className="pointer-events-auto relative isolate z-50 mx-auto mb-4 flex max-w-7xl items-center justify-between">
          <nav aria-label="Breadcrumb" className="text-sm text-gray-400">
            <ol className="flex items-center gap-2">
              <li>
                <Link href="/" className="hover:text-white">
                  Home
                </Link>
              </li>
              <li className="text-gray-600">/</li>
              <li>
                <Link href="/shop" className="hover:text-white">
                  Shop
                </Link>
              </li>
              <li className="text-gray-600">/</li>
              <li aria-current="page" className="line-clamp-1 max-w-[50vw] text-gray-300">
                {selectedProduct?.title}
              </li>
            </ol>
          </nav>
          <button
            type="button"
            onClick={async () => {
              const url = typeof window !== 'undefined' ? window.location.href : '';
              if (!url) return;
              // Preferred: Clipboard API
              try {
                await navigator.clipboard.writeText(url);
                toast.success('Link copied');
                return;
              } catch (_) {}
              // Fallback: legacy copy via hidden textarea
              try {
                const ta = document.createElement('textarea');
                ta.value = url;
                ta.setAttribute('readonly', '');
                ta.style.position = 'fixed';
                ta.style.opacity = '0';
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                document.body.removeChild(ta);
                toast.success('Link copied');
              } catch (_) {}
            }}
            className="relative z-20 rounded border border-gray-700 px-3 py-1 text-sm text-gray-200 hover:border-gray-500"
            aria-label="Share this product"
          >
            Share
          </button>
        </div>
        <ProductDetails product={selectedProduct} focusRestoreRef={restoreFocusEl} />
        <RelatedProducts
          currentId={selectedProduct?.id}
          productType={selectedProduct?.productType}
        />
      </div>
    </>
  );
}
