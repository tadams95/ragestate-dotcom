import { AddressElement } from "@stripe/react-stripe-js";

const AddressForm = ({ onAddressChange }) => {
  const handleAddressChange = (e) => {
    if (e.complete) {
      onAddressChange(e.value); // Pass address up to parent component
    }
  };
  return (
    <form>
      <h3 className="mt-4">Shipping Address</h3>
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
