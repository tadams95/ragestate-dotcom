'use client';

import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import {
  ArrowRightIcon,
  AtSymbolIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  EnvelopeIcon,
  GiftIcon,
  TicketIcon,
  UserCircleIcon,
  UserGroupIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../firebase/context/FirebaseContext';
import { db } from '../firebase/firebase';

/**
 * Transfer Ticket Modal - Beautiful, intuitive ticket transfer experience
 *
 * Flow:
 * 1. ENTER_RECIPIENT - User enters recipient email OR @username, or picks from followers
 * 2. CONFIRM - Review transfer details before sending
 * 3. SENDING - Processing transfer request
 * 4. SUCCESS - Transfer complete, claim email sent
 * 5. ERROR - Show error with retry option
 */
const STEPS = {
  ENTER_RECIPIENT: 'enter_recipient',
  CONFIRM: 'confirm',
  SENDING: 'sending',
  SUCCESS: 'success',
  ERROR: 'error',
};

export default function TransferTicketModal({ ticket, isOpen, onClose, onTransferComplete }) {
  const { currentUser } = useAuth();
  const [step, setStep] = useState(STEPS.ENTER_RECIPIENT);
  const [recipientInput, setRecipientInput] = useState('');
  const [inputError, setInputError] = useState('');
  const [transferError, setTransferError] = useState('');

  // Resolved recipient info
  const [resolvedRecipient, setResolvedRecipient] = useState(null);
  const [isLookingUp, setIsLookingUp] = useState(false);

  // Followers quick-pick
  const [followers, setFollowers] = useState([]);
  const [isLoadingFollowers, setIsLoadingFollowers] = useState(false);
  const [showFollowers, setShowFollowers] = useState(true);

  // Fetch followers when modal opens
  useEffect(() => {
    if (!isOpen || !currentUser?.uid) return;

    const fetchFollowers = async () => {
      setIsLoadingFollowers(true);
      try {
        // Query follows where followedId === current user (people who follow me)
        const followsQuery = query(
          collection(db, 'follows'),
          where('followedId', '==', currentUser.uid),
        );
        const followsSnap = await getDocs(followsQuery);

        if (followsSnap.empty) {
          setFollowers([]);
          setIsLoadingFollowers(false);
          return;
        }

        // Get follower UIDs
        const followerIds = followsSnap.docs.map((d) => d.data().followerId);

        // Batch fetch profiles (limit to 20 for performance)
        const limitedIds = followerIds.slice(0, 20);
        const profilePromises = limitedIds.map((uid) =>
          getDoc(doc(db, 'profiles', uid)).then((snap) => ({
            uid,
            ...snap.data(),
          })),
        );

        const profiles = await Promise.all(profilePromises);

        // Also fetch usernames for each profile
        const usernamePromises = profiles.map(async (profile) => {
          // Try to find username by querying usernames collection
          const usernamesQuery = query(
            collection(db, 'usernames'),
            where('uid', '==', profile.uid),
          );
          const usernameSnap = await getDocs(usernamesQuery);
          const username = usernameSnap.empty ? null : usernameSnap.docs[0].id;
          return { ...profile, username };
        });

        const followersWithUsernames = await Promise.all(usernamePromises);

        // Filter to users with accounts (must have username to receive transfers)
        // Users without usernames can't be sent tickets via quick-pick
        const validFollowers = followersWithUsernames.filter(
          (f) => f.username && (f.displayName || f.username),
        );

        setFollowers(validFollowers);
      } catch (err) {
        console.error('Error fetching followers:', err);
        setFollowers([]);
      } finally {
        setIsLoadingFollowers(false);
      }
    };

    fetchFollowers();
  }, [isOpen, currentUser?.uid]);

  // Reset state when modal opens/closes
  const handleClose = useCallback(() => {
    // Only close if not in the middle of sending
    if (step === STEPS.SENDING) return;
    setStep(STEPS.ENTER_RECIPIENT);
    setRecipientInput('');
    setInputError('');
    setTransferError('');
    setResolvedRecipient(null);
    setIsLookingUp(false);
    onClose();
  }, [step, onClose]);

  // Detect if input looks like a username
  const isUsernameInput = (input) => input.trim().startsWith('@');

  // Validate email format
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Select a follower from the quick-pick list
  const handleSelectFollower = (follower) => {
    setResolvedRecipient({
      type: 'username',
      username: follower.username,
      uid: follower.uid,
      displayName: follower.displayName || follower.username,
      photoURL: follower.photoURL || null,
      isVerified: follower.isVerified || false,
    });
    setRecipientInput(`@${follower.username}`);
    setInputError('');
    setStep(STEPS.CONFIRM);
  };

  // Lookup username in Firestore
  const lookupUsername = useCallback(
    async (username) => {
      const cleanUsername = username.toLowerCase().replace(/^@/, '');
      if (cleanUsername.length < 2) {
        setResolvedRecipient(null);
        return;
      }

      setIsLookingUp(true);
      try {
        // Check usernames collection
        const usernameDoc = await getDoc(doc(db, 'usernames', cleanUsername));
        if (!usernameDoc.exists()) {
          setResolvedRecipient(null);
          setIsLookingUp(false);
          return;
        }

        const { uid } = usernameDoc.data();

        // Cannot transfer to self
        if (uid === currentUser?.uid) {
          setResolvedRecipient(null);
          setInputError("You can't transfer a ticket to yourself");
          setIsLookingUp(false);
          return;
        }

        // Fetch profile for display info
        const profileDoc = await getDoc(doc(db, 'profiles', uid));
        const profileData = profileDoc.data() || {};

        setResolvedRecipient({
          type: 'username',
          username: cleanUsername,
          uid,
          displayName: profileData.displayName || cleanUsername,
          photoURL: profileData.photoURL || null,
          isVerified: profileData.isVerified || false,
        });
        setInputError('');
      } catch (err) {
        console.error('Username lookup error:', err);
        setResolvedRecipient(null);
      } finally {
        setIsLookingUp(false);
      }
    },
    [currentUser?.uid],
  );

  // Debounced username lookup
  useEffect(() => {
    if (!isUsernameInput(recipientInput)) {
      setResolvedRecipient(null);
      return;
    }

    const timer = setTimeout(() => {
      lookupUsername(recipientInput);
    }, 300);

    return () => clearTimeout(timer);
  }, [recipientInput, lookupUsername]);

  // Handle input change
  const handleInputChange = (e) => {
    const value = e.target.value;
    setRecipientInput(value);
    if (inputError) {
      setInputError('');
    }
    // Clear resolved recipient if input changes and it's not a username
    if (!isUsernameInput(value)) {
      setResolvedRecipient(null);
    }
  };

  // Handle continue to confirm step
  const handleContinue = () => {
    const input = recipientInput.trim();

    if (!input) {
      setInputError('Please enter an email or @username');
      return;
    }

    // Username path
    if (isUsernameInput(input)) {
      if (!resolvedRecipient) {
        setInputError(`Username ${input} not found`);
        return;
      }
      setInputError('');
      setStep(STEPS.CONFIRM);
      return;
    }

    // Email path
    const email = input.toLowerCase();

    if (!validateEmail(email)) {
      setInputError('Please enter a valid email address');
      return;
    }

    // Cannot transfer to self
    if (currentUser?.email?.toLowerCase() === email) {
      setInputError("You can't transfer a ticket to yourself");
      return;
    }

    // Set resolved recipient for email
    setResolvedRecipient({
      type: 'email',
      email,
    });
    setInputError('');
    setStep(STEPS.CONFIRM);
  };

  // Handle transfer confirmation
  const handleConfirmTransfer = async () => {
    setStep(STEPS.SENDING);
    setTransferError('');

    try {
      const payload = {
        ragerId: ticket.id?.split('-')[0] || ticket.id, // Handle expanded ticket IDs
        eventId: ticket.eventId,
        senderUserId: currentUser?.uid,
        senderEmail: currentUser?.email,
        senderName: currentUser?.displayName || currentUser?.email?.split('@')[0],
      };

      // Add either username or email to payload
      if (resolvedRecipient?.type === 'username') {
        payload.recipientUsername = resolvedRecipient.username;
      } else {
        payload.recipientEmail = resolvedRecipient?.email || recipientInput.trim().toLowerCase();
      }

      const res = await fetch('/api/payments/transfer-ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to transfer ticket');
      }

      setStep(STEPS.SUCCESS);

      // Notify parent component
      if (onTransferComplete) {
        onTransferComplete({
          transferId: data.transferId,
          recipientEmail: resolvedRecipient?.email || recipientInput.trim().toLowerCase(),
          recipientUsername: resolvedRecipient?.username || null,
          recipientHasAccount: data.recipientHasAccount,
        });
      }
    } catch (err) {
      console.error('Transfer error:', err);
      setTransferError(err.message || 'Something went wrong. Please try again.');
      setStep(STEPS.ERROR);
    }
  };

  // Handle back to recipient entry
  const handleBack = () => {
    setStep(STEPS.ENTER_RECIPIENT);
    setTransferError('');
  };

  // Handle retry after error
  const handleRetry = () => {
    setStep(STEPS.CONFIRM);
    setTransferError('');
  };

  // Format event date for display
  const formatEventDate = (dateStr) => {
    if (!dateStr) return 'TBA';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  if (!isOpen || !ticket) return null;

  return (
    <Dialog open={isOpen} onClose={handleClose} className="relative z-50">
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity data-[closed]:opacity-0 data-[enter]:duration-300 data-[leave]:duration-200"
      />

      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-full items-end justify-center p-0 sm:items-center sm:p-4">
          <DialogPanel
            transition
            className="relative w-full max-w-md transform overflow-hidden rounded-t-2xl border border-[var(--border-subtle)] bg-[var(--bg-elev-1)] shadow-2xl transition-all data-[closed]:translate-y-8 data-[closed]:opacity-0 data-[enter]:duration-300 data-[leave]:duration-200 sm:rounded-2xl data-[closed]:sm:translate-y-0 data-[closed]:sm:scale-95"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-6 py-4">
              <DialogTitle className="flex items-center gap-2 text-lg font-bold text-[var(--text-primary)]">
                <GiftIcon className="h-5 w-5 text-red-500" />
                Transfer Ticket
              </DialogTitle>
              <button
                onClick={handleClose}
                disabled={step === STEPS.SENDING}
                className="flex h-10 w-10 items-center justify-center rounded-full text-[var(--text-secondary)] transition hover:bg-[var(--bg-elev-2)] hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Close"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Ticket Preview Card */}
              <div className="mb-6 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elev-2)] p-4">
                <div className="flex items-start gap-4">
                  {ticket.imageUrl ? (
                    <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-[var(--bg-elev-3)]">
                      <Image
                        src={ticket.imageUrl}
                        alt={ticket.eventName}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--bg-elev-3)]">
                      <TicketIcon className="h-8 w-8 text-[var(--text-tertiary)]" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-semibold text-[var(--text-primary)]">
                      {ticket.eventName}
                    </h3>
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">
                      {formatEventDate(ticket.eventDate)}
                      {ticket.eventTime && ticket.eventTime !== 'TBA' && ` • ${ticket.eventTime}`}
                    </p>
                    <p className="mt-1 text-xs text-[var(--text-tertiary)]">
                      {ticket.ticketType || 'General Admission'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Step: Enter Recipient (Email or @Username) */}
              {step === STEPS.ENTER_RECIPIENT && (
                <div className="space-y-4">
                  {/* Followers Quick-Pick Section */}
                  {followers.length > 0 && (
                    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elev-2)]">
                      <button
                        type="button"
                        onClick={() => setShowFollowers(!showFollowers)}
                        className="flex w-full items-center justify-between px-4 py-3 text-left"
                      >
                        <div className="flex items-center gap-2">
                          <UserGroupIcon className="h-5 w-5 text-red-500" />
                          <span className="text-sm font-medium text-[var(--text-primary)]">
                            Your Followers
                          </span>
                          <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-xs font-medium text-red-500">
                            {followers.length}
                          </span>
                        </div>
                        {showFollowers ? (
                          <ChevronUpIcon className="h-4 w-4 text-[var(--text-tertiary)]" />
                        ) : (
                          <ChevronDownIcon className="h-4 w-4 text-[var(--text-tertiary)]" />
                        )}
                      </button>

                      {showFollowers && (
                        <div className="max-h-48 overflow-y-auto border-t border-[var(--border-subtle)] px-2 py-1.5">
                          {followers.map((follower) => (
                            <button
                              key={follower.uid}
                              type="button"
                              onClick={() => handleSelectFollower(follower)}
                              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition hover:bg-[var(--bg-elev-3)]"
                            >
                              {follower.photoURL ? (
                                <Image
                                  src={follower.photoURL}
                                  alt={follower.displayName || follower.username}
                                  width={36}
                                  height={36}
                                  className="h-9 w-9 rounded-full object-cover"
                                />
                              ) : (
                                <UserCircleIcon className="h-9 w-9 text-[var(--text-tertiary)]" />
                              )}
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="truncate text-sm font-medium text-[var(--text-primary)]">
                                    {follower.displayName || follower.username}
                                  </span>
                                  {follower.isVerified && (
                                    <CheckCircleIcon className="h-3.5 w-3.5 flex-shrink-0 text-red-500" />
                                  )}
                                </div>
                                {follower.username && (
                                  <span className="text-xs text-[var(--text-tertiary)]">
                                    @{follower.username}
                                  </span>
                                )}
                              </div>
                              <ArrowRightIcon className="h-4 w-4 flex-shrink-0 text-[var(--text-tertiary)]" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Loading followers indicator */}
                  {isLoadingFollowers && (
                    <div className="flex items-center justify-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elev-2)] px-4 py-3">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--border-subtle)] border-t-red-500"></div>
                      <span className="text-sm text-[var(--text-tertiary)]">
                        Loading followers...
                      </span>
                    </div>
                  )}

                  {/* Divider when followers exist */}
                  {followers.length > 0 && (
                    <div className="flex items-center gap-3">
                      <div className="h-px flex-1 bg-[var(--border-subtle)]"></div>
                      <span className="text-xs text-[var(--text-tertiary)]">or enter manually</span>
                      <div className="h-px flex-1 bg-[var(--border-subtle)]"></div>
                    </div>
                  )}

                  <div>
                    <label
                      htmlFor="recipient-input"
                      className="mb-2 block text-sm font-medium text-[var(--text-secondary)]"
                    >
                      Send to email or @username
                    </label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                        {isUsernameInput(recipientInput) ? (
                          <AtSymbolIcon className="h-5 w-5 text-red-500" />
                        ) : (
                          <EnvelopeIcon className="h-5 w-5 text-[var(--text-tertiary)]" />
                        )}
                      </div>
                      <input
                        type="text"
                        id="recipient-input"
                        placeholder="@username or email"
                        value={recipientInput}
                        onChange={handleInputChange}
                        onKeyDown={(e) => e.key === 'Enter' && !isLookingUp && handleContinue()}
                        className={`w-full rounded-xl border bg-[var(--bg-elev-2)] py-3.5 pl-12 pr-4 text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 ${
                          inputError
                            ? 'border-red-500 focus:ring-red-500/30'
                            : 'border-[var(--border-subtle)] focus:border-red-500/50 focus:ring-red-500/30'
                        }`}
                      />
                      {isLookingUp && (
                        <div className="absolute inset-y-0 right-0 flex items-center pr-4">
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--border-subtle)] border-t-red-500"></div>
                        </div>
                      )}
                    </div>
                    {inputError && <p className="mt-2 text-sm text-red-400">{inputError}</p>}
                  </div>

                  {/* Username Profile Preview */}
                  {resolvedRecipient?.type === 'username' && (
                    <div className="flex items-center gap-3 rounded-xl border border-green-500/30 bg-green-500/10 p-3">
                      {resolvedRecipient.photoURL ? (
                        <Image
                          src={resolvedRecipient.photoURL}
                          alt={resolvedRecipient.displayName}
                          width={40}
                          height={40}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      ) : (
                        <UserCircleIcon className="h-10 w-10 text-green-500" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-[var(--text-primary)]">
                            {resolvedRecipient.displayName}
                          </span>
                          {resolvedRecipient.isVerified && (
                            <CheckCircleIcon className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                        <span className="text-sm text-green-500">
                          @{resolvedRecipient.username}
                        </span>
                      </div>
                      <CheckCircleIcon className="h-5 w-5 flex-shrink-0 text-green-500" />
                    </div>
                  )}

                  <p className="text-center text-xs text-[var(--text-tertiary)]">
                    {isUsernameInput(recipientInput)
                      ? "They'll receive a notification and email with a claim link."
                      : "We'll send them an email with a link to claim this ticket."}
                  </p>

                  <button
                    onClick={handleContinue}
                    disabled={
                      isLookingUp || (isUsernameInput(recipientInput) && !resolvedRecipient)
                    }
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-red-600 text-base font-semibold text-white transition hover:bg-red-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Continue
                    <ArrowRightIcon className="h-4 w-4" />
                  </button>
                </div>
              )}

              {/* Step: Confirm */}
              {step === STEPS.CONFIRM && (
                <div className="space-y-5">
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
                    <h4 className="font-semibold text-amber-400">Confirm Transfer</h4>
                    <p className="mt-2 text-sm text-[var(--text-secondary)]">
                      You're about to transfer this ticket to:
                    </p>
                    {/* Show profile preview for username, plain text for email */}
                    {resolvedRecipient?.type === 'username' ? (
                      <div className="mt-3 flex items-center gap-3 rounded-lg bg-[var(--bg-elev-2)] p-3">
                        {resolvedRecipient.photoURL ? (
                          <Image
                            src={resolvedRecipient.photoURL}
                            alt={resolvedRecipient.displayName}
                            width={36}
                            height={36}
                            className="h-9 w-9 rounded-full object-cover"
                          />
                        ) : (
                          <UserCircleIcon className="h-9 w-9 text-[var(--text-tertiary)]" />
                        )}
                        <div>
                          <span className="font-semibold text-[var(--text-primary)]">
                            {resolvedRecipient.displayName}
                          </span>
                          <p className="text-sm text-[var(--text-secondary)]">
                            @{resolvedRecipient.username}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className="mt-2 break-all rounded-lg bg-[var(--bg-elev-2)] px-3 py-2 font-mono text-sm text-[var(--text-primary)]">
                        {resolvedRecipient?.email || recipientInput}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2 rounded-xl bg-[var(--bg-elev-2)] p-4 text-sm">
                    <p className="text-[var(--text-secondary)]">
                      <span className="font-medium text-[var(--text-primary)]">
                        What happens next:
                      </span>
                    </p>
                    <ul className="ml-4 list-disc space-y-1 text-[var(--text-secondary)]">
                      <li>They'll receive an email with a claim link</li>
                      <li>The link expires in 72 hours</li>
                      <li>Your ticket becomes inactive once claimed</li>
                      <li>This action cannot be undone after they claim</li>
                    </ul>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={handleBack}
                      className="flex h-12 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elev-2)] font-medium text-[var(--text-primary)] transition hover:bg-[var(--bg-elev-3)] active:scale-[0.98]"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleConfirmTransfer}
                      className="flex h-12 items-center justify-center gap-2 rounded-xl bg-red-600 font-semibold text-white transition hover:bg-red-500 active:scale-[0.98]"
                    >
                      <GiftIcon className="h-5 w-5" />
                      Send Ticket
                    </button>
                  </div>
                </div>
              )}

              {/* Step: Sending */}
              {step === STEPS.SENDING && (
                <div className="flex flex-col items-center py-8">
                  <div className="relative">
                    <div className="h-16 w-16 animate-spin rounded-full border-4 border-[var(--border-subtle)] border-t-red-500"></div>
                    <GiftIcon className="absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 text-red-500" />
                  </div>
                  <p className="mt-6 font-medium text-[var(--text-primary)]">
                    Transferring ticket...
                  </p>
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">
                    This will only take a moment
                  </p>
                </div>
              )}

              {/* Step: Success */}
              {step === STEPS.SUCCESS && (
                <div className="flex flex-col items-center py-4">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-500/20">
                    <CheckCircleIcon className="h-12 w-12 text-green-500" />
                  </div>
                  <h3 className="mt-6 text-xl font-bold text-[var(--text-primary)]">
                    Ticket Sent! 🎉
                  </h3>
                  <p className="mt-3 text-center text-sm text-[var(--text-secondary)]">
                    We've sent a claim link to
                  </p>
                  {/* Show profile preview for username, plain email otherwise */}
                  {resolvedRecipient?.type === 'username' ? (
                    <div className="mt-2 flex items-center gap-2 rounded-lg bg-[var(--bg-elev-2)] px-4 py-2">
                      {resolvedRecipient.photoURL ? (
                        <Image
                          src={resolvedRecipient.photoURL}
                          alt={resolvedRecipient.displayName}
                          width={24}
                          height={24}
                          className="h-6 w-6 rounded-full object-cover"
                        />
                      ) : (
                        <UserCircleIcon className="h-6 w-6 text-[var(--text-tertiary)]" />
                      )}
                      <span className="font-semibold text-[var(--text-primary)]">
                        @{resolvedRecipient.username}
                      </span>
                    </div>
                  ) : (
                    <p className="mt-1 break-all rounded-lg bg-[var(--bg-elev-2)] px-4 py-2 text-center font-mono text-sm text-[var(--text-primary)]">
                      {resolvedRecipient?.email || recipientInput}
                    </p>
                  )}
                  <p className="mt-4 text-center text-xs text-[var(--text-tertiary)]">
                    The link expires in 72 hours. Your ticket will be deactivated once they claim
                    it.
                  </p>

                  <button
                    onClick={handleClose}
                    className="mt-6 flex h-12 w-full items-center justify-center rounded-xl bg-[var(--bg-elev-2)] font-medium text-[var(--text-primary)] transition hover:bg-[var(--bg-elev-3)]"
                  >
                    Done
                  </button>
                </div>
              )}

              {/* Step: Error */}
              {step === STEPS.ERROR && (
                <div className="flex flex-col items-center py-4">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-500/20">
                    <XMarkIcon className="h-12 w-12 text-red-500" />
                  </div>
                  <h3 className="mt-6 text-xl font-bold text-[var(--text-primary)]">
                    Transfer Failed
                  </h3>
                  <p className="mt-3 text-center text-sm text-red-400">{transferError}</p>

                  <div className="mt-6 grid w-full grid-cols-2 gap-3">
                    <button
                      onClick={handleBack}
                      className="flex h-12 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elev-2)] font-medium text-[var(--text-primary)] transition hover:bg-[var(--bg-elev-3)]"
                    >
                      Change Recipient
                    </button>
                    <button
                      onClick={handleRetry}
                      className="flex h-12 items-center justify-center rounded-xl bg-red-600 font-semibold text-white transition hover:bg-red-500"
                    >
                      Try Again
                    </button>
                  </div>
                </div>
              )}
            </div>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
}
