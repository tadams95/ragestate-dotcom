'use client';

import { PlusIcon } from '@heroicons/react/20/solid';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useDispatch } from 'react-redux';
import { addToCart } from '../../../../lib/features/todos/cartSlice';
import { fetchShopifyProducts } from '../../../../shopify/shopifyService';

/**
 * CrossSellSection - Shows related merch suggestions on the cart page
 * Minimal implementation: fetches Shopify products, excludes items in cart, shows 4 max
 */
export default function CrossSellSection({ cartItems = [] }) {
  const dispatch = useDispatch();
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Check if cart has any event tickets (digital items)
  const hasTickets = cartItems.some((item) => item.isDigital === true || item.eventDetails);

  useEffect(() => {
    let mounted = true;

    // Get IDs of items already in cart to filter them out
    const cartProductIds = new Set(cartItems.map((item) => item.productId));

    const loadSuggestions = async () => {
      try {
        const products = await fetchShopifyProducts();
        if (!mounted) return;

        // Filter out items already in cart, limit to 4
        const filtered = products
          .filter((p) => {
            const id = p?.id?.toString() || p?.handle;
            return !cartProductIds.has(id);
          })
          .slice(0, 4);

        setSuggestions(filtered);
      } catch (err) {
        console.error('Failed to load cross-sell suggestions:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadSuggestions();
    return () => {
      mounted = false;
    };
  }, [cartItems]);

  const handleQuickAdd = (product) => {
    const variant = product?.variants?.[0];
    const img = product?.images?.[0] || product?.featuredImage || variant?.image;
    const price =
      variant?.price?.amount ||
      variant?.price ||
      product?.priceRange?.minVariantPrice?.amount ||
      '0';

    const cartItem = {
      productId: product?.id?.toString() || product?.handle,
      title: product.title,
      productImageSrc: img?.src || img?.transformedSrc || '/assets/user.png',
      selectedQuantity: 1,
      price: parseFloat(price),
      selectedColor: null,
      selectedSize: null,
      isDigital: false,
    };

    dispatch(addToCart(cartItem));

    toast.success(`${product.title} added!`, {
      duration: 2000,
      position: 'bottom-center',
      style: { background: '#333', color: '#fff', border: '1px solid #444' },
    });
  };

  // Don't show if no suggestions or still loading
  if (loading || suggestions.length === 0) return null;

  return (
    <section className="mt-8 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elev-1)] p-4">
      <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
        {hasTickets ? 'Complete the Look' : 'You Might Also Like'}
      </h3>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {suggestions.map((product) => {
          const img =
            product?.images?.[0] || product?.featuredImage || product?.variants?.[0]?.image;
          const src = img?.src || img?.transformedSrc || '/assets/user.png';
          const variant = product?.variants?.[0];
          const price =
            variant?.price?.amount ||
            variant?.price ||
            product?.priceRange?.minVariantPrice?.amount;

          return (
            <div key={product.id} className="group relative">
              <div className="aspect-square relative overflow-hidden rounded-md bg-[var(--bg-elev-2)]">
                <Image
                  src={src}
                  alt={product.title}
                  fill
                  sizes="(min-width: 640px) 25vw, 50vw"
                  className="object-cover object-center"
                />
                {/* Quick Add overlay */}
                <button
                  onClick={() => handleQuickAdd(product)}
                  className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100"
                  aria-label={`Add ${product.title} to cart`}
                >
                  <span className="flex items-center gap-1 rounded-full bg-red-600 px-3 py-1.5 text-xs font-medium text-white">
                    <PlusIcon className="h-4 w-4" />
                    Add
                  </span>
                </button>
              </div>
              <p className="mt-1.5 line-clamp-1 text-xs text-[var(--text-secondary)]">
                {product.title}
              </p>
              {price && (
                <p className="text-xs font-medium text-[var(--text-primary)]">
                  ${parseFloat(price).toFixed(2)}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
