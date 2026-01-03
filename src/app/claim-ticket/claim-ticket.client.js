'use client';

import {
  ArrowRightIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  GiftIcon,
  TicketIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../../firebase/context/FirebaseContext';

/**
 * Claim Ticket Page - Beautiful experience for claiming transferred tickets
 *
 * States:
 * - LOADING: Validating token
 * - AUTH_REQUIRED: User needs to log in
 * - PREVIEW: Show ticket details, ready to claim
 * - CLAIMING: Processing claim
 * - SUCCESS: Claimed successfully
 * - ERROR: Token invalid, expired, or wrong user
 */
const STATES = {
  LOADING: 'loading',
  AUTH_REQUIRED: 'auth_required',
  PREVIEW: 'preview',
  CLAIMING: 'claiming',
  SUCCESS: 'success',
  ERROR: 'error',
};

function ClaimTicketClient() {
  const searchParams = useSearchParams();
  const { currentUser, loading: authLoading } = useAuth();

  const [state, setState] = useState(STATES.LOADING);
  const [transferData, setTransferData] = useState(null);
  const [error, setError] = useState(null);
  const [claimedEventId, setClaimedEventId] = useState(null);

  const token = searchParams.get('t');

  // Validate the transfer token and get transfer details
  const validateToken = useCallback(async () => {
    if (!token) {
      setState(STATES.ERROR);
      setError({
        title: 'Invalid Link',
        message: 'This claim link appears to be invalid or incomplete.',
      });
      return;
    }

    if (authLoading) return;

    if (!currentUser) {
      setState(STATES.AUTH_REQUIRED);
      return;
    }

    try {
      // Fetch transfer preview data
      const res = await fetch(`/api/payments/transfer-preview?t=${encodeURIComponent(token)}`);

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const status = res.status;

        if (status === 404) {
          setError({
            title: 'Transfer Not Found',
            message: 'This transfer has already been claimed or does not exist.',
          });
        } else if (status === 410) {
          setError({
            title: 'Link Expired',
            message: 'This transfer link has expired. Ask the sender to transfer the ticket again.',
          });
        } else if (status === 403) {
          setError({
            title: 'Wrong Account',
            message:
              data.error ||
              'This ticket was sent to a different email address. Please log in with the correct account.',
          });
        } else {
          setError({
            title: 'Something Went Wrong',
            message: data.error || 'Unable to load transfer details.',
          });
        }
        setState(STATES.ERROR);
        return;
      }

      const data = await res.json();
      setTransferData(data);
      setState(STATES.PREVIEW);
    } catch (err) {
      console.error('Token validation error:', err);
      setError({
        title: 'Connection Error',
        message: 'Unable to connect to our servers. Please try again.',
      });
      setState(STATES.ERROR);
    }
  }, [token, currentUser, authLoading]);

  useEffect(() => {
    validateToken();
  }, [validateToken]);

  // Handle claim action
  const handleClaim = async () => {
    if (!token || !currentUser) return;

    setState(STATES.CLAIMING);

    try {
      const res = await fetch('/api/payments/claim-ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          claimToken: token,
          claimerUserId: currentUser.uid,
          claimerEmail: currentUser.email,
          claimerName: currentUser.displayName || currentUser.email?.split('@')[0],
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to claim ticket');
      }

      setClaimedEventId(data.eventId);
      setState(STATES.SUCCESS);
    } catch (err) {
      console.error('Claim error:', err);
      setError({
        title: 'Claim Failed',
        message: err.message || 'Unable to claim the ticket. Please try again.',
      });
      setState(STATES.ERROR);
    }
  };

  // Format date
  const formatEventDate = (dateValue) => {
    if (!dateValue) return 'TBA';
    try {
      const date = dateValue.toDate ? dateValue.toDate() : new Date(dateValue);
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return 'TBA';
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg-base)]">
      {/* Header */}
      <header className="border-b border-[var(--border-subtle)] bg-[var(--bg-elev-1)]">
        <div className="mx-auto flex h-16 max-w-lg items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/assets/RSLogo2.png"
              alt="RAGESTATE"
              width={120}
              height={32}
              className="h-8 w-auto"
            />
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Loading State */}
          {state === STATES.LOADING && (
            <div className="flex flex-col items-center rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elev-1)] p-8">
              <div className="relative">
                <div className="h-16 w-16 animate-spin rounded-full border-4 border-[var(--border-subtle)] border-t-red-500"></div>
                <GiftIcon className="absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 text-red-500" />
              </div>
              <p className="mt-6 text-[var(--text-secondary)]">Loading your ticket...</p>
            </div>
          )}

          {/* Auth Required State */}
          {state === STATES.AUTH_REQUIRED && (
            <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elev-1)] p-8">
              <div className="flex flex-col items-center text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-500/20">
                  <GiftIcon className="h-10 w-10 text-red-500" />
                </div>
                <h1 className="mt-6 text-2xl font-bold text-[var(--text-primary)]">
                  You've Got a Ticket! 🎉
                </h1>
                <p className="mt-3 text-[var(--text-secondary)]">
                  Log in or create an account to claim your ticket.
                </p>
              </div>

              <div className="mt-8 space-y-3">
                <Link
                  href={`/login?redirect=${encodeURIComponent(`/claim-ticket?t=${token}`)}`}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-red-600 font-semibold text-white transition hover:bg-red-500"
                >
                  Log In
                  <ArrowRightIcon className="h-4 w-4" />
                </Link>
                <Link
                  href={`/create-account?redirect=${encodeURIComponent(`/claim-ticket?t=${token}`)}`}
                  className="flex h-12 w-full items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elev-2)] font-medium text-[var(--text-primary)] transition hover:bg-[var(--bg-elev-3)]"
                >
                  Create Account
                </Link>
              </div>
            </div>
          )}

          {/* Preview State */}
          {state === STATES.PREVIEW && transferData && (
            <div className="overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elev-1)]">
              {/* Gift Header */}
              <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 p-6 text-center">
                <div className="flex justify-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10 backdrop-blur">
                    <GiftIcon className="h-8 w-8 text-white" />
                  </div>
                </div>
                <h1 className="mt-4 text-xl font-bold text-white">
                  {transferData.fromName || 'Someone'} sent you a ticket!
                </h1>
              </div>

              {/* Ticket Details */}
              <div className="p-6">
                <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elev-2)] p-4">
                  <div className="flex items-start gap-4">
                    <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--bg-elev-3)]">
                      <TicketIcon className="h-7 w-7 text-red-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="font-bold text-[var(--text-primary)]">
                        {transferData.eventName}
                      </h2>
                      <p className="mt-1 text-sm text-[var(--text-secondary)]">
                        📅 {formatEventDate(transferData.eventDate)}
                      </p>
                      <p className="mt-2 text-xs text-[var(--text-tertiary)]">
                        {transferData.ticketQuantity || 1} ticket
                        {(transferData.ticketQuantity || 1) > 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Logged in as notice */}
                <p className="mt-4 text-center text-sm text-[var(--text-tertiary)]">
                  Claiming as{' '}
                  <span className="font-medium text-[var(--text-secondary)]">
                    {currentUser?.email}
                  </span>
                </p>

                {/* Claim Button */}
                <button
                  onClick={handleClaim}
                  className="mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-red-600 text-lg font-bold text-white transition hover:bg-red-500 active:scale-[0.98]"
                >
                  <TicketIcon className="h-6 w-6" />
                  Claim Your Ticket
                </button>

                <p className="mt-4 text-center text-xs text-[var(--text-tertiary)]">
                  By claiming, this ticket will be added to your account.
                </p>
              </div>
            </div>
          )}

          {/* Claiming State */}
          {state === STATES.CLAIMING && (
            <div className="flex flex-col items-center rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elev-1)] p-8">
              <div className="relative">
                <div className="h-16 w-16 animate-spin rounded-full border-4 border-[var(--border-subtle)] border-t-red-500"></div>
                <TicketIcon className="absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 text-red-500" />
              </div>
              <p className="mt-6 font-medium text-[var(--text-primary)]">Claiming your ticket...</p>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">Just a moment</p>
            </div>
          )}

          {/* Success State */}
          {state === STATES.SUCCESS && (
            <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elev-1)] p-8">
              <div className="flex flex-col items-center text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-500/20">
                  <CheckCircleIcon className="h-12 w-12 text-green-500" />
                </div>
                <h1 className="mt-6 text-2xl font-bold text-[var(--text-primary)]">
                  Ticket Claimed! 🎉
                </h1>
                <p className="mt-3 text-[var(--text-secondary)]">
                  Your ticket has been added to your account. You're all set!
                </p>
              </div>

              <div className="mt-8 space-y-3">
                <Link
                  href="/account?tab=tickets"
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-red-600 font-semibold text-white transition hover:bg-red-500"
                >
                  <TicketIcon className="h-5 w-5" />
                  View My Tickets
                </Link>
                {claimedEventId && (
                  <Link
                    href={`/events/${claimedEventId}`}
                    className="flex h-12 w-full items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elev-2)] font-medium text-[var(--text-primary)] transition hover:bg-[var(--bg-elev-3)]"
                  >
                    View Event Details
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* Error State */}
          {state === STATES.ERROR && error && (
            <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elev-1)] p-8">
              <div className="flex flex-col items-center text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-500/20">
                  {error.title === 'Link Expired' ? (
                    <ExclamationTriangleIcon className="h-12 w-12 text-amber-500" />
                  ) : (
                    <XCircleIcon className="h-12 w-12 text-red-500" />
                  )}
                </div>
                <h1 className="mt-6 text-xl font-bold text-[var(--text-primary)]">{error.title}</h1>
                <p className="mt-3 text-[var(--text-secondary)]">{error.message}</p>
              </div>

              <div className="mt-8 space-y-3">
                {error.title === 'Wrong Account' && (
                  <Link
                    href={`/login?redirect=${encodeURIComponent(`/claim-ticket?t=${token}`)}`}
                    className="flex h-12 w-full items-center justify-center rounded-xl bg-red-600 font-semibold text-white transition hover:bg-red-500"
                  >
                    Log In with Different Account
                  </Link>
                )}
                <Link
                  href="/"
                  className="flex h-12 w-full items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elev-2)] font-medium text-[var(--text-primary)] transition hover:bg-[var(--bg-elev-3)]"
                >
                  Go Home
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--border-subtle)] bg-[var(--bg-elev-1)] py-4 text-center text-xs text-[var(--text-tertiary)]">
        <p>© {new Date().getFullYear()} RAGESTATE. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default ClaimTicketClient;
