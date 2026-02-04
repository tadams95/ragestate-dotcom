'use client';

import { memo, useCallback, useState } from 'react';

/**
 * @typedef {Object} GuestEmailFormProps
 * @property {(email: string, marketingOptIn: boolean) => void} onSubmit
 * @property {string} [initialEmail]
 * @property {boolean} [isLoading]
 */

/**
 * Email collection form for guest checkout
 * @param {GuestEmailFormProps} props
 */
function GuestEmailForm({ onSubmit, initialEmail = '', isLoading = false }) {
  const [email, setEmail] = useState(initialEmail);
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [error, setError] = useState(null);

  const validateEmail = (emailValue) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(emailValue);
  };

  const handleSubmit = useCallback(
    (e) => {
      e.preventDefault();
      const trimmedEmail = email.trim();
      if (!validateEmail(trimmedEmail)) {
        setError('Please enter a valid email address');
        return;
      }
      setError(null);
      onSubmit(trimmedEmail, marketingOptIn);
    },
    [email, marketingOptIn, onSubmit],
  );

  const handleEmailChange = useCallback((e) => {
    setEmail(e.target.value);
    setError(null);
  }, []);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="guest-email"
          className="block text-sm font-medium text-[var(--text-secondary)]"
        >
          Email for order confirmation
        </label>
        <input
          type="email"
          id="guest-email"
          value={email}
          onChange={handleEmailChange}
          className="mt-1 w-full rounded-lg bg-[var(--bg-elev-2)] px-4 py-3
                     text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]
                     focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500
                     border border-[var(--border-subtle)]"
          placeholder="you@example.com"
          required
          disabled={isLoading}
          autoComplete="email"
        />
        {error && <p className="mt-1 text-sm text-[var(--danger)]">{error}</p>}
      </div>

      <p className="text-xs text-[var(--text-tertiary)]">
        We'll send your receipt and order updates to this address.
      </p>

      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={marketingOptIn}
          onChange={(e) => setMarketingOptIn(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-[var(--border-subtle)]
                     bg-[var(--bg-elev-2)] text-[var(--accent)]
                     focus:ring-[var(--accent)] focus:ring-offset-0"
          disabled={isLoading}
        />
        <span className="text-xs text-[var(--text-secondary)]">
          Send me updates on new drops and events
        </span>
      </label>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full rounded-lg bg-[var(--accent)] px-4 py-3
                   font-semibold text-white hover:opacity-90 transition-opacity
                   disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Setting up checkout...
          </span>
        ) : (
          'Continue to Payment'
        )}
      </button>
    </form>
  );
}

export default memo(GuestEmailForm);
