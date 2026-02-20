'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { loginSuccess } from '../../../lib/features/authSlice';
import { setAuthenticated, setUserName } from '../../../lib/features/userSlice';
import { createUser, signInWithGoogle } from '../../../lib/utils/auth';
import { validateEmailDomain } from '../../../lib/utils/disposableEmails';
import { checkRateLimit, peekRateLimit, RATE_LIMITS } from '../../../lib/utils/rateLimit';
import storage from '../../../src/utils/storage';

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
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [rateLimitError, setRateLimitError] = useState('');
  const [honeypot, setHoneypot] = useState(''); // Bot trap - should remain empty
  const dispatch = useDispatch();

  // Check rate limit status on mount and periodically
  useEffect(() => {
    const checkLimit = () => {
      const { key, maxAttempts, windowMs } = RATE_LIMITS.SIGNUP;
      const status = peekRateLimit(key, maxAttempts, windowMs);
      if (!status.allowed && status.blockedUntil) {
        const remainingMs = status.blockedUntil.getTime() - Date.now();
        const remainingMins = Math.ceil(remainingMs / 60000);
        setRateLimitError(
          `Too many signup attempts. Please try again in ${remainingMins} minute${remainingMins !== 1 ? 's' : ''}.`,
        );
      } else {
        setRateLimitError('');
      }
    };

    checkLimit();
    // Re-check every 30 seconds in case block expires
    const interval = setInterval(checkLimit, 30000);
    return () => clearInterval(interval);
  }, []);

  // const API_URL = "https://us-central1-ragestate-app.cloudfunctions.net/stripePayment";

  const inputStyling =
    'w-full rounded-lg border border-gray-500 bg-black/30 px-4 py-3 text-gray-100 transition duration-200 placeholder:text-gray-500 focus:border-red-500 focus:ring-1 focus:ring-red-500 sm:text-sm sm:leading-6';

  const buttonStyling =
    'flex w-full justify-center rounded-lg bg-gradient-to-r from-red-600 to-red-500 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:from-red-500 hover:to-red-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

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

    // Honeypot check - bots fill hidden fields, humans don't
    if (honeypot) {
      // Silently reject but pretend to process (don't reveal detection)
      await new Promise((r) => setTimeout(r, 1500));
      setIsLoading(false);
      return;
    }

    // Block disposable/temporary email domains
    const disposableError = validateEmailDomain(email);
    if (disposableError) {
      setFormError(disposableError);
      setIsLoading(false);
      return;
    }

    // Check rate limit before attempting signup
    const { key, maxAttempts, windowMs, blockDurationMs } = RATE_LIMITS.SIGNUP;
    const rateLimitStatus = checkRateLimit(key, maxAttempts, windowMs, blockDurationMs);
    if (!rateLimitStatus.allowed) {
      setRateLimitError(rateLimitStatus.message);
      setIsLoading(false);
      return;
    }

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
      dispatch(setUserName(`${firstName} ${lastName}`));

      // Send email verification and guide user to verify page
      try {
        if (auth.currentUser) {
          const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
          const actionCodeSettings = { url: `${siteUrl}/verify-email`, handleCodeInApp: true };
          try {
            await sendEmailVerification(auth.currentUser, actionCodeSettings);
          } catch (err) {
            if (
              err?.code === 'auth/invalid-continue-uri' ||
              err?.code === 'auth/unauthorized-continue-uri'
            ) {
              await sendEmailVerification(auth.currentUser);
            } else {
              throw err;
            }
          }
        }
      } catch (e) {
        console.warn('Failed to send verification email immediately:', e);
      }

      // Reset form and navigate
      cancelCreateHandler();
      setIsAuthenticating(false);
      setIsLoading(false);
      const next =
        typeof window !== 'undefined'
          ? new URLSearchParams(window.location.search).get('next')
          : null;
      const verifyUrl = `/verify-email?email=${encodeURIComponent(email)}${next ? `&next=${encodeURIComponent(next)}` : ''}`;
      router.push(verifyUrl);
    } catch (error) {
      const errorMessage = handleAuthError(error);
      setFormError(errorMessage);
      console.error('Error creating user:', error);
      setIsAuthenticating(false);
      setIsLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setIsGoogleLoading(true);
    setFormError('');
    try {
      const { user, userData } = await signInWithGoogle();

      // Handle authentication state
      dispatch(
        loginSuccess({
          userId: user.uid,
          email: user.email,
          idToken: user.stsTokenManager.accessToken,
          refreshToken: user.stsTokenManager.refreshToken,
        }),
      );

      // Save auth data to local storage
      storage.set('idToken', user.stsTokenManager.accessToken);
      storage.set('refreshToken', user.stsTokenManager.refreshToken);
      storage.set('email', user.email);
      storage.set('userId', user.uid);

      // Set user name
      const name = userData?.displayName || user.displayName || '';
      if (name) {
        dispatch(setUserName(name));
        storage.set('name', name);
      }

      // Set profile picture
      const photoURL = userData?.photoURL || user.photoURL || '/assets/user.png';
      storage.set('profilePicture', photoURL);

      dispatch(setAuthenticated(true));
      setIsGoogleLoading(false);

      // Google accounts are already verified - redirect directly
      const next =
        typeof window !== 'undefined'
          ? new URLSearchParams(window.location.search).get('next')
          : null;
      router.push(next || '/');
    } catch (error) {
      console.error('Error signing up with Google:', error.message);
      setFormError(error.message);
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-root)] transition-colors duration-200">
      {/* Header is rendered by layout.js */}

      <div className="relative isolate flex min-h-[calc(100vh-80px)] flex-col items-center justify-center overflow-hidden px-6 py-12 lg:px-8">
        {/* Background gradient effect */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-red-500/10 via-transparent to-transparent" />

        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          {/* Add a logo or brand element */}
          <div className="mb-6 mt-10 flex justify-center">
            <Image src="/assets/RSLogo2.png" alt="RAGESTATE" width={128} height={64} priority />
          </div>

          <h2 className="text-center text-3xl font-bold tracking-tight text-[var(--text-primary)] sm:text-4xl">
            Create Account
          </h2>
          <p className="mt-2 text-center text-sm text-[var(--text-secondary)]">
            Already have an account?{' '}
            <Link href="/login" className="font-semibold leading-6 text-red-500 hover:text-red-400">
              Sign in here
            </Link>
          </p>
        </div>

        {/* Two-column layout on larger screens */}
        <div className="mt-10 grid w-full max-w-5xl grid-cols-1 items-start gap-8 sm:mx-auto md:grid-cols-5">
          {/* Form column */}
          <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elev-1)] p-8 shadow-2xl backdrop-blur-lg md:col-span-3">
            {/* Google Sign-up Button */}
            <button
              type="button"
              onClick={handleGoogleSignUp}
              disabled={isGoogleLoading || isLoading || isAuthenticating || !!rateLimitError}
              className="mb-6 flex w-full items-center justify-center gap-3 rounded-lg border border-[var(--border-subtle)] bg-white px-4 py-3 text-sm font-semibold text-gray-900 transition-all duration-200 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isGoogleLoading ? (
                <svg className="h-5 w-5 animate-spin text-gray-600" viewBox="0 0 24 24">
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
              ) : (
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
              )}
              {isGoogleLoading ? 'Signing up...' : 'Sign up with Google'}
            </button>

            {/* Divider */}
            <div className="mb-6 flex items-center justify-center">
              <span className="text-sm text-[var(--text-secondary)]">or create with email</span>
            </div>

            <form className="space-y-6" onSubmit={handleSignUp}>
              {/* Grid layout for form fields */}
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="firstName"
                    className="block text-sm font-medium text-[var(--text-secondary)]"
                  >
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
                  <label
                    htmlFor="lastName"
                    className="block text-sm font-medium text-[var(--text-secondary)]"
                  >
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
                <label
                  htmlFor="phoneNumber"
                  className="block text-sm font-medium text-[var(--text-secondary)]"
                >
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
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-[var(--text-secondary)]"
                >
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

              {/* Honeypot field - hidden from humans, bots will fill it */}
              <div aria-hidden="true" className="absolute left-[-9999px] top-[-9999px]">
                <label htmlFor="website">Website</label>
                <input
                  type="text"
                  id="website"
                  name="website"
                  tabIndex={-1}
                  autoComplete="off"
                  value={honeypot}
                  onChange={(e) => setHoneypot(e.target.value)}
                />
              </div>

              {/* Password fields */}
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-[var(--text-secondary)]"
                  >
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
                    className="block text-sm font-medium text-[var(--text-secondary)]"
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
              {rateLimitError && (
                <div className="rounded-md border border-yellow-500 bg-yellow-500/10 p-3">
                  <p className="text-sm text-yellow-500">{rateLimitError}</p>
                </div>
              )}
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
                  disabled={isLoading || isAuthenticating || !!rateLimitError}
                  className={`${buttonStyling} sm:flex-1 ${
                    isLoading || isAuthenticating || rateLimitError
                      ? 'cursor-not-allowed opacity-70'
                      : ''
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
                  className="text-sm font-medium text-[var(--text-secondary)] hover:text-red-500"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>

          {/* Information column */}
          <div className="space-y-6 md:col-span-2">
            {/* Password requirements box */}
            <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elev-1)] p-6 shadow-xl backdrop-blur-lg">
              <h3 className="mb-4 text-lg font-medium text-[var(--text-primary)]">
                Password Requirements
              </h3>
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
                    <span
                      className={`text-sm ${req.test ? 'text-green-500' : 'text-[var(--text-secondary)]'}`}
                    >
                      {req.text}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Benefits box */}
            <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elev-1)] p-6 shadow-xl backdrop-blur-lg">
              <h3 className="mb-4 text-lg font-medium text-[var(--text-primary)]">
                Account Benefits
              </h3>
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
                    <span className="text-sm text-[var(--text-secondary)]">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <p className="mb-4 mt-12 text-center text-xs text-[var(--text-tertiary)]">
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
