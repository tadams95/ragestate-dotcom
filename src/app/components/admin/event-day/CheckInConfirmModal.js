'use client';

import { memo, useCallback, useEffect } from 'react';
import { adminButtonPrimary, adminButtonOutline } from '../shared/adminStyles';

/**
 * @param {{ guest: Object|null, isOpen: boolean, isLoading: boolean, onConfirm: () => void, onCancel: () => void }} props
 */
function CheckInConfirmModal({ guest, isOpen, isLoading, onConfirm, onCancel }) {
  // Close on Escape
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape' && !isLoading) onCancel();
    },
    [isLoading, onCancel],
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  if (!isOpen || !guest) return null;

  const { displayName, email, usedCount = 0, quantity = 1 } = guest;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) onCancel();
      }}
    >
      <div className="w-full max-w-md rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elev-1)] p-6 shadow-2xl">
        <h3 className="mb-1 text-lg font-semibold text-[var(--text-primary)]">
          Confirm Check-In
        </h3>

        <div className="mb-4 mt-3 space-y-2">
          <p className="text-sm text-[var(--text-primary)]">
            <span className="font-semibold">{displayName}</span>
          </p>
          {email && (
            <p className="text-sm text-[var(--text-secondary)]">{email}</p>
          )}
          <p className="text-sm text-[var(--text-secondary)]">
            {usedCount} of {quantity} tickets used
          </p>
        </div>

        <div className="mb-4 rounded-md bg-amber-500/10 p-3">
          <p className="text-sm text-amber-400">
            This will use 1 ticket entry.
          </p>
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className={adminButtonOutline}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={adminButtonPrimary}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Checking in...
              </span>
            ) : (
              'Confirm Check-In'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default memo(CheckInConfirmModal);
