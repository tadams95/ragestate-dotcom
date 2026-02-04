'use client';

import { CheckCircleIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

/**
 * @typedef {Object} OrderData
 * @property {string} orderNumber
 * @property {Array<{productId?: string, title?: string, name?: string, quantity?: number, productImageSrc?: string, imageSrc?: string}>} items
 * @property {string} email
 * @property {boolean} isGuest
 */

/**
 * Order Confirmed Client Component
 * Displays order confirmation details from sessionStorage or URL
 * @param {{ orderNumber: string }} props
 */
export default function OrderConfirmedClient({ orderNumber }) {
  const [orderData, setOrderData] = useState(/** @type {OrderData|null} */ (null));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Try to get order data from sessionStorage
    try {
      const stored = sessionStorage.getItem('lastOrder');
      if (stored) {
        const parsed = JSON.parse(stored);
        // Verify the order number matches
        if (parsed.orderNumber === orderNumber) {
          setOrderData(parsed);
        }
        // Clear after reading so it doesn't persist across sessions
        sessionStorage.removeItem('lastOrder');
      }
    } catch (e) {
      console.warn('Failed to parse order data from sessionStorage:', e);
    }
    setLoading(false);
  }, [orderNumber]);

  const displayItems = useMemo(() => {
    if (!orderData?.items || !Array.isArray(orderData.items)) return [];
    return orderData.items
      .map((i, idx) => ({
        id: `${i.productId || i.id || 'item'}-${idx}`,
        title: i.title || i.name || i.productId || 'Item',
        quantity: parseInt(i.quantity ?? i.qty ?? i.selectedQuantity ?? i.ticketQuantity ?? 1, 10) || 1,
        image: i.productImageSrc || i.imageSrc || null,
      }))
      .filter((i) => i.quantity > 0);
  }, [orderData]);

  const isGuest = orderData?.isGuest ?? false;
  const email = orderData?.email || null;

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elev-1)] p-6 sm:p-8">
        {/* Success Icon and Header */}
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircleIcon className="h-10 w-10 text-green-600" aria-hidden="true" />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-[var(--text-primary)] sm:text-3xl">
            Order Confirmed
          </h1>
          <p className="mt-2 text-[var(--text-secondary)]">
            Thank you for your purchase!
          </p>
        </div>

        {/* Order Number */}
        <div className="mt-8 rounded-lg bg-[var(--bg-elev-2)] p-4 text-center">
          <p className="text-sm font-medium uppercase tracking-wide text-[var(--text-tertiary)]">
            Order Number
          </p>
          <p className="mt-1 text-xl font-bold text-[var(--text-primary)] sm:text-2xl">
            {orderNumber}
          </p>
        </div>

        {/* Email Confirmation Notice */}
        {email && (
          <p className="mt-4 text-center text-sm text-[var(--text-secondary)]">
            A confirmation email has been sent to{' '}
            <span className="font-medium text-[var(--text-primary)]">{email}</span>
          </p>
        )}

        {/* Purchased Items */}
        {displayItems.length > 0 && (
          <div className="mt-8">
            <h2 className="text-sm font-medium uppercase tracking-wide text-[var(--text-tertiary)]">
              Items Purchased ({displayItems.reduce((sum, item) => sum + item.quantity, 0)})
            </h2>
            <ul className="mt-3 divide-y divide-[var(--border-subtle)] rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-root)]">
              {displayItems.map((item) => (
                <li key={item.id} className="flex items-center gap-4 p-4">
                  <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-[var(--bg-elev-2)]">
                    {item.image ? (
                      <Image
                        src={item.image}
                        alt={item.title}
                        fill
                        sizes="56px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-[var(--text-tertiary)]">
                        No image
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-[var(--text-primary)]">{item.title}</p>
                    <p className="text-sm text-[var(--text-secondary)]">Qty: {item.quantity}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* No items fallback - when visiting URL directly */}
        {displayItems.length === 0 && (
          <div className="mt-8 text-center">
            <p className="text-[var(--text-secondary)]">
              Your order details have been saved. Check your email for confirmation.
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          {isGuest ? (
            <>
              <Link
                href={`/create-account?email=${encodeURIComponent(email || '')}&from=order-confirmed&order=${encodeURIComponent(orderNumber)}`}
                className="inline-flex items-center justify-center rounded-lg bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
              >
                Create account
              </Link>
              <Link
                href="/order-lookup"
                className="inline-flex items-center justify-center rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elev-2)] px-6 py-3 text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-elev-1)] transition-colors"
              >
                Track your order
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/account?tab=orders"
                className="inline-flex items-center justify-center rounded-lg bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
              >
                View order history
              </Link>
            </>
          )}
          <Link
            href="/shop"
            className="inline-flex items-center justify-center rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elev-2)] px-6 py-3 text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-elev-1)] transition-colors"
          >
            Continue shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
