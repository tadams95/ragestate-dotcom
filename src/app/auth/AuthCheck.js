"use client";

import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { loginSuccess } from "../../../lib/features/todos/authSlice"; // Adjust import path as per your project structure

export default function AuthCheck() {
  const dispatch = useDispatch();

  useEffect(() => {
    // Check if tokens are present in local storage
    const idToken = localStorage.getItem("idToken");
    const refreshToken = localStorage.getItem("refreshToken");

    console.log("idToken: ", idToken);

    if (idToken && refreshToken) {
      // Dispatch loginSuccess action with tokens
      dispatch(loginSuccess({ idToken, refreshToken }));
    }
  }, [dispatch]); // Ensure dispatch is added to dependencies array to avoid linting warnings

  return null;
}
