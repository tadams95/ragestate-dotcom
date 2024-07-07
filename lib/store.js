import { configureStore } from "@reduxjs/toolkit";
import cartReducer from "./features/todos/cartSlice";
import userReducer from "./features/todos/userSlice";
import authReducer from "./features/todos/authSlice"


export const makeStore = () => {
  return configureStore({
    reducer: {
      cart: cartReducer,
      user: userReducer,
      auth: authReducer,
    },
  });
};
