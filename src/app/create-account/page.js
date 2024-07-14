"use client";

import Footer from "../components/Footer";
import Header from "../components/Header";
import RandomDetailStyling from "../components/styling/RandomDetailStyling";

import { app } from "../../../firebase/firebase";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { useState } from "react";
import { useDispatch } from "react-redux";
import { setStripeCustomerId } from "../../../lib/features/todos/userSlice";
import { loginSuccess } from "../../../lib/features/todos/authSlice";

export default function CreateAccount() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordMatchError, setPasswordMatchError] = useState("");
  const [formError, setFormError] = useState("");
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const dispatch = useDispatch();

  const API_URL =
    "https://us-central1-ragestate-app.cloudfunctions.net/stripePayment";

  const inputStyling =
    "block w-full bg-transparent pl-2 rounded-md border-0 py-1.5 px-1 text-gray-100 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6";

  const buttonStyling =
    "flex-1 justify-center rounded-md bg-transparent border-gray-100 border-2 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700";

  const cancelCreateHandler = () => {
    setFirstName("");
    setLastName("");
    setPhoneNumber("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
  };

  const handleEmailChange = (e) => {
    const newEmail = e.target.value;
    setEmail(newEmail);
    // Add email validation logic if needed
  };

  const handlePasswordChange = (e) => {
    const newPassword = e.target.value;
    setPassword(newPassword);
    setPasswordError("");
    // Validate password length or other criteria if needed
  };

  const handleConfirmPasswordChange = (e) => {
    const value = e.target.value;
    setConfirmPassword(value);
    validatePasswordMatch(value);
  };

  // function validatePassword(password) {
  //   const passwordRegex =
  //     /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

  //   if (!passwordRegex.test(password)) {
  //     throw new Error(
  //       "Password must be at least 8 characters long and include at least one uppercase letter, one lowercase letter, one digit, and one special character."
  //     );
  //   }
  // }

  const validatePasswordMatch = (value) => {
    if (password !== value) {
      setPasswordMatchError("Passwords do not match");
    } else {
      setPasswordMatchError("");
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();

    try {
      setIsAuthenticating(true);

      const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
      if (!emailRegex.test(email)) {
        throw new Error("Please enter a valid email address");
      }

      // Firebase authentication instance
      const auth = getAuth();

      // Create user with email and password
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const createdUser = userCredential.user;

      console.log("Created User: ", createdUser);

      // Update user data in Firebase Realtime Database
      const userId = createdUser.uid;
      const firebaseDatabaseUrl = `https://ragestate-app-default-rtdb.firebaseio.com/users/${userId}.json`;
      const firebaseResponse = await fetch(firebaseDatabaseUrl, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email,
          firstName: firstName,
          lastName: lastName,
          phoneNumber: phoneNumber,
          expoPushToken: "",
          qrCode: userId,
        }),
      });

      if (!firebaseResponse.ok) {
        console.error(
          "Failed to update user data in Firebase. Status:",
          firebaseResponse.status
        );
        const errorMessage = await firebaseResponse.text();
        console.error("Error Message:", errorMessage);
        throw new Error("Failed to update user data in Firebase");
      }

      const stripeCustomerResponse = await fetch(`${API_URL}/create-customer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email,
          name: `${firstName} ${lastName}`,
          firebaseId: createdUser.uid, // Assuming the createdUser object contains the localId
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

      // dispatch(setStripeCustomerId(stripeCustomerData));
      localStorage.setItem("stripeCustomerData", stripeCustomerData);

      // // Extract necessary data from userCredential
      const idToken = userCredential._tokenResponse.idToken; // Access idToken from _tokenResponse
      const refreshToken = userCredential._tokenResponse.refreshToken; // Access refreshToken directly
      const userEmail = userCredential.user.email;

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
      localStorage.setItem("name", `${firstName} ${lastName}`);

      // Reset input fields after successful creation
      setFirstName("");
      setLastName("");
      setEmail("");
      setPhoneNumber("");
      setPassword("");
      setConfirmPassword("");
      setIsAuthenticating(false);
      router.push("/account");
    } catch (error) {
      if (error.code === "auth/email-already-in-use") {
        setFormError(
          "Email already exists. Please log in or use a different email."
        );
      } else {
        setFormError(`Error creating user: ${error.message}`);
      }
      console.error("Error creating user:", error);

      setIsAuthenticating(false);
    }
  };

  return (
    <>
      <RandomDetailStyling />
      <Header />
      <div className="flex min-h-full flex-1 flex-col justify-center px-6 py-12 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-sm">
          <h2 className="mt-20 text-center text-xl font-bold leading-9 tracking-tight text-gray-100">
            CREATE YOUR ACCOUNT BELOW
          </h2>
        </div>

        <div className="mt-4 sm:mx-auto sm:w-full sm:max-w-sm border py-4 px-4 rounded-md ">
          <form className="space-y-6" onSubmit={handleSignUp} method="POST">
            <div>
              <label
                htmlFor="firstName"
                className="block text-sm font-medium leading-6 text-gray-100"
              >
                First Name
              </label>
              <div className="mt-2">
                <input
                  required
                  id="firstName"
                  name="firstName"
                  type="text"
                  autoComplete="given-name"
                  placeholder="First Name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className={inputStyling}
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="lastName"
                className="block text-sm font-medium leading-6 text-gray-100"
              >
                Last Name
              </label>
              <div className="mt-2">
                <input
                  required
                  id="lastName"
                  name="lastName"
                  type="text"
                  autoComplete="family-name"
                  placeholder="Last Name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className={inputStyling}
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="phoneNumber"
                className="block text-sm font-medium leading-6 text-gray-100"
              >
                Phone Number
              </label>
              <div className="mt-2">
                <input
                  required
                  id="phoneNumber"
                  name="phoneNumber"
                  type="tel"
                  autoComplete="tel"
                  placeholder="Phone Number"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className={inputStyling}
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium leading-6 text-gray-100"
              >
                Email address
              </label>
              <div className="mt-2">
                <input
                  required
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="Email"
                  value={email}
                  onChange={handleEmailChange}
                  className={inputStyling}
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium leading-6 text-gray-100"
              >
                Password
              </label>
              <div className="mt-2">
                <input
                  required
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Password"
                  value={password}
                  onChange={handlePasswordChange}
                  className={inputStyling}
                />
              </div>
            </div>

            <div>
              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium leading-6 text-gray-100"
                >
                  Confirm Password
                </label>
                <div className="mt-2">
                  <input
                    required
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Confirm Password"
                    value={confirmPassword}
                    onChange={handleConfirmPasswordChange}
                    className={`${inputStyling} ${
                      passwordMatchError ? "border-red-500" : ""
                    }`}
                  />
                </div>
                {passwordMatchError && (
                  <p className="text-red-500 text-sm mt-1">
                    {passwordMatchError}
                  </p>
                )}
              </div>
              <div className="mt-8 flex gap-4">
                <button type="submit" className={buttonStyling}>
                  CREATE
                </button>

                <button
                  type="button"
                  onClick={cancelCreateHandler}
                  className={buttonStyling}
                >
                  CANCEL
                </button>
              </div>
            </div>
            {formError && <p className="text-red-500">{formError}</p>}
            {passwordError && (
              <p className="text-red-500 text-sm mt-1">{passwordError}</p>
            )}
          </form>
        </div>
        <Footer />
      </div>
    </>
  );
}
