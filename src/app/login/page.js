'use client';

import { doc, getDoc, getFirestore } from 'firebase/firestore';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useState } from 'react';
import { useDispatch } from 'react-redux';
import { loginSuccess } from '../../../lib/features/todos/authSlice';
import { setAuthenticated, setUserName } from '../../../lib/features/todos/userSlice';
import { loginUser } from '../../../lib/utils/auth';
import Header from '../components/Header';

export default function Login() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useDispatch();
  const [_error, setError] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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

      // Save auth data to local storage
      localStorage.setItem('idToken', user.stsTokenManager.accessToken);
      localStorage.setItem('refreshToken', user.stsTokenManager.refreshToken);
      localStorage.setItem('email', user.email);
      localStorage.setItem('userId', user.uid);

      // Set user name if available
      if (userData) {
        const name = `${userData.firstName} ${userData.lastName}`;
        dispatch(setUserName(name));
        localStorage.setItem('name', name);
      }

      // Prefer the public profiles.photoURL for header/avatar; fallback to customers.profilePicture
      try {
        const db = getFirestore();
        const profileSnap = await getDoc(doc(db, 'profiles', user.uid));
        const publicPhoto = profileSnap.exists() ? profileSnap.data()?.photoURL || '' : '';
        const fallbackPhoto = userData?.profilePicture || '/assets/user.png';
        localStorage.setItem('profilePicture', publicPhoto || fallbackPhoto);
      } catch (_) {
        // If Firestore read fails, still set a fallback so Header can render something
        localStorage.setItem('profilePicture', userData?.profilePicture || '/assets/user.png');
      }

      // Redirect to intended destination if provided
      setEmail('');
      setPassword('');
      dispatch(setAuthenticated(true));
      setIsAuthenticating(false);
      const next = searchParams?.get('next');
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

  return (
    <div className="min-h-screen bg-black">
      <Header />

      <div className="relative isolate flex min-h-[calc(100vh-80px)] flex-col items-center justify-center overflow-hidden px-6 py-12 lg:px-8">
        {/* Background gradient effect */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-red-500/10 via-transparent to-transparent" />

        {/* Login container */}
        <div className="relative w-full max-w-md space-y-8">
          {/* Header section */}
          <div className="space-y-6 text-center">
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
