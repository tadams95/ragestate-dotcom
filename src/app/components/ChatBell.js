'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useChatUnreadCount } from '../../../lib/hooks/useChatUnreadCount';

/**
 * Chat icon with unread count badge.
 * Links to /chat.
 * @param {object} props
 * @param {string} [props.className] - Additional classes for the link wrapper
 */
export default function ChatBell({ className = '' }) {
  const unreadCount = useChatUnreadCount();
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
      href="/chat"
      aria-label="Messages"
      className={`relative inline-flex items-center justify-center text-[var(--text-primary)] transition-all duration-150 hover:scale-110 hover:text-[var(--accent)] active:scale-95 ${className}`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className={`h-6 w-6 transition-transform duration-300 ${isAnimating ? 'animate-wiggle' : ''}`}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
        />
      </svg>
      {unreadCount > 0 && (
        <span
          aria-label={`${unreadCount} unread messages`}
          className={`pointer-events-none absolute -right-0.5 -top-0.5 inline-flex min-w-[18px] max-w-[30px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold leading-4 text-white shadow ring-1 ring-black/40 transition-transform duration-300 ${isAnimating ? 'animate-badge-pop' : ''}`}
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </Link>
  );
}
