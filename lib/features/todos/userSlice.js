import { createSlice } from "@reduxjs/toolkit";

export const userSlice = createSlice({
  name: "user",
  initialState: {
    localId: null,
    userEmail: null,
    userName: null,
    stripeCustomerId: null,
    authenticated: null,
  },
  reducers: {
    setLocalId: (state, action) => {
      state.localId = action.payload;
    },
    setUserEmail: (state, action) => {
      state.userEmail = action.payload;
    },
    setUserName: (state, action) => {
      state.userName = action.payload;
    },
    setStripeCustomerId: (state, action) => {
      state.stripeCustomerId = action.payload;
    },
    setAuthenticated: (state, action) => {
      state.authenticated = action.payload;
    },
  },
});

export const api = "AIzaSyDcHCRWrYonzJa_";
export const key = "Pyfwzbfp-r3bxz2bUX8";

export const {
  setLocalId,
  setUserEmail,
  setUserName,
  setStripeCustomerId,
  setAuthenticated,
} = userSlice.actions;

export const selectLocalId = (state) => state.user.localId;
export const selectUserEmail = (state) => state.user.userEmail;
export const selectUserName = (state) => state.user.userName;
export const selectStripeCustomerId = (state) => state.user.stripeCustomerId;
export const selectAuthenticated = (state) => state.user.authenticated;

export default userSlice.reducer;
