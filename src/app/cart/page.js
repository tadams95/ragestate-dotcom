"use client";

import { useState, useEffect, useMemo } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { useSelector, useDispatch } from "react-redux";

//REMOVE AFTER MOJO PIN
import {
  doc,
  getFirestore,
  setDoc,
  getDoc,
  updateDoc,
  collection,
  addDoc,
} from "firebase/firestore";

import {
  TruckIcon,
  XMarkIcon,
  DevicePhoneMobileIcon,
} from "@heroicons/react/20/solid";

import {
  selectCartItems,
  removeFromCart,
  setCheckoutPrice,
  setPaymentIntent,
  // Assume these actions are added to cartSlice.js
  incrementQuantity,
  decrementQuantity,
} from "../../../lib/features/todos/cartSlice";

import Header from "../components/Header";
import Footer from "../components/Footer";
import Link from "next/link";
import EmptyCart from "../../../components/EmptyCart";
import RandomDetailStyling from "../components/styling/RandomDetailStyling";
import CheckoutForm from "../../../components/CheckoutForm";
import AddressForm from "../../../components/AddressForm";

export default function Cart() {
  const dispatch = useDispatch();
  const cartItems = useSelector(selectCartItems);
  const firestore = getFirestore();
  const [code, setCode] = useState("");
  const [validCode, setValidCode] = useState(false);
  const [codeError, setCodeError] = useState("");
  const [isLoading, setIsLoading] = useState(false); // This state now indicates client secret fetching
  const [errorMessage, setErrorMessage] = useState("");
  const [addressDetails, setAddressDetails] = useState(null); // Add this line
  const [discountAmount, setDiscountAmount] = useState(0);
  const [promoApplied, setPromoApplied] = useState(false);

  const [state, setState] = useState({
    cartSubtotal: 0,
    totalPrice: 0,
    stripePromise: null,
    clientSecret: "",
    userName: "",
    userEmail: "",
    userId: "",
    idToken: null,
    refreshToken: null,
  });

  // Improved error handling for validatePromoCode
  const validatePromoCode = async (inputCode) => {
    const upperCaseCode = inputCode.toUpperCase(); // Standardize code case

    if (!upperCaseCode || upperCaseCode.trim() === "") {
      setValidCode(false);
      setCodeError("Please enter a promo code");
      return false;
    }
    // Don't validate if already applied
    if (promoApplied) {
      return false;
    }

    try {
      setIsLoading(true); // Use isLoading for validation feedback
      setErrorMessage("");

      // Check Firestore for the promoter code
      const codeRef = doc(firestore, "promoterCodes", upperCaseCode);
      const codeSnap = await getDoc(codeRef);

      if (codeSnap.exists()) {
        setValidCode(true);
        setCodeError("");
        return true;
      } else {
        setValidCode(false);
        setCodeError("Invalid promo code");
        return false;
      }
    } catch (error) {
      console.error("Error validating code:", error);
      setCodeError(`Error validating code: ${error.message}`);
      setValidCode(false);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const API_URL =
    "https://us-central1-ragestate-app.cloudfunctions.net/stripePayment";

  // NOTE: Assumes removeFromCart in cartSlice now removes the entire item line.
  const handleRemoveFromCart = (productId, selectedColor, selectedSize) => {
    dispatch(removeFromCart({ productId, selectedColor, selectedSize }));
  };

  // NOTE: Assumes incrementQuantity action exists in cartSlice.js
  const handleIncrement = (productId, selectedColor, selectedSize) => {
    dispatch(incrementQuantity({ productId, selectedColor, selectedSize }));
  };

  // NOTE: Assumes decrementQuantity action exists in cartSlice.js
  // This action should handle decrementing and removing if quantity reaches 0.
  const handleDecrement = (productId, selectedColor, selectedSize) => {
    dispatch(decrementQuantity({ productId, selectedColor, selectedSize }));
  };

  const handleAddressChange = (address) => {
    setAddressDetails(address);
    setState((prevState) => ({
      ...prevState,
      addressDetails: address,
    }));
  };

  useEffect(() => {
    // Update calculation to include quantity
    const newCartSubtotal = cartItems.reduce((accumulator, item) => {
      // Ensure item.quantity exists and is a number, default to 1 if not
      const quantity =
        typeof item.quantity === "number" && item.quantity > 0
          ? item.quantity
          : 1;
      return accumulator + parseFloat(item.price) * quantity;
    }, 0);

    const taxRate = 0.075;
    const taxTotal = newCartSubtotal * taxRate;
    const shipping = cartItems.some((item) => !item.isDigital) ? 0.0 : 0.0;
    // Apply discount here
    const newTotalPrice =
      newCartSubtotal + taxTotal + shipping - discountAmount;

    setState((prevState) => ({
      ...prevState,
      cartSubtotal: newCartSubtotal,
      // Ensure total price doesn't go below zero
      totalPrice: Math.max(0, newTotalPrice),
    }));

    // Update checkout price in Redux store, ensuring it's not negative
    dispatch(setCheckoutPrice(Math.max(0, newTotalPrice * 100))); // Convert to cents for Stripe
  }, [cartItems, dispatch, discountAmount]); // Add discountAmount dependency

  useEffect(() => {
    const publishableKey =
      "pk_live_51NFhuOHnXmOBmfaDu16tJEuppfYKPUivMapB9XLXaBpiOLqiPRz2uoPAiifxqiLT49dyPCHOSKs74wjBspzJ8zo600yGYluqUe";
    setState((prevState) => ({
      ...prevState,
      stripePromise: loadStripe(publishableKey),
    }));
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const idToken = localStorage.getItem("idToken");
      const refreshToken = localStorage.getItem("refreshToken");
      const userName = localStorage.getItem("name");
      const userEmail = localStorage.getItem("email");
      const userId = localStorage.getItem("userId");

      setState((prevState) => ({
        ...prevState,
        idToken,
        refreshToken,
        userName,
        userEmail,
        userId,
      }));
    }
  }, []);

  const taxRate = 0.075;
  const taxTotal = (state.cartSubtotal * taxRate).toFixed(2);
  const shipping = cartItems.some((item) => !item.isDigital) ? 0.0 : 0.0;
  const total = (
    parseFloat(state.cartSubtotal) +
    parseFloat(taxTotal) +
    shipping - // Subtract discount for display
    discountAmount
  ).toFixed(2);
  // Ensure total is not negative
  const finalTotal = Math.max(0, parseFloat(total)).toFixed(2);
  // Ensure stripeTotal calculation uses the quantity-aware finalTotal
  const stripeTotal = Math.max(0, parseFloat(finalTotal) * 100);

  useEffect(() => {
    const fetchClientSecret = async () => {
      try {
        // Don't fetch if cart is empty or total is 0 or less
        if (!cartItems.length || stripeTotal <= 0) {
          // Clear existing client secret if total becomes 0 or less after discount
          if (state.clientSecret) {
            setState((prevState) => ({ ...prevState, clientSecret: "" }));
            localStorage.removeItem("clientSecret");
          }
          return;
        }

        setIsLoading(true);
        setErrorMessage("");
        // console.log(`Fetching client secret for amount: ${stripeTotal}`); // Log amount being sent

        const response = await fetch(`${API_URL}/web-payment`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount: stripeTotal, // Use the potentially discounted stripeTotal
            customerEmail: state.userEmail,
            name: state.userName,
            firebaseId: state.userId,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.message || `Error: HTTP status ${response.status}`
          );
        }

        const { client_secret } = await response.json();

        // Log the received client secret
        // console.log("Received new client_secret:", client_secret);

        setState((prevState) => ({
          ...prevState,
          clientSecret: client_secret,
        }));
        localStorage.setItem("clientSecret", client_secret);
      } catch (error) {
        console.error("Error fetching payment intent:", error.message);
        setErrorMessage(
          `Payment setup failed: ${error.message}. Please refresh the page or try again later.`
        );
        // Ensure clientSecret is cleared on error if needed
        setState((prevState) => ({ ...prevState, clientSecret: "" }));
        localStorage.removeItem("clientSecret");
      } finally {
        // Set loading false when fetch completes or fails
        setIsLoading(false);
      }
    };

    if (state.userName && state.userEmail && state.userId) {
      fetchClientSecret();
    } else {
      // If user details are missing, ensure loading is false and secret is cleared
      setIsLoading(false);
      if (state.clientSecret) {
        setState((prevState) => ({ ...prevState, clientSecret: "" }));
        localStorage.removeItem("clientSecret");
      }
    }
    // Add stripeTotal to dependencies to refetch when discount changes the total
  }, [
    state.userName,
    state.userEmail,
    state.userId,
    cartItems,
    stripeTotal,
    API_URL,
  ]);

  const appearance = {
    theme: "stripe",
    variables: {
      colorText: "#ffffff",
      colorBackground: "#000000",
    },
  };

  // Memoize the options object based on clientSecret
  const options = useMemo(
    () => ({
      clientSecret: state.clientSecret,
      appearance: appearance,
    }),
    [state.clientSecret]
  );

  const hasPhysicalItems = cartItems.some((item) => !item.isDigital);

  const renderPromoSection = (item) => (
    <div className="flex flex-col space-y-2">
      {/* Use flex-wrap and items-center for better alignment on smaller screens */}
      <div className="flex flex-wrap items-center space-x-2">
        <input
          type="text"
          placeholder="Enter promo code"
          value={code}
          onChange={(e) => {
            // Simplified onChange
            const newCode = e.target.value.toUpperCase();
            setCode(newCode);
            setCodeError(""); // Clear error on type
            setValidCode(false); // Reset validation status on type
          }}
          // Add consistent padding, height, and potentially width/min-width
          // Use disabled:bg-gray-200 for explicit disabled styling
          className="mt-2 sm:mt-0 ml-0 sm:ml-2 px-3 py-2 h-10 border border-gray-300 rounded text-black w-40 disabled:bg-gray-200 disabled:cursor-not-allowed" // Example: Added h-10, px-3, py-2, w-40, disabled styles
          disabled={promoApplied || isLoading} // Only disable if applied or during button click process
        />
        <button
          // Add consistent padding, height, and potentially width/min-width
          // Ensure hover/focus states are consistent
          className={`mt-2 sm:mt-0 ml-0 sm:ml-2 px-3 py-2 h-10 rounded text-sm font-medium transition-colors ${
            // Example: Added h-10, px-3, py-2, text-sm, font-medium
            code && !promoApplied && !isLoading
              ? "bg-red-500 text-white hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              : "bg-gray-300 text-gray-900 cursor-not-allowed"
          }`}
          onClick={async () => {
            // Validate first when button is clicked
            if (!code || promoApplied || isLoading) return; // Guard clause
            const upperCaseCode = code.toUpperCase(); // Use standardized code

            setIsLoading(true); // Start loading indicator
            const isValid = await validatePromoCode(upperCaseCode); // Validate standardized code
            setIsLoading(false); // Stop loading indicator after validation

            if (isValid) {
              // Apply discount logic only if code is valid
              // Determine discount based on the code
              const discountValue = upperCaseCode === "RS20" ? 20 : 5;
              setDiscountAmount(discountValue);
              setPromoApplied(true);
              setCodeError(""); // Clear any previous errors

              // Recalculate total price in state immediately
              setState((prevState) => {
                const taxRate = 0.075; // Ensure taxRate is accessible here or passed
                const shipping = cartItems.some((item) => !item.isDigital)
                  ? 0.0
                  : 0.0; // Ensure shipping is accessible
                const newTotalPrice =
                  prevState.cartSubtotal +
                  prevState.cartSubtotal * taxRate +
                  shipping -
                  discountValue; // Use the determined discountValue
                return {
                  ...prevState,
                  totalPrice: Math.max(0, newTotalPrice), // Ensure not negative
                };
              });
            }
            // If !isValid, validatePromoCode already set the error message
          }}
          // Disable button if code is empty, already applied, or loading
          disabled={!code || promoApplied || isLoading}
        >
          {/* Update button text */}
          {isLoading
            ? "Applying..." // Changed loading text
            : promoApplied
            ? "Applied"
            : "Apply Discount"}
        </button>
      </div>
      {codeError && (
        <p className="text-red-500 text-sm mt-1 ml-2">{codeError}</p>
      )}{" "}
      {/* Added margin for spacing */}
      {/* Display success message if promo applied */}
      {promoApplied && (
        <p className="text-green-500 text-sm mt-1 ml-2">Discount applied!</p> // Added margin for spacing
      )}
    </div>
  );

  return (
    <div className="bg-black isolate">
      <Header />
      {errorMessage && (
        <div
          className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mt-16 mx-auto max-w-7xl"
          role="alert"
        >
          <span className="block sm:inline">{errorMessage}</span>
          <button
            className="absolute top-0 bottom-0 right-0 px-4 py-3"
            onClick={() => setErrorMessage("")}
          >
            <XMarkIcon className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      )}
      {cartItems.length === 0 ? (
        <EmptyCart />
      ) : (
        <div className="mx-auto max-w-2xl px-4 pb-24 pt-32 sm:px-6 lg:max-w-7xl lg:px-8">
          <h1 className="text-3xl font-bold tracking-tight text-gray-100 sm:text-4xl">
            Shopping Cart
          </h1>
          <div className="mt-12 lg:grid lg:grid-cols-12 lg:items-start lg:gap-x-12 xl:gap-x-16">
            <section aria-labelledby="cart-heading" className="lg:col-span-7">
              <h2 id="cart-heading" className="sr-only">
                Items in your shopping cart
              </h2>

              <ul
                role="list"
                className="divide-y divide-gray-200 border-b border-t border-gray-100"
              >
                {cartItems.map((item, index) => {
                  // Assume item has quantity, default to 1 if not for display safety
                  const quantity =
                    typeof item.quantity === "number" && item.quantity > 0
                      ? item.quantity
                      : 1;
                  const lineItemTotal = (
                    parseFloat(item.price) * quantity
                  ).toFixed(2);

                  return (
                    <li
                      key={`${item.productId}-${item.selectedColor}-${item.selectedSize}-${index}`}
                      className="flex py-6 sm:py-10"
                    >
                      {/* Image */}
                      <div className="flex-shrink-0">
                        <img
                          src={
                            item.productImageSrc[0].src || item.productImageSrc
                          }
                          alt={item.title}
                          className="h-32 w-32 rounded-md object-cover object-center sm:h-48 sm:w-48" // Adjusted size
                        />
                      </div>

                      {/* Details Section */}
                      <div className="ml-4 flex flex-1 flex-col justify-between sm:ml-6">
                        {/* Top part: Title, Attributes, Price per item */}
                        <div>
                          <div className="flex justify-between items-start">
                            <h3 className="text-base font-medium text-gray-100">
                              {" "}
                              {/* Increased text size */}
                              {item.title}
                            </h3>
                            {/* Moved Remove button here for better top-right alignment */}
                            <button
                              type="button"
                              className="-m-2 inline-flex p-2 text-gray-400 hover:text-red-500" // Adjusted color
                              onClick={() =>
                                handleRemoveFromCart(
                                  item.productId,
                                  item.selectedColor,
                                  item.selectedSize
                                )
                              }
                            >
                              <span className="sr-only">Remove</span>
                              <XMarkIcon
                                className="h-5 w-5"
                                aria-hidden="true"
                              />
                            </button>
                          </div>
                          <div className="mt-1 flex text-sm text-gray-400">
                            {" "}
                            {/* Adjusted color */}
                            <p>{item.selectedColor}</p>
                            {item.selectedSize ? (
                              <p className="ml-4 border-l border-gray-500 pl-4">
                                {" "}
                                {/* Adjusted color */}
                                {item.selectedSize}
                              </p>
                            ) : null}
                          </div>
                          <p className="mt-1 text-sm text-gray-300">
                            {" "}
                            {/* Adjusted color */}${item.price} each
                          </p>
                        </div>

                        {/* Bottom part: Quantity, Line Total, Digital/Physical Info */}
                        <div className="mt-4 flex flex-1 items-end justify-between text-sm">
                          {/* Quantity Controls */}
                          <div className="flex items-center space-x-2 text-gray-100">
                            <button
                              onClick={() =>
                                handleDecrement(
                                  item.productId,
                                  item.selectedColor,
                                  item.selectedSize
                                )
                              }
                              className="px-2 py-1 border border-gray-500 rounded text-sm hover:bg-gray-700 disabled:opacity-50" // Adjusted border color, text size
                              disabled={quantity <= 1}
                            >
                              -
                            </button>
                            <span className="w-8 text-center">{quantity}</span>{" "}
                            {/* Added width for alignment */}
                            <button
                              onClick={() =>
                                handleIncrement(
                                  item.productId,
                                  item.selectedColor,
                                  item.selectedSize
                                )
                              }
                              className="px-2 py-1 border border-gray-500 rounded text-sm hover:bg-gray-700" // Adjusted border color, text size
                            >
                              +
                            </button>
                          </div>

                          {/* Line Item Total */}
                          <div className="flex flex-col items-end">
                            <p className="font-medium text-gray-100">
                              Total: ${lineItemTotal}
                            </p>
                            {/* Digital/Physical Info - Moved here for better grouping */}
                            <div className="mt-2 flex items-center space-x-2 text-xs text-gray-400">
                              {" "}
                              {/* Adjusted size/color */}
                              {item.isDigital ? (
                                <>
                                  <DevicePhoneMobileIcon
                                    className="h-4 w-4 flex-shrink-0"
                                    aria-hidden="true"
                                  />
                                  <span>Delivered digitally</span>
                                </>
                              ) : (
                                <>
                                  <TruckIcon
                                    className="h-4 w-4 flex-shrink-0"
                                    aria-hidden="true"
                                  />
                                  <span>Ships in 1-2 weeks</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Promo Section (Only for Digital Items) - Placed below main details */}
                        {item.isDigital &&
                          state.idToken &&
                          state.refreshToken &&
                          state.clientSecret &&
                          state.stripePromise && (
                            <div className="mt-4 pt-4 border-t border-gray-700">
                              {" "}
                              {/* Added separator */}
                              {renderPromoSection(item)}
                            </div>
                          )}
                        {item.isDigital &&
                          !state.idToken &&
                          !state.refreshToken && (
                            <div className="mt-4 pt-4 border-t border-gray-700">
                              <span className="text-gray-400 text-xs">
                                {" "}
                                {/* Adjusted size/color */}
                                Log in to use promo codes.
                              </span>
                            </div>
                          )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>

            {/* Order summary */}
            <section
              aria-labelledby="summary-heading"
              className="mt-16 rounded-lg bg-transparent px-4 py-6 sm:p-6 lg:col-span-5 lg:mt-0 lg:p-8 border border-solid border-gray-100"
            >
              <h2
                id="summary-heading"
                className="text-lg font-medium text-gray-100"
              >
                Order summary
              </h2>

              <dl className="mt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <dt className="text-sm text-gray-100">Subtotal</dt>
                  <dd className="text-sm font-medium text-gray-100">
                    ${state.cartSubtotal.toFixed(2)}
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
                  <dd className="text-sm font-medium text-gray-100">
                    ${taxTotal}
                  </dd>
                </div>
                {/* Add Discount Row */}
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
                  <dt className="text-base font-medium text-gray-100">
                    Order total
                  </dt>
                  <dd className="text-base font-medium text-gray-100">
                    {/* Use finalTotal which accounts for discount */}$
                    {finalTotal}
                  </dd>
                </div>
              </dl>

              <div className="mt-10">
                {/* Conditionally render based on authentication and client secret */}
                {state.idToken &&
                state.refreshToken &&
                state.clientSecret && // Check if clientSecret exists
                state.stripePromise ? (
                  <>
                    {/* Render Elements and CheckoutForm for authenticated users */}
                    <Elements
                      key={state.clientSecret} // Force re-mount when clientSecret changes
                      stripe={state.stripePromise}
                      options={options} // Pass memoized options
                    >
                      {hasPhysicalItems && (
                        <div className="mt-4">
                          <AddressForm onAddressChange={handleAddressChange} />
                        </div>
                      )}
                      {/* Pass isLoading state to CheckoutForm */}
                      <CheckoutForm
                        addressDetails={addressDetails}
                        isLoading={isLoading} // Pass the loading state
                      />
                    </Elements>
                  </>
                ) : isLoading && state.idToken && state.refreshToken ? (
                  // Show loading indicator specifically when clientSecret is being fetched/updated
                  <div className="flex justify-center items-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-500"></div>
                    <span className="ml-2 text-white">
                      Updating payment details...
                    </span>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm text-gray-100 mb-2 text-center">
                      Please log in or create an account to checkout.
                    </p>
                    {/* Links to login or create account pages */}
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

              {/* Continue Shopping */}
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
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
