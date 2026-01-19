'use client';

import Link from 'next/link';
import { memo } from 'react';

/**
 * Format relative time for chat list (e.g., "2m", "1h", "Yesterday")
 * @param {Date} date
 * @returns {string}
 */
function formatRelativeTime(date) {
  if (!date) return '';

  const now = new Date();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;
  if (hours < 24) return `${hours}h`;
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * @typedef {import('../../../../lib/types/chat').ChatSummary} ChatSummary
 */

/**
 * @typedef {Object} ChatListItemProps
 * @property {ChatSummary} chat - The chat summary data
 */

/**
 * Individual chat list item for the chat list
 * @param {ChatListItemProps} props
 */
function ChatListItem({ chat }) {
  const isEvent = chat.type === 'event';
  const displayName = isEvent ? chat.eventName : chat.peerName;
  const photoURL = isEvent ? null : chat.peerPhoto;
  const hasUnread = chat.unreadCount > 0;

  // Get last message preview text
  const getPreviewText = () => {
    if (!chat.lastMessage) return 'No messages yet';
    if (chat.lastMessage.type === 'image') return '📷 Photo';
    if (chat.lastMessage.type === 'video') return '🎬 Video';
    return chat.lastMessage.text || '';
  };

  return (
    <Link
      href={`/chat/${chat.chatId}`}
      className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[var(--bg-hover)] border-b border-[var(--border-subtle)]"
      role="listitem"
      aria-label={`${hasUnread ? `${chat.unreadCount} unread messages from ` : ''}${displayName || 'Chat'}`}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        {isEvent ? (
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--bg-elev-2)]">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="h-6 w-6 text-[var(--text-tertiary)]"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
              />
            </svg>
          </div>
        ) : photoURL ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={photoURL}
            alt={displayName || 'User'}
            loading="lazy"
            className="h-12 w-12 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[var(--accent)] to-[var(--accent-glow)]">
            <span className="text-lg font-semibold text-white">
              {displayName?.[0]?.toUpperCase() || '?'}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p
            className={`truncate text-[15px] ${hasUnread ? 'font-semibold text-[var(--text-primary)]' : 'text-[var(--text-primary)]'}`}
          >
            {displayName || 'Chat'}
          </p>
          {chat.lastMessage && (
            <span className="flex-shrink-0 text-xs text-[var(--text-tertiary)]">
              {formatRelativeTime(chat.lastMessage.createdAt)}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between gap-2">
          <p
            className={`truncate text-sm ${hasUnread ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}
          >
            {getPreviewText()}
          </p>
          {hasUnread && (
            <span className="flex-shrink-0 rounded-full bg-[var(--accent)] px-2 py-0.5 text-xs font-semibold text-white">
              {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

export default memo(ChatListItem);
