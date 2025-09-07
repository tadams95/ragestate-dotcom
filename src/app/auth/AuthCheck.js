"use client";

import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  loginSuccess,
  logoutSuccess,
} from "../../../lib/features/todos/authSlice"; // Adjust import path as per your project structure
import {
  setAuthenticated,
  selectAuthenticated,
} from "../../../lib/features/todos/userSlice";
import refreshAuthTokens from "../../../firebase/util/refreshAuthTokens";
import storage from "@/utils/storage";

export default function AuthCheck() {
  const dispatch = useDispatch();
  const isAuthenticated = useSelector(selectAuthenticated);

  useEffect(() => {
    const checkAuthentication = async () => {
      // Check if tokens are present in local storage
      const { idToken, refreshToken, email, userId } = storage.readKeys([
        "idToken",
        "refreshToken",
        "email",
        "userId",
      ]);

      if (idToken && refreshToken && email && userId) {
        // Dispatch loginSuccess action with tokens from localStorage
        dispatch(loginSuccess({ idToken, refreshToken, email, userId }));
        dispatch(setAuthenticated(true));

        // Check if ID token needs refreshing (e.g., nearing expiration)
        const tokenExpirationThreshold = 5 * 60 * 1000; // 5 minutes in milliseconds
        const tokenExpirationTime = Number(storage.get("tokenExpirationTime"));
        const currentTime = Date.now();

        if (
          tokenExpirationTime &&
          currentTime >= tokenExpirationTime - tokenExpirationThreshold
        ) {
          try {
            // Refresh the ID token using refreshAuthTokens function
            const newTokens = await refreshAuthTokens(refreshToken);

            if (newTokens && newTokens.idToken) {
              // Update the stored tokens and authentication state
              storage.set("idToken", newTokens.idToken);
              storage.set("refreshToken", newTokens.refreshToken);
              dispatch(
                loginSuccess({
                  idToken: newTokens.idToken,
                  refreshToken: newTokens.refreshToken,
                  email,
                  userId,
                })
              );
              dispatch(setAuthenticated(true));
            } else {
              // Handle token refresh failure
              console.error("Token refresh failed");
              dispatch(logoutSuccess());
              dispatch(setAuthenticated(false));
            }
          } catch (error) {
            console.error("Error refreshing token:", error.message);
            dispatch(logoutSuccess());
            dispatch(setAuthenticated(false));
          }
        }
      } else {
        // No valid tokens found in localStorage
        // Log user out or handle as per your application's logic
        dispatch(logoutSuccess());
        dispatch(setAuthenticated(false));
      }
    };

    checkAuthentication();
  }, [dispatch, isAuthenticated]);

  return null;
}
