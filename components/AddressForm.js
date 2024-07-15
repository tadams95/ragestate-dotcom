import { useState } from "react";
import { AddressElement } from "@stripe/react-stripe-js";

const AddressForm = ({ onAddressChange }) => {
  const [shippingAddress, setShippingAddress] = useState({
    line1: "",
    city: "",
    state: "",
    postal_code: "",
    country: "",
  });

  const handleAddressChange = (e) => {
    if (e.complete) {
      const address = e.value;
      setShippingAddress(address); // Update local state with the address
      onAddressChange(address); // Pass address up to parent component
    }
  };
  return (
    <form>
      <h3 className="mt-4">Shipping</h3>
      <AddressElement
        className="mt-4"
        options={{
          mode: "shipping",
          allowedCountries: ["US"],
        }}
        onChange={handleAddressChange}
      />
    </form>
  );
};

export default AddressForm;
