"use client";

import { useState, useEffect } from "react";
import {
  TruckIcon,
  XMarkIcon,
  DevicePhoneMobileIcon,
} from "@heroicons/react/20/solid";
import { useSelector, useDispatch } from "react-redux";

import {
  selectCartItems,
  removeFromCart,
  setCheckoutPrice,
} from "../../../lib/features/todos/cartSlice";

import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";

import {
  doc,
  setDoc,
  updateDoc,
  getDoc,
  collection,
  addDoc,
  getFirestore,
} from "firebase/firestore";

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
  const [cartSubtotal, setCartSubtotal] = useState(0);
  const [totalPrice, setTotalPrice] = useState(0);
  const [stripePromise, setStripePromise] = useState(null);
  const [clientSecret, setClientSecret] = useState("");

  const [idToken, setIdToken] = useState(null);
  const [refreshToken, setRefreshToken] = useState(null);

  // console.log("Cart Items: ", cartItems);

  const handleRemoveFromCart = (productId, selectedColor, selectedSize) => {
    dispatch(removeFromCart({ productId, selectedColor, selectedSize }));
  };

  useEffect(() => {
    // Calculate subtotal price
    const newCartSubtotal = cartItems.reduce((accumulator, item) => {
      const itemPrice = parseFloat(item.price);
      return accumulator + itemPrice;
    }, 0);

    setCartSubtotal(newCartSubtotal);

    // Calculate tax and total price
    const taxRate = 0.075;
    const taxTotal = newCartSubtotal * taxRate;

    const newTotalPrice = newCartSubtotal + taxTotal + shipping;

    setTotalPrice(newTotalPrice);
    dispatch(setCheckoutPrice(newTotalPrice * 100)); // Convert to cents for Stripe
  }, [cartItems, dispatch]);

  useEffect(() => {
    const publishableKey =
      "pk_test_51NFhuOHnXmOBmfaDAdOEefavmmfZzMX4F0uOpbvrK1P49isqVY6uBUDeXnCqNjiu6g89dh9CMZj7wDOAFLX5z93t007GOWlK8e";

    setStripePromise(loadStripe(publishableKey));
    if (typeof window !== "undefined") {
      const storedIdToken = localStorage.getItem("idToken");
      const storedRefreshToken = localStorage.getItem("refreshToken");
      setIdToken(storedIdToken);
      setRefreshToken(storedRefreshToken);
    }
  }, []);

  useEffect(() => {
    const fetchClientSecret = async () => {
      try {
        const response = await fetch(
          "https://us-central1-ragestate-app.cloudfunctions.net/stripePayment/create-payment-intent",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({}),
          }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch payment intent");
        }

        const { client_secret } = await response.json();
        setClientSecret(client_secret);
        // console.log("Client Secret: ", client_secret);
      } catch (error) {
        console.error("Error fetching payment intent:", error.message);
      }
    };

    fetchClientSecret();
  }, []);

  const taxRate = 0.075;
  const taxTotal = (cartSubtotal * taxRate).toFixed(2);

  // Initialize shipping cost
  let shipping = 0.0;

  // Check if there are any physical (non-digital) items in the cart
  const hasPhysicalItems = cartItems.some((item) => !item.isDigital);

  // Adjust shipping based on the presence of physical items
  if (hasPhysicalItems) {
    shipping = 9.99;
  } else {
    shipping = 0.0; // No shipping cost for digital items
  }

  const total = (
    parseFloat(cartSubtotal) +
    parseFloat(taxTotal) +
    shipping
  ).toFixed(2);

  const appearance = {
    theme: "stripe",
    variables: {
      colorText: "#ffffff",
      colorBackground: "#000000",
    },
  };
  const options = {
    clientSecret: clientSecret,
    appearance: appearance,
  };

  return (
    <div className="bg-black isolate">
      <Header />
      {cartItems.length === 0 ? (
        <EmptyCart />
      ) : (
        <div className="mx-auto max-w-2xl px-4 pb-24 pt-32 sm:px-6 lg:max-w-7xl lg:px-8">
          <RandomDetailStyling />
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
                {cartItems.map((item, index) => (
                  <li
                    key={`${item.productId}-${item.selectedColor}-${item.selectedSize}-${index}`}
                    className="flex py-6 sm:py-10"
                  >
                    <div className="flex-shrink-0">
                      <img
                        src={item.images[0].src || item.images}
                        alt={item.title}
                        className="h-24 w-24 rounded-md object-cover object-center sm:h-48 sm:w-48"
                      />
                    </div>

                    <div className="ml-4 flex flex-1 flex-col justify-between sm:ml-6">
                      <div className="relative pr-9 sm:grid sm:grid-cols-2 sm:gap-x-6 sm:pr-0">
                        <div>
                          <div className="flex justify-between">
                            <h3 className="text-sm">
                              <Link
                                href="/shop"
                                className="font-medium text-gray-100 hover:text-gray-500"
                              >
                                {item.title}
                              </Link>
                            </h3>
                          </div>
                          <div className="mt-1 flex text-sm">
                            <p className="text-gray-100">
                              {item.selectedColor}
                            </p>
                            {item.selectedSize ? (
                              <p className="ml-4 border-l border-gray-200 pl-4 text-gray-100">
                                {item.selectedSize}
                              </p>
                            ) : null}
                          </div>
                          <p className="mt-1 text-sm font-medium text-gray-100">
                            ${item.price}
                          </p>
                        </div>

                        <div className="mt-4 sm:mt-0 sm:pr-9">
                          <div className="absolute right-0 top-0">
                            <button
                              type="button"
                              className="-m-2 inline-flex p-2 text-gray-100 hover:text-red-500"
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
                        </div>
                      </div>

                      <div className="mt-4 flex space-x-2 text-sm text-gray-500">
                        {item.isDigital ? (
                          <>
                            <span className="text-gray-100">
                              <DevicePhoneMobileIcon
                                className="h-5 w-5 flex-shrink-0"
                                aria-hidden="true"
                              />
                            </span>
                            <span className="text-gray-200">{`Delivered digitally`}</span>
                          </>
                        ) : (
                          <>
                            <span className="text-gray-100">
                              <TruckIcon
                                className="h-5 w-5 flex-shrink-0"
                                aria-hidden="true"
                              />
                            </span>
                            <span className="text-gray-200">{`Ships in 1-2 weeks`}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
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
                  <dd className="text-sm font-medium text-gray-100">
                    ${taxTotal}
                  </dd>
                </div>
                <div className="flex items-center justify-between border-t border-gray-200 pt-4">
                  <dt className="text-base font-medium text-gray-100">
                    Order total
                  </dt>
                  <dd className="text-base font-medium text-gray-100">
                    ${total}
                  </dd>
                </div>
              </dl>

              <div className="mt-10">
                {/* Conditionally render based on authentication and presence of physical items */}
                {idToken && refreshToken && clientSecret && stripePromise ? (
                  <>
                    {/* Render Elements and CheckoutForm for authenticated users */}
                    <Elements stripe={stripePromise} options={options}>
                      {hasPhysicalItems && (
                        <div className="mt-4">
                          <AddressForm />
                        </div>
                      )}
                      <CheckoutForm />
                    </Elements>
                  </>
                ) : (
                  // Login or Create Account
                  <div>
                    <p className="text-sm text-gray-100 mb-2 text-center">
                      Please log in or create an account to checkout.
                    </p>
                    {/* Links to login or create account pages */}
                    <div className="mt-10 flex items-center justify-center gap-x-6">
                      <Link
                        href="/login"
                        className="flex  items-center justify-center rounded-md border border-gray-100 px-8 py-2 text-base font-medium text-white hover:bg-red-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                      >
                        Login
                      </Link>

                      <Link
                        href="/create-account"
                        className="flex  items-center justify-center rounded-md border border-gray-100 px-8 py-2 text-base font-medium text-white hover:bg-red-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
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
