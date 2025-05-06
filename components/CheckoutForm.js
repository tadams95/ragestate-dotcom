import React, { useEffect, useState, useMemo } from "react";
import {
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { selectCartItems, clearCart } from "../lib/features/todos/cartSlice";
import { useSelector, useDispatch } from "react-redux";
import SaveToFirestore from "../firebase/util/saveToFirestore";

export default function CheckoutForm({
  addressDetails,
  isLoading: propIsLoading,
  userId,
  userName,
  userEmail,
}) {
  const stripe = useStripe();
  const elements = useElements();
  const dispatch = useDispatch();

  const [message, setMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [orderSaved, setOrderSaved] = useState(false);
  const [orderNumber, setOrderNumber] = useState(null);
  const [elementsReady, setElementsReady] = useState(false);
  const cartItems = useSelector(selectCartItems);
  const [paymentIntent, setPaymentIntent] = useState("");

  // Load payment intent from localStorage if not provided as prop
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedClientSecret = localStorage.getItem("clientSecret");
      setPaymentIntent(storedClientSecret || "");
    }
  }, []);

  // Mark elements as ready when PaymentElement is mounted
  useEffect(() => {
    if (stripe && elements) {
      const paymentElement = elements.getElement(PaymentElement);
      if (paymentElement) {
        console.log("Payment Element detected as mounted");
        setElementsReady(true);
      } else {
        console.log("Payment Element not yet mounted");
        setElementsReady(false);
      }
    }
  }, [stripe, elements]);

  // Extract payment intent prefix for Firestore with better error handling
  const paymentIntentPrefix = useMemo(() => {
    if (!paymentIntent) return "";

    const firstUnderscoreIndex = paymentIntent.indexOf("_");
    if (firstUnderscoreIndex === -1) return paymentIntent;

    const secondUnderscoreIndex = paymentIntent.indexOf(
      "_",
      firstUnderscoreIndex + 1
    );
    return secondUnderscoreIndex === -1
      ? paymentIntent
      : paymentIntent.substring(0, secondUnderscoreIndex);
  }, [paymentIntent]);

  // Check for already completed payment in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get("redirect_status");
    const paymentIntentId = params.get("payment_intent");

    if (status === "succeeded" && paymentIntentId && !orderSaved) {
      console.log(
        "Found successful payment in URL, order may have already been processed"
      );
      // Could check Firestore here to see if the order exists
    }
  }, [orderSaved]);

  // Check payment status on load
  useEffect(() => {
    if (!stripe) {
      return;
    }

    const clientSecret = new URLSearchParams(window.location.search).get(
      "payment_intent_client_secret"
    );

    if (!clientSecret) {
      return;
    }

    stripe.retrievePaymentIntent(clientSecret).then(({ paymentIntent }) => {
      switch (paymentIntent.status) {
        case "succeeded":
          setMessage("Payment succeeded!");
          break;
        case "processing":
          setMessage("Your payment is processing.");
          break;
        case "requires_payment_method":
          setMessage("Your payment was not successful, please try again.");
          break;
        default:
          setMessage("Something went wrong.");
          break;
      }
    });
  }, [stripe]);

  const saveOrder = async (paymentId) => {
    try {
      const firebaseId = userId || localStorage.getItem("userId");
      const name = userName || localStorage.getItem("name");
      const email = userEmail || localStorage.getItem("email");

      // Skip if we don't have the necessary data
      if (!firebaseId || !paymentId || !cartItems.length) {
        console.error("Missing data required for saving order:", {
          hasFirebaseId: !!firebaseId,
          hasPaymentId: !!paymentId,
          cartLength: cartItems.length,
        });
        return null;
      }

      // Skip if already saved
      if (orderSaved) {
        console.log("Order already saved, skipping");
        return { success: true, orderNumber };
      }

      console.log("Preparing cart items for save");
      const preparedCartItems = cartItems.map((item) => ({
        ...item,
        productId: item.productId || item.id,
        title: item.title || item.name,
        price: parseFloat(item.price) || 0,
        quantity: parseInt(item.quantity) || 1,
        productImageSrc: item.imageSrc || item.productImageSrc,
        color: item.selectedColor || item.color,
        size: item.selectedSize || item.size,
      }));

      console.log("Saving order to Firestore", {
        name,
        email,
        itemsCount: preparedCartItems.length,
      });

      const result = await SaveToFirestore(
        name,
        email,
        firebaseId,
        preparedCartItems,
        paymentId,
        addressDetails
      );

      if (result && result.success) {
        console.log("Order saved successfully:", result.orderNumber);
        setOrderSaved(true);
        setOrderNumber(result.orderNumber);

        // Save to localStorage for the account page
        localStorage.setItem("lastOrderNumber", result.orderNumber);
        localStorage.setItem("lastOrderTime", new Date().toISOString());

        // Clear cart so user doesn't accidentally resubmit
        dispatch(clearCart());

        return result;
      } else {
        console.error(
          "Failed to save order:",
          result?.error || "Unknown error"
        );
        return null;
      }
    } catch (error) {
      console.error("Error in saveOrder:", error);
      return null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!stripe || !elements) {
      console.error("Stripe.js or Elements not loaded");
      return;
    }

    // Check if elements are ready
    const paymentElement = elements.getElement(PaymentElement);
    if (!paymentElement) {
      console.error("Payment Element not found in the DOM");
      setMessage("Payment form not fully loaded. Please refresh the page.");
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      console.log("Payment submission initiated");

      // Attempt to save order BEFORE payment confirmation if we have payment intent
      let preSaveResult = null;
      if (paymentIntentPrefix && !orderSaved) {
        console.log("Saving order before payment confirmation");
        preSaveResult = await saveOrder(paymentIntentPrefix);
      }

      // Verify elements are ready before confirming
      if (!elementsReady) {
        console.log("Elements not ready, rechecking...");
        const paymentElement = elements.getElement(PaymentElement);
        if (!paymentElement) {
          throw new Error("Payment Element not available");
        }
        setElementsReady(true);
      }

      console.log("Confirming payment with stripe.confirmPayment");
      // Continue with payment confirmation
      const { error, paymentIntent: confirmedPayment } =
        await stripe.confirmPayment({
          elements,
          confirmParams: {
            return_url: `${window.location.origin}/account`,
          },
          redirect: "if_required",
        });

      // Handle errors first
      if (error) {
        console.error("Payment error:", error);
        if (error.type === "card_error" || error.type === "validation_error") {
          setMessage(error.message);
        } else {
          setMessage("An unexpected error occurred.");
        }
        setIsLoading(false);
        return;
      }

      // If we get here without redirect, payment succeeded without redirect
      if (confirmedPayment) {
        console.log("Payment confirmed without redirect:", confirmedPayment.id);

        // If we didn't save before, or if pre-save used a different ID, save now
        if (
          !orderSaved ||
          (preSaveResult && confirmedPayment.id !== paymentIntentPrefix)
        ) {
          console.log("Saving order post-payment confirmation");
          const postSaveResult = await saveOrder(confirmedPayment.id);

          if (postSaveResult && postSaveResult.success) {
            setMessage(
              `Payment succeeded! Order #${postSaveResult.orderNumber} created.`
            );
          } else {
            setMessage(
              "Payment succeeded, but there was an issue saving your order."
            );
          }
        } else {
          setMessage(`Payment succeeded! Order #${orderNumber} processed.`);
        }

        // Redirect after a short delay to show the success message
        setTimeout(() => {
          window.location.href = `${window.location.origin}/account`;
        }, 2000);
      }
    } catch (error) {
      console.error("Unhandled error during payment:", error);
      setMessage(`An unexpected error occurred: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const paymentElementOptions = {
    layout: "tabs",
    // Add onReady handler to track element readiness
    onReady: () => {
      console.log("Payment element is ready");
      setElementsReady(true);
    },
  };

  // Use either the component's loading state or the prop loading state
  const isButtonDisabled =
    isLoading || propIsLoading || !stripe || !elements || !elementsReady;

  return (
    <form id="payment-form" onSubmit={handleSubmit}>
      <PaymentElement
        className="mt-4"
        id="payment-element"
        options={paymentElementOptions}
        onReady={() => setElementsReady(true)}
      />
      <button
        className="w-full mt-8 rounded-md border border-solid border-gray-100 bg-transparent px-4 py-3 text-base font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-gray-50"
        disabled={isButtonDisabled}
        id="submit"
      >
        <span id="button-text">
          {isLoading ? <div className="spinner" id="spinner"></div> : "Pay now"}
        </span>
      </button>
      {/* Show any error or success messages */}
      {message && (
        <div
          id="payment-message"
          className={`mt-4 text-sm ${
            message.includes("succeeded") || message.includes("success")
              ? "text-green-500"
              : "text-red-500"
          }`}
        >
          {message}
        </div>
      )}
    </form>
  );
}
