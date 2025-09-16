'use client';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  TruckIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import Image from 'next/image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';

import { useDispatch } from 'react-redux';
import { addToCart } from '../lib/features/todos/cartSlice';

import EventStyling1 from '@/app/components/styling/EventStyling1';
import EventStyling2 from '@/app/components/styling/EventStyling2';

const policies = [
  {
    name: 'National delivery',
    icon: TruckIcon,
    description: 'Get your order within 1-2 Weeks',
  },
  {
    name: 'Your support matters',
    icon: UserGroupIcon,
    description: 'Thanks for RAGING with us!',
  },
];

function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

export default function ProductDetails({ product, focusRestoreRef }) {
  const dispatch = useDispatch();
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  // const [productPrice, setProductPrice] = useState(0);

  const basePrice = useMemo(() => {
    const amt = parseFloat(product?.variants?.[0]?.price?.amount || '0');
    return Number.isFinite(amt) ? amt : 0;
  }, [product]);
  // Avoid early return to keep hooks order stable; assume caller shows skeleton

  // console.log("Price Ya Heard: ", product?.variants[0]?.price?.amount);

  // Destructure necessary fields from product
  const {
    id,
    title,
    images,
    // Add other necessary fields
  } = product;

  const variants = useMemo(() => product?.variants || [], [product]);
  const productImages = useMemo(() => product?.images || [], [product]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const closeBtnRef = useRef(null);

  const totalImages = productImages.length;
  const goPrev = useCallback(() => {
    setActiveIndex((i) => (totalImages ? (i - 1 + totalImages) % totalImages : 0));
  }, [totalImages]);
  const goNext = useCallback(() => {
    setActiveIndex((i) => (totalImages ? (i + 1) % totalImages : 0));
  }, [totalImages]);

  const [zoomed, setZoomed] = useState(false);
  const [zoomScale] = useState(2);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [lastTap, setLastTap] = useState(0);
  const clickSuppressUntilRef = useRef(0);
  const [tStartX, setTStartX] = useState(0);
  const [tStartY, setTStartY] = useState(0);
  const [tLastX, setTLastX] = useState(0);
  const [tLastY, setTLastY] = useState(0);
  const [didMove, setDidMove] = useState(false);

  const toggleZoom = useCallback(() => {
    setZoomed((z) => {
      if (z) {
        setPanX(0);
        setPanY(0);
      }
      return !z;
    });
  }, []);

  const onTouchStart = useCallback((e) => {
    const t = e.touches?.[0];
    if (!t) return;
    setTStartX(t.clientX);
    setTStartY(t.clientY);
    setTLastX(t.clientX);
    setTLastY(t.clientY);
    setDidMove(false);
  }, []);

  const onTouchMove = useCallback(
    (e) => {
      const t = e.touches?.[0];
      if (!t) return;
      const dx = t.clientX - tLastX;
      const dy = t.clientY - tLastY;
      if (zoomed) {
        setPanX((x) => x + dx);
        setPanY((y) => y + dy);
        e.preventDefault();
      } else {
        if (Math.abs(t.clientX - tStartX) > 10 || Math.abs(t.clientY - tStartY) > 10)
          setDidMove(true);
      }
      setTLastX(t.clientX);
      setTLastY(t.clientY);
    },
    [tLastX, tLastY, tStartX, tStartY, zoomed],
  );

  const onTouchEnd = useCallback(
    (e) => {
      if (zoomed) return;
      const t = e.changedTouches?.[0];
      if (!t) return;
      const dx = t.clientX - tStartX;
      const dy = t.clientY - tStartY;
      const horizontal = Math.abs(dx) > Math.abs(dy);
      if (horizontal && Math.abs(dx) > 50) {
        if (dx < 0) goNext();
        else goPrev();
        return;
      }
      const now = Date.now();
      if (!didMove && now - lastTap < 300) {
        toggleZoom();
        clickSuppressUntilRef.current = now + 350;
        setLastTap(0);
      } else {
        setLastTap(now);
      }
    },
    [tStartX, tStartY, goNext, goPrev, didMove, lastTap, zoomed, toggleZoom],
  );

  const onMouseDown = useCallback(
    (e) => {
      if (!zoomed) return;
      e.preventDefault();
      let lastX = e.clientX;
      let lastY = e.clientY;
      const move = (ev) => {
        const dx = ev.clientX - lastX;
        const dy = ev.clientY - lastY;
        lastX = ev.clientX;
        lastY = ev.clientY;
        setPanX((x) => x + dx);
        setPanY((y) => y + dy);
      };
      const up = () => {
        window.removeEventListener('mousemove', move);
        window.removeEventListener('mouseup', up);
      };
      window.addEventListener('mousemove', move);
      window.addEventListener('mouseup', up);
    },
    [zoomed],
  );

  const onImageClick = useCallback(() => {
    if (Date.now() < clickSuppressUntilRef.current) return;
    if (!zoomed) setLightboxOpen(true);
  }, [zoomed]);

  useEffect(() => {
    if (!lightboxOpen) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setLightboxOpen(false);
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    };
    const prevOverflow = document.body.style.overflow;
    const restoreEl = focusRestoreRef?.current || null;
    document.body.style.overflow = 'hidden';
    closeBtnRef.current?.focus?.();
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
      restoreEl?.focus?.();
    };
  }, [lightboxOpen, totalImages, goNext, goPrev, focusRestoreRef]);

  const getVariantOption = (variant, name) =>
    (variant?.selectedOptions || []).find((o) => o?.name === name)?.value || '';

  const isVariantAvailable = (variant) => {
    if (!variant) return false;
    const availableFlag =
      (typeof variant?.availableForSale === 'boolean' && variant.availableForSale) ||
      (typeof variant?.available === 'boolean' && variant.available) ||
      (variant?.availableForSale == null && variant?.available == null);
    const qtyOk = variant?.quantityAvailable == null || variant.quantityAvailable > 0;
    return Boolean(availableFlag && qtyOk);
  };

  const colorOptions = useMemo(() => {
    const set = new Set();
    variants.forEach((v) => {
      const c = getVariantOption(v, 'Color');
      if (c) set.add(c);
    });
    return Array.from(set);
  }, [variants]);

  const sizeOptions = useMemo(() => {
    const set = new Set();
    variants.forEach((v) => {
      const s = getVariantOption(v, 'Size');
      if (s) set.add(s);
    });
    return Array.from(set);
  }, [variants]);

  const currentVariant = useMemo(() => {
    const hasColor = variants.some((v) => getVariantOption(v, 'Color'));
    const hasSize = variants.some((v) => getVariantOption(v, 'Size'));
    return (
      variants.find((v) => {
        const cOk = !hasColor || (selectedColor && getVariantOption(v, 'Color') === selectedColor);
        const sOk = !hasSize || (selectedSize && getVariantOption(v, 'Size') === selectedSize);
        return cOk && sOk;
      }) || null
    );
  }, [variants, selectedColor, selectedSize]);

  const displayPrice = useMemo(() => {
    const amt = parseFloat(currentVariant?.price?.amount ?? basePrice);
    return Number.isFinite(amt) ? amt.toFixed(2) : '0.00';
  }, [currentVariant, basePrice]);

  // Preselect first available variant or first variant
  useEffect(() => {
    if (!variants.length) return;
    const firstAvail = variants.find((v) => isVariantAvailable(v)) || variants[0];
    const c = getVariantOption(firstAvail, 'Color');
    const s = getVariantOption(firstAvail, 'Size');
    if (c && !selectedColor) setSelectedColor(c);
    if (s && !selectedSize) setSelectedSize(s);
  }, [variants, selectedColor, selectedSize]);

  const handleAddToCart = (e) => {
    if (e?.preventDefault) e.preventDefault(); // Prevent form submission when used in form

    // Check if all required selections are made
    if (selectedSize && selectedColor) {
      const leadImage =
        images && images.length > 0 ? images[0]?.src || images[0]?.transformedSrc || null : null;
      const productToAdd = {
        productId: id,
        productImageSrc: leadImage,
        title,
        price: parseFloat(displayPrice),
        selectedSize,
        selectedColor,
        isDigital: false,
      };

      console.log('Product Added: ', productToAdd);
      // Implement dispatch or function to add to cart
      dispatch(addToCart(productToAdd));
      setSelectedSize(''); // Reset selectedSize
      setSelectedColor(''); // Reset selectedColor
      toast.success('Added to cart!', {
        duration: 3000,
        position: 'bottom-center',
        style: {
          background: '#333',
          color: '#fff',
          border: '1px solid #444',
        },
      });
    } else {
      // Handle the case where not all required selections are made
      if (!selectedSize) {
        toast.error('Please select a size', {
          duration: 3000,
          position: 'bottom-center',
          style: {
            background: '#333',
            color: '#fff',
            border: '1px solid #444',
          },
        });
      }
      if (!selectedColor) {
        toast.error('Please select a color', {
          duration: 3000,
          position: 'bottom-center',
          style: {
            background: '#333',
            color: '#fff',
            border: '1px solid #444',
          },
        });
      }
    }
  };

  // Availability-aware option disabling
  const isColorDisabled = (color) => {
    // If size is chosen, only enable colors that have an available variant for that size
    if (selectedSize) {
      return !variants.some(
        (v) =>
          getVariantOption(v, 'Color') === color &&
          getVariantOption(v, 'Size') === selectedSize &&
          isVariantAvailable(v),
      );
    }
    // Otherwise enable if any available variant has this color
    return !variants.some((v) => getVariantOption(v, 'Color') === color && isVariantAvailable(v));
  };

  const isSizeDisabled = (size) => {
    if (selectedColor) {
      return !variants.some(
        (v) =>
          getVariantOption(v, 'Size') === size &&
          getVariantOption(v, 'Color') === selectedColor &&
          isVariantAvailable(v),
      );
    }
    return !variants.some((v) => getVariantOption(v, 'Size') === size && isVariantAvailable(v));
  };

  return (
    <div className="isolate bg-black">
      <Toaster />
      <EventStyling1 />
      <EventStyling2 />
      <div className="scroll-pb-24 pb-20 pt-6 sm:pb-10 lg:pb-8">
        <div className="mx-auto mt-8 max-w-2xl px-4 sm:px-6 lg:max-w-7xl lg:px-8">
          <div className="lg:grid lg:auto-rows-min lg:grid-cols-10 lg:gap-x-8">
            <div className="lg:col-span-5 lg:col-start-8">
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold tracking-tight text-gray-100">{product.title}</h1>
                <p className="text-2xl font-bold text-white">${displayPrice}</p>
              </div>
            </div>

            {/* Image gallery: slider with thumbnails and lightbox */}
            <div className="col-start-1 mt-8 lg:col-span-7 lg:row-span-3 lg:row-start-1 lg:mt-0">
              <h2 className="sr-only">Images</h2>
              {/* Main slider */}
              <div
                ref={focusRestoreRef}
                tabIndex={-1}
                className="group relative h-[28rem] overflow-hidden rounded-lg sm:h-[32rem]"
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
                onMouseDown={onMouseDown}
              >
                {productImages.length > 0 ? (
                  (() => {
                    const image = productImages[activeIndex] || {};
                    const src = image?.src || image?.transformedSrc || null;
                    if (!src) {
                      // eslint-disable-next-line no-console
                      console.warn('[ProductDetail] Missing product image URL', {
                        productId: product?.id,
                        image,
                      });
                    }
                    return (
                      <>
                        <Image
                          key={image?.id || activeIndex}
                          src={src || '/assets/user.png'}
                          alt={image?.altText || product.title}
                          fill
                          sizes="(min-width:1024px) 60vw, 100vw"
                          className={classNames(
                            'object-cover transition-transform duration-300 group-hover:scale-105',
                            zoomed ? 'cursor-move' : 'cursor-zoom-in',
                          )}
                          onClick={onImageClick}
                          style={
                            zoomed
                              ? {
                                  transform: `scale(${zoomScale}) translate(${panX / zoomScale}px, ${panY / zoomScale}px)`,
                                }
                              : undefined
                          }
                        />
                        {/* Prev/Next controls */}
                        {totalImages > 1 && (
                          <>
                            <button
                              type="button"
                              aria-label="Previous image"
                              onClick={goPrev}
                              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white backdrop-blur transition hover:bg-black/70"
                            >
                              <ChevronLeftIcon className="h-6 w-6" />
                            </button>
                            <button
                              type="button"
                              aria-label="Next image"
                              onClick={goNext}
                              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white backdrop-blur transition hover:bg-black/70"
                            >
                              <ChevronRightIcon className="h-6 w-6" />
                            </button>
                          </>
                        )}
                      </>
                    );
                  })()
                ) : (
                  <div className="flex h-full items-center justify-center bg-gray-900 text-gray-400">
                    No images
                  </div>
                )}
              </div>

              {/* Thumbnails */}
              {totalImages > 1 && (
                <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                  {productImages.map((thumb, idx) => {
                    const tsrc = thumb?.src || thumb?.transformedSrc || null;
                    const selected = idx === activeIndex;
                    return (
                      <button
                        key={thumb?.id || idx}
                        type="button"
                        aria-label={`Show image ${idx + 1}`}
                        onClick={() => setActiveIndex(idx)}
                        className={classNames(
                          'relative h-16 w-16 flex-shrink-0 overflow-hidden rounded border',
                          selected ? 'border-red-500' : 'border-gray-700',
                        )}
                      >
                        <Image
                          src={tsrc || '/assets/user.png'}
                          alt={thumb?.altText || `${product.title} thumbnail ${idx + 1}`}
                          fill
                          sizes="64px"
                          className="object-cover"
                        />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Lightbox overlay */}
            {lightboxOpen && (
              <div className="fixed inset-0 z-50 bg-black/90" role="dialog" aria-modal="true">
                <button
                  ref={closeBtnRef}
                  aria-label="Close image"
                  className="absolute right-4 top-4 rounded bg-black/60 px-3 py-2 text-white"
                  onClick={() => setLightboxOpen(false)}
                >
                  Close
                </button>
                <div className="relative mx-auto flex h-full w-full max-w-7xl items-center justify-center px-4">
                  <Image
                    src={
                      productImages[activeIndex]?.src ||
                      productImages[activeIndex]?.transformedSrc ||
                      '/assets/user.png'
                    }
                    alt={productImages[activeIndex]?.altText || product.title}
                    fill
                    sizes="100vw"
                    className="object-contain"
                  />
                </div>
              </div>
            )}

            <div
              className="mt-8 lg:sticky lg:col-span-5 lg:col-start-8"
              style={{ top: 'calc(var(--header-h, 96px) + 24px)' }}
            >
              <form onSubmit={handleAddToCart} className="space-y-6">
                {/* Color pills */}
                <div>
                  <h2 className="mb-3 text-sm font-medium text-gray-100">Color</h2>
                  <div className="flex flex-wrap gap-2">
                    {colorOptions.length === 0 && (
                      <span className="text-sm text-gray-400">No color options</span>
                    )}
                    {colorOptions.map((color) => {
                      const disabled = isColorDisabled(color);
                      const selected = selectedColor === color;
                      return (
                        <button
                          key={color}
                          type="button"
                          aria-pressed={selected}
                          aria-label={`Select color ${color}`}
                          disabled={disabled}
                          onClick={() => setSelectedColor(color)}
                          className={classNames(
                            'rounded-md border px-3 py-2 text-sm',
                            selected ? 'border-red-500 text-white' : 'border-white text-gray-100',
                            disabled
                              ? 'cursor-not-allowed opacity-40'
                              : 'transition-colors duration-150 hover:border-red-500',
                          )}
                        >
                          {color}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Size pills */}
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-sm font-medium text-gray-100">Size</h2>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {sizeOptions.length === 0 && (
                      <span className="text-sm text-gray-400">No size options</span>
                    )}
                    {sizeOptions.map((size) => {
                      const disabled = isSizeDisabled(size);
                      const selected = selectedSize === size;
                      return (
                        <button
                          key={size}
                          type="button"
                          aria-pressed={selected}
                          aria-label={`Select size ${size}`}
                          disabled={disabled}
                          onClick={() => setSelectedSize(size)}
                          className={classNames(
                            'rounded-md border px-3 py-2 text-sm',
                            selected ? 'border-red-500 text-white' : 'border-white text-gray-100',
                            disabled
                              ? 'cursor-not-allowed opacity-40'
                              : 'transition-colors duration-150 hover:border-red-500',
                          )}
                        >
                          {size}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Availability / stock */}
                <div className="text-sm text-gray-300">
                  {currentVariant ? (
                    isVariantAvailable(currentVariant) ? (
                      currentVariant?.quantityAvailable != null ? (
                        <span>In stock: {currentVariant.quantityAvailable}</span>
                      ) : (
                        <span>In stock</span>
                      )
                    ) : (
                      <span className="text-red-400">Out of stock</span>
                    )
                  ) : (
                    <span>Select options to see availability</span>
                  )}
                </div>

                {/* Desktop add to cart */}
                <button
                  type="submit"
                  disabled={!currentVariant || !isVariantAvailable(currentVariant)}
                  className={classNames(
                    'hidden w-full max-w-xs items-center justify-center rounded-md px-8 py-3 text-base font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-900 sm:flex',
                    !currentVariant || !isVariantAvailable(currentVariant)
                      ? 'cursor-not-allowed bg-gray-700 text-gray-300'
                      : 'bg-red-600 text-white hover:bg-red-700',
                  )}
                >
                  {!currentVariant
                    ? 'Select options'
                    : !isVariantAvailable(currentVariant)
                      ? 'Out of stock'
                      : 'Add to cart'}
                </button>
              </form>

              {/* Product details */}
              <div className="mt-8">
                <h2 className="mb-4 text-lg font-medium text-gray-100">Description</h2>
                <div
                  className="prose prose-sm prose-invert mt-4 text-gray-300"
                  dangerouslySetInnerHTML={{ __html: product.description }}
                />
              </div>

              <div className="mt-6 border-t border-gray-800 pt-6" />

              {/* Policies */}
              <section aria-labelledby="policies-heading" className="mt-0">
                <h2 id="policies-heading" className="sr-only">
                  Our Policies
                </h2>
                <dl className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                  {policies.map((policy) => (
                    <div
                      key={policy.name}
                      className="rounded-lg border border-white bg-transparent bg-opacity-50 p-6 text-center transition-colors duration-200 hover:border-gray-700"
                    >
                      <dt>
                        <policy.icon
                          className="mx-auto h-6 w-6 flex-shrink-0 text-red-500"
                          aria-hidden="true"
                        />
                        <span className="mt-4 text-sm font-medium text-gray-100">
                          {policy.name}
                        </span>
                      </dt>
                      <dd className="mt-1 text-sm text-gray-400">{policy.description}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            </div>
          </div>
        </div>
      </div>
      {/* Mobile sticky ATC bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-800 bg-black/80 pb-[env(safe-area-inset-bottom)] backdrop-blur supports-[backdrop-filter]:bg-black/60 sm:hidden">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <div className="text-lg font-semibold text-white">${displayPrice}</div>
          <button
            onClick={() => handleAddToCart()}
            disabled={!currentVariant || !isVariantAvailable(currentVariant)}
            className={classNames(
              'flex flex-1 justify-center rounded-md px-6 py-3 text-base font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500',
              !currentVariant || !isVariantAvailable(currentVariant)
                ? 'cursor-not-allowed bg-gray-700 text-gray-300'
                : 'bg-red-600 text-white hover:bg-red-700',
            )}
          >
            {!currentVariant
              ? 'Select options'
              : !isVariantAvailable(currentVariant)
                ? 'Out of stock'
                : 'Add to cart'}
          </button>
        </div>
      </div>
      {/* Footer is rendered globally in RootLayout */}
    </div>
  );
}
