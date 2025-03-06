"use client";

import React, { useState, useCallback } from "react";
import { auth } from "../../../firebase/firebase";
import { loginSuccess } from "../../../lib/features/todos/authSlice";
import { setAuthenticated } from "../../../lib/features/todos/userSlice";
import { signInWithEmailAndPassword } from "firebase/auth";

import {
  setLocalId,
  setUserName,
  setUserEmail,
  selectUserName,
  setStripeCustomerId,
} from "../../../lib/features/todos/userSlice";

import { getDatabase, ref as databaseRef, get } from "firebase/database";

import { useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";

import Link from "next/link";
import Header from "../components/Header";
import RandomDetailStyling from "../components/styling/RandomDetailStyling";
import Footer from "../components/Footer";

const API_URL =
  "https://us-central1-ragestate-app.cloudfunctions.net/stripePayment";

export default function Login() {
  const router = useRouter();
  const dispatch = useDispatch();
  const userName = useSelector(selectUserName);
  const [error, setError] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Memoize the onChange handlers using useCallback
  const handleEmailChange = useCallback((e) => {
    setEmail(e.target.value);
  }, []);

  const handlePasswordChange = useCallback((e) => {
    setPassword(e.target.value);
  }, []);

  const handleSignIn = async (event) => {
    event.preventDefault();
    setIsAuthenticating(true);

    const db = getDatabase();

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      // // Extract necessary data from userCredential
      const idToken = userCredential._tokenResponse.idToken; // Access idToken from _tokenResponse
      const refreshToken = userCredential._tokenResponse.refreshToken; // Access refreshToken directly
      const userEmail = userCredential.user.email;
      const userId = userCredential.user.uid;

      // Dispatch loginSuccess action with user information and tokens
      dispatch(
        loginSuccess({
          userId: userCredential.user.uid,
          email: userCredential.user.email,
          idToken: userCredential._tokenResponse.idToken,
          refreshToken: userCredential._tokenResponse.refreshToken,
        })
      );

      // Save tokens to local storage
      localStorage.setItem("idToken", idToken);
      localStorage.setItem("refreshToken", refreshToken);
      localStorage.setItem("email", userEmail);
      localStorage.setItem("userId", userId);

      const userRef = databaseRef(db, `users/${userId}`);
      get(userRef)
        .then((snapshot) => {
          if (snapshot.exists()) {
            // Extract the user's name and profile picture URL from the snapshot data
            const userData = snapshot.val();
            const name = userData.firstName + " " + userData.lastName;

            // Dispatch the setUserName action with the fetched user name
            dispatch(setUserName(name));
            localStorage.setItem("name", name);
            if (userData.profilePicture) {
              localStorage.setItem("profilePicture", userData.profilePicture);
            } else {
              localStorage.setItem("profilePicture", "/assets/trollface.png");
            }
          } else {
            // console.log("No data available");
          }
        })
        .catch((error) => {
          console.error("Error fetching user data:", error);
          setError(error);
        });

      const stripeCustomerResponse = await fetch(`${API_URL}/create-customer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email,
          name: userName,
          firebaseId: userId,
        }),
      });

      if (!stripeCustomerResponse.ok) {
        // Log response status and error message if available
        console.error(
          "Failed to create Stripe customer. Status:",
          stripeCustomerResponse.status
        );
        const errorMessage = await stripeCustomerResponse.text();
        console.error("Error Message:", errorMessage);
        throw new Error("Failed to create Stripe customer");
      }

      const stripeCustomerData = await stripeCustomerResponse.json();

      localStorage.setItem("stripeCustomerData", stripeCustomerData);

      // console.log(stripeCustomerData);
      setEmail("");
      setPassword("");
      dispatch(setAuthenticated(true));
      setIsAuthenticating(false);
      router.back(); // Navigate back after successful login
    } catch (error) {
      console.error("Error signing in:", error.message);
      // Handle login failure
    }
  };

  return (
    <div className="min-h-screen bg-black">
      <Header />
      
      <div className="flex min-h-[calc(100vh-80px)] flex-col justify-center items-center px-6 py-12 lg:px-8 relative isolate overflow-hidden">
        {/* Background gradient effect */}
        <div className="absolute inset-0 bg-gradient-to-b from-red-500/10 via-transparent to-transparent -z-10" />
        
        {/* Login container */}
        <div className="w-full max-w-md space-y-8 relative">
          {/* Header section */}
          <div className="text-center space-y-6">
            <h2 className="text-3xl font-bold tracking-tight text-gray-100 sm:text-4xl">
              Welcome Back
            </h2>
            <p className="text-gray-400 text-sm">
              Enter your credentials to access your account
            </p>
          </div>

          {/* Form container with glass effect */}
          <div className="mt-10 backdrop-blur-lg bg-white/5 p-8 rounded-2xl border border-white/10 shadow-2xl">
            <form className="space-y-6" onSubmit={handleSignIn}>
              {/* Email field */}
              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-medium text-gray-300">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={handleEmailChange}
                  className="w-full rounded-lg bg-black/30 border border-gray-500 px-4 py-3 text-gray-100 
                           placeholder:text-gray-500 focus:border-red-500 focus:ring-1 focus:ring-red-500
                           transition duration-200"
                  placeholder="Enter your email"
                />
              </div>

              {/* Password field */}
              <div className="space-y-2">
                <label htmlFor="password" className="block text-sm font-medium text-gray-300">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={handlePasswordChange}
                  className="w-full rounded-lg bg-black/30 border border-gray-500 px-4 py-3 text-gray-100 
                           placeholder:text-gray-500 focus:border-red-500 focus:ring-1 focus:ring-red-500
                           transition duration-200"
                  placeholder="Enter your password"
                />
              </div>

              {/* Remember me and Forgot password */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-500 bg-black/30 text-red-500 focus:ring-red-500"
                  />
                  <label htmlFor="remember-me" className="text-sm text-gray-300">
                    Remember me
                  </label>
                </div>
                <Link
                  href="/forgot-password"
                  className="text-sm font-semibold text-red-500 hover:text-red-400 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>

              {/* Sign in button */}
              <button
                type="submit"
                disabled={isAuthenticating}
                className="w-full rounded-lg bg-gradient-to-r from-red-600 to-red-500 px-4 py-3 text-sm 
                         font-semibold text-white shadow-sm hover:from-red-500 hover:to-red-400 
                         focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 
                         disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                {isAuthenticating ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Signing in...
                  </span>
                ) : (
                  "Sign in"
                )}
              </button>
            </form>
          </div>

          {/* Create account link */}
          <p className="mt-10 text-center text-sm text-gray-400">
            Not a member?{" "}
            <Link
              href="/create-account"
              className="font-semibold text-red-500 hover:text-red-400 transition-colors"
            >
              Create an account
            </Link>
          </p>
        </div>
      </div>

      <Footer />
    </div>
  );
}
