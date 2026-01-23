'use client';

import { useCallback, useState } from 'react';

import { useRouter } from 'next/navigation';

import { forgotPassword } from '../../../firebase/util/auth';

import RandomDetailStyling from '../components/styling/RandomDetailStyling';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const router = useRouter();

  async function confirmReset(e) {
    e.preventDefault();
    const success = await forgotPassword(email);

    if (success) {
      window.alert('Reset Password Email Sent');
      router.push('/login');
    }
  }

  // Memoize the onChange handlers using useCallback
  const handleEmailChange = useCallback((e) => {
    setEmail(e.target.value);
  }, []);

  return (
    <>
      <RandomDetailStyling />
      {/* Header is rendered by layout.js */}
      <div className="isolate flex min-h-full flex-1 flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-1/2">
          <h2 className="mt-52 text-center text-2xl font-bold leading-9 tracking-tight text-[var(--text-primary)]">
            RESET YOUR PASSWORD BELOW
          </h2>
        </div>

        <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-[480px] md:w-full">
          <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elev-1)] px-12 py-12 shadow">
            <form className="space-y-6" onSubmit={confirmReset}>
              {/* Email input */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium leading-6 text-[var(--text-secondary)]"
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
                    className="block w-full rounded-md border-0 bg-[var(--bg-elev-2)] py-1.5 pl-3 text-[var(--text-primary)] shadow-sm ring-1 ring-inset ring-[var(--border-subtle)] placeholder:text-[var(--text-tertiary)] focus:ring-2 focus:ring-inset focus:ring-red-500 sm:text-sm sm:leading-6"
                    style={{ paddingLeft: '10px' }} // Adjust the padding-left here
                  />
                </div>
              </div>

              {/* Sign in button */}
              <div>
                <button
                  type="submit"
                  className="flex w-full justify-center rounded-md bg-gradient-to-r from-red-600 to-red-500 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:from-red-500 hover:to-red-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
                >
                  Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      {/* Footer is rendered globally in RootLayout */}
    </>
  );
}
