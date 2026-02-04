'use client';

import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

/**
 * @typedef {Object} OrderItem
 * @property {string} title
 * @property {number} quantity
 * @property {string} [image]
 */

/**
 * @typedef {Object} OrderResult
 * @property {string} orderNumber
 * @property {string} status
 * @property {string} createdAt
 * @property {OrderItem[]} items
 * @property {string} totalAmount
 * @property {string} [shippingStatus]
 * @property {string} [trackingNumber]
 * @property {string} [trackingUrl]
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Order Lookup Form Content - needs to be wrapped in Suspense for useSearchParams
 */
function OrderLookupContent() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(/** @type {string|null} */ (null));
  const [order, setOrder] = useState(/** @type {OrderResult|null} */ (null));
  const [notFound, setNotFound] = useState(false);

  // Pre-fill from URL params (e.g., from email link)
  useEffect(() => {
    const urlOrder = searchParams.get('order');
    const urlEmail = searchParams.get('email');
    if (urlOrder) setOrderNumber(urlOrder);
    if (urlEmail) setEmail(urlEmail);
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setOrder(null);
    setNotFound(false);

    // Validate email format
    const trimmedEmail = email.trim().toLowerCase();
    if (!EMAIL_REGEX.test(trimmedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    // Validate order number
    const trimmedOrder = orderNumber.trim();
    if (!trimmedOrder) {
      setError('Please enter your order number.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/orders/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: trimmedEmail,
          orderNumber: trimmedOrder,
        }),
      });

      const data = await res.json();

      if (res.status === 429) {
        setError(data.message || 'Too many requests. Please try again later.');
        return;
      }

      if (!res.ok) {
        setError(data.error || 'Failed to look up order. Please try again.');
        return;
      }

      if (data.found && data.order) {
        setOrder(data.order);
      } else {
        setNotFound(true);
      }
    } catch (err) {
      console.error('Order lookup error:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusStyles = {
      completed: 'bg-green-100 text-green-800',
      processing: 'bg-yellow-100 text-yellow-800',
      shipped: 'bg-blue-100 text-blue-800',
      delivered: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return statusStyles[status?.toLowerCase()] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="mx-auto max-w-xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="text-center">
        <MagnifyingGlassIcon className="mx-auto h-12 w-12 text-[var(--text-tertiary)]" />
        <h1 className="mt-4 text-2xl font-bold text-[var(--text-primary)] sm:text-3xl">
          Track Your Order
        </h1>
        <p className="mt-2 text-[var(--text-secondary)]">
          Enter your email and order number to check your order status.
        </p>
      </div>

      {/* Search Form */}
      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-[var(--text-primary)]">
            Email address
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="mt-1 block w-full rounded-lg bg-[var(--bg-elev-2)] px-4 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            required
          />
        </div>

        <div>
          <label htmlFor="orderNumber" className="block text-sm font-medium text-[var(--text-primary)]">
            Order number
          </label>
          <input
            type="text"
            id="orderNumber"
            name="orderNumber"
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            placeholder="RS-20240203-ABC123"
            className="mt-1 block w-full rounded-lg bg-[var(--bg-elev-2)] px-4 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            required
          />
        </div>

        {error && (
          <div className="rounded-lg bg-[var(--danger)]/10 p-3 text-sm text-[var(--danger)]">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-[var(--accent)] px-4 py-3 font-semibold text-white hover:opacity-90 transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? 'Looking up...' : 'Find my order'}
        </button>
      </form>

      {/* Not Found Message */}
      {notFound && (
        <div className="mt-8 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elev-1)] p-6 text-center">
          <p className="text-[var(--text-primary)]">
            We couldn&apos;t find an order matching that email and order number.
          </p>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Please double-check your order number and email address, then try again.
          </p>
        </div>
      )}

      {/* Order Details */}
      {order && (
        <div className="mt-8 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elev-1)] p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-wide text-[var(--text-tertiary)]">
                Order Number
              </p>
              <p className="mt-1 text-lg font-bold text-[var(--text-primary)]">
                {order.orderNumber}
              </p>
            </div>
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${getStatusBadge(order.status)}`}>
              {order.status}
            </span>
          </div>

          {order.createdAt && (
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Ordered on {new Date(order.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          )}

          {/* Shipping Status */}
          {order.shippingStatus && (
            <div className="mt-4 rounded-lg bg-[var(--bg-elev-2)] p-4">
              <p className="text-sm font-medium text-[var(--text-primary)]">
                Shipping: {order.shippingStatus}
              </p>
              {order.trackingNumber && (
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  Tracking: {order.trackingUrl ? (
                    <a
                      href={order.trackingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--accent)] hover:underline"
                    >
                      {order.trackingNumber}
                    </a>
                  ) : (
                    order.trackingNumber
                  )}
                </p>
              )}
            </div>
          )}

          {/* Items */}
          {order.items && order.items.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium uppercase tracking-wide text-[var(--text-tertiary)]">
                Items
              </p>
              <ul className="mt-2 divide-y divide-[var(--border-subtle)]">
                {order.items.map((item, idx) => (
                  <li key={idx} className="flex items-center gap-3 py-3">
                    {item.image && (
                      <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-[var(--bg-elev-2)]">
                        <Image
                          src={item.image}
                          alt={item.title}
                          fill
                          sizes="48px"
                          className="object-cover"
                        />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[var(--text-primary)]">
                        {item.title}
                      </p>
                      <p className="text-xs text-[var(--text-secondary)]">Qty: {item.quantity}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Total */}
          {order.totalAmount && (
            <div className="mt-4 flex items-center justify-between border-t border-[var(--border-subtle)] pt-4">
              <p className="font-medium text-[var(--text-primary)]">Total</p>
              <p className="font-bold text-[var(--text-primary)]">{order.totalAmount}</p>
            </div>
          )}
        </div>
      )}

      {/* CTAs */}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link
          href={`/create-account?from=order-lookup${email ? `&email=${encodeURIComponent(email)}` : ''}`}
          className="inline-flex items-center justify-center rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elev-2)] px-6 py-3 text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-elev-1)] transition-colors"
        >
          Create account
        </Link>
        <Link
          href="/shop"
          className="inline-flex items-center justify-center rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elev-2)] px-6 py-3 text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-elev-1)] transition-colors"
        >
          Continue shopping
        </Link>
      </div>
    </div>
  );
}

/**
 * Order Lookup Client Component
 * Form to look up guest orders by email + order number
 */
export default function OrderLookupClient() {
  return (
    <Suspense fallback={
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
      </div>
    }>
      <OrderLookupContent />
    </Suspense>
  );
}
