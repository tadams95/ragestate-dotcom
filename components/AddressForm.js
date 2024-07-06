import React from "react";
import { AddressElement } from "@stripe/react-stripe-js";

const AddressForm = () => {
  return (
    <form>
      <h3 className="mt-4">Shipping</h3>
      <AddressElement
        className="mt-4"
        options={{
          mode: "shipping",
          allowedCountries: ["US"],
        }}
      />
    </form>
  );
};

export default AddressForm;
