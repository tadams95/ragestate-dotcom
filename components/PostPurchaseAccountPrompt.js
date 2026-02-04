'use client';

import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import { UserPlusIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { memo, useState } from 'react';

/**
 * @typedef {Object} PostPurchaseAccountPromptProps
 * @property {boolean} open - Whether the modal is open
 * @property {() => void} onClose - Close handler
 * @property {string} email - Guest email from checkout
 * @property {string} orderNumber - Order number for reference
 */

/**
 * Modal prompting guest users to create an account after purchase
 * @param {PostPurchaseAccountPromptProps} props
 */
function PostPurchaseAccountPrompt({ open, onClose, email, orderNumber }) {
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 200);
  };

  // Encode email for URL parameter
  const encodedEmail = encodeURIComponent(email || '');

  return (
    <Dialog open={open && !isClosing} onClose={handleClose} className="relative z-50">
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-black/60 transition-opacity data-[closed]:opacity-0 data-[enter]:duration-300 data-[leave]:duration-200 data-[enter]:ease-out data-[leave]:ease-in"
      />

      <div className="fixed inset-0 z-50 w-screen overflow-y-auto">
        <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
          <DialogPanel
            transition
            className="relative transform overflow-hidden rounded-lg bg-[var(--bg-elev-1)] px-4 pb-4 pt-5 text-left shadow-xl ring-1 ring-[var(--border-subtle)] transition-all data-[closed]:translate-y-4 data-[closed]:opacity-0 data-[enter]:duration-300 data-[leave]:duration-200 data-[enter]:ease-out data-[leave]:ease-in sm:my-8 sm:w-full sm:max-w-md sm:p-6 data-[closed]:sm:translate-y-0 data-[closed]:sm:scale-95"
          >
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent)]/10">
                <UserPlusIcon className="h-6 w-6 text-[var(--accent)]" aria-hidden="true" />
              </div>
              <DialogTitle
                as="h3"
                className="mt-4 text-lg font-semibold leading-6 text-[var(--text-primary)]"
              >
                Create an account?
              </DialogTitle>
              <div className="mt-3">
                <p className="text-sm text-[var(--text-secondary)]">
                  Create a free account to track your orders, get early access to drops, and unlock
                  member perks.
                </p>
                {email && (
                  <p className="mt-2 text-xs text-[var(--text-tertiary)]">
                    We'll use <span className="font-medium text-[var(--text-secondary)]">{email}</span> to set up your account.
                  </p>
                )}
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <Link
                href={`/create-account?email=${encodedEmail}&from=guest-checkout${orderNumber ? `&order=${orderNumber}` : ''}`}
                onClick={handleClose}
                className="flex w-full justify-center rounded-lg bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white shadow-sm hover:opacity-90 transition-opacity"
              >
                Create account
              </Link>
              <button
                type="button"
                onClick={handleClose}
                className="flex w-full justify-center rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elev-2)] px-4 py-3 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-elev-1)] transition-colors"
              >
                Maybe later
              </button>
            </div>

            <p className="mt-4 text-center text-xs text-[var(--text-tertiary)]">
              Your order confirmation has been sent to your email.
            </p>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
}

export default memo(PostPurchaseAccountPrompt);
