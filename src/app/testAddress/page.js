"use client";

import React from "react";

import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";

import AddressForm from "../../../components/AddressForm";
import RandomDetailStyling from "../components/styling/RandomDetailStyling";

// Make sure to call `loadStripe` outside of a component’s render to avoid
// recreating the `Stripe` object on every render.
const stripe = loadStripe(
  "pk_test_51NFhuOHnXmOBmfaDAdOEefavmmfZzMX4F0uOpbvrK1P49isqVY6uBUDeXnCqNjiu6g89dh9CMZj7wDOAFLX5z93t007GOWlK8e"
);

export default function TestAddress() {
  const options = {
    // Fully customizable with appearance API.
    appearance: {
      theme: "stripe",
      variables: {
        colorText: "#ffffff",
        colorBackground: "#000000",
      },
    },
  };

  return (
    <>
      <div className="mx-auto my-40 max-w-7xl px-4 sm:px-6 lg:px-8 isolate">
        <RandomDetailStyling />
        <div className="mx-auto max-w-3xl border border-1 p-8 rounded-md">
          <Elements stripe={stripe} options={options}>
            <AddressForm />
          </Elements>
        </div>
      </div>
    </>
  );
}
