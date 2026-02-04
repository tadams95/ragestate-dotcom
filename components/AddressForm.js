import { AddressElement } from "@stripe/react-stripe-js";
import { useState } from "react";

/**
 * AddressForm component with address validation error display
 * FIX 3.3: Enhanced to show validation errors to users
 * @param {{ onAddressChange: (address: object | null) => void }} props
 */
const AddressForm = ({ onAddressChange }) => {
  const [isComplete, setIsComplete] = useState(false);
  const [validationError, setValidationError] = useState(null);

  const handleAddressChange = (e) => {
    setIsComplete(e.complete);

    if (e.complete) {
      setValidationError(null);
      onAddressChange(e.value); // Pass complete address up to parent component
    } else {
      // FIX 3.3: Clear address when incomplete to prevent submission with partial data
      onAddressChange(null);

      // Check for specific field errors
      if (e.value && e.value.address) {
        const { address } = e.value;
        const missingFields = [];
        if (!address.line1) missingFields.push('street address');
        if (!address.city) missingFields.push('city');
        if (!address.state) missingFields.push('state');
        if (!address.postal_code) missingFields.push('ZIP code');
        if (!e.value.name) missingFields.push('name');

        if (missingFields.length > 0) {
          setValidationError(`Please complete: ${missingFields.join(', ')}`);
        } else {
          setValidationError(null);
        }
      }
    }
  };

  return (
    <form>
      <h3 className="mt-4 text-[var(--text-primary)] font-medium">Shipping Address</h3>
      <AddressElement
        className="mt-4"
        options={{
          mode: "shipping",
          allowedCountries: ["US"],
        }}
        onChange={handleAddressChange}
      />
      {/* FIX 3.3: Display address validation errors */}
      {validationError && !isComplete && (
        <p className="mt-2 text-sm text-[var(--warning)]">
          {validationError}
        </p>
      )}
    </form>
  );
};

export default AddressForm;
