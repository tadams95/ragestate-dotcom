'use client';

import Header from '../components/Header';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { loginSuccess } from '../../../lib/features/todos/authSlice';
import { createUser } from '../../../lib/utils/auth';

import { sendEmailVerification } from 'firebase/auth';
import { auth } from '../../../firebase/firebase';
import { handleAuthError } from '../../../lib/utils/authUtils'; // You may need to create this

export default function CreateAccount() {
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordMatchError, setPasswordMatchError] = useState('');
  const [formError, setFormError] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const dispatch = useDispatch();

  // const API_URL = "https://us-central1-ragestate-app.cloudfunctions.net/stripePayment";

  const inputStyling =
    'block w-full bg-black pl-2 rounded-md border-2 py-1.5 px-1 text-gray-100 shadow-sm ring-1 ring-inset ring-gray-700 placeholder:text-gray-500 focus:ring-2 focus:ring-inset focus:ring-red-500 sm:text-sm sm:leading-6';

  const buttonStyling =
    'flex w-full justify-center rounded-md bg-transparent px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 border-2 border-gray-100 transition-all duration-200';

  const cancelCreateHandler = () => {
    setFirstName('');
    setLastName('');
    setPhoneNumber('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
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
    setPasswordError(errors.length > 0 ? errors.join(', ') : '');
  };

  const handleConfirmPasswordChange = (e) => {
    const value = e.target.value;
    setConfirmPassword(value);
    validatePasswordMatch(value);
  };

  const validatePassword = (password) => {
    const errors = [];
    if (password.length < 8) errors.push('Password must be at least 8 characters');
    if (!/[A-Z]/.test(password)) errors.push('Include at least one uppercase letter');
    if (!/[a-z]/.test(password)) errors.push('Include at least one lowercase letter');
    if (!/[0-9]/.test(password)) errors.push('Include at least one number');
    return errors;
  };

  const validatePasswordMatch = (value) => {
    if (password !== value) {
      setPasswordMatchError('Passwords do not match');
    } else {
      setPasswordMatchError('');
    }
  };

  const formatPhoneNumber = (value) => {
    const phone = value.replace(/\D/g, '');
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
    setFormError('');

    try {
      // Validate password
      const passwordErrors = validatePassword(password);
      if (passwordErrors.length > 0) {
        setPasswordError(passwordErrors.join(', '));
        setIsLoading(false);
        return;
      }

      // Validate passwords match
      if (password !== confirmPassword) {
        setPasswordMatchError('Passwords do not match');
        setIsLoading(false);
        return;
      }

      setIsAuthenticating(true);

      const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
      if (!emailRegex.test(email)) {
        throw new Error('Please enter a valid email address');
      }

      // Create user using the new architecture
      const { user } = await createUser(
        email,
        password,
        firstName,
        lastName,
        phoneNumber,
        '', // expoPushToken is empty for web users
        dispatch,
      );

      // Create or reuse a Stripe Customer via our server-side proxy (non-blocking)
      try {
        const fullName = `${firstName} ${lastName}`.trim();
        await fetch('/api/payments/create-customer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uid: user.uid, email: user.email, name: fullName }),
        });
      } catch (e) {
        console.warn('Stripe customer creation skipped:', e);
      }

      // Handle authentication state
      dispatch(
        loginSuccess({
          userId: user.uid,
          email: user.email,
          idToken: user.stsTokenManager.accessToken,
          refreshToken: user.stsTokenManager.refreshToken,
        }),
      );

      // Save user data to local storage
      localStorage.setItem('idToken', user.stsTokenManager.accessToken);
      localStorage.setItem('refreshToken', user.stsTokenManager.refreshToken);
      localStorage.setItem('email', email);
      localStorage.setItem('userId', user.uid);
      localStorage.setItem('name', `${firstName} ${lastName}`);

      // Send email verification and guide user to verify page
      try {
        if (auth.currentUser) {
          await sendEmailVerification(auth.currentUser);
        }
      } catch (e) {
        console.warn('Failed to send verification email immediately:', e);
      }

      // Reset form and navigate
      cancelCreateHandler();
      setIsAuthenticating(false);
      setIsLoading(false);
      router.push(`/verify-email?email=${encodeURIComponent(email)}`);
    } catch (error) {
      const errorMessage = handleAuthError(error);
      setFormError(errorMessage);
      console.error('Error creating user:', error);
      setIsAuthenticating(false);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black">
      <Header />
      <div className="mx-auto flex min-h-full max-w-4xl flex-1 flex-col justify-center px-6 py-12 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          {/* Add a logo or brand element */}
          <div className="mb-6 mt-10 flex justify-center">
            <Image src="/assets/RSLogo2.png" alt="RAGESTATE" width={128} height={64} priority />
          </div>

          <h2 className="text-center text-2xl font-bold leading-9 tracking-tight text-gray-100">
            CREATE YOUR ACCOUNT
          </h2>
          <p className="mt-2 text-center text-sm text-gray-400">
            Already have an account?{' '}
            <Link href="/login" className="font-semibold leading-6 text-red-500 hover:text-red-400">
              Sign in here
            </Link>
          </p>
        </div>

        {/* Two-column layout on larger screens */}
        <div className="mt-10 grid w-full max-w-4xl grid-cols-1 items-start gap-8 sm:mx-auto sm:mt-16 md:grid-cols-5">
          {/* Form column */}
          <div className="rounded-lg border border-gray-800 bg-gray-900/30 p-6 shadow-xl md:col-span-3">
            <form className="space-y-6" onSubmit={handleSignUp}>
              {/* Grid layout for form fields */}
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
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
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
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
                  <label
                    htmlFor="confirmPassword"
                    className="block text-sm font-medium text-gray-300"
                  >
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
                    className={`${inputStyling} mt-1 ${
                      passwordMatchError ? 'border-red-500 ring-red-500' : ''
                    }`}
                  />
                  {passwordMatchError && (
                    <p className="mt-1 text-sm text-red-500">{passwordMatchError}</p>
                  )}
                </div>
              </div>

              {/* Validation and form error messages */}
              {passwordError && (
                <div className="rounded-md border border-red-500 bg-red-500/10 p-3">
                  <p className="text-sm text-red-500">{passwordError}</p>
                </div>
              )}
              {formError && (
                <div className="rounded-md border border-red-500 bg-red-500/10 p-3">
                  <p className="text-sm text-red-500">{formError}</p>
                </div>
              )}

              {/* Form actions */}
              <div className="flex flex-col gap-4 pt-4 sm:flex-row sm:justify-between">
                <button
                  type="submit"
                  disabled={isLoading || isAuthenticating}
                  className={`${buttonStyling} sm:flex-1 ${
                    isLoading || isAuthenticating ? 'cursor-not-allowed opacity-70' : ''
                  }`}
                >
                  {isLoading || isAuthenticating ? (
                    <span className="flex items-center justify-center">
                      <svg
                        className="-ml-1 mr-3 h-5 w-5 animate-spin text-white"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="none"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                      Creating Account...
                    </span>
                  ) : (
                    'CREATE ACCOUNT'
                  )}
                </button>
                <button
                  type="button"
                  onClick={cancelCreateHandler}
                  className="text-sm font-medium text-gray-300 hover:text-red-500"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>

          {/* Information column */}
          <div className="md:col-span-2">
            {/* Password requirements box */}
            <div className="mb-6 rounded-lg border border-gray-800 bg-gray-900/30 p-5 shadow-md">
              <h3 className="mb-4 text-lg font-medium text-gray-100">Password Requirements</h3>
              <ul className="space-y-3">
                {[
                  { test: password.length >= 8, text: 'At least 8 characters' },
                  {
                    test: /[A-Z]/.test(password),
                    text: 'One uppercase letter',
                  },
                  {
                    test: /[a-z]/.test(password),
                    text: 'One lowercase letter',
                  },
                  { test: /[0-9]/.test(password), text: 'One number' },
                ].map((req, index) => (
                  <li key={index} className="flex items-center">
                    <span
                      className={`mr-2 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded ${
                        req.test ? 'bg-green-500/20' : 'bg-gray-700/50'
                      }`}
                    >
                      {req.test ? (
                        <svg
                          className="h-4 w-4 text-green-500"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="h-4 w-4 text-gray-500"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      )}
                    </span>
                    <span className={`text-sm ${req.test ? 'text-green-500' : 'text-gray-400'}`}>
                      {req.text}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Benefits box */}
            <div className="rounded-lg border border-gray-800 bg-gray-900/30 p-5 shadow-md">
              <h3 className="mb-4 text-lg font-medium text-gray-100">Account Benefits</h3>
              <ul className="space-y-2">
                {[
                  'Faster checkout',
                  'Order history tracking',
                  'Access to exclusive merchandise',
                  'Early access to ticket sales',
                  'Special promoter opportunities',
                ].map((benefit, i) => (
                  <li key={i} className="flex items-center">
                    <svg
                      className="mr-2 h-5 w-5 text-red-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span className="text-sm text-gray-300">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <p className="mb-4 mt-12 text-center text-xs text-gray-500">
          By creating an account, you agree to the{' '}
          <a href="#" className="text-red-500 hover:text-red-400">
            Terms of Service
          </a>{' '}
          and{' '}
          <a href="#" className="text-red-500 hover:text-red-400">
            Privacy Policy
          </a>
        </p>
      </div>
      {/* Footer is rendered globally in RootLayout */}
    </div>
  );
}
