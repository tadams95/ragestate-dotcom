'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useDispatch } from 'react-redux';
import { addToCart } from '../../../../lib/features/todos/cartSlice';
import { fetchShopifyProducts } from '../../../../shopify/shopifyService';

/**
 * CrossSellSection - Shows related merch suggestions on the cart page
 * - Products with multiple variants (sizes/colors) link to product page
 * - Single-variant products can be quick-added
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
    // Normalize IDs: cart may have GID or handle, so check both
    const cartProductIds = new Set(
      cartItems.flatMap((item) => [item.productId, item.productId?.toString()].filter(Boolean)),
    );

    const loadSuggestions = async () => {
      try {
        const products = await fetchShopifyProducts();
        if (!mounted) return;

        // Filter out items already in cart, limit to 4
        const filtered = products
          .filter((p) => {
            // Check both ID and handle to ensure no duplicates
            const id = p?.id?.toString();
            const handle = p?.handle;
            return !cartProductIds.has(id) && !cartProductIds.has(handle);
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

  // Check if product has multiple variants (sizes/colors)
  const hasMultipleVariants = (product) => {
    const variants = product?.variants;
    const variantCount = Array.isArray(variants) ? variants.length : variants?.length || 0;
    return variantCount > 1;
  };

  // Get product slug for linking to product page
  // Always prefer handle (authoritative) — title-based fallback may cause 404s
  const getProductSlug = (product) => {
    return product?.handle || '';
  };

  const handleQuickAdd = (product) => {
    const variant = product?.variants?.[0];
    const img = product?.images?.[0] || product?.featuredImage || variant?.image;
    const price =
      variant?.price?.amount ||
      variant?.price ||
      product?.priceRange?.minVariantPrice?.amount ||
      '0';

    // Get image URL - handle Shopify's various image formats
    const imgSrc = img?.src || img?.transformedSrc || img?.url || '/assets/user.png';

    const cartItem = {
      productId: product?.id?.toString() || product?.handle,
      title: product.title,
      productImageSrc: imgSrc,
      selectedQuantity: 1,
      price: parseFloat(price),
      variantId: variant?.id || null, // Required for Shopify checkout
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

  // Helper to get image URL from Shopify product
  // Shopify-buy SDK returns array-like objects, not true Arrays
  const getImageUrl = (product) => {
    // Try images array (could be array-like)
    const images = product?.images;
    const firstImage = Array.isArray(images) ? images[0] : images?.[0];

    // Try featuredImage
    const featuredImage = product?.featuredImage;

    // Try variant image
    const variants = product?.variants;
    const variantImage = Array.isArray(variants) ? variants[0]?.image : variants?.[0]?.image;

    const img = firstImage || featuredImage || variantImage;

    // Handle various Shopify image URL formats
    return img?.src || img?.transformedSrc || img?.url || null;
  };

  // Don't show if no suggestions or still loading
  if (loading || suggestions.length === 0) return null;

  return (
    <section className="mt-8 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elev-1)] p-4">
      <h3 className="mb-4 text-sm font-semibold text-[var(--text-primary)]">
        {hasTickets ? 'Complete the Look' : 'You Might Also Like'}
      </h3>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {suggestions.map((product) => {
          const imgUrl = getImageUrl(product);
          const variant = product?.variants?.[0];
          const price =
            variant?.price?.amount ||
            variant?.price ||
            product?.priceRange?.minVariantPrice?.amount;
          const needsVariantSelection = hasMultipleVariants(product);
          const productSlug = getProductSlug(product);

          return (
            <div key={product.id} className="group flex flex-col">
              {/* Image container - link to product for multi-variant items */}
              {needsVariantSelection ? (
                <Link
                  href={`/shop/${productSlug}`}
                  className="aspect-square relative overflow-hidden rounded-md bg-[var(--bg-elev-2)]"
                >
                  {imgUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={imgUrl}
                      alt={product.title}
                      className="h-full w-full object-cover object-center transition-transform group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[var(--text-tertiary)]">
                      <span className="text-xs">No image</span>
                    </div>
                  )}
                </Link>
              ) : (
                <div className="aspect-square relative overflow-hidden rounded-md bg-[var(--bg-elev-2)]">
                  {imgUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={imgUrl}
                      alt={product.title}
                      className="h-full w-full object-cover object-center transition-transform group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[var(--text-tertiary)]">
                      <span className="text-xs">No image</span>
                    </div>
                  )}
                </div>
              )}

              {/* Product info */}
              <p className="mt-2 line-clamp-1 text-xs text-[var(--text-secondary)]">
                {product.title}
              </p>
              {price && (
                <p className="text-xs font-medium text-[var(--text-primary)]">
                  ${parseFloat(price).toFixed(2)}
                </p>
              )}

              {/* Conditional button: Quick add for single-variant, link for multi-variant */}
              {needsVariantSelection ? (
                <Link
                  href={`/shop/${productSlug}`}
                  className="mt-2 flex w-full items-center justify-center gap-1 rounded-md border border-[var(--accent)] px-2 py-1.5 text-xs font-medium text-[var(--accent)] transition-colors hover:bg-[var(--accent)] hover:text-white"
                  aria-label={`Select options for ${product.title}`}
                >
                  Select Options
                </Link>
              ) : (
                <button
                  onClick={() => handleQuickAdd(product)}
                  className="mt-2 flex w-full items-center justify-center gap-1 rounded-md bg-[var(--accent)] px-2 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[var(--accent-glow)]"
                  aria-label={`Add ${product.title} to cart`}
                >
                  Add to Cart
                </button>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
