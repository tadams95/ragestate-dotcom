'use client';

import { memo, useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useUserSearch } from '../../../../../lib/hooks/useUserSearch';
import { adminButtonPrimary, adminButtonOutline, adminInput } from '../shared/adminStyles';

/**
 * @typedef {Object} AddGuestModalProps
 * @property {boolean} isOpen
 * @property {string} eventId
 * @property {() => void} onClose
 * @property {() => void} onGuestAdded
 */

/**
 * Two-step modal for adding a guest to an event:
 * Step 1: Search for a user by username
 * Step 2: Confirm and create a comp ticket
 * @param {AddGuestModalProps} props
 */
function AddGuestModal({ isOpen, eventId, onClose, onGuestAdded }) {
  const [step, setStep] = useState(1);
  const [selectedUser, setSelectedUser] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [query, setQuery] = useState('');

  const { results, isLoading, error, search, clear } = useUserSearch({ includeEmail: true });
  const inputRef = useRef(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setSelectedUser(null);
      setQuantity(1);
      setIsSubmitting(false);
      setQuery('');
      clear();
    }
  }, [isOpen, clear]);

  // Auto-focus search input when on step 1
  useEffect(() => {
    if (isOpen && step === 1) {
      // Small delay to ensure the DOM is ready
      const timer = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen, step]);

  // Close on Escape
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape' && !isSubmitting) onClose();
    },
    [isSubmitting, onClose],
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  const handleSearchChange = useCallback(
    (e) => {
      const value = e.target.value;
      setQuery(value);
      search(value);
    },
    [search],
  );

  const handleSelectUser = useCallback((user) => {
    setSelectedUser(user);
    setStep(2);
  }, []);

  const handleBack = useCallback(() => {
    setSelectedUser(null);
    setStep(1);
  }, []);

  const handleCreateTicket = useCallback(async () => {
    if (!selectedUser || isSubmitting) return;

    const baseUrl = process.env.NEXT_PUBLIC_FUNCTIONS_BASE_URL;
    const proxyKey = process.env.NEXT_PUBLIC_PROXY_KEY;

    if (!baseUrl || !proxyKey) {
      toast.error('Missing environment configuration');
      return;
    }

    setIsSubmitting(true);

    try {
      const resp = await fetch(`${baseUrl}/manual-create-ticket`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-proxy-key': proxyKey,
        },
        cache: 'no-store',
        credentials: 'omit',
        body: JSON.stringify({
          uid: selectedUser.uid,
          eventId,
          qty: quantity,
          priceCents: 0,
        }),
      });

      let data;
      try {
        data = await resp.json();
      } catch {
        toast.error(`Failed to add guest (HTTP ${resp.status})`);
        return;
      }

      if (!resp.ok) {
        toast.error(data?.message || data?.error || 'Failed to add guest');
        return;
      }

      toast.success(`Added ${selectedUser.displayName || selectedUser.username} to guest list`);
      onGuestAdded();
      onClose();
    } catch (err) {
      console.error('Add guest error:', err);
      toast.error('Failed to add guest. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedUser, isSubmitting, eventId, quantity, onGuestAdded, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elev-1)] p-6 shadow-2xl">
        <h3 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">Add Guest</h3>

        {step === 1 ? (
          /* Step 1: Search */
          <div>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={handleSearchChange}
              placeholder="Search by username or email..."
              className={adminInput}
            />

            <div className="mt-3 max-h-64 overflow-y-auto">
              {isLoading && (
                <div className="flex items-center justify-center py-6">
                  <svg className="h-5 w-5 animate-spin text-[var(--text-tertiary)]" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                </div>
              )}

              {!isLoading && error && (
                <div className="py-4 text-center">
                  <p className="text-sm text-[var(--danger)]">Search failed</p>
                  <button
                    onClick={() => search(query)}
                    className="mt-1 text-sm text-[var(--text-secondary)] underline hover:text-[var(--text-primary)]"
                  >
                    Retry
                  </button>
                </div>
              )}

              {!isLoading && !error && query && results.length === 0 && (
                <p className="py-4 text-center text-sm text-[var(--text-tertiary)]">
                  No users found. Check the username or email and try again.
                </p>
              )}

              {!isLoading &&
                results.map((user) => (
                  <button
                    key={user.uid}
                    onClick={() => handleSelectUser(user)}
                    className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors hover:bg-[var(--bg-elev-2)]"
                  >
                    {user.profilePicture ? (
                      <img
                        src={user.profilePicture}
                        alt=""
                        className="h-8 w-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-600 text-sm font-semibold text-white">
                        {(user.displayName || user.username || '?').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[var(--text-primary)]">
                        {user.displayName || user.username}
                      </p>
                      <p className="truncate text-xs text-[var(--text-tertiary)]">
                        {user.username ? `@${user.username}` : ''}
                        {user.username && user.email ? ' · ' : ''}
                        {user.email || ''}
                      </p>
                    </div>
                  </button>
                ))}
            </div>

            <div className="mt-4 flex justify-end">
              <button onClick={onClose} className={adminButtonOutline}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          /* Step 2: Confirm */
          <div>
            {/* Selected user card */}
            <div className="mb-4 flex items-center gap-3 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-elev-2)] p-3">
              {selectedUser.profilePicture ? (
                <img
                  src={selectedUser.profilePicture}
                  alt=""
                  className="h-10 w-10 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-600 text-sm font-semibold text-white">
                  {(selectedUser.displayName || selectedUser.username || '?').charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-[var(--text-primary)]">
                  {selectedUser.displayName || selectedUser.username}
                </p>
                <p className="truncate text-xs text-[var(--text-tertiary)]">@{selectedUser.username}</p>
              </div>
            </div>

            {/* Quantity picker */}
            <label className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">
              Ticket Quantity
            </label>
            <input
              type="number"
              min={1}
              max={10}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Math.min(10, Number(e.target.value) || 1)))}
              className={`${adminInput} mb-4 w-24`}
            />

            {/* Info callout */}
            <div className="mb-4 rounded-md bg-blue-500/10 p-3">
              <p className="text-sm text-blue-400">
                This will create a complimentary ticket ({quantity === 1 ? '1 entry' : `${quantity} entries`}).
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={handleBack}
                disabled={isSubmitting}
                className={adminButtonOutline}
              >
                Back
              </button>
              <button
                onClick={handleCreateTicket}
                disabled={isSubmitting}
                className={adminButtonPrimary}
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Creating...
                  </span>
                ) : (
                  'Create Ticket'
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(AddGuestModal);
