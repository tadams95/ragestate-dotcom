"use client";

import { useState, useEffect, useMemo } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { useSelector, useDispatch } from "react-redux";

//REMOVE AFTER MOJO PIN
import { doc, getFirestore, getDoc } from "firebase/firestore";

import { TruckIcon, XMarkIcon } from "@heroicons/react/20/solid";

import {
  selectCartItems,
  removeFromCart,
  setCheckoutPrice,
  setPaymentIntent,
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
import storage from "@/utils/storage";

// Import new components
import PromoCodeInput from "./components/PromoCodeInput";
import CartItemDisplay from "./components/CartItemDisplay";
import OrderSummaryDisplay from "./components/OrderSummaryDisplay";

export default function Cart() {
  const dispatch = useDispatch();
  const cartItems = useSelector(selectCartItems);
  const firestore = getFirestore();
  const [code, setCode] = useState("");
  const [validCode, setValidCode] = useState(false);
  const [codeError, setCodeError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [addressDetails, setAddressDetails] = useState(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [promoApplied, setPromoApplied] = useState(false);
  const [appliedPromoCodeData, setAppliedPromoCodeData] = useState(null); // Store details of the applied promo code

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

  const validatePromoCode = async (inputCode) => {
    const upperCaseCode = inputCode.toUpperCase();

    if (!upperCaseCode || upperCaseCode.trim() === "") {
      setValidCode(false);
      setCodeError("Please enter a promo code");
      return { isValid: false, data: null };
    }
    if (promoApplied) {
      setCodeError("A promo code has already been applied.");
      return { isValid: false, data: null };
    }

    try {
      setIsLoading(true);
      setErrorMessage("");

      const codeRef = doc(firestore, "promoterCodes", upperCaseCode);
      const codeSnap = await getDoc(codeRef);

      if (codeSnap.exists()) {
        const promoData = codeSnap.data();
        if (!promoData.active) {
          setValidCode(false);
          setCodeError("This promo code is no longer active.");
          return { isValid: false, data: null };
        }
        if (promoData.expiresAt && promoData.expiresAt.toDate() < new Date()) {
          setValidCode(false);
          setCodeError("This promo code has expired.");
          return { isValid: false, data: null };
        }
        if (promoData.currentUses >= promoData.maxUses) {
          setValidCode(false);
          setCodeError("This promo code has reached its maximum usage limit.");
          return { isValid: false, data: null };
        }

        setValidCode(true);
        setCodeError("");
        return { isValid: true, data: { id: codeSnap.id, ...promoData } };
      } else {
        setValidCode(false);
        setCodeError("Invalid promo code");
        return { isValid: false, data: null };
      }
    } catch (error) {
      console.error("Error validating code:", error);
      setCodeError(`Error validating code: ${error.message}`);
      setValidCode(false);
      return { isValid: false, data: null };
    } finally {
      setIsLoading(false);
    }
  };

  const API_URL =
    "https://us-central1-ragestate-app.cloudfunctions.net/stripePayment";

  const handleRemoveFromCart = (productId, selectedColor, selectedSize) => {
    dispatch(removeFromCart({ productId, selectedColor, selectedSize }));
  };

  const handleIncrement = (productId, selectedColor, selectedSize) => {
    dispatch(incrementQuantity({ productId, selectedColor, selectedSize }));
  };

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

  const handleApplyPromoCode = async () => {
    if (!code || promoApplied || isLoading) return;
    const upperCaseCode = code.toUpperCase();

    setIsLoading(true);
    const validationResult = await validatePromoCode(upperCaseCode);
    setIsLoading(false);

    if (validationResult.isValid && validationResult.data) {
      const promoData = validationResult.data;
      setDiscountAmount(promoData.discountValue);
      setAppliedPromoCodeData(promoData);
      setPromoApplied(true);
      setCodeError("");

      setState((prevState) => {
        const taxRate = 0.075;
        const shipping = cartItems.some((item) => !item.isDigital) ? 0.0 : 0.0;
        const newTotalPrice =
          prevState.cartSubtotal +
          prevState.cartSubtotal * taxRate +
          shipping -
          promoData.discountValue;
        return {
          ...prevState,
          totalPrice: Math.max(0, newTotalPrice),
        };
      });
    } else {
      setAppliedPromoCodeData(null);
    }
  };

  useEffect(() => {
    const newCartSubtotal = cartItems.reduce((accumulator, item) => {
      const quantity =
        typeof item.quantity === "number" && item.quantity > 0
          ? item.quantity
          : 1;
      return accumulator + parseFloat(item.price) * quantity;
    }, 0);

    const taxRate = 0.075;
    const taxTotal = newCartSubtotal * taxRate;
    const shipping = cartItems.some((item) => !item.isDigital) ? 0.0 : 0.0;
    const newTotalPrice =
      newCartSubtotal + taxTotal + shipping - discountAmount;

    setState((prevState) => ({
      ...prevState,
      cartSubtotal: newCartSubtotal,
      totalPrice: Math.max(0, newTotalPrice),
    }));

    dispatch(setCheckoutPrice(Math.max(0, newTotalPrice * 100)));
  }, [cartItems, dispatch, discountAmount]);

  useEffect(() => {
    const publishableKey =
      "pk_live_51NFhuOHnXmOBmfaDu16tJEuppfYKPUivMapB9XLXaBpiOLqiPRz2uoPAiifxqiLT49dyPCHOSKs74wjBspzJ8zo600yGYluqUe";
    setState((prevState) => ({
      ...prevState,
      stripePromise: loadStripe(publishableKey),
    }));
  }, []);

  useEffect(() => {
    const { idToken, refreshToken, name, email, userId } = storage.readKeys([
      "idToken",
      "refreshToken",
      "name",
      "email",
      "userId",
    ]);
    setState((prevState) => ({
      ...prevState,
      idToken,
      refreshToken,
      userName: name || "",
      userEmail: email || "",
      userId: userId || "",
    }));
  }, []);

  const taxRate = 0.075;
  const taxTotal = (state.cartSubtotal * taxRate).toFixed(2);
  const shipping = cartItems.some((item) => !item.isDigital) ? 0.0 : 0.0;
  const total = (
    parseFloat(state.cartSubtotal) +
    parseFloat(taxTotal) +
    shipping -
    discountAmount
  ).toFixed(2);
  const finalTotal = Math.max(0, parseFloat(total)).toFixed(2);
  const stripeTotal = Math.round(Math.max(0, parseFloat(finalTotal) * 100));

  useEffect(() => {
    const fetchClientSecret = async () => {
      try {
        if (!cartItems.length || stripeTotal <= 0) {
          if (state.clientSecret) {
            setState((prevState) => ({ ...prevState, clientSecret: "" }));
            storage.remove("clientSecret");
          }
          return;
        }

        const MIN_STRIPE_AMOUNT = 50; // 50 cents, Stripe's typical minimum
        if (stripeTotal < MIN_STRIPE_AMOUNT) {
          console.warn(
            `Stripe total amount ${stripeTotal} cents is below minimum ${MIN_STRIPE_AMOUNT} cents. Payment intent not created.`
          );
          setErrorMessage(
            `Order total after discount ($${(stripeTotal / 100).toFixed(
              2
            )}) is below the minimum processing amount of $${(
              MIN_STRIPE_AMOUNT / 100
            ).toFixed(2)}. Please adjust your cart or promo code.`
          );
          if (state.clientSecret) {
            setState((prevState) => ({ ...prevState, clientSecret: "" }));
            storage.remove("clientSecret");
          }
          setIsLoading(false);
          return;
        }

        setIsLoading(true);
        setErrorMessage("");

        const response = await fetch(`${API_URL}/web-payment`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount: stripeTotal,
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

        setState((prevState) => ({
          ...prevState,
          clientSecret: client_secret,
        }));
        storage.set("clientSecret", client_secret);
      } catch (error) {
        console.error("Error fetching payment intent:", error.message);
        setErrorMessage(
          `Payment setup failed: ${error.message}. Please refresh the page or try again later.`
        );
        setState((prevState) => ({ ...prevState, clientSecret: "" }));
        storage.remove("clientSecret");
      } finally {
        setIsLoading(false);
      }
    };

    if (state.userName && state.userEmail && state.userId) {
      fetchClientSecret();
    } else {
      setIsLoading(false);
      if (state.clientSecret) {
        setState((prevState) => ({ ...prevState, clientSecret: "" }));
        storage.remove("clientSecret");
      }
    }
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

  const options = useMemo(
    () => ({
      clientSecret: state.clientSecret,
      appearance: appearance,
    }),
    [state.clientSecret]
  );

  const hasPhysicalItems = cartItems.some((item) => !item.isDigital);

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
                {cartItems.map((item, index) => (
                  <CartItemDisplay
                    key={`${item.productId}-${item.selectedColor}-${item.selectedSize}-${index}`}
                    item={item}
                    handleIncrement={handleIncrement}
                    handleDecrement={handleDecrement}
                    handleRemoveFromCart={handleRemoveFromCart}
                    renderPromoComponent={
                      item.isDigital &&
                      state.idToken &&
                      state.refreshToken &&
                      state.clientSecret &&
                      state.stripePromise
                        ? () => (
                            <PromoCodeInput
                              code={code}
                              setCode={setCode}
                              handleApplyPromoCode={handleApplyPromoCode}
                              promoApplied={promoApplied}
                              isLoading={isLoading}
                              codeError={codeError}
                              setValidCode={setValidCode}
                              setCodeError={setCodeError}
                            />
                          )
                        : item.isDigital &&
                          !state.idToken &&
                          !state.refreshToken
                        ? () => (
                            <div className="mt-4 pt-4 border-t border-gray-700">
                              <span className="text-gray-400 text-xs">
                                Log in to use promo codes.
                              </span>
                            </div>
                          )
                        : null
                    }
                  />
                ))}
              </ul>
            </section>

            <OrderSummaryDisplay
              cartSubtotal={state.cartSubtotal}
              shipping={shipping}
              taxTotal={taxTotal}
              discountAmount={discountAmount}
              finalTotal={finalTotal}
              idToken={state.idToken}
              refreshToken={state.refreshToken}
              clientSecret={state.clientSecret}
              stripePromise={state.stripePromise}
              options={options}
              hasPhysicalItems={hasPhysicalItems}
              handleAddressChange={handleAddressChange}
              addressDetails={addressDetails}
              isLoading={isLoading}
              userId={state.userId}
              userName={state.userName}
              userEmail={state.userEmail}
              appliedPromoCode={appliedPromoCodeData} // Pass applied promo code data
            />
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
