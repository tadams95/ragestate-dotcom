import { createSlice } from "@reduxjs/toolkit";

//redux slice to manage cart state and add items to cart

const cartSlice = createSlice({
  name: "cart",
  // Ensure initialState reflects items potentially having quantity
  initialState: { items: [], checkoutPrice: 0, paymentIntent: "" },
  reducers: {
    addToCart: (state, action) => {
      const { productId, selectedColor, selectedSize } = action.payload;
      const existingItemIndex = state.items.findIndex(
        (item) =>
          item.productId === productId &&
          item.selectedColor === selectedColor &&
          item.selectedSize === selectedSize
      );

      if (existingItemIndex !== -1) {
        // Item exists, increment quantity
        state.items[existingItemIndex].quantity += 1;
      } else {
        // Item does not exist, add it with quantity 1
        state.items.push({ ...action.payload, quantity: 1 });
      }
    },
    removeFromCart: (state, action) => {
      // This reducer removes the entire item line regardless of quantity
      const { productId, selectedColor, selectedSize } = action.payload;
      const indexToRemove = state.items.findIndex(
        (item) =>
          item.productId === productId &&
          item.selectedColor === selectedColor &&
          item.selectedSize === selectedSize
      );

      if (indexToRemove !== -1) {
        state.items.splice(indexToRemove, 1);
      }
    },
    // Add incrementQuantity reducer
    incrementQuantity: (state, action) => {
      const { productId, selectedColor, selectedSize } = action.payload;
      const itemToUpdate = state.items.find(
        (item) =>
          item.productId === productId &&
          item.selectedColor === selectedColor &&
          item.selectedSize === selectedSize
      );
      if (itemToUpdate) {
        itemToUpdate.quantity += 1;
      }
    },
    // Add decrementQuantity reducer
    decrementQuantity: (state, action) => {
      const { productId, selectedColor, selectedSize } = action.payload;
      const itemIndex = state.items.findIndex(
        (item) =>
          item.productId === productId &&
          item.selectedColor === selectedColor &&
          item.selectedSize === selectedSize
      );

      if (itemIndex !== -1) {
        if (state.items[itemIndex].quantity > 1) {
          // Decrement quantity if greater than 1
          state.items[itemIndex].quantity -= 1;
        } else {
          // Remove item if quantity is 1
          state.items.splice(itemIndex, 1);
        }
      }
    },
    clearCart: (state) => {
      state.items = [];
      // Also reset checkout price and payment intent if needed
      state.checkoutPrice = 0;
      state.paymentIntent = "";
    },
    setCheckoutPrice: (state, action) => {
      state.checkoutPrice = action.payload;
    },
    setPaymentIntent: (state, action) => {
      state.paymentIntent = action.payload;
    },
  },
});

export const {
  addToCart,
  removeFromCart,
  incrementQuantity,
  decrementQuantity,
  clearCart,
  setCheckoutPrice,
  setPaymentIntent,
} = cartSlice.actions;
export const selectCartItems = (state) => state.cart.items;
export const selectCheckoutPrice = (state) => state.cart.checkoutPrice; // Selector function to extract checkoutPrice
export const selectPaymentIntent = (state) => state.cart.paymentIntent;
export default cartSlice.reducer;
