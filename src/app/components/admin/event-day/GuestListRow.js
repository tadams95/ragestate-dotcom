'use client';

import { memo } from 'react';
import { formatDate } from '../../../../utils/formatters';

/**
 * @param {{ guest: Object, onCheckIn: (guest: Object) => void, isCheckingIn: boolean }} props
 */
function GuestListRow({ guest, onCheckIn, isCheckingIn }) {
  const { displayName, email, tierName, usedCount = 0, quantity = 1, lastScanAt, photoURL } = guest;

  const isExhausted = usedCount >= quantity;

  // Status badge
  let badgeClass, badgeText;
  if (usedCount === 0) {
    badgeClass = 'bg-green-500/20 text-[var(--success)]';
    badgeText = 'Not scanned';
  } else if (usedCount < quantity) {
    badgeClass = 'bg-amber-500/20 text-[var(--warning)]';
    badgeText = `${usedCount}/${quantity} used`;
  } else {
    badgeClass = 'bg-red-500/20 text-[var(--danger)]';
    badgeText = 'Exhausted';
  }

  return (
    <tr className="border-l-2 border-l-transparent transition-colors hover:border-l-[var(--accent)] hover:bg-[var(--bg-elev-1)]">
      {/* Name */}
      <td className="whitespace-nowrap px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          {photoURL ? (
            <img
              src={photoURL}
              alt=""
              className="h-8 w-8 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white">
              {(displayName?.[0] || '?').toUpperCase()}
            </div>
          )}
          <span className="text-sm font-medium text-[var(--text-primary)]">
            {displayName}
          </span>
        </div>
      </td>

      {/* Email */}
      <td className="hidden max-w-[200px] truncate px-4 py-3 text-sm text-[var(--text-secondary)] sm:table-cell sm:px-6">
        {email || 'N/A'}
      </td>

      {/* Ticket Type */}
      <td className="hidden whitespace-nowrap px-4 py-3 text-sm text-[var(--text-secondary)] md:table-cell md:px-6">
        {tierName}
      </td>

      {/* Status */}
      <td className="whitespace-nowrap px-4 py-3 sm:px-6">
        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${badgeClass}`}>
          {badgeText}
        </span>
      </td>

      {/* Last Scan */}
      <td className="hidden whitespace-nowrap px-4 py-3 text-sm md:table-cell md:px-6">
        {lastScanAt ? (
          <span className="text-[var(--text-secondary)]">{formatDate(lastScanAt)}</span>
        ) : (
          <span className="text-[var(--text-tertiary)]">Never</span>
        )}
      </td>

      {/* Actions */}
      <td className="whitespace-nowrap px-4 py-3 sm:px-6">
        <button
          onClick={() => onCheckIn(guest)}
          disabled={isExhausted || isCheckingIn}
          className="inline-flex items-center justify-center rounded-md bg-red-600 px-3 py-1 text-xs font-semibold text-white shadow transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isCheckingIn ? (
            <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            'Check In'
          )}
        </button>
      </td>
    </tr>
  );
}

export default memo(GuestListRow);
