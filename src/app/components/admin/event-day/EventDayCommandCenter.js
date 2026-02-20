'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { StatCardSkeleton, TableSkeleton } from '../shared/AdminSkeleton';
import AdminErrorState from '../shared/AdminErrorState';
import EventSelector from './EventSelector';
import CheckInStats from './CheckInStats';
import GuestListTable from './GuestListTable';
import CheckInConfirmModal from './CheckInConfirmModal';
import { useEventDayData } from './useEventDayData';

export default function EventDayCommandCenter() {
  const [selectedEventId, setSelectedEventId] = useState(() => {
    if (typeof window === 'undefined') return '';
    try {
      return localStorage.getItem('eventDaySelectedEvent') || '';
    } catch {
      return '';
    }
  });

  const { guests, stats, loading, error, refreshGuests, updateGuestAfterCheckIn } =
    useEventDayData(selectedEventId);

  const [confirmGuest, setConfirmGuest] = useState(null);
  const [checkingInId, setCheckingInId] = useState(null);

  const handleEventChange = useCallback((eventId) => {
    setSelectedEventId(eventId);
    try {
      localStorage.setItem('eventDaySelectedEvent', eventId);
    } catch {}
  }, []);

  const handleCheckIn = useCallback((guest) => {
    setConfirmGuest(guest);
  }, []);

  const handleConfirmCheckIn = useCallback(async () => {
    if (!confirmGuest) return;

    const baseUrl = process.env.NEXT_PUBLIC_FUNCTIONS_BASE_URL;
    const proxyKey = process.env.NEXT_PUBLIC_PROXY_KEY;

    if (!baseUrl || !proxyKey) {
      toast.error('Missing environment configuration');
      return;
    }

    setCheckingInId(confirmGuest.id);

    try {
      const resp = await fetch(`${baseUrl}/scan-ticket`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-proxy-key': proxyKey,
        },
        cache: 'no-store',
        credentials: 'omit',
        body: JSON.stringify({
          userId: confirmGuest.userId,
          ragerId: confirmGuest.id,
          eventId: selectedEventId,
          scannerId: 'admin-event-day',
        }),
      });

      let data;
      try {
        data = await resp.json();
      } catch {
        toast.error(`Check-in failed (HTTP ${resp.status})`);
        return;
      }

      if (!resp.ok) {
        toast.error(data?.message || data?.error || 'Check-in failed');
        return;
      }

      updateGuestAfterCheckIn(confirmGuest.id, data);
      toast.success(`Checked in ${confirmGuest.displayName}`);
    } catch (err) {
      console.error('Check-in error:', err);
      toast.error('Check-in failed. Please try again.');
    } finally {
      setCheckingInId(null);
      setConfirmGuest(null);
    }
  }, [confirmGuest, selectedEventId, updateGuestAfterCheckIn]);

  const handleCancelModal = useCallback(() => {
    if (!checkingInId) setConfirmGuest(null);
  }, [checkingInId]);

  const handleOpenScanner = useCallback(() => {
    try {
      localStorage.setItem('scannerEventId', selectedEventId);
    } catch {}
  }, [selectedEventId]);

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="mb-1 text-sm text-[var(--text-tertiary)]">
          <Link href="/admin" className="hover:text-[var(--text-secondary)] transition-colors">
            Admin
          </Link>
          {' \u203A '}
          <span className="text-[var(--text-secondary)]">Event Day</span>
        </div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          Event Day Command Center
        </h1>
      </div>

      {/* Actions bar */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <EventSelector
          selectedEventId={selectedEventId}
          onEventChange={handleEventChange}
        />
        <div className="flex gap-2">
          <button
            onClick={refreshGuests}
            disabled={loading || !selectedEventId}
            className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border-subtle)] px-3 py-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-elev-2)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
          {selectedEventId && (
            <Link
              href="/admin/scanner"
              onClick={handleOpenScanner}
              className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border-subtle)] px-3 py-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-elev-2)]"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
              Open Scanner
            </Link>
          )}
        </div>
      </div>

      {/* Content */}
      {!selectedEventId ? (
        <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elev-1)] p-12 text-center">
          <svg className="mx-auto mb-3 h-12 w-12 text-[var(--text-tertiary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-lg font-medium text-[var(--text-secondary)]">
            Select an event to view the guest list.
          </p>
        </div>
      ) : loading ? (
        <div>
          <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <StatCardSkeleton key={i} />
            ))}
          </div>
          <TableSkeleton rows={8} columns={6} />
        </div>
      ) : error ? (
        <AdminErrorState
          title="Error loading guest list"
          message={error}
          onRetry={refreshGuests}
          variant="fullPage"
        />
      ) : (
        <div className="space-y-6">
          <CheckInStats stats={stats} />
          <GuestListTable
            guests={guests}
            onCheckIn={handleCheckIn}
            checkingInId={checkingInId}
          />
        </div>
      )}

      {/* Confirmation modal */}
      <CheckInConfirmModal
        guest={confirmGuest}
        isOpen={!!confirmGuest}
        isLoading={!!checkingInId}
        onConfirm={handleConfirmCheckIn}
        onCancel={handleCancelModal}
      />
    </div>
  );
}
