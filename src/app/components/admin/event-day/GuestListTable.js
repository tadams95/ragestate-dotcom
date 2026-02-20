'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { adminInput } from '../shared/adminStyles';
import GuestListRow from './GuestListRow';

/**
 * @param {{ guests: Array, onCheckIn: (guest: Object) => void, checkingInId: string|null }} props
 */
export default function GuestListTable({ guests, onCheckIn, checkingInId }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortField, setSortField] = useState('displayName');
  const [sortDirection, setSortDirection] = useState('asc');
  const searchTimer = useRef(null);

  // Debounce search (300ms)
  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim().toLowerCase());
    }, 300);
    return () => clearTimeout(searchTimer.current);
  }, [searchQuery]);

  // Filter by search
  const filtered = useMemo(() => {
    if (!debouncedSearch) return guests;
    return guests.filter((g) => {
      const name = (g.displayName || '').toLowerCase();
      const email = (g.email || '').toLowerCase();
      return name.includes(debouncedSearch) || email.includes(debouncedSearch);
    });
  }, [guests, debouncedSearch]);

  // Sort
  const sorted = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'displayName') {
        cmp = (a.displayName || '').localeCompare(b.displayName || '');
      } else if (sortField === 'usedCount') {
        cmp = (a.usedCount || 0) - (b.usedCount || 0);
      } else if (sortField === 'tierName') {
        cmp = (a.tierName || '').localeCompare(b.tierName || '');
      }
      return sortDirection === 'asc' ? cmp : -cmp;
    });
    return copy;
  }, [filtered, sortField, sortDirection]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const SortArrow = ({ field }) => {
    if (sortField !== field) return null;
    return (
      <span className="ml-1 inline-block">
        {sortDirection === 'asc' ? '\u2191' : '\u2193'}
      </span>
    );
  };

  const thClass =
    'px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)] cursor-pointer select-none hover:text-[var(--text-primary)] transition-colors sm:px-6';

  if (guests.length === 0) {
    return (
      <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elev-2)] p-8 text-center">
        <svg className="mx-auto mb-3 h-10 w-10 text-[var(--text-tertiary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
        </svg>
        <p className="text-[var(--text-tertiary)]">No tickets found for this event.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Search */}
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="text"
          placeholder="Search by name or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={`${adminInput} sm:max-w-xs`}
        />
        <p className="text-sm text-[var(--text-tertiary)]">
          Showing {sorted.length} of {guests.length} guests
        </p>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elev-2)] shadow-md">
        {debouncedSearch && sorted.length === 0 ? (
          <div className="p-8 text-center text-[var(--text-tertiary)]">
            No guests match &ldquo;{searchQuery.trim()}&rdquo;
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[var(--border-subtle)]">
              <thead>
                <tr className="bg-[var(--bg-elev-2)]">
                  <th className={thClass} onClick={() => handleSort('displayName')}>
                    Name<SortArrow field="displayName" />
                  </th>
                  <th className={`${thClass} hidden sm:table-cell`}>Email</th>
                  <th className={`${thClass} hidden md:table-cell`} onClick={() => handleSort('tierName')}>
                    Type<SortArrow field="tierName" />
                  </th>
                  <th className={thClass} onClick={() => handleSort('usedCount')}>
                    Status<SortArrow field="usedCount" />
                  </th>
                  <th className={`${thClass} hidden md:table-cell`}>Last Scan</th>
                  <th className={thClass}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {sorted.map((guest) => (
                  <GuestListRow
                    key={guest.id}
                    guest={guest}
                    onCheckIn={onCheckIn}
                    isCheckingIn={checkingInId === guest.id}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
