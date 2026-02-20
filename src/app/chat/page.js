'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useAuth } from '../../../firebase/context/FirebaseContext';
import { useChatList } from '../../../lib/hooks/useChatList';
import { ChatListItem, ChatListSkeleton, EmptyChat } from './components';

/**
 * Chat List Page - Shows all user's conversations
 * Route: /chat
 */
export default function ChatListPage() {
  const { currentUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const { chats, isLoading, error } = useChatList();

  // Show toast for chat list errors
  useEffect(() => {
    if (error) {
      toast.error('Failed to load conversations');
    }
  }, [error]);

  // Auth loading state
  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-root)] pt-[calc(80px+env(safe-area-inset-top))]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
      </div>
    );
  }

  // Not logged in
  if (!currentUser) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--bg-root)] px-4 pt-[calc(80px+env(safe-area-inset-top))]">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--bg-elev-2)]">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="h-8 w-8 text-[var(--text-tertiary)]"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
            />
          </svg>
        </div>
        <h2 className="mb-2 text-xl font-semibold text-[var(--text-primary)]">Sign in to chat</h2>
        <p className="mb-6 text-center text-[var(--text-secondary)]">
          Log in to view your messages and start conversations
        </p>
        <Link
          href="/login"
          className="rounded-lg bg-[var(--accent)] px-6 py-3 font-semibold text-white transition-opacity hover:opacity-90"
        >
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-root)] pb-[env(safe-area-inset-bottom)] pt-[calc(80px+env(safe-area-inset-top))]">
      {/* Page Header */}
      <div className="mx-auto max-w-2xl px-4">
        <div className="flex items-center justify-between py-4">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Messages</h1>
          <Link
            href="/chat/new"
            className="flex h-10 items-center gap-2 rounded-md bg-[var(--accent)] px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            aria-label="New chat"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="h-5 w-5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            <span className="hidden sm:inline">New</span>
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-2xl">
        {/* Loading state - skeleton loader */}
        {isLoading && <ChatListSkeleton count={5} />}

        {/* Error state */}
        {error && !isLoading && (
          <div className="p-4 text-center">
            <p className="text-[var(--danger)]">Failed to load chats</p>
            <p className="mt-1 text-sm text-[var(--text-tertiary)]">{error.message}</p>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && chats.length === 0 && (
          <EmptyChat onNewChat={() => router.push('/chat/new')} />
        )}

        {/* Chat list */}
        {!isLoading && !error && chats.length > 0 && (
          <nav aria-label="Conversations">
            <div className="divide-y divide-[var(--border-subtle)]" role="list">
              {chats.map((chat) => (
                <ChatListItem key={chat.chatId} chat={chat} />
              ))}
            </div>
          </nav>
        )}
      </div>
    </div>
  );
}
