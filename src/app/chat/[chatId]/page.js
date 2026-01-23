'use client';

import { doc, getDoc } from 'firebase/firestore';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../../../firebase/context/FirebaseContext';
import { db } from '../../../../firebase/firebase';
import { getUserDisplayInfo } from '../../../../lib/firebase/chatService';
import { useChat } from '../../../../lib/hooks/useChat';
import { ChatInput, ImageViewerDialog, MessageBubble } from '../components';

/**
 * Chat Room Page - Individual conversation view
 * Route: /chat/[chatId]
 */
export default function ChatRoomPage() {
  const params = useParams();
  const router = useRouter();
  const { currentUser, loading: authLoading } = useAuth();
  const chatId = params?.chatId;

  // Chat metadata state
  const [chatMeta, setChatMeta] = useState(null);
  const [metaLoading, setMetaLoading] = useState(true);
  const [metaError, setMetaError] = useState(null);

  // Image viewer state
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerImageUrl, setViewerImageUrl] = useState('');

  // Message list ref for auto-scroll
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const lastMessageCountRef = useRef(0);

  // Chat hook
  const { messages, isLoading, isLoadingMore, hasMore, error, isSending, sendMessage, loadMore } =
    useChat(chatId);

  // Fetch chat metadata
  useEffect(() => {
    if (!chatId || !currentUser?.uid) {
      setMetaLoading(false);
      return;
    }

    async function fetchChatMeta() {
      setMetaLoading(true);
      setMetaError(null);

      try {
        const chatDoc = await getDoc(doc(db, 'chats', chatId));

        if (!chatDoc.exists()) {
          setMetaError(new Error('Chat not found'));
          setMetaLoading(false);
          return;
        }

        const chatData = chatDoc.data();
        let displayInfo = {
          displayName: 'Chat',
          photoURL: null,
          username: null,
          peerId: null,
        };

        if (chatData.type === 'dm') {
          // For DM, find the other user
          const peerId = chatData.members?.find((id) => id !== currentUser.uid);
          if (peerId) {
            const peerInfo = await getUserDisplayInfo(peerId);
            displayInfo = {
              displayName: peerInfo.displayName,
              photoURL: peerInfo.photoURL,
              username: peerInfo.username,
              peerId,
            };
          }
        } else if (chatData.type === 'event') {
          displayInfo = {
            displayName: chatData.eventName || 'Event Chat',
            photoURL: null,
            username: null,
            peerId: null,
            isEvent: true,
            eventId: chatData.eventId,
          };
        }

        setChatMeta({
          ...chatData,
          ...displayInfo,
        });
      } catch (err) {
        console.error('Failed to fetch chat metadata:', err);
        setMetaError(err);
      } finally {
        setMetaLoading(false);
      }
    }

    fetchChatMeta();
  }, [chatId, currentUser?.uid]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messages.length > lastMessageCountRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    lastMessageCountRef.current = messages.length;
  }, [messages.length]);

  // Handle scroll for pagination
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container || isLoadingMore || !hasMore) return;

    // Load more when scrolled near top
    if (container.scrollTop < 100) {
      loadMore();
    }
  }, [isLoadingMore, hasMore, loadMore]);

  // Handle image click
  const handleImageClick = useCallback((imageUrl) => {
    setViewerImageUrl(imageUrl);
    setViewerOpen(true);
  }, []);

  // Show toast for message loading errors
  useEffect(() => {
    if (error) {
      toast.error('Failed to load messages');
    }
  }, [error]);

  // Wrapped send message with toast notification on error
  const handleSendMessage = useCallback(
    async (text, mediaFile) => {
      try {
        await sendMessage(text, mediaFile);
      } catch (err) {
        toast.error('Failed to send message. Please try again.');
      }
    },
    [sendMessage],
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

  // Meta error
  if (metaError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--bg-root)] px-4 pt-[calc(80px+env(safe-area-inset-top))]">
        <p className="mb-4 text-[var(--danger)]">Chat not found</p>
        <Link href="/chat" className="text-[var(--accent)] hover:underline">
          Back to messages
        </Link>
      </div>
    );
  }

  const isEvent = chatMeta?.type === 'event';

  return (
    <div className="fixed inset-0 z-10 flex flex-col bg-[var(--bg-root)] pt-[calc(72px+env(safe-area-inset-top))] lg:static lg:z-auto lg:h-screen lg:min-h-[500px] lg:pt-[72px]">
      {/* Chat Header - positioned below global header */}
      <div className="flex-shrink-0 border-b border-[var(--border-subtle)] bg-[var(--bg-root)]">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
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

          {/* User/Event info - clickable for DM profiles */}
          {metaLoading ? (
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className="h-9 w-9 flex-shrink-0 animate-pulse rounded-md bg-[var(--bg-elev-2)]" />
              <div className="h-4 w-24 animate-pulse rounded bg-[var(--bg-elev-2)]" />
            </div>
          ) : chatMeta?.peerId ? (
            <Link
              href={`/u/${chatMeta.username || chatMeta.peerId}`}
              className="flex min-w-0 flex-1 items-center gap-3 transition-opacity hover:opacity-80"
            >
              {chatMeta.photoURL ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={chatMeta.photoURL}
                  alt={chatMeta.displayName}
                  className="h-9 w-9 flex-shrink-0 rounded-md object-cover"
                />
              ) : (
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-[var(--accent)] to-[var(--accent-glow)]">
                  <span className="text-sm font-semibold text-white">
                    {chatMeta.displayName?.[0]?.toUpperCase() || '?'}
                  </span>
                </div>
              )}
              <span className="truncate font-semibold text-[var(--text-primary)]">
                {chatMeta.displayName}
              </span>
            </Link>
          ) : (
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md bg-[var(--bg-elev-2)]">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="h-5 w-5 text-[var(--text-tertiary)]"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
                  />
                </svg>
              </div>
              <span className="truncate font-semibold text-[var(--text-primary)]">
                {chatMeta?.displayName || 'Chat'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div ref={messagesContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl px-4 py-4">
          {/* Loading more indicator */}
          {isLoadingMore && (
            <div className="flex justify-center py-4">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
            </div>
          )}

          {/* Load more button (fallback) */}
          {hasMore && !isLoadingMore && messages.length > 0 && (
            <button
              onClick={loadMore}
              className="mb-4 w-full text-center text-sm text-[var(--text-secondary)] hover:text-[var(--accent)]"
            >
              Load older messages
            </button>
          )}

          {/* Initial loading */}
          {isLoading && (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
            </div>
          )}

          {/* Error state */}
          {error && !isLoading && (
            <div className="py-8 text-center">
              <p className="text-[var(--danger)]">Failed to load messages</p>
              <p className="mt-1 text-sm text-[var(--text-tertiary)]">{error.message}</p>
            </div>
          )}

          {/* Empty state */}
          {!isLoading && !error && messages.length === 0 && (
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
                    d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
                  />
                </svg>
              </div>
              <p className="text-[var(--text-secondary)]">No messages yet</p>
              <p className="mt-1 text-sm text-[var(--text-tertiary)]">
                Send a message to start the conversation
              </p>
            </div>
          )}

          {/* Messages list */}
          {!isLoading && messages.length > 0 && (
            <div className="space-y-1" role="list" aria-label="Chat messages">
              {messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  isOwn={message.senderId === currentUser?.uid}
                  showSender={isEvent}
                  onImageClick={handleImageClick}
                />
              ))}
            </div>
          )}

          {/* Scroll anchor */}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Chat Input - fixed at bottom */}
      <div className="flex-shrink-0 border-t border-[var(--border-subtle)] bg-[var(--bg-elev-1)]">
        <div className="mx-auto max-w-2xl">
          <ChatInput onSend={handleSendMessage} isSending={isSending} />
        </div>
      </div>

      {/* Image Viewer */}
      <ImageViewerDialog open={viewerOpen} onOpenChange={setViewerOpen} imageUrl={viewerImageUrl} />
    </div>
  );
}
