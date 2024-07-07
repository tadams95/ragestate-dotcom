// authSlice.js

import { createSlice } from "@reduxjs/toolkit";

export const authSlice = createSlice({
  name: "auth",
  initialState: {
    isAuthenticated: false,
    userId: null,
    email: null,
    //add more user info if needed
  },
  reducers: {
    loginSuccess: (state, action) => {
      state.isAuthenticated = true;
      state.userId = action.payload.userId;
      state.email = action.payload.email;
      // You can add more user information from userCredential here
    },
    logoutSuccess: (state) => {
      state.isAuthenticated = false;
      state.userId = null;
      state.email = null;
      // Clear other user information
    },
  },
});

export const { loginSuccess, logoutSuccess } = authSlice.actions;

export default authSlice.reducer;
