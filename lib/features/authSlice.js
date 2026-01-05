// authSlice.js

import { createSlice } from "@reduxjs/toolkit";

// Function to load authentication state from localStorage
const loadAuthState = () => {
  try {
    const serializedAuthState = localStorage.getItem("authState");
    if (serializedAuthState === null) {
      return undefined; // Return undefined if no state found
    }
    return JSON.parse(serializedAuthState);
  } catch (err) {
    return undefined; // Return undefined on any error
  }
};

// Function to save authentication state to localStorage
const saveAuthState = (state) => {
  try {
    const serializedAuthState = JSON.stringify(state);
    localStorage.setItem("authState", serializedAuthState);
  } catch (err) {
    // Handle potential errors here, such as quota exceeded
  }
};

export const authSlice = createSlice({
  name: "auth",
  initialState: loadAuthState() || {
    isAuthenticated: false,
    userId: null,
    email: null,
    idToken: null, // Add idToken to state
    refreshToken: null, // Add refreshToken to state
    // Add more user info if needed
  },
  reducers: {
    loginSuccess: (state, action) => {
      state.isAuthenticated = true;
      state.userId = action.payload.userId;
      state.email = action.payload.email;
      state.idToken = action.payload.idToken; // Save idToken to state
      state.refreshToken = action.payload.refreshToken; // Save refreshToken to state
      // You can add more user information from userCredential here
      saveAuthState(state); // Save state to localStorage on login success
    },
    logoutSuccess: (state) => {
      state.isAuthenticated = false;
      state.userId = null;
      state.email = null;
      state.idToken = null; // Clear idToken on logout
      state.refreshToken = null; // Clear refreshToken on logout
      // Clear other user information
      localStorage.removeItem("authState"); // Remove state from localStorage on logout
    },
  },
});

export const { loginSuccess, logoutSuccess } = authSlice.actions;

export default authSlice.reducer;
