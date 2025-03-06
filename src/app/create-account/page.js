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
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function CreateAccount() {
  const router = useRouter();
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
  const [isLoading, setIsLoading] = useState(false);
  const dispatch = useDispatch();

  const API_URL =
    "https://us-central1-ragestate-app.cloudfunctions.net/stripePayment";

  const inputStyling =
    "block w-full bg-black pl-2 rounded-md border-2 py-1.5 px-1 text-gray-100 shadow-sm ring-1 ring-inset ring-gray-700 placeholder:text-gray-500 focus:ring-2 focus:ring-inset focus:ring-red-500 sm:text-sm sm:leading-6";

  const buttonStyling =
    "flex w-full justify-center rounded-md bg-transparent px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 border-2 border-gray-100 transition-all duration-200";

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
    const errors = validatePassword(newPassword);
    setPasswordError(errors.length > 0 ? errors.join(", ") : "");
  };

  const handleConfirmPasswordChange = (e) => {
    const value = e.target.value;
    setConfirmPassword(value);
    validatePasswordMatch(value);
  };

  const validatePassword = (password) => {
    const errors = [];
    if (password.length < 8)
      errors.push("Password must be at least 8 characters");
    if (!/[A-Z]/.test(password))
      errors.push("Include at least one uppercase letter");
    if (!/[a-z]/.test(password))
      errors.push("Include at least one lowercase letter");
    if (!/[0-9]/.test(password)) errors.push("Include at least one number");
    return errors;
  };

  const validatePasswordMatch = (value) => {
    if (password !== value) {
      setPasswordMatchError("Passwords do not match");
    } else {
      setPasswordMatchError("");
    }
  };

  const formatPhoneNumber = (value) => {
    const phone = value.replace(/\D/g, "");
    const match = phone.match(/^(\d{0,3})(\d{0,3})(\d{0,4})$/);
    if (match) {
      return !match[2]
        ? match[1]
        : !match[3]
        ? `(${match[1]}) ${match[2]}`
        : `(${match[1]}) ${match[2]}-${match[3]}`;
    }
    return phone;
  };

  const handlePhoneChange = (e) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhoneNumber(formatted);
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setFormError("");

    try {
      // Validate password
      const passwordErrors = validatePassword(password);
      if (passwordErrors.length > 0) {
        setPasswordError(passwordErrors.join(", "));
        setIsLoading(false);
        return;
      }

      // Validate passwords match
      if (password !== confirmPassword) {
        setPasswordMatchError("Passwords do not match");
        setIsLoading(false);
        return;
      }

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
      setIsLoading(false);
      router.push("/account");
    } catch (error) {
      setFormError(
        error.code === "auth/email-already-in-use"
          ? "Email already exists. Please log in or use a different email."
          : `Error creating account: ${error.message}`
      );
      console.error("Error creating user:", error);

      setIsAuthenticating(false);
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-black min-h-screen">
      <Header />
      <div className="flex min-h-full flex-1 flex-col justify-center px-6 py-12 lg:px-8 max-w-4xl mx-auto">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          {/* Add a logo or brand element */}
          <div className="flex justify-center mt-10 mb-6">
            <img 
              src="/assets/RSLogo2.png" 
              alt="RAGESTATE" 
              className="h-16 w-auto" 
            />
          </div>
          
          <h2 className="text-center text-2xl font-bold leading-9 tracking-tight text-gray-100">
            CREATE YOUR ACCOUNT
          </h2>
          <p className="mt-2 text-center text-sm text-gray-400">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-semibold leading-6 text-red-500 hover:text-red-400"
            >
              Sign in here
            </Link>
          </p>
        </div>

        {/* Two-column layout on larger screens */}
        <div className="mt-10 sm:mt-16 sm:mx-auto w-full max-w-4xl grid grid-cols-1 md:grid-cols-5 gap-8 items-start">
          {/* Form column */}
          <div className="md:col-span-3 bg-gray-900/30 p-6 rounded-lg border border-gray-800 shadow-xl">
            <form className="space-y-6" onSubmit={handleSignUp}>
              {/* Grid layout for form fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-300">
                    First Name
                  </label>
                  <input
                    required
                    id="firstName"
                    name="firstName"
                    type="text"
                    autoComplete="given-name"
                    placeholder="First Name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className={`${inputStyling} mt-1`}
                  />
                </div>
                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-300">
                    Last Name
                  </label>
                  <input
                    required
                    id="lastName"
                    name="lastName"
                    type="text"
                    autoComplete="family-name"
                    placeholder="Last Name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className={`${inputStyling} mt-1`}
                  />
                </div>
              </div>
              
              {/* Single column fields */}
              <div>
                <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-300">
                  Phone Number
                </label>
                <input
                  required
                  id="phoneNumber"
                  name="phoneNumber"
                  type="tel"
                  autoComplete="tel"
                  placeholder="Phone Number"
                  value={phoneNumber}
                  onChange={handlePhoneChange}
                  className={`${inputStyling} mt-1`}
                />
              </div>
              
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300">
                  Email Address
                </label>
                <input
                  required
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="Email"
                  value={email}
                  onChange={handleEmailChange}
                  className={`${inputStyling} mt-1`}
                />
              </div>
              
              {/* Password fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-300">
                    Password
                  </label>
                  <input
                    required
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Password"
                    value={password}
                    onChange={handlePasswordChange}
                    className={`${inputStyling} mt-1`}
                  />
                </div>
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300">
                    Confirm Password
                  </label>
                  <input
                    required
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Confirm Password"
                    value={confirmPassword}
                    onChange={handleConfirmPasswordChange}
                    className={`${inputStyling} mt-1 ${passwordMatchError ? "border-red-500 ring-red-500" : ""}`}
                  />
                  {passwordMatchError && (
                    <p className="text-red-500 text-sm mt-1">{passwordMatchError}</p>
                  )}
                </div>
              </div>

              {/* Form error message */}
              {formError && (
                <div className="rounded-md bg-red-500/10 border border-red-500 p-3">
                  <p className="text-sm text-red-500">{formError}</p>
                </div>
              )}
              
              {/* Form actions */}
              <div className="flex flex-col sm:flex-row sm:justify-between gap-4 pt-4">
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`${buttonStyling} sm:flex-1 ${isLoading ? "opacity-70 cursor-not-allowed" : ""}`}
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Creating Account...
                    </span>
                  ) : (
                    "CREATE ACCOUNT"
                  )}
                </button>
                <button
                  type="button"
                  onClick={cancelCreateHandler}
                  className="text-gray-300 hover:text-red-500 text-sm font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
          
          {/* Information column */}
          <div className="md:col-span-2">
            {/* Password requirements box */}
            <div className="bg-gray-900/30 p-5 rounded-lg border border-gray-800 shadow-md mb-6">
              <h3 className="text-lg font-medium text-gray-100 mb-4">Password Requirements</h3>
              <ul className="space-y-3">
                {[
                  { test: password.length >= 8, text: "At least 8 characters" },
                  { test: /[A-Z]/.test(password), text: "One uppercase letter" },
                  { test: /[a-z]/.test(password), text: "One lowercase letter" },
                  { test: /[0-9]/.test(password), text: "One number" }
                ].map((req, index) => (
                  <li key={index} className="flex items-center">
                    <span className={`flex-shrink-0 h-5 w-5 mr-2 rounded flex items-center justify-center ${
                      req.test ? "bg-green-500/20" : "bg-gray-700/50"
                    }`}>
                      {req.test ? (
                        <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                    </span>
                    <span className={`text-sm ${req.test ? "text-green-500" : "text-gray-400"}`}>{req.text}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            {/* Benefits box */}
            <div className="bg-gray-900/30 p-5 rounded-lg border border-gray-800 shadow-md">
              <h3 className="text-lg font-medium text-gray-100 mb-4">Account Benefits</h3>
              <ul className="space-y-2">
                {[
                  "Faster checkout",
                  "Order history tracking",
                  "Access to exclusive merchandise",
                  "Early access to ticket sales",
                  "Special promoter opportunities"
                ].map((benefit, i) => (
                  <li key={i} className="flex items-center">
                    <svg className="h-5 w-5 text-red-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm text-gray-300">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
        
        <p className="text-center text-xs text-gray-500 mb-4 mt-12">
          By creating an account, you agree to the <a href="#" className="text-red-500 hover:text-red-400">Terms of Service</a> and <a href="#" className="text-red-500 hover:text-red-400">Privacy Policy</a>
        </p>
      </div>
      <Footer />
    </div>
  );
}
