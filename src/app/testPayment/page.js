"use client";

import { useEffect, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import CheckoutForm from "../../../components/CheckoutForm";
import RandomDetailStyling from "../components/styling/RandomDetailStyling";
import AddressForm from "../../../components/AddressForm";

export default function Payment() {
  const [stripePromise, setStripePromise] = useState(null);
  const [clientSecret, setClientSecret] = useState("");

  useEffect(() => {
    const publishableKey =
      "pk_test_51NFhuOHnXmOBmfaDAdOEefavmmfZzMX4F0uOpbvrK1P49isqVY6uBUDeXnCqNjiu6g89dh9CMZj7wDOAFLX5z93t007GOWlK8e";

    setStripePromise(loadStripe(publishableKey));
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
        console.log("Client Secret: ", client_secret);
      } catch (error) {
        console.error("Error fetching payment intent:", error.message);
      }
    };

    fetchClientSecret();
  }, []);

  const appearance = {
    theme: "stripe",
    variables: {
      colorText: "#ffffff",
      colorBackground: "#000000",
    },
  };
  const options = {
    clientSecret,
    appearance,
  };

  return (
    <>
      <div className="mx-auto my-40 max-w-7xl px-4 sm:px-6 lg:px-8 isolate">
        <RandomDetailStyling />
        <div className="mx-auto max-w-3xl border border-1 p-8 rounded-md">
          <h1>React Stripe and the Payment Element</h1>
          {clientSecret && stripePromise && (
            <Elements stripe={stripePromise} options={options}>
              <AddressForm />
              <CheckoutForm />
            </Elements>
          )}
        </div>
      </div>
    </>
  );
}
