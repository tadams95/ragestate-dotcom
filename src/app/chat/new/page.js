'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useCallback, useMemo } from 'react';
import { useAuth } from '../../../../firebase/context/FirebaseContext';
import { useUserSearch } from '../../../../lib/hooks/useUserSearch';
import { useChatList, getExistingDmPeerIds, getRecentDmContacts } from '../../../../lib/hooks/useChatList';
import { getOrCreateDmChat } from '../../../../lib/firebase/chatService';

/**
 * New Chat Page - Start a new DM conversation
 * Route: /chat/new
 */
export default function NewChatPage() {
  const router = useRouter();
  const { currentUser, loading: authLoading } = useAuth();
  const { results, isLoading: searchLoading, search, clear } = useUserSearch();
  const { chats } = useChatList();

  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState(null);

  // Get existing DM peer IDs to filter from search results
  const existingPeerIds = useMemo(() => getExistingDmPeerIds(chats), [chats]);

  // Get recent DM contacts for quick access
  const recentContacts = useMemo(() => getRecentDmContacts(chats, 5), [chats]);

  // Filter search results to exclude current user and existing DMs
  const filteredResults = useMemo(() => {
    return results.filter(
      (user) => user.uid !== currentUser?.uid && !existingPeerIds.has(user.uid)
    );
  }, [results, currentUser?.uid, existingPeerIds]);

  // Handle search input change
  const handleSearchChange = useCallback(
    (e) => {
      const value = e.target.value;
      setSearchQuery(value);
      setError(null);

      if (value.trim()) {
        search(value);
      } else {
        clear();
      }
    },
    [search, clear]
  );

  // Handle selecting a user to start chat
  const handleSelectUser = useCallback(
    async (userId) => {
      if (!currentUser?.uid || isCreating) return;

      setIsCreating(true);
      setError(null);

      try {
        const chatId = await getOrCreateDmChat(currentUser.uid, userId);
        router.push(`/chat/${chatId}`);
      } catch (err) {
        console.error('Failed to create chat:', err);
        setError(err.message || 'Failed to start conversation');
        setIsCreating(false);
      }
    },
    [currentUser?.uid, router, isCreating]
  );

  // Handle selecting a recent contact
  const handleSelectRecentContact = useCallback(
    (chatId) => {
      router.push(`/chat/${chatId}`);
    },
    [router]
  );

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
    router.push('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-[var(--bg-root)] pb-[env(safe-area-inset-bottom)] pt-[calc(80px+env(safe-area-inset-top))]">
      {/* Page Header */}
      <div className="mx-auto max-w-2xl px-4">
        <div className="flex items-center gap-3 py-4">
          {/* Back button */}
          <Link
            href="/chat"
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-elev-1)] hover:text-[var(--text-primary)]"
            aria-label="Back to messages"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="h-5 w-5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </Link>

          <h1 className="text-xl font-bold text-[var(--text-primary)]">New Message</h1>
        </div>

        {/* Search input */}
        <div className="pb-4">
          <div className="relative">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--text-tertiary)]"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
              />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search users..."
              className="w-full rounded-md border-0 bg-[var(--bg-elev-2)] py-3 pl-10 pr-10 text-[15px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none ring-2 ring-transparent focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              autoFocus
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  clear();
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                aria-label="Clear search"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="h-5 w-5"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-2xl">
        {/* Error message */}
        {error && (
          <div className="px-4 py-3">
            <p className="text-center text-sm text-[var(--danger)]">{error}</p>
          </div>
        )}

        {/* Creating chat loading overlay */}
        {isCreating && (
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
            <span className="ml-3 text-[var(--text-secondary)]">Starting conversation...</span>
          </div>
        )}

        {/* Search results */}
        {searchQuery && !isCreating && (
          <>
            {searchLoading && (
              <div className="flex justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
              </div>
            )}

            {!searchLoading && filteredResults.length === 0 && (
              <div className="py-8 text-center">
                <p className="text-[var(--text-secondary)]">No users found</p>
                <p className="mt-1 text-sm text-[var(--text-tertiary)]">
                  Try a different search term
                </p>
              </div>
            )}

            {!searchLoading && filteredResults.length > 0 && (
              <div className="divide-y divide-[var(--border-subtle)]">
                {filteredResults.map((user) => (
                  <button
                    key={user.uid}
                    onClick={() => handleSelectUser(user.uid)}
                    disabled={isCreating}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--bg-elev-1)] disabled:opacity-50"
                  >
                    {user.photoURL ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={user.photoURL}
                        alt={user.displayName || user.username}
                        className="h-12 w-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[var(--accent)] to-[var(--accent-glow)]">
                        <span className="text-lg font-semibold text-white">
                          {(user.displayName || user.username)?.[0]?.toUpperCase() || '?'}
                        </span>
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-[var(--text-primary)]">
                        {user.displayName || user.username}
                      </p>
                      {user.username && (
                        <p className="truncate text-sm text-[var(--text-secondary)]">
                          @{user.username}
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {/* Recent contacts (shown when not searching) */}
        {!searchQuery && !isCreating && recentContacts.length > 0 && (
          <>
            <div className="px-4 py-3">
              <h2 className="text-sm font-medium uppercase tracking-wide text-[var(--text-tertiary)]">
                Recent
              </h2>
            </div>
            <div className="divide-y divide-[var(--border-subtle)]">
              {recentContacts.map((chat) => (
                <button
                  key={chat.chatId}
                  onClick={() => handleSelectRecentContact(chat.chatId)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--bg-elev-1)]"
                >
                  {chat.peerPhoto ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={chat.peerPhoto}
                      alt={chat.peerName}
                      className="h-12 w-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[var(--accent)] to-[var(--accent-glow)]">
                      <span className="text-lg font-semibold text-white">
                        {chat.peerName?.[0]?.toUpperCase() || '?'}
                      </span>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-[var(--text-primary)]">
                      {chat.peerName || 'Chat'}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {/* Empty state when no recent contacts and not searching */}
        {!searchQuery && !isCreating && recentContacts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12">
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
                  d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                />
              </svg>
            </div>
            <p className="text-[var(--text-secondary)]">Search for users to message</p>
            <p className="mt-1 text-sm text-[var(--text-tertiary)]">
              Type a username to find someone
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
