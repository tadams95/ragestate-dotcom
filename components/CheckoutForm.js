import React, { useEffect, useState } from "react";
import { PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { useSelector } from "react-redux";
import { useFirebase } from "../firebase/context/FirebaseContext"; // Add this import
import SaveToFirestore from "../firebase/util/saveToFirestore";
import { selectCartItems } from "../lib/features/todos/cartSlice";

export default function CheckoutForm({ addressDetails }) {
  const stripe = useStripe();
  const elements = useElements();
  const { user } = useFirebase(); // Add this line to get the authenticated user

  const [message, setMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [firebaseId, setUserId] = useState("");
  const [errorType, setErrorType] = useState(null);
  const [errorMessage, setErrorMessage] = useState(""); // Add this line
  const cartItems = useSelector(selectCartItems);
  const [paymentIntent, setPaymentIntent] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedUserName = localStorage.getItem("name");
      const storedEmail = localStorage.getItem("email");
      const storedUserId = localStorage.getItem("userId");
      const storedClientSecret = localStorage.getItem("clientSecret");
      
      if (!storedUserName || !storedEmail || !storedUserId || !storedClientSecret) {
        setMessage("Missing user information. Please refresh or try logging in again.");
        setErrorType("user_data");
        return;
      }
      
      setUserName(storedUserName);
      setUserEmail(storedEmail);
      setUserId(storedUserId);
      setPaymentIntent(storedClientSecret);
    }
  }, []);

  // Find the index of the second underscore
  const getPaymentIntentPrefix = () => {
    if (!paymentIntent) return "";
    
    const firstUnderscoreIndex = paymentIntent.indexOf("_");
    if (firstUnderscoreIndex === -1) return "";
    
    const secondUnderscoreIndex = paymentIntent.indexOf(
      "_",
      firstUnderscoreIndex + 1
    );
    
    return secondUnderscoreIndex !== -1 
      ? paymentIntent.substring(0, secondUnderscoreIndex)
      : "";
  };

  const paymentIntentPrefix = getPaymentIntentPrefix();

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
          setErrorType("success");
          break;
        case "processing":
          setMessage("Your payment is processing.");
          setErrorType("processing");
          break;
        case "requires_payment_method":
          setMessage("Your payment was not successful, please try again.");
          setErrorType("payment_failed");
          break;
        default:
          setMessage(`Something went wrong. Status: ${paymentIntent.status}`);
          setErrorType("unknown");
          break;
      }
    }).catch(error => {
      console.error("Error retrieving payment intent:", error);
      setMessage(`Error retrieving payment status: ${error.message}`);
      setErrorType("retrieval_error");
    });
  }, [stripe]);

  const validateInputs = () => {
    if (!userName || !userEmail || !firebaseId) {
      setMessage("User information is missing. Please log in again.");
      setErrorType("validation");
      return false;
    }
    
    if (!paymentIntentPrefix) {
      setMessage("Payment reference is missing. Please refresh the page.");
      setErrorType("validation");
      return false;
    }
    
    if (cartItems.length === 0) {
      setMessage("Your cart is empty. Please add items before checkout.");
      setErrorType("validation");
      return false;
    }
    
    // For physical items, validate address
    const hasPhysicalItems = cartItems.some(item => !item.isDigital);
    if (hasPhysicalItems && (!addressDetails || !addressDetails.address || !addressDetails.address.line1)) {
      setMessage("Shipping address is required for physical items.");
      setErrorType("validation");
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    setErrorMessage(""); // Now this will work
    setMessage(""); // Clear any existing messages

    try {
      // Input validation
      if (!validateInputs()) {
        setIsLoading(false);
        return;
      }

      // Verify user is authenticated
      if (!user) {
        throw new Error("Please log in to complete your purchase");
      }

      // Verify stripe is loaded
      if (!stripe || !elements) {
        throw new Error("Stripe has not been initialized");
      }

      // Confirm payment
      const { error: paymentError } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/account`,
        },
      });

      if (paymentError) {
        throw new Error(paymentError.message);
      }

      // Save to Firestore
      try {
        await SaveToFirestore(
          userName,
          userEmail,
          firebaseId,
          cartItems,
          paymentIntentPrefix,
          addressDetails
        );
      } catch (firestoreError) {
        console.error("Firestore save error:", firestoreError);
        setErrorMessage("Purchase completed but there was an error saving your order. Please contact support.");
        setErrorType("firestore_error");
      }
    } catch (error) {
      console.error("Checkout error:", error);
      setErrorMessage(error.message);
      setErrorType("payment_error");
    } finally {
      setIsLoading(false);
    }
  };

  const paymentElementOptions = {
    layout: "tabs",
  };

  const getMessageClass = () => {
    if (!errorType) return "mt-4 text-gray-100";
    
    switch (errorType) {
      case "success":
        return "mt-4 text-green-500 font-medium";
      case "processing":
        return "mt-4 text-yellow-500 font-medium";
      default:
        return "mt-4 text-red-500 font-medium";
    }
  };

  return (
    <form id="payment-form" onSubmit={handleSubmit}>
      <PaymentElement
        className="mt-4"
        id="payment-element"
        options={paymentElementOptions}
      />
      {message && (
        <div id="payment-message" className={getMessageClass()}>
          {message}
        </div>
      )}
      {errorMessage && (
        <div className="mt-4 text-red-500 font-medium">
          {errorMessage}
        </div>
      )}
      <button
        className={`w-full mt-8 rounded-md border border-solid border-gray-100 
          bg-transparent px-4 py-3 text-base font-medium text-white shadow-sm 
          hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-gray-500 
          focus:ring-offset-2 focus:ring-offset-gray-50
          ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
        disabled={isLoading || !stripe || !elements}
        id="submit"
      >
        <span id="button-text">
          {isLoading ? (
            <div className="flex justify-center items-center">
              <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-2"></div>
              Processing...
            </div>
          ) : "Pay now"}
        </span>
      </button>
    </form>
  );
}
