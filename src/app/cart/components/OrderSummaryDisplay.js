'use client';

import { Elements } from '@stripe/react-stripe-js';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import AddressForm from '../../../../components/AddressForm'; // Adjusted path
import AuthGateModal from '../../../../components/AuthGateModal';
import CheckoutForm from '../../../../components/CheckoutForm'; // Adjusted path

export default function OrderSummaryDisplay({
  cartSubtotal,
  shipping,
  taxTotal,
  finalTotal,
  idToken,
  refreshToken,
  clientSecret,
  stripePromise,
  options,
  hasPhysicalItems,
  handleAddressChange,
  addressDetails,
  isLoading, // General loading state from parent
  // Promo code props
  promoCode,
  promoDiscount,
  promoDisplayCode,
  promoError,
  promoLoading,
  onApplyPromo,
  onRemovePromo,
}) {
  const [showAuthGate, setShowAuthGate] = useState(false);
  const [promoInput, setPromoInput] = useState('');
  const pathname = usePathname?.() || '/cart';

  const handleApplyPromo = () => {
    if (promoInput.trim() && onApplyPromo) {
      onApplyPromo(promoInput.trim());
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleApplyPromo();
    }
  };

  // Calculate totals with discount
  const discountedSubtotal = Math.max(0, cartSubtotal - (promoDiscount || 0) / 100);
  const displayTotal = promoDiscount
    ? Math.max(0, parseFloat(finalTotal) - promoDiscount / 100).toFixed(2)
    : finalTotal;

  return (
    <section
      aria-labelledby="summary-heading"
      className="mt-16 rounded-lg border border-solid border-[var(--border-subtle)] bg-[var(--bg-elev-1)] px-4 py-6 sm:p-6 lg:col-span-5 lg:mt-0 lg:p-8"
    >
      <h2 id="summary-heading" className="text-lg font-medium text-[var(--text-primary)]">
        Order summary
      </h2>

      <dl className="mt-6 space-y-4">
        <div className="flex items-center justify-between">
          <dt className="text-sm text-[var(--text-primary)]">Subtotal</dt>
          <dd className="text-sm font-medium text-[var(--text-primary)]">
            ${cartSubtotal.toFixed(2)}
          </dd>
        </div>

        {/* Promo Code Section */}
        <div className="border-t border-[var(--border-subtle)] pt-4">
          <label htmlFor="promo-code" className="mb-2 block text-sm text-[var(--text-primary)]">
            Promo Code
          </label>
          {promoCode && promoDisplayCode ? (
            // Applied promo code display
            <div className="flex items-center justify-between rounded-md bg-green-50 px-3 py-2 dark:bg-green-900/20">
              <div className="flex items-center gap-2">
                <svg
                  className="h-4 w-4 text-green-600 dark:text-green-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                <span className="text-sm font-medium text-green-700 dark:text-green-400">
                  {promoDisplayCode}
                </span>
              </div>
              <button
                type="button"
                onClick={onRemovePromo}
                className="text-sm text-[var(--text-secondary)] transition-colors hover:text-red-500"
              >
                Remove
              </button>
            </div>
          ) : (
            // Promo code input
            <div className="flex gap-2">
              <input
                type="text"
                id="promo-code"
                value={promoInput}
                onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                onKeyDown={handleKeyDown}
                placeholder="Enter code"
                disabled={promoLoading}
                className="flex-1 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-elev-2)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 disabled:opacity-50"
              />
              <button
                type="button"
                onClick={handleApplyPromo}
                disabled={promoLoading || !promoInput.trim()}
                className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-elev-2)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-elev-1)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {promoLoading ? (
                  <span className="flex items-center gap-1">
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                  </span>
                ) : (
                  'Apply'
                )}
              </button>
            </div>
          )}
          {promoError && <p className="mt-2 text-sm text-red-500">{promoError}</p>}
        </div>

        {/* Discount line (when promo applied) */}
        {promoDiscount > 0 && (
          <div className="flex items-center justify-between text-green-600 dark:text-green-400">
            <dt className="text-sm">Discount</dt>
            <dd className="text-sm font-medium">-${(promoDiscount / 100).toFixed(2)}</dd>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-[var(--border-subtle)] pt-4">
          <dt className="flex items-center text-sm text-[var(--text-primary)]">
            <span>Shipping</span>
          </dt>
          <dd className="text-sm font-medium text-[var(--text-primary)]">${shipping.toFixed(2)}</dd>
        </div>
        <div className="flex items-center justify-between border-t border-[var(--border-subtle)] pt-4">
          <dt className="flex text-sm text-[var(--text-primary)]">
            <span>Tax</span>
          </dt>
          <dd className="text-sm font-medium text-[var(--text-primary)]">${taxTotal}</dd>
        </div>
        <div className="flex items-center justify-between border-t border-[var(--border-subtle)] pt-4">
          <dt className="text-base font-medium text-[var(--text-primary)]">Order total</dt>
          <dd className="text-base font-medium text-[var(--text-primary)]">
            {promoDiscount > 0 && (
              <span className="mr-2 text-sm text-[var(--text-secondary)] line-through">
                ${finalTotal}
              </span>
            )}
            ${displayTotal}
          </dd>
        </div>
      </dl>

      <div className="mt-10">
        {idToken && refreshToken && clientSecret && stripePromise ? (
          <>
            <Elements key={clientSecret} stripe={stripePromise} options={options}>
              {hasPhysicalItems && (
                <div className="mt-4">
                  <AddressForm onAddressChange={handleAddressChange} />
                </div>
              )}
              <CheckoutForm
                addressDetails={addressDetails}
                isLoading={isLoading} // Pass the general loading state
                clientSecret={clientSecret}
                hasPhysicalItems={hasPhysicalItems} // FIX: Pass for address validation
                idToken={idToken} // FIX: Pass for API authentication
              />
            </Elements>
          </>
        ) : isLoading && idToken && refreshToken ? ( // Show loading if auth'd but clientSecret is pending
          <div className="flex items-center justify-center py-4">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-red-500"></div>
            <span className="ml-2 text-white">Updating payment details...</span>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <button
              type="button"
              onClick={() => setShowAuthGate(true)}
              className="w-full rounded-md bg-[var(--accent)] px-8 py-3 text-base font-medium text-white hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
            >
              Log in to Checkout
            </button>
          </div>
        )}
      </div>

      <div className="mt-6 text-center text-sm">
        <p>
          <Link href="/shop" className="font-medium text-[var(--text-primary)] hover:text-red-500">
            Continue Shopping
            <span aria-hidden="true"> &rarr;</span>
          </Link>
        </p>
      </div>

      <AuthGateModal
        open={showAuthGate}
        onClose={() => setShowAuthGate(false)}
        title="Log in to checkout"
        message="Create an account or log in to complete your purchase."
        loginHref={`/login?next=${encodeURIComponent(pathname)}`}
        createHref={`/create-account?next=${encodeURIComponent(pathname)}`}
      />
    </section>
  );
}
