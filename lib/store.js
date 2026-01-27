import { configureStore } from "@reduxjs/toolkit";
import cartReducer from "./features/cartSlice";
import userReducer from "./features/userSlice";
import authReducer from "./features/authSlice";
import chatReducer from "./features/chatSlice";
import relationshipReducer from "./features/relationshipSlice";

export const makeStore = () => {
  return configureStore({
    reducer: {
      cart: cartReducer,
      user: userReducer,
      auth: authReducer,
      chat: chatReducer,
      relationship: relationshipReducer,
    },
  });
};
