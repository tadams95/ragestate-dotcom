import React, { useEffect, useState } from "react";
import {
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { useSelector } from "react-redux";
import { selectCartItems } from "../lib/features/todos/cartSlice";

export default function CheckoutForm({ addressDetails, isLoading }) {
  const stripe = useStripe();
  const elements = useElements();

  const [message, setMessage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const cartItems = useSelector(selectCartItems);

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

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!stripe || !elements) {
      console.log("Stripe.js not loaded yet.");
      return;
    }

    if (isLoading) {
      console.log("Waiting for client secret update...");
      return;
    }

    setIsProcessing(true);
    setMessage(null);

    const elementsOptions = elements.getElement(PaymentElement)?._options;
    console.log(
      "Attempting payment confirmation with clientSecret from Elements options:",
      elementsOptions?.clientSecret
    );
    const storedClientSecret = localStorage.getItem("clientSecret");
    console.log(
      "Client secret from localStorage at time of submit:",
      storedClientSecret
    );

    const return_url = `${window.location.origin}/account`;

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: return_url,
        shipping: addressDetails
          ? {
              name: addressDetails.name,
              address: {
                line1: addressDetails.address.line1,
                line2: addressDetails.address.line2,
                city: addressDetails.address.city,
                state: addressDetails.address.state,
                postal_code: addressDetails.address.postal_code,
                country: addressDetails.address.country,
              },
            }
          : undefined,
      },
    });

    if (error) {
      if (error.type === "card_error" || error.type === "validation_error") {
        setMessage(error.message);
      } else {
        setMessage("An unexpected error occurred.");
        console.error("Stripe confirmation error:", error);
      }
    } else {
      setMessage("Payment processing...");
    }

    setIsProcessing(false);
  };

  const paymentElementOptions = {
    layout: "tabs",
  };

  const isButtonDisabled = !stripe || !elements || isLoading || isProcessing;

  return (
    <form id="payment-form" onSubmit={handleSubmit}>
      <PaymentElement id="payment-element" options={paymentElementOptions} />
      <button
        disabled={isButtonDisabled}
        id="submit"
        className={`mt-6 w-full rounded-md border border-transparent px-4 py-2 text-base font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 ${
          isButtonDisabled
            ? "bg-gray-500 text-gray-300 cursor-not-allowed"
            : "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500"
        }`}
      >
        <span id="button-text">
          {isProcessing
            ? "Processing..."
            : isLoading
            ? "Updating..."
            : "Pay now"}
        </span>
      </button>
      {message && (
        <div
          id="payment-message"
          className={`mt-4 text-sm ${
            message.includes("success") ? "text-green-500" : "text-red-500"
          }`}
        >
          {message}
        </div>
      )}
    </form>
  );
}
