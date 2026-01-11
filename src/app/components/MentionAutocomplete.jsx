'use client';

import { memo, useEffect, useRef, useState } from 'react';
import { useUserSearch } from '../../../lib/hooks/useUserSearch';
import MentionUserRow from './MentionUserRow';

/**
 * @typedef {import('../../../lib/firebase/userSearch').MentionUser} MentionUser
 */

/**
 * Autocomplete dropdown for @mentions
 * @param {Object} props
 * @param {string} props.query - Search query (text after @)
 * @param {boolean} props.isOpen - Whether dropdown is visible
 * @param {(user: MentionUser) => void} props.onSelect - Selection callback
 * @param {() => void} props.onClose - Close callback
 * @param {number} props.selectedIndex - Currently highlighted index
 * @param {(index: number) => void} props.onSelectedIndexChange - Update selection
 */
function MentionAutocomplete({
  query,
  isOpen,
  onSelect,
  onClose,
  selectedIndex,
  onSelectedIndexChange,
}) {
  const { results, isLoading, error, search, clear } = useUserSearch();
  const listRef = useRef(null);
  const [isOffline, setIsOffline] = useState(
    typeof navigator !== 'undefined' ? !navigator.onLine : false,
  );

  // Handle online/offline state
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Handle click outside to dismiss
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e) => {
      if (listRef.current && !listRef.current.contains(e.target)) {
        onClose();
      }
    };

    // Use mousedown to catch click before textarea loses focus
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  // Trigger search when query changes
  useEffect(() => {
    if (isOpen && query) {
      search(query);
    } else {
      clear();
    }
  }, [query, isOpen, search, clear]);

  // Handle keyboard selection (Enter/Tab)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Enter' || e.key === 'Tab') {
        if (results.length > 0 && selectedIndex >= 0 && selectedIndex < results.length) {
          e.preventDefault();
          onSelect(results[selectedIndex]);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex, onSelect]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current && results.length > 0) {
      const selectedElement = listRef.current.querySelector(`[data-index="${selectedIndex}"]`);
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex, results.length]);

  // Reset selection when results change
  useEffect(() => {
    if (results.length > 0 && selectedIndex >= results.length) {
      onSelectedIndexChange(0);
    }
  }, [results.length, selectedIndex, onSelectedIndexChange]);

  if (!isOpen) return null;

  // Loading state
  if (isLoading && results.length === 0) {
    return (
      <div className="absolute left-0 right-0 z-50 mt-1 overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elev-1)] shadow-lg">
        <div className="flex items-center justify-center px-4 py-3">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--text-tertiary)] border-t-transparent" />
          <span className="ml-2 text-sm text-[var(--text-tertiary)]">Searching...</span>
        </div>
      </div>
    );
  }

  // Offline state
  if (isOffline) {
    return (
      <div className="absolute left-0 right-0 z-50 mt-1 overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elev-1)] shadow-lg">
        <div className="px-4 py-3 text-center">
          <p className="text-sm text-[var(--text-tertiary)]">
            You&apos;re offline. Connect to search users.
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="absolute left-0 right-0 z-50 mt-1 overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elev-1)] shadow-lg">
        <div className="px-4 py-3 text-center">
          <p className="text-sm text-[var(--text-tertiary)]">Couldn&apos;t search users</p>
          <button
            type="button"
            onClick={() => search(query)}
            className="mt-1 text-sm text-[#ff1f42] hover:underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  // Empty state (only show after search completes)
  if (!isLoading && query && results.length === 0) {
    return (
      <div className="absolute left-0 right-0 z-50 mt-1 overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elev-1)] shadow-lg">
        <div className="px-4 py-3 text-center text-sm text-[var(--text-tertiary)]">
          No users found
        </div>
      </div>
    );
  }

  // Results list
  if (results.length === 0) return null;

  return (
    <div
      ref={listRef}
      id="mention-listbox"
      role="listbox"
      aria-label="User suggestions"
      aria-activedescendant={`mention-user-${selectedIndex}`}
      className="absolute left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elev-1)] shadow-lg"
    >
      {/* Screen reader announcement */}
      <div aria-live="polite" className="sr-only">
        {results.length} user{results.length !== 1 ? 's' : ''} found
      </div>

      {results.map((user, index) => (
        <MentionUserRow
          key={user.uid}
          id={`mention-user-${index}`}
          data-index={index}
          user={user}
          isSelected={index === selectedIndex}
          onSelect={() => onSelect(user)}
          onHover={() => onSelectedIndexChange(index)}
        />
      ))}
    </div>
  );
}

export default memo(MentionAutocomplete);
