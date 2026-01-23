'use client';

import BellIcon from '@heroicons/react/24/outline/BellIcon';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
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
  const prevCountRef = useRef(unreadCount);
  const [isAnimating, setIsAnimating] = useState(false);

  // Detect count changes and trigger animation
  useEffect(() => {
    if (prevCountRef.current !== unreadCount && unreadCount > 0) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 600);
      return () => clearTimeout(timer);
    }
    prevCountRef.current = unreadCount;
  }, [unreadCount]);

  return (
    <Link
      href="/account/notifications"
      aria-label="Notifications"
      className={`relative inline-flex items-center justify-center text-[var(--text-primary)] transition-all duration-150 hover:scale-110 hover:text-[var(--accent)] active:scale-95 ${className}`}
    >
      <BellIcon
        className={`h-6 w-6 transition-transform duration-300 ${isAnimating ? 'animate-wiggle' : ''}`}
        aria-hidden="true"
      />
      {unreadCount > 0 && (
        <span
          aria-label={`${unreadCount} unread notifications`}
          className={`pointer-events-none absolute -right-0.5 -top-0.5 inline-flex min-w-[18px] max-w-[30px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold leading-4 text-white shadow ring-1 ring-black/40 transition-transform duration-300 ${isAnimating ? 'animate-badge-pop' : ''}`}
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </Link>
  );
}
