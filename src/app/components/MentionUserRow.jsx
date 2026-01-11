'use client';

import Image from 'next/image';
import { memo } from 'react';

/**
 * @typedef {import('../../../lib/firebase/userSearch').MentionUser} MentionUser
 */

/**
 * Single user row in the mention autocomplete dropdown
 * @param {Object} props
 * @param {MentionUser} props.user - User data
 * @param {boolean} props.isSelected - Whether this row is highlighted
 * @param {() => void} props.onSelect - Selection callback
 * @param {() => void} props.onHover - Hover callback for keyboard+mouse hybrid
 * @param {string} [props.id] - Element ID for aria-activedescendant
 */
function MentionUserRow({ user, isSelected, onSelect, onHover, id }) {
  return (
    <div
      id={id}
      role="option"
      aria-selected={isSelected}
      className={`flex cursor-pointer items-center gap-3 px-3 py-2 transition-colors ${
        isSelected ? 'bg-[var(--bg-elev-2)]' : 'hover:bg-[var(--bg-elev-2)]'
      }`}
      onClick={onSelect}
      onMouseEnter={onHover}
    >
      {/* Avatar */}
      <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-[var(--bg-elev-2)]">
        {user.profilePicture ? (
          <Image
            src={user.profilePicture}
            alt={user.displayName}
            fill
            className="object-cover"
            sizes="36px"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm font-medium text-[var(--text-secondary)]">
            {user.displayName?.charAt(0)?.toUpperCase() || '@'}
          </div>
        )}
      </div>

      {/* User info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1">
          <span className="truncate font-semibold text-[var(--text-primary)]">
            @{user.username}
          </span>
          {user.verified && (
            <svg
              className="h-4 w-4 shrink-0 text-[#ff1f42]"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-label="Verified"
            >
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
            </svg>
          )}
        </div>
        <div className="truncate text-sm text-[var(--text-tertiary)]">{user.displayName}</div>
      </div>
    </div>
  );
}

export default memo(MentionUserRow);
