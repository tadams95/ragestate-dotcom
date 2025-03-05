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
  const [isClaiming, setIsClaiming] = useState(false);
  const [hasClaimed, setHasClaimed] = useState(false);
  const [validCode, setValidCode] = useState(false);
  const [codeError, setCodeError] = useState("");

  const [state, setState] = useState({
    cartSubtotal: 0,
    totalPrice: 0,
    stripePromise: null,
    clientSecret: "",
    userName: "",
    userEmail: "",
    userId: "",
    addressDetails: null,
    idToken: null,
    refreshToken: null,
  });

  // Remove the static promoterCodes array since we're using Firestore now
  // const promoterCodes = ["COLON", "BELLA", "GARDNER", "NATE", "WILSON"];

  // Add function to validate code against Firestore
  const validatePromoCode = async (inputCode) => {
    try {
      const codeRef = doc(firestore, 'promoterCodes', inputCode.toUpperCase());
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
      setCodeError("Error validating code");
      setValidCode(false);
      return false;
    }
  };

  const API_URL =
    "https://us-central1-ragestate-app.cloudfunctions.net/stripePayment";

  // console.log("Cart Items: ", cartItems);

  const handleRemoveFromCart = (productId, selectedColor, selectedSize) => {
    dispatch(removeFromCart({ productId, selectedColor, selectedSize }));
  };

  const handleAddressChange = (address) => {
    setAddressDetails(address);
  };

  useEffect(() => {
    const newCartSubtotal = cartItems.reduce((accumulator, item) => {
      return accumulator + parseFloat(item.price);
    }, 0);

    const taxRate = 0.075;
    const taxTotal = newCartSubtotal * taxRate;
    const shipping = cartItems.some((item) => !item.isDigital) ? 4.99 : 0.0;
    const newTotalPrice = newCartSubtotal + taxTotal + shipping;

    setState((prevState) => ({
      ...prevState,
      cartSubtotal: newCartSubtotal,
      totalPrice: newTotalPrice,
    }));

    dispatch(setCheckoutPrice(newTotalPrice * 100)); // Convert to cents for Stripe
  }, [cartItems, dispatch]);

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
      const claimed = localStorage.getItem("ticketClaimed");

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

  useEffect(() => {
    const fetchClientSecret = async () => {
      try {
        const response = await fetch(`${API_URL}/web-payment`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount: stripeTotal, // Replace with your actual amount
            customerEmail: state.userEmail, // Use user's email from state
            name: state.userName, // Use user's name from state
            firebaseId: state.userId, // Use user's Firebase ID from state
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to fetch payment intent");
        }

        const { client_secret } = await response.json();

        setState((prevState) => ({
          ...prevState,
          clientSecret: client_secret,
        }));
        localStorage.setItem("clientSecret", client_secret);
      } catch (error) {
        console.error("Error fetching payment intent:", error.message);
      }
    };

    if (state.userName && state.userEmail && state.userId) {
      fetchClientSecret();
    }
  }, [state.userName, state.userEmail, state.userId]);

  const taxRate = 0.075;
  const taxTotal = (state.cartSubtotal * taxRate).toFixed(2);

  const shipping = cartItems.some((item) => !item.isDigital) ? 4.99 : 0.0;

  const total = (
    parseFloat(state.cartSubtotal) +
    parseFloat(taxTotal) +
    shipping
  ).toFixed(2);

  const stripeTotal = total * 100;

  const appearance = {
    theme: "stripe",
    variables: {
      colorText: "#ffffff",
      colorBackground: "#000000",
    },
  };
  const options = {
    clientSecret: state.clientSecret,
    appearance: appearance,
  };

  const hasPhysicalItems = cartItems.some((item) => !item.isDigital);

  // console.log("cartItems", cartItems);

  const renderPromoSection = (item) => (
    <div className="flex flex-col space-y-2">
      <div className="flex space-x-2">
        <input
          type="text"
          placeholder="Enter promo code"
          value={code}
          onChange={async (e) => {
            const newCode = e.target.value.toUpperCase();
            setCode(newCode);
            if (newCode.length > 3) { // Only validate if code is long enough
              await validatePromoCode(newCode);
            } else {
              setValidCode(false);
            }
          }}
          className="mt-2 sm:mt-0 ml-0 sm:ml-2 px-2 py-1 border rounded"
        />
        <button
          className={`mt-2 sm:mt-0 ml-0 sm:ml-6 px-2 py-2 rounded ${
            validCode && !hasClaimed
              ? "bg-red-500 text-white hover:bg-red-600"
              : "bg-gray-300 text-gray-900 cursor-not-allowed"
          }`}
          onClick={async () => {
            if (validCode && !isClaiming && !hasClaimed) {
              setIsClaiming(true);
              try {
                // Your existing claiming logic here
                const eventId = item.eventDetails ? item.productId : null;
                // ... rest of your claiming logic ...
                
                localStorage.setItem("ticketClaimed", "true");
                setHasClaimed(true);
                alert("Promoter ticket claimed!");
              } catch (error) {
                console.error("Error claiming ticket:", error);
                alert("Failed to claim ticket. Please try again.");
              } finally {
                setIsClaiming(false);
              }
            }
          }}
          disabled={!validCode || isClaiming || hasClaimed}
        >
          {isClaiming ? "Claiming..." : "Claim Ticket"}
        </button>
      </div>
      {codeError && (
        <p className="text-red-500 text-sm">{codeError}</p>
      )}
    </div>
  );

  return (
    <div className="bg-black isolate">
      <Header />
      {cartItems.length === 0 ? (
        <EmptyCart />
      ) : (
        <div className="mx-auto max-w-2xl px-4 pb-24 pt-32 sm:px-6 lg:max-w-7xl lg:px-8">
          {/* <RandomDetailStyling /> */}
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
                        src={
                          item.productImageSrc[0].src || item.productImageSrc
                        }
                        alt={item.title}
                        className="h-64 w-48 rounded-md object-cover object-center sm:h-80 sm:w-64"
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

                      <div className="mt-4 flex flex-col sm:flex-row sm:space-x-2 text-sm text-gray-500">
                        {item.isDigital ? (
                          <>
                            <span className="text-gray-100 flex items-center">
                              <DevicePhoneMobileIcon
                                className="h-5 w-5 flex-shrink-0"
                                aria-hidden="true"
                              />
                            </span>
                            <span className="text-gray-200 flex items-center">{`Delivered digitally`}</span>
                            {state.idToken &&
                            state.refreshToken &&
                            state.clientSecret &&
                            state.stripePromise ? (
                              renderPromoSection(item)
                            ) : (
                              <>
                                <span className="text-gray-200 flex items-center mt-16 sm:mt-0">
                                  Please log in or create an account to claim
                                  promoter ticket
                                </span>
                              </>
                            )}
                          </>
                        ) : (
                          <>
                            <span className="text-gray-100 flex items-center">
                              <TruckIcon
                                className="h-5 w-5 flex-shrink-0"
                                aria-hidden="true"
                              />
                            </span>
                            <span className="text-gray-200 flex items-center">{`Ships in 1-2 weeks`}</span>
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
                {state.idToken &&
                state.refreshToken &&
                state.clientSecret &&
                state.stripePromise ? (
                  <>
                    {/* Render Elements and CheckoutForm for authenticated users */}
                    <Elements stripe={state.stripePromise} options={options}>
                      {hasPhysicalItems && (
                        <div className="mt-4">
                          <AddressForm onAddressChange={handleAddressChange} />
                        </div>
                      )}
                      <CheckoutForm addressDetails={state.addressDetails} />
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
