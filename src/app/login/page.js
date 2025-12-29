'use client';

import storage from '@/utils/storage';
import { doc, getDoc, getFirestore } from 'firebase/firestore';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { useDispatch } from 'react-redux';
import { loginSuccess } from '../../../lib/features/todos/authSlice';
import { setAuthenticated, setUserName } from '../../../lib/features/todos/userSlice';
import { loginUser, signInWithGoogle } from '../../../lib/utils/auth';

export default function Login() {
  const router = useRouter();
  const dispatch = useDispatch();
  const [_error, setError] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

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

    try {
      const { user, userData } = await loginUser(email, password, dispatch);

      // Handle authentication state
      dispatch(
        loginSuccess({
          userId: user.uid,
          email: user.email,
          idToken: user.stsTokenManager.accessToken,
          refreshToken: user.stsTokenManager.refreshToken,
        }),
      );

      // Save auth data to local storage (using storage helper to trigger same-tab event)
      storage.set('idToken', user.stsTokenManager.accessToken);
      storage.set('refreshToken', user.stsTokenManager.refreshToken);
      storage.set('email', user.email);
      storage.set('userId', user.uid);

      // Set user name if available
      if (userData) {
        const name = `${userData.firstName} ${userData.lastName}`;
        dispatch(setUserName(name));
        storage.set('name', name);
      }

      // Prefer the public profiles.photoURL for header/avatar; fallback to customers.profilePicture
      try {
        const db = getFirestore();
        const profileSnap = await getDoc(doc(db, 'profiles', user.uid));
        const publicPhoto = profileSnap.exists() ? profileSnap.data()?.photoURL || '' : '';
        const fallbackPhoto = userData?.profilePicture || '/assets/user.png';
        storage.set('profilePicture', publicPhoto || fallbackPhoto);
      } catch (_) {
        // If Firestore read fails, still set a fallback so Header can render something
        storage.set('profilePicture', userData?.profilePicture || '/assets/user.png');
      }

      // Redirect to intended destination if provided
      setEmail('');
      setPassword('');
      dispatch(setAuthenticated(true));
      setIsAuthenticating(false);
      const next =
        typeof window !== 'undefined'
          ? new URLSearchParams(window.location.search).get('next')
          : null;
      if (next) {
        router.push(next);
      } else {
        router.push('/');
      }
    } catch (error) {
      console.error('Error signing in:', error.message);
      setError(error.message);
      setIsAuthenticating(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setError(null);
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

      // Redirect
      const next =
        typeof window !== 'undefined'
          ? new URLSearchParams(window.location.search).get('next')
          : null;
      router.push(next || '/');
    } catch (error) {
      console.error('Error signing in with Google:', error.message);
      setError(error.message);
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black">
      {/* Header is rendered by layout.js */}

      <div className="relative isolate flex min-h-[calc(100vh-80px)] flex-col items-center justify-center overflow-hidden px-6 py-12 lg:px-8">
        {/* Background gradient effect */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-red-500/10 via-transparent to-transparent" />

        {/* Login container */}
        <div className="relative w-full max-w-md space-y-8">
          {/* Header section */}
          <div className="space-y-6 text-center">
            <div className="flex justify-center">
              <Image src="/assets/RSLogo2.png" alt="RAGESTATE" width={128} height={64} priority />
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-gray-100 sm:text-4xl">
              Welcome Back
            </h2>
            <p className="text-sm text-gray-400">Enter your credentials to access your account</p>
          </div>

          {/* Form container with glass effect */}
          <div className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-lg">
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
                  className="w-full rounded-lg border border-gray-500 bg-black/30 px-4 py-3 text-gray-100 transition duration-200 placeholder:text-gray-500 focus:border-red-500 focus:ring-1 focus:ring-red-500"
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
                  className="w-full rounded-lg border border-gray-500 bg-black/30 px-4 py-3 text-gray-100 transition duration-200 placeholder:text-gray-500 focus:border-red-500 focus:ring-1 focus:ring-red-500"
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
                  className="text-sm font-semibold text-red-500 transition-colors hover:text-red-400"
                >
                  Forgot password?
                </Link>
              </div>

              {/* Sign in button */}
              <button
                type="submit"
                disabled={isAuthenticating}
                className="w-full rounded-lg bg-gradient-to-r from-red-600 to-red-500 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:from-red-500 hover:to-red-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isAuthenticating ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24">
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
                    Signing in...
                  </span>
                ) : (
                  'Sign in'
                )}
              </button>

              {/* Divider */}
              <div className="my-6 flex items-center justify-center">
                <span className="text-sm text-gray-400">or continue with</span>
              </div>

              {/* Google Sign-in Button */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isGoogleLoading || isAuthenticating}
                className="flex w-full items-center justify-center gap-3 rounded-lg border border-gray-500 bg-white px-4 py-3 text-sm font-semibold text-gray-900 transition-all duration-200 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
                {isGoogleLoading ? 'Signing in...' : 'Sign in with Google'}
              </button>
            </form>
          </div>

          {/* Create account link */}
          <p className="mt-10 text-center text-sm text-gray-400">
            Not a member?{' '}
            <Link
              href="/create-account"
              className="font-semibold text-red-500 transition-colors hover:text-red-400"
            >
              Create an account
            </Link>
          </p>
        </div>
      </div>

      {/* Footer is rendered globally in RootLayout */}
    </div>
  );
}
