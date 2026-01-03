'use client';

import { GiftIcon, XMarkIcon } from '@heroicons/react/24/outline';
import QRCode from 'qrcode.react';
import { useState } from 'react';
import { useAuth } from '../firebase/context/FirebaseContext';
import { downloadEventICS } from '../lib/utils/generateICS';
import TransferTicketModal from './TransferTicketModal';

/**
 * Ticket Detail Modal - "Event Day Hero" experience
 * Optimized for the "get me in the door NOW" moment
 * Now with ticket transfer capability
 */
export default function TicketDetailModal({ ticket, isOpen, onClose, onTransferComplete }) {
  const { currentUser } = useAuth();
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState('');

  if (!isOpen || !ticket) return null;

  // Determine if ticket can be transferred
  // Cannot transfer: used tickets, past events, tickets already pending transfer
  const canTransfer = (() => {
    if (!ticket) return false;
    if (ticket.usedCount > 0) return false;
    if (ticket.pendingTransferTo) return false;
    if (ticket.status === 'inactive' || ticket.active === false) return false;

    // Check if event is in the past
    if (ticket.eventDate) {
      const eventDate = new Date(ticket.eventDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (eventDate < today) return false;
    }

    return true;
  })();

  // Handle cancel transfer
  const handleCancelTransfer = async () => {
    if (!ticket.pendingTransferId || !currentUser?.uid) return;

    setIsCancelling(true);
    setCancelError('');

    try {
      const response = await fetch('/api/payments/cancel-transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transferId: ticket.pendingTransferId,
          senderUserId: currentUser.uid,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel transfer');
      }

      // Notify parent to refresh tickets
      if (onTransferComplete) {
        onTransferComplete({ cancelled: true });
      }
      onClose();
    } catch (err) {
      console.error('Cancel transfer error:', err);
      setCancelError(err.message || 'Failed to cancel transfer');
    } finally {
      setIsCancelling(false);
    }
  };

  const handleTransferComplete = (result) => {
    setShowTransferModal(false);
    if (onTransferComplete) {
      onTransferComplete(result);
    }
    // Close the main modal after successful transfer
    onClose();
  };

  // Generate QR value - uses ticketToken if available, otherwise falls back to eventId-oderId pattern
  const qrValue = ticket.ticketToken || `${ticket.eventId}-${ticket.id}`;

  // Format event date with day-of-week
  const formatEventDate = (dateStr, timeStr) => {
    if (!dateStr) return null;
    try {
      const date = new Date(dateStr);
      const options = { weekday: 'short', month: 'short', day: 'numeric' };
      const formatted = date.toLocaleDateString('en-US', options);
      return timeStr ? `${formatted} • ${timeStr}` : formatted;
    } catch {
      return dateStr;
    }
  };

  const formattedDate = formatEventDate(ticket.eventDate, ticket.eventTime);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[95vh] w-full overflow-y-auto rounded-t-xl border border-[var(--border-subtle)] bg-[var(--bg-elev-1)] shadow-xl sm:max-h-[90vh] sm:max-w-md sm:rounded-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-6 py-4">
          <h2 className="text-lg font-bold text-[var(--text-primary)]">Your Ticket</h2>
          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full text-[var(--text-secondary)] transition hover:bg-[var(--bg-elev-2)] hover:text-[var(--text-primary)]"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-col items-center p-6">
          {/* QR Code - Large, high contrast, theme-independent */}
          <div className="rounded-xl bg-white p-4 shadow-lg">
            <QRCode
              value={qrValue}
              size={280}
              level="H"
              includeMargin={false}
              bgColor="#FFFFFF"
              fgColor="#000000"
            />
          </div>

          {/* Ticket holder name + count */}
          <div className="mt-6 text-center">
            {ticket.holderName && (
              <p className="text-lg font-semibold text-[var(--text-primary)]">
                {ticket.holderName}
              </p>
            )}
            {ticket.ticketIndex && ticket.ticketCount && (
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Ticket #{ticket.ticketIndex} of {ticket.ticketCount}
              </p>
            )}
            <p className="mt-2 text-sm text-[var(--text-tertiary)]">
              Show this QR code at the door
            </p>
          </div>

          {/* Event Details Section */}
          <div className="mt-6 w-full border-t border-[var(--border-subtle)] pt-6">
            {ticket.eventName && (
              <p className="text-center text-xl font-bold text-[var(--text-primary)]">
                🎉 {ticket.eventName}
              </p>
            )}
            {formattedDate && (
              <p className="mt-2 text-center text-sm text-[var(--text-secondary)]">
                📅 {formattedDate}
              </p>
            )}
            {ticket.location && (
              <p className="mt-1 text-center text-sm text-[var(--text-secondary)]">
                📍 {ticket.location}
              </p>
            )}
          </div>

          {/* Quick Action Buttons */}
          <div className="mt-6 flex w-full gap-3">
            <button
              onClick={() => downloadEventICS(ticket)}
              className="flex h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elev-2)] text-sm font-medium text-[var(--text-primary)] transition hover:bg-[var(--bg-elev-3)]"
            >
              📅 Add to Calendar
            </button>
            {ticket.location && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ticket.location)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elev-2)] text-sm font-medium text-[var(--text-primary)] transition hover:bg-[var(--bg-elev-3)]"
              >
                🗺 Get Directions
              </a>
            )}
          </div>

          {/* Transfer Ticket Button */}
          {canTransfer && (
            <button
              onClick={() => setShowTransferModal(true)}
              className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-red-500/30 bg-red-600/20 text-sm font-medium text-[var(--text-primary)] transition hover:bg-red-600/30"
            >
              <GiftIcon className="h-5 w-5 text-red-500" />
              Transfer to a Friend
            </button>
          )}

          {/* Pending Transfer Notice with Cancel Button */}
          {ticket.pendingTransferTo && (
            <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
              <p className="text-center text-sm text-amber-400">
                ⏳ Transfer pending to {ticket.pendingTransferTo}
              </p>
              {cancelError && (
                <p className="mt-2 text-center text-xs text-red-400">{cancelError}</p>
              )}
              <button
                onClick={handleCancelTransfer}
                disabled={isCancelling}
                className="mt-3 flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-red-500/30 bg-red-600/20 text-sm font-medium text-red-400 transition hover:bg-red-600/30 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isCancelling ? (
                  <>
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-red-400/30 border-t-red-400"></div>
                    Cancelling...
                  </>
                ) : (
                  <>
                    <XMarkIcon className="h-4 w-4" />
                    Cancel Transfer
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Transfer Ticket Modal */}
      <TransferTicketModal
        ticket={ticket}
        isOpen={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        onTransferComplete={handleTransferComplete}
      />
    </div>
  );
}
