import React, { use, useEffect, useState } from "react";
import {
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";

import SaveToFirestore from "../firebase/util/saveToFirestore";

export default function CheckoutForm() {
  const stripe = useStripe();
  const elements = useElements();

  const [message, setMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [firebaseId, setUserId] = useState("");
  const [xyz, setCartItems] = useState();

  // console.log("Cart Items from CheckoutForm: ", cartItems);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedUserName = localStorage.getItem("name");
      const storedEmail = localStorage.getItem("email");
      const storedUserId = localStorage.getItem("userId");
      setUserName(storedUserName);
      setUserEmail(storedEmail);
      setUserId(storedUserId);
    }
  }, []);

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

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!stripe || !elements) {
      // Stripe.js hasn't yet loaded.
      // Make sure to disable form submission until Stripe.js has loaded.
      return;
    }

    setIsLoading(true);

    try {
      // Save purchase details to Firestore
      await SaveToFirestore(userName, userEmail, firebaseId);
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          // Adjust this to your payment completion page or handle it within the component
          return_url: "http://localhost:3000/completion",
        },
      });

      if (error) {
        if (error.type === "card_error" || error.type === "validation_error") {
          setMessage(error.message);
        } else {
          setMessage("An unexpected error occurred.");
        }
      } else {
        // Payment succeeded, handle success message or redirect
        setMessage("Payment succeeded!");
      }
    } catch (error) {
      console.error("Error confirming payment:", error);
      setMessage("An error occurred during payment confirmation.");
    }

    setIsLoading(false);
  };

  const paymentElementOptions = {
    layout: "tabs",
  };

  return (
    <form id="payment-form" onSubmit={handleSubmit}>
      <PaymentElement
        className="mt-4"
        id="payment-element"
        options={paymentElementOptions}
      />
      <button
        className="w-full mt-8 rounded-md border border-solid border-gray-100 bg-transparent px-4 py-3 text-base font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-gray-50"
        disabled={isLoading || !stripe || !elements}
        id="submit"
      >
        <span id="button-text">
          {isLoading ? <div className="spinner" id="spinner"></div> : "Pay now"}
        </span>
      </button>
      {/* Show any error or success messages */}
      {message && <div id="payment-message">{message}</div>}
    </form>
  );
}
