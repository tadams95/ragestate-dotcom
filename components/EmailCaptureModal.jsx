'use client';

import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import { EnvelopeIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { addDoc, collection, getFirestore, serverTimestamp } from 'firebase/firestore';
import { useState } from 'react';
import toast from 'react-hot-toast';

/**
 * Email capture modal for non-logged-in users.
 * Stores emails in `emailCaptures` collection for marketing campaigns.
 *
 * @param {Object} props
 * @param {boolean} props.open - Whether the modal is open
 * @param {function} props.onClose - Called when modal should close
 * @param {string} [props.source] - Where the capture occurred (e.g., 'event_page', 'feed')
 * @param {string} [props.eventId] - Event ID if captured on an event page
 * @param {string} [props.eventName] - Event name for display
 */
export default function EmailCaptureModal({
  open,
  onClose,
  source = 'event_page',
  eventId = null,
  eventName = null,
}) {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || submitting) return;

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error('Please enter a valid email');
      return;
    }

    setSubmitting(true);
    try {
      const db = getFirestore();
      await addDoc(collection(db, 'emailCaptures'), {
        email: email.toLowerCase().trim(),
        source,
        eventId,
        capturedAt: serverTimestamp(),
        subscribed: true,
      });
      setSuccess(true);
      toast.success("You're on the list!");
      // Auto-close after success
      setTimeout(() => {
        onClose();
        // Reset state after close animation
        setTimeout(() => {
          setSuccess(false);
          setEmail('');
        }, 300);
      }, 1500);
    } catch (err) {
      console.error('Email capture error:', err);
      toast.error('Something went wrong. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    onClose();
    // Mark as dismissed in sessionStorage to avoid re-showing
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('emailCaptureShown', 'true');
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} className="relative z-50">
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-black/70 transition-opacity data-[closed]:opacity-0 data-[enter]:duration-300 data-[leave]:duration-200 data-[enter]:ease-out data-[leave]:ease-in"
      />

      <div className="fixed inset-0 z-50 w-screen overflow-y-auto">
        <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
          <DialogPanel
            transition
            className="relative transform overflow-hidden rounded-lg bg-gray-900 px-4 pb-4 pt-5 text-left shadow-xl ring-1 ring-gray-800 transition-all data-[closed]:translate-y-4 data-[closed]:opacity-0 data-[enter]:duration-300 data-[leave]:duration-200 data-[enter]:ease-out data-[leave]:ease-in sm:my-8 sm:w-full sm:max-w-md sm:p-6 data-[closed]:sm:translate-y-0 data-[closed]:sm:scale-95"
          >
            {/* Close button */}
            <button
              type="button"
              onClick={handleClose}
              className="absolute right-3 top-3 rounded-full p-1 text-gray-400 hover:bg-gray-800 hover:text-white"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>

            {success ? (
              // Success state
              <div className="py-4 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
                  <svg
                    className="h-6 w-6 text-green-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="2"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="mt-3 text-base font-medium text-white">You're on the list!</p>
                <p className="mt-1 text-sm text-gray-400">
                  We'll keep you posted on upcoming events.
                </p>
              </div>
            ) : (
              // Form state
              <>
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-500/10 sm:mx-0 sm:h-10 sm:w-10">
                    <EnvelopeIcon className="h-6 w-6 text-red-500" />
                  </div>
                  <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                    <DialogTitle as="h3" className="text-base font-semibold leading-6 text-white">
                      Don't miss out
                    </DialogTitle>
                    <div className="mt-2">
                      <p className="text-sm text-[var(--text-secondary)]">
                        {eventName
                          ? `Get notified about ${eventName} and future events.`
                          : 'Get notified about upcoming events and exclusive drops.'}
                      </p>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="mt-5">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                    autoComplete="email"
                    className="w-full rounded-md border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                  />
                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <button
                      type="submit"
                      disabled={submitting || !email}
                      className="inline-flex w-full justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50 sm:order-2"
                    >
                      {submitting ? 'Submitting...' : 'Notify Me'}
                    </button>
                    <button
                      type="button"
                      onClick={handleClose}
                      className="inline-flex w-full justify-center rounded-md bg-gray-800 px-3 py-2 text-sm font-semibold text-gray-300 shadow-sm ring-1 ring-inset ring-gray-700 hover:bg-gray-700 sm:order-1"
                    >
                      Maybe Later
                    </button>
                  </div>
                  <p className="mt-3 text-center text-xs text-gray-500">
                    No spam, just event updates. Unsubscribe anytime.
                  </p>
                </form>
              </>
            )}
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
}
