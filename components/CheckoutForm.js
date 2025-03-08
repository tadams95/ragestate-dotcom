import React, { useEffect, useState } from "react";
import { PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { useSelector } from "react-redux";
import { useFirebase } from "../firebase/context/FirebaseContext";
import SaveToFirestore from "../firebase/util/saveToFirestore";
import { selectCartItems } from "../lib/features/todos/cartSlice";

export default function CheckoutForm({ addressDetails }) {
  const stripe = useStripe();
  const elements = useElements();
  const { user } = useFirebase();

  const [message, setMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [firebaseId, setUserId] = useState("");
  const [errorType, setErrorType] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [debugInfo, setDebugInfo] = useState({});
  const cartItems = useSelector(selectCartItems);
  const [paymentIntent, setPaymentIntent] = useState("");
  const [isPaymentProcessed, setIsPaymentProcessed] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedUserName = localStorage.getItem("name");
      const storedEmail = localStorage.getItem("email");
      const storedUserId = localStorage.getItem("userId");
      const storedClientSecret = localStorage.getItem("clientSecret");
      
      const userInfo = {
        name: storedUserName,
        email: storedEmail,
        userId: storedUserId,
        hasClientSecret: !!storedClientSecret
      };
      console.log("User info from localStorage:", userInfo);
      setDebugInfo(prev => ({...prev, userInfo}));
      
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
  
  // Log payment intent info for debugging
  useEffect(() => {
    if (paymentIntent) {
      const prefixInfo = {
        paymentIntent: paymentIntent.substring(0, 10) + "...", // Only log a portion for security
        extractedPrefix: paymentIntentPrefix,
      };
      console.log("Payment intent info:", prefixInfo);
      setDebugInfo(prev => ({...prev, paymentIntent: prefixInfo}));
    }
  }, [paymentIntent, paymentIntentPrefix]);

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
      console.log("Retrieved payment intent status:", paymentIntent.status);
      
      switch (paymentIntent.status) {
        case "succeeded":
          setMessage("Payment succeeded!");
          setErrorType("success");
          setIsPaymentProcessed(true); // Mark as processed
          // Save purchase data to Firestore on successful payment
          handleSaveToFirestore();
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

  // Separate function to handle the Firestore saving
  const handleSaveToFirestore = async () => {
    try {
      console.log("Attempting to save purchase to Firestore...");
      setDebugInfo(prev => ({...prev, savingToFirestore: true}));
      
      // Input validation
      if (!validateInputs()) {
        console.error("Input validation failed");
        setDebugInfo(prev => ({...prev, validationFailed: true}));
        return false;
      }

      console.log("Input validation passed, proceeding with save");
      
      const result = await SaveToFirestore(
        userName,
        userEmail,
        firebaseId,
        cartItems,
        paymentIntentPrefix,
        addressDetails
      );
      
      console.log("SaveToFirestore result:", result);
      setDebugInfo(prev => ({...prev, firestoreResult: result}));
      
      return true;
    } catch (firestoreError) {
      console.error("Firestore save error:", firestoreError);
      setErrorMessage("Purchase completed but there was an error saving your order. Please contact support.");
      setErrorType("firestore_error");
      setDebugInfo(prev => ({...prev, firestoreError: firestoreError.message}));
      return false;
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    setErrorMessage("");
    setMessage("");
    
    try {
      // Log debugging info
      console.log("Starting payment process with:", { 
        hasStripe: !!stripe, 
        hasElements: !!elements,
        cartItemsCount: cartItems.length,
        user: user?.uid,
        firebaseId 
      });
      
      // Input validation
      if (!validateInputs()) {
        setIsLoading(false);
        return;
      }

      // Verify user is authenticated - we'll now make this a warning not an error
      if (!user) {
        console.warn("No Firebase user object found. Proceeding with stored firebaseId");
      } else if (user.uid !== firebaseId) {
        console.warn(`User mismatch: current user.uid=${user.uid}, stored firebaseId=${firebaseId}`);
      }

      // Verify stripe is loaded
      if (!stripe || !elements) {
        throw new Error("Stripe has not been initialized");
      }

      // Confirm payment with Stripe
      console.log("Confirming payment with Stripe...");
      const { error: paymentError, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: "if_required",
        confirmParams: {
          return_url: `${window.location.origin}/account`,
        },
      });

      if (paymentError) {
        console.error("Payment error:", paymentError);
        throw new Error(paymentError.message);
      }
      
      console.log("Payment successful, status:", paymentIntent?.status);
      setIsPaymentProcessed(true);
      
      // Save to Firestore after successful payment
      if (paymentIntent && (paymentIntent.status === "succeeded" || paymentIntent.status === "processing")) {
        const savedToFirestore = await handleSaveToFirestore();
        if (savedToFirestore) {
          setMessage("Payment successful! Your order has been placed.");
          setErrorType("success");
          // After successful payment and order saving, redirect to account page
          setTimeout(() => {
            window.location.href = "/account";
          }, 2000);
        }
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
      
      {/* Add a debug info section that can be expanded if needed in development */}
      {process.env.NODE_ENV === "development" && Object.keys(debugInfo).length > 0 && (
        <details className="mt-4 p-2 bg-gray-800 rounded-md">
          <summary className="text-gray-300 text-xs">Debug Info</summary>
          <pre className="mt-2 text-xs text-gray-300 overflow-auto max-h-40">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </details>
      )}
      
      <button
        className={`w-full mt-8 rounded-md border border-solid border-gray-100 
          bg-transparent px-4 py-3 text-base font-medium text-white shadow-sm 
          hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-gray-500 
          focus:ring-offset-2 focus:ring-offset-gray-50
          ${isLoading || isPaymentProcessed ? "opacity-50 cursor-not-allowed" : ""}`}
        disabled={isLoading || !stripe || !elements || isPaymentProcessed}
        id="submit"
      >
        <span id="button-text">
          {isLoading ? (
            <div className="flex justify-center items-center">
              <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-2"></div>
              Processing...
            </div>
          ) : isPaymentProcessed ? "Payment Processed" : "Pay now"}
        </span>
      </button>
      
      {/* Add a manual save button for recovery in case automatic save fails */}
      {isPaymentProcessed && !debugInfo.firestoreResult && (
        <button
          type="button"
          onClick={handleSaveToFirestore}
          className="w-full mt-2 py-2 px-4 bg-gray-700 text-white rounded-md text-sm"
        >
          Save Order Details (If not automatically saved)
        </button>
      )}
    </form>
  );
}
