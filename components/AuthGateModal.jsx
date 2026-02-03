'use client';

import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import Link from 'next/link';

export default function AuthGateModal({
  open,
  onClose,
  title = 'Log in to continue',
  message = 'You need an account to proceed.',
  loginHref = '/login',
  createHref = '/create-account',
}) {
  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-black/60 transition-opacity data-[closed]:opacity-0 data-[enter]:duration-300 data-[leave]:duration-200 data-[enter]:ease-out data-[leave]:ease-in"
      />

      <div className="fixed inset-0 z-50 w-screen overflow-y-auto">
        <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
          <DialogPanel
            transition
            className="relative transform overflow-hidden rounded-lg bg-[var(--bg-elev-1)] px-4 pb-4 pt-5 text-left shadow-xl ring-1 ring-[var(--border-subtle)] transition-all data-[closed]:translate-y-4 data-[closed]:opacity-0 data-[enter]:duration-300 data-[leave]:duration-200 data-[enter]:ease-out data-[leave]:ease-in sm:my-8 sm:w-full sm:max-w-lg sm:p-6 data-[closed]:sm:translate-y-0 data-[closed]:sm:scale-95"
          >
            <div className="sm:flex sm:items-start">
              <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-[var(--accent)]/10 sm:mx-0 sm:h-10 sm:w-10">
                <svg
                  className="h-6 w-6 text-[var(--accent)]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 11V7m0 8h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                <DialogTitle as="h3" className="text-base font-semibold leading-6 text-[var(--text-primary)]">
                  {title}
                </DialogTitle>
                <div className="mt-2">
                  <p className="text-sm text-[var(--text-secondary)]">{message}</p>
                </div>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-1 gap-3 sm:mt-4 sm:grid-cols-2">
              <Link
                href={loginHref}
                onClick={onClose}
                className="inline-flex w-full justify-center rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90"
              >
                Log In
              </Link>
              <Link
                href={createHref}
                onClick={onClose}
                className="inline-flex w-full justify-center rounded-md bg-[var(--bg-elev-2)] px-3 py-2 text-sm font-semibold text-[var(--text-primary)] shadow-sm ring-1 ring-inset ring-[var(--border-subtle)] hover:bg-[var(--bg-elev-1)]"
              >
                Create Account
              </Link>
              <button
                type="button"
                onClick={onClose}
                className="col-span-full inline-flex w-full justify-center rounded-md bg-transparent px-3 py-2 text-sm font-semibold text-[var(--text-secondary)] shadow-sm hover:text-[var(--text-primary)]"
              >
                Cancel
              </button>
            </div>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
}
