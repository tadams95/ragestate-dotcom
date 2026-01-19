import { configureStore } from "@reduxjs/toolkit";
import cartReducer from "./features/cartSlice";
import userReducer from "./features/userSlice";
import authReducer from "./features/authSlice";
import chatReducer from "./features/chatSlice";

export const makeStore = () => {
  return configureStore({
    reducer: {
      cart: cartReducer,
      user: userReducer,
      auth: authReducer,
      chat: chatReducer,
    },
  });
};
