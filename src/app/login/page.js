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
import ErrorModal from "../../../components/ErrorModal";
import SocialLogins from "./socialLogin/SocialLogins";

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
          } else {
            // console.log("No data available");
          }
        })
        .catch((error) => {
          console.error("Error fetching user data:", error);
          setError(error);
        });

      console.log(userCredential);
      dispatch(setAuthenticated(true));
      setIsAuthenticating(false);
      router.back(); // Navigate back after successful login
    } catch (error) {
      console.error("Error signing in:", error.message);
      // Handle login failure
    }
  };

  return (
    <>
      <RandomDetailStyling />
      <Header />

      <div className="flex min-h-full flex-1 flex-col justify-center py-12 sm:px-6 lg:px-8 isolate">
        <div className="sm:mx-auto sm:w-1/2">
          <h2 className="mt-20 text-center text-2xl font-bold leading-9 tracking-tight text-gray-100">
            WELCOME BACK, LOGIN BELOW
          </h2>
        </div>

        <div className="mt-10 sm:mx-auto sm:w-full md:w-full sm:max-w-[480px]">
          <div className="bg-transparent border border-white py-12 shadow rounded-lg px-12">
            <form className="space-y-6" onSubmit={handleSignIn}>
              {/* Email input */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium leading-6 text-gray-100"
                >
                  Email address
                </label>
                <div className="mt-2">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={handleEmailChange}
                    className="block w-full rounded-md bg-transparent border-0 py-1.5 pl-3 text-gray-100 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                    style={{ paddingLeft: "10px" }} // Adjust the padding-left here
                  />
                </div>
              </div>

              {/* Password input */}
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium leading-6 text-gray-100"
                >
                  Password
                </label>
                <div className="mt-2">
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={handlePasswordChange}
                    className="block w-full rounded-md bg-transparent border-0 py-1.5 text-gray-100 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                    style={{ paddingLeft: "10px" }} // Adjust the padding-left here
                  />
                </div>
              </div>

              {/* Remember me and Forgot password */}
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                  />
                  <label
                    htmlFor="remember-me"
                    className="ml-3 block text-sm leading-6 text-gray-100"
                  >
                    Remember me
                  </label>
                </div>
                <div className="text-sm leading-6">
                  <Link
                    href="/forgot-password"
                    className="font-semibold text-gray-300 hover:text-red-700"
                    // onClick={(e) => {
                    //   e.preventDefault();
                    // }}
                  >
                    Forgot password?
                  </Link>
                </div>
              </div>

              {/* Sign in button */}
              <div>
                <button
                  type="submit"
                  className="flex w-full justify-center rounded-md border border-white bg-transparent px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                  disabled={isAuthenticating}
                >
                  {isAuthenticating ? "Signing in..." : "Sign in"}
                </button>
              </div>
            </form>

            {/* Social Logins */}
            {/* <div>
              <div className="relative mt-10">
                <div
                  className="absolute inset-0 flex items-center"
                  aria-hidden="true"
                >
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-sm font-medium leading-6">
                  <span className="bg-white px-6 text-gray-900">
                    Or continue with
                  </span>
                </div>
              </div>
              <SocialLogins />
            </div> */}
          </div>

          {/* Create Account link */}
          <p className="mt-10 text-center text-sm text-gray-100">
            Not a member?{" "}
            <Link
              href="/create-account"
              className="font-semibold leading-6 text-sky-700 hover:text-red-700"
            >
              Create Account
            </Link>
          </p>
        </div>
      </div>

      <Footer />
    </>
  );
}
