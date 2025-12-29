'use client';

import BellIcon from '@heroicons/react/24/outline/BellIcon';
import Link from 'next/link';
import { useUnreadNotificationsCount } from '../../../lib/hooks';

/**
 * Notification bell icon with unread count badge.
 * Links to /account/notifications.
 * @param {object} props
 * @param {string} props.userId - Current user's UID (required for badge count)
 * @param {string} [props.className] - Additional classes for the link wrapper
 */
export default function NotificationBell({ userId, className = '' }) {
  const [unreadCount] = useUnreadNotificationsCount(userId);

  return (
    <Link
      href="/account/notifications"
      aria-label="Notifications"
      className={`relative inline-flex items-center justify-center text-gray-100 active:opacity-80 ${className}`}
    >
      <BellIcon className="h-6 w-6" aria-hidden="true" />
      {unreadCount > 0 && (
        <span
          aria-label={`${unreadCount} unread notifications`}
          className="pointer-events-none absolute -right-0.5 -top-0.5 inline-flex min-w-[18px] max-w-[30px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold leading-4 text-white shadow ring-1 ring-black/40"
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </Link>
  );
}
