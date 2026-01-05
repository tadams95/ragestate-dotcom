'use client';

import Image from 'next/image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useDispatch } from 'react-redux';
import { addToCart } from '../lib/features/cartSlice';

export default function QuickViewModal({ open, onClose, product }) {
  const dispatch = useDispatch();
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const modalRef = useRef(null);
  const closeBtnRef = useRef(null);
  const prevFocusRef = useRef(null);

  const variants = useMemo(() => product?.variants || [], [product]);
  const images = useMemo(() => product?.images || [], [product]);

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

  const basePrice = useMemo(() => {
    const amt = parseFloat(product?.variants?.[0]?.price?.amount || '0');
    return Number.isFinite(amt) ? amt : 0;
  }, [product]);

  const displayPrice = useMemo(() => {
    const amt = parseFloat(currentVariant?.price?.amount ?? basePrice);
    return Number.isFinite(amt) ? amt.toFixed(2) : '0.00';
  }, [currentVariant, basePrice]);

  useEffect(() => {
    if (!open) return;
    prevFocusRef.current = document.activeElement;

    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
      if (e.key === 'Tab') {
        const container = modalRef.current;
        const focusables = container?.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1")]',
        );
        if (!focusables || focusables.length === 0) {
          e.preventDefault();
          closeBtnRef.current?.focus?.();
          return;
        }
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    // Focus the close button initially for keyboard users
    setTimeout(() => closeBtnRef.current?.focus?.(), 0);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      // Restore focus to the element that had it before opening
      prevFocusRef.current?.focus?.();
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!variants.length) return;
    const firstAvail = variants.find((v) => isVariantAvailable(v)) || variants[0];
    const c = getVariantOption(firstAvail, 'Color');
    const s = getVariantOption(firstAvail, 'Size');
    if (c && !selectedColor) setSelectedColor(c);
    if (s && !selectedSize) setSelectedSize(s);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variants]);

  const isColorDisabled = (color) => {
    if (selectedSize) {
      return !variants.some(
        (v) =>
          getVariantOption(v, 'Color') === color &&
          getVariantOption(v, 'Size') === selectedSize &&
          isVariantAvailable(v),
      );
    }
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

  const handleAddToCart = useCallback(
    (e) => {
      e?.preventDefault?.();
      if (!currentVariant) return;
      const leadImage = images?.[0]?.src || images?.[0]?.transformedSrc || null;
      const price = parseFloat(
        currentVariant?.price?.amount ?? currentVariant?.priceV2?.amount ?? basePrice,
      );
      const productToAdd = {
        productId: product?.id,
        productImageSrc: leadImage,
        title: product?.title,
        price: Number.isFinite(price) ? price : 0,
        variantId: currentVariant?.id,
        quantity: 1,
        selectedSize,
        selectedColor,
        isDigital: false,
      };
      dispatch(addToCart(productToAdd));
      toast.success('Added to cart!', { duration: 2500 });
    },
    [currentVariant, images, basePrice, dispatch, product, selectedSize, selectedColor],
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="qv-title"
      onMouseDown={(e) => {
        if (e.currentTarget === e.target) onClose?.();
      }}
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-3xl overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elev-1)] p-4 transition-colors duration-200"
      >
        <button
          ref={closeBtnRef}
          aria-label="Close quick view"
          className="absolute right-3 top-3 rounded bg-black/60 px-3 py-1 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
          onClick={onClose}
        >
          Close
        </button>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="relative h-72 w-full overflow-hidden rounded-lg">
            <Image
              src={images?.[0]?.src || images?.[0]?.transformedSrc || '/assets/user.png'}
              alt={images?.[0]?.altText || product?.title}
              fill
              sizes="(min-width:640px) 50vw, 100vw"
              className="object-cover"
            />
          </div>
          <div className="space-y-4">
            <h3 id="qv-title" className="text-lg font-semibold text-[var(--text-primary)]">
              {product?.title}
            </h3>
            <div className="text-xl font-bold text-[var(--text-primary)]">${displayPrice}</div>

            {/* Color */}
            <div>
              <h4 className="mb-2 text-sm text-[var(--text-secondary)]">Color</h4>
              <div className="flex flex-wrap gap-2">
                {colorOptions.length === 0 && (
                  <span className="text-sm text-[var(--text-tertiary)]">No color options</span>
                )}
                {colorOptions.map((color) => {
                  const disabled = isColorDisabled(color);
                  const selected = selectedColor === color;
                  return (
                    <button
                      key={color}
                      type="button"
                      aria-pressed={selected}
                      disabled={disabled}
                      onClick={() => setSelectedColor(color)}
                      className={`rounded-md border px-3 py-1 text-sm ${
                        selected ? 'border-red-500 text-white' : 'border-white text-gray-100'
                      } ${disabled ? 'opacity-40' : 'hover:border-red-500'}`}
                    >
                      {color}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Size */}
            <div>
              <h4 className="mb-2 text-sm text-[var(--text-secondary)]">Size</h4>
              <div className="flex flex-wrap gap-2">
                {sizeOptions.length === 0 && (
                  <span className="text-sm text-[var(--text-tertiary)]">No size options</span>
                )}
                {sizeOptions.map((size) => {
                  const disabled = isSizeDisabled(size);
                  const selected = selectedSize === size;
                  return (
                    <button
                      key={size}
                      type="button"
                      aria-pressed={selected}
                      disabled={disabled}
                      onClick={() => setSelectedSize(size)}
                      className={`rounded-md border px-3 py-1 text-sm ${
                        selected ? 'border-red-500 text-white' : 'border-white text-gray-100'
                      } ${disabled ? 'opacity-40' : 'hover:border-red-500'}`}
                    >
                      {size}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              disabled={!currentVariant || !isVariantAvailable(currentVariant)}
              onClick={handleAddToCart}
              className={`w-full rounded-md px-6 py-3 text-base font-medium ${
                !currentVariant || !isVariantAvailable(currentVariant)
                  ? 'cursor-not-allowed bg-gray-700 text-gray-300'
                  : 'bg-red-600 text-white hover:bg-red-700'
              }`}
            >
              {!currentVariant
                ? 'Select options'
                : !isVariantAvailable(currentVariant)
                  ? 'Out of stock'
                  : 'Add to cart'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
