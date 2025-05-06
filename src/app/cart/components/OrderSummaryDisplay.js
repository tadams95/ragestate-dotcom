"use client";

import React from "react";
import Link from "next/link";
import { Elements } from "@stripe/react-stripe-js";
import AddressForm from "../../../../components/AddressForm"; // Adjusted path
import CheckoutForm from "../../../../components/CheckoutForm"; // Adjusted path

export default function OrderSummaryDisplay({
  cartSubtotal,
  shipping,
  taxTotal,
  discountAmount,
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
  return (
    <section
      aria-labelledby="summary-heading"
      className="mt-16 rounded-lg bg-transparent px-4 py-6 sm:p-6 lg:col-span-5 lg:mt-0 lg:p-8 border border-solid border-gray-100"
    >
      <h2 id="summary-heading" className="text-lg font-medium text-gray-100">
        Order summary
      </h2>

      <dl className="mt-6 space-y-4">
        <div className="flex items-center justify-between">
          <dt className="text-sm text-gray-100">Subtotal</dt>
          <dd className="text-sm font-medium text-gray-100">
            ${cartSubtotal.toFixed(2)}
          </dd>
        </div>
        <div className="flex items-center justify-between border-t border-gray-200 pt-4">
          <dt className="flex items-center text-sm text-gray-100">
            <span>Shipping</span>
          </dt>
          <dd className="text-sm font-medium text-gray-100">
            ${shipping.toFixed(2)}
          </dd>
        </div>
        <div className="flex items-center justify-between border-t border-gray-200 pt-4">
          <dt className="flex text-sm text-gray-100">
            <span>Tax</span>
          </dt>
          <dd className="text-sm font-medium text-gray-100">${taxTotal}</dd>
        </div>
        {discountAmount > 0 && (
          <div className="flex items-center justify-between border-t border-gray-200 pt-4">
            <dt className="flex text-sm text-gray-100">
              <span>Discount</span>
            </dt>
            <dd className="text-sm font-medium text-green-500">
              -${discountAmount.toFixed(2)}
            </dd>
          </div>
        )}
        <div className="flex items-center justify-between border-t border-gray-200 pt-4">
          <dt className="text-base font-medium text-gray-100">Order total</dt>
          <dd className="text-base font-medium text-gray-100">${finalTotal}</dd>
        </div>
      </dl>

      <div className="mt-10">
        {idToken && refreshToken && clientSecret && stripePromise ? (
          <>
            <Elements
              key={clientSecret}
              stripe={stripePromise}
              options={options}
            >
              {hasPhysicalItems && (
                <div className="mt-4">
                  <AddressForm onAddressChange={handleAddressChange} />
                </div>
              )}
              <CheckoutForm
                addressDetails={addressDetails}
                isLoading={isLoading} // Pass the general loading state
              />
            </Elements>
          </>
        ) : isLoading && idToken && refreshToken ? ( // Show loading if auth'd but clientSecret is pending
          <div className="flex justify-center items-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-500"></div>
            <span className="ml-2 text-white">Updating payment details...</span>
          </div>
        ) : (
          <div>
            <p className="text-sm text-gray-100 mb-2 text-center">
              Please log in or create an account to checkout.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Link
                href="/login"
                className="flex items-center justify-center rounded-md border border-gray-100 px-8 py-2 text-base font-medium text-white hover:bg-red-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                Login
              </Link>
              <Link
                href="/create-account"
                className="flex items-center justify-center rounded-md border border-gray-100 px-8 py-2 text-base font-medium text-white hover:bg-red-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                Create Account
              </Link>
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 text-center text-sm">
        <p>
          <Link
            href="/shop"
            className="font-medium text-gray-100 hover:text-red-500"
          >
            Continue Shopping
            <span aria-hidden="true"> &rarr;</span>
          </Link>
        </p>
      </div>
    </section>
  );
}
