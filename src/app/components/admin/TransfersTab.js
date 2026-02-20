'use client';

import {
  ArrowPathIcon,
  CheckCircleIcon,
  ClockIcon,
  MagnifyingGlassIcon,
  XCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { collection, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
import { useCallback, useEffect, useState } from 'react';
import { db } from '../../../../firebase/firebase';
import { adminInput } from './shared/adminStyles';

/**
 * Get status badge styling
 */
function getStatusBadge(status) {
  switch (status) {
    case 'claimed':
      return {
        label: 'Claimed',
        icon: CheckCircleIcon,
        className: 'bg-green-500/20 text-[var(--success)]',
      };
    case 'pending':
      return {
        label: 'Pending',
        icon: ClockIcon,
        className: 'bg-amber-500/20 text-[var(--warning)]',
      };
    case 'expired':
      return {
        label: 'Expired',
        icon: XCircleIcon,
        className: 'bg-gray-500/30 text-gray-400',
      };
    case 'cancelled':
      return {
        label: 'Cancelled',
        icon: XCircleIcon,
        className: 'bg-red-500/20 text-red-400',
      };
    default:
      return {
        label: status || 'Unknown',
        icon: ClockIcon,
        className: 'bg-gray-500/30 text-gray-400',
      };
  }
}

/**
 * Format timestamp to readable string
 */
function formatTimestamp(ts) {
  if (!ts) return '—';
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function TransfersTab() {
  const inputStyling = adminInput;
  const [searchType, setSearchType] = useState('email'); // 'email' | 'userEmail' | 'event'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEventId, setSelectedEventId] = useState('');
  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState(null);

  // Cancel modal state
  const [cancelModal, setCancelModal] = useState({ open: false, transfer: null });
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState(null);

  // Load events for dropdown
  useEffect(() => {
    async function loadEvents() {
      try {
        const eventsRef = collection(db, 'events');
        const q = query(eventsRef, orderBy('dateTime', 'desc'), limit(50));
        const snap = await getDocs(q);
        const eventList = snap.docs.map((d) => ({
          id: d.id,
          title: d.data().title || d.id,
          dateTime: d.data().dateTime,
        }));
        setEvents(eventList);
      } catch (err) {
        console.error('Error loading events:', err);
      } finally {
        setEventsLoading(false);
      }
    }
    loadEvents();
  }, []);

  // Look up user by email to get their userId
  const findUserByEmail = async (email) => {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', email.toLowerCase()), limit(1));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return snap.docs[0].id;
  };

  const handleSearch = useCallback(async () => {
    // For event search, use selectedEventId; for others, use searchQuery
    const searchValue = searchType === 'event' ? selectedEventId : searchQuery.trim();
    if (!searchValue) return;

    setLoading(true);
    setError(null);
    setSearched(true);

    try {
      const transfersRef = collection(db, 'ticketTransfers');
      let results = [];

      if (searchType === 'email') {
        // Search by recipient email (toEmail field)
        const q = query(
          transfersRef,
          where('toEmail', '==', searchValue.toLowerCase()),
          orderBy('createdAt', 'desc'),
          limit(50),
        );
        const snap = await getDocs(q);
        results = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      } else if (searchType === 'userEmail') {
        // Look up user by email first, then search transfers by userId
        const userId = await findUserByEmail(searchValue);
        if (!userId) {
          setError('No user found with that email address.');
          setTransfers([]);
          setLoading(false);
          return;
        }

        // Search both sent and received
        const [sentSnap, receivedSnap] = await Promise.all([
          getDocs(
            query(
              transfersRef,
              where('fromUserId', '==', userId),
              orderBy('createdAt', 'desc'),
              limit(50),
            ),
          ),
          getDocs(
            query(
              transfersRef,
              where('toUserId', '==', userId),
              orderBy('createdAt', 'desc'),
              limit(50),
            ),
          ),
        ]);

        const sentDocs = sentSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
          _direction: 'sent',
        }));
        const receivedDocs = receivedSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
          _direction: 'received',
        }));

        // Merge and sort
        results = [...sentDocs, ...receivedDocs].sort((a, b) => {
          const aTime = a.createdAt?.toDate?.() || new Date(0);
          const bTime = b.createdAt?.toDate?.() || new Date(0);
          return bTime - aTime;
        });

        // Dedupe
        const seen = new Set();
        results = results.filter((r) => {
          if (seen.has(r.id)) return false;
          seen.add(r.id);
          return true;
        });
      } else if (searchType === 'event') {
        // Search by event ID from dropdown
        const q = query(
          transfersRef,
          where('eventId', '==', searchValue),
          orderBy('createdAt', 'desc'),
          limit(50),
        );
        const snap = await getDocs(q);
        results = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      }

      setTransfers(results);
    } catch (err) {
      console.error('Error searching transfers:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [searchType, searchQuery, selectedEventId]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Admin cancel transfer
  const handleAdminCancel = async () => {
    const transfer = cancelModal.transfer;
    if (!transfer) return;

    setCancelling(true);
    setCancelError(null);

    try {
      const res = await fetch('/api/payments/cancel-transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transferId: transfer.id,
          isAdmin: true,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to cancel transfer');
      }

      // Update local state to reflect cancellation
      setTransfers((prev) =>
        prev.map((t) => (t.id === transfer.id ? { ...t, status: 'cancelled' } : t)),
      );
      setCancelModal({ open: false, transfer: null });
    } catch (err) {
      console.error('Admin cancel error:', err);
      setCancelError(err.message);
    } finally {
      setCancelling(false);
    }
  };

  // Check if search button should be enabled
  const canSearch = searchType === 'event' ? !!selectedEventId : !!searchQuery.trim();

  return (
    <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elev-1)] p-6 shadow-xl">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-[var(--text-primary)]">Transfer Lookup</h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Search ticket transfers by recipient email, user account, or event.
        </p>
      </div>

      {/* Search Controls */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <select
          value={searchType}
          onChange={(e) => {
            setSearchType(e.target.value);
            setSearchQuery('');
            setSelectedEventId('');
            setTransfers([]);
            setSearched(false);
          }}
          className={inputStyling + ' sm:w-44'}
        >
          <option value="email">By Recipient Email</option>
          <option value="userEmail">By User Email</option>
          <option value="event">By Event</option>
        </select>

        {searchType === 'event' ? (
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className={inputStyling + ' flex-1'}
            disabled={eventsLoading}
          >
            <option value="">{eventsLoading ? 'Loading events...' : 'Select an event'}</option>
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.title}
              </option>
            ))}
          </select>
        ) : (
          <div className="relative flex-1">
            <input
              type="email"
              placeholder={searchType === 'email' ? 'recipient@example.com' : 'user@example.com'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className={inputStyling + ' pr-10'}
            />
            <MagnifyingGlassIcon className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--text-tertiary)]" />
          </div>
        )}

        <button
          onClick={handleSearch}
          disabled={loading || !canSearch}
          className="flex items-center justify-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
        >
          {loading ? (
            <ArrowPathIcon className="h-4 w-4 animate-spin" />
          ) : (
            <MagnifyingGlassIcon className="h-4 w-4" />
          )}
          Search
        </button>
      </div>

      {/* Search Type Hints */}
      <div className="mb-4 text-xs text-[var(--text-tertiary)]">
        {searchType === 'email' && 'Search transfers sent TO this email address.'}
        {searchType === 'userEmail' && 'Search all transfers (sent & received) for a user account.'}
        {searchType === 'event' && 'View all transfers for a specific event.'}
      </div>

      {/* Error State */}
      {error && (
        <div className="animate-error-shake mb-4 rounded-md border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Results */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-[var(--accent)]"></div>
        </div>
      ) : searched && transfers.length === 0 ? (
        <div className="py-12 text-center text-[var(--text-tertiary)]">
          No transfers found for this search.
        </div>
      ) : transfers.length > 0 ? (
        <div className="overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elev-2)]">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[var(--border-subtle)]">
              <thead>
                <tr className="bg-[var(--bg-elev-2)]">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                    Event
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                    From
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                    To
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                    Created
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                    Expires
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {transfers.map((transfer) => {
                  const { label, icon: StatusIcon, className } = getStatusBadge(transfer.status);
                  return (
                    <tr key={transfer.id} className="border-l-2 border-l-transparent transition hover:border-l-[var(--accent)] hover:bg-[var(--bg-elev-3)]">
                      <td className="whitespace-nowrap px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${className}`}
                        >
                          <StatusIcon className="h-3 w-3" />
                          {label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-[var(--text-primary)]">
                          {transfer.eventName || transfer.eventId}
                        </div>
                        {transfer.ticketQuantity > 1 && (
                          <div className="text-xs text-[var(--text-tertiary)]">
                            {transfer.ticketQuantity} tickets
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-[var(--text-primary)]">
                          {transfer.fromName || '—'}
                        </div>
                        <div className="text-xs text-[var(--text-tertiary)]">
                          {transfer.fromEmail ||
                            (transfer.fromUserId ? `${transfer.fromUserId.slice(0, 8)}...` : '—')}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-[var(--text-primary)]">
                          {transfer.toUsername
                            ? `@${transfer.toUsername}`
                            : transfer.toEmail || '—'}
                        </div>
                        {transfer.toUserId && (
                          <div className="text-xs text-[var(--text-tertiary)]">
                            {transfer.toUserId.slice(0, 8)}...
                          </div>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-[var(--text-secondary)]">
                        {formatTimestamp(transfer.createdAt)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-[var(--text-secondary)]">
                        {formatTimestamp(transfer.expiresAt)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        {transfer.status === 'pending' && (
                          <button
                            onClick={() => setCancelModal({ open: true, transfer })}
                            className="rounded bg-red-600/20 px-2 py-1 text-xs font-medium text-red-400 transition hover:bg-red-600/40"
                          >
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="border-t border-[var(--border-subtle)] bg-[var(--bg-elev-2)] px-4 py-2 text-xs text-[var(--text-tertiary)]">
            {transfers.length} transfer{transfers.length !== 1 ? 's' : ''} found
          </div>
        </div>
      ) : (
        <div className="py-12 text-center text-[var(--text-tertiary)]">
          Select a search type and enter criteria to find transfers.
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {cancelModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="animate-modal-enter relative w-full max-w-md rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elev-1)] p-6 shadow-xl">
            <button
              onClick={() => {
                setCancelModal({ open: false, transfer: null });
                setCancelError(null);
              }}
              className="absolute right-4 top-4 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>

            <h3 className="mb-2 text-lg font-bold text-[var(--text-primary)]">Cancel Transfer?</h3>

            <p className="mb-4 text-sm text-[var(--text-secondary)]">
              This will cancel the pending transfer and restore the ticket to the original owner.
            </p>

            <div className="mb-4 rounded-md bg-[var(--bg-elev-2)] p-3 text-sm">
              <div className="mb-1 text-[var(--text-tertiary)]">Transfer Details</div>
              <div className="text-[var(--text-primary)]">
                <strong>Event:</strong> {cancelModal.transfer?.eventName || 'Unknown'}
              </div>
              <div className="text-[var(--text-secondary)]">
                <strong>From:</strong>{' '}
                {cancelModal.transfer?.fromName || cancelModal.transfer?.fromEmail || 'Unknown'}
              </div>
              <div className="text-[var(--text-secondary)]">
                <strong>To:</strong>{' '}
                {cancelModal.transfer?.toUsername
                  ? `@${cancelModal.transfer.toUsername}`
                  : cancelModal.transfer?.toEmail || 'Unknown'}
              </div>
            </div>

            {cancelError && (
              <div className="animate-error-shake mb-4 rounded-md border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-400">
                {cancelError}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setCancelModal({ open: false, transfer: null });
                  setCancelError(null);
                }}
                disabled={cancelling}
                className="flex-1 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-elev-2)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] transition hover:bg-[var(--bg-elev-3)] disabled:opacity-50"
              >
                Keep Transfer
              </button>
              <button
                onClick={handleAdminCancel}
                disabled={cancelling}
                className="flex flex-1 items-center justify-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                {cancelling && <ArrowPathIcon className="h-4 w-4 animate-spin" />}
                {cancelling ? 'Cancelling...' : 'Cancel Transfer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
