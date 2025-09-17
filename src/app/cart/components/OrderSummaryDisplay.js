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
}) {
  const [showAuthGate, setShowAuthGate] = useState(false);
  const pathname = usePathname?.() || '/cart';
  return (
    <section
      aria-labelledby="summary-heading"
      className="mt-16 rounded-lg border border-solid border-gray-100 bg-transparent px-4 py-6 sm:p-6 lg:col-span-5 lg:mt-0 lg:p-8"
    >
      <h2 id="summary-heading" className="text-lg font-medium text-gray-100">
        Order summary
      </h2>

      <dl className="mt-6 space-y-4">
        <div className="flex items-center justify-between">
          <dt className="text-sm text-gray-100">Subtotal</dt>
          <dd className="text-sm font-medium text-gray-100">${cartSubtotal.toFixed(2)}</dd>
        </div>
        <div className="flex items-center justify-between border-t border-gray-200 pt-4">
          <dt className="flex items-center text-sm text-gray-100">
            <span>Shipping</span>
          </dt>
          <dd className="text-sm font-medium text-gray-100">${shipping.toFixed(2)}</dd>
        </div>
        <div className="flex items-center justify-between border-t border-gray-200 pt-4">
          <dt className="flex text-sm text-gray-100">
            <span>Tax</span>
          </dt>
          <dd className="text-sm font-medium text-gray-100">${taxTotal}</dd>
        </div>
        <div className="flex items-center justify-between border-t border-gray-200 pt-4">
          <dt className="text-base font-medium text-gray-100">Order total</dt>
          <dd className="text-base font-medium text-gray-100">${finalTotal}</dd>
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
              className="w-full rounded-md bg-red-700 px-8 py-3 text-base font-medium text-white hover:bg-red-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
            >
              Log in to Checkout
            </button>
          </div>
        )}
      </div>

      <div className="mt-6 text-center text-sm">
        <p>
          <Link href="/shop" className="font-medium text-gray-100 hover:text-red-500">
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
