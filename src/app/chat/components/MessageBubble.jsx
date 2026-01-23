'use client';

import { memo, useState } from 'react';

/**
 * Format message time (e.g., "2:34 PM")
 * @param {Date} date
 * @returns {string}
 */
function formatMessageTime(date) {
  if (!date) return '';
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * @typedef {import('../../../../lib/types/chat').Message} Message
 */

/**
 * @typedef {Object} MessageBubbleProps
 * @property {Message} message - The message data
 * @property {boolean} isOwn - Whether the message is from the current user
 * @property {boolean} [showSender=false] - Show sender info (for group chats)
 * @property {(imageUrl: string) => void} [onImageClick] - Callback when image is clicked
 */

/**
 * Individual message bubble component
 * @param {MessageBubbleProps} props
 */
function MessageBubble({ message, isOwn, showSender = false, onImageClick }) {
  const hasMedia = !!message.mediaUrl;
  const hasText = !!message.text;
  const isSending = message.status === 'sending';

  return (
    <div
      className={`my-1 flex ${isOwn ? 'justify-end' : 'justify-start'}`}
      role="listitem"
      aria-label={`${isOwn ? 'Your message' : `Message from ${message.senderName}`}${isSending ? ', sending' : ''}`}
    >
      <div className={`max-w-[80%] ${isOwn ? 'items-end' : 'items-start'}`}>
        {/* Sender info for group chats */}
        {showSender && !isOwn && (
          <div className="mb-1 flex items-center gap-1.5 px-1">
            {message.senderPhoto && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={message.senderPhoto}
                alt={message.senderName}
                loading="lazy"
                className="h-4 w-4 rounded-md object-cover"
              />
            )}
            <span className="text-xs font-medium text-[var(--text-tertiary)]">
              {message.senderName}
            </span>
          </div>
        )}

        {/* Message bubble */}
        <div
          className={`overflow-hidden rounded-2xl ${
            isOwn
              ? 'rounded-br-md bg-[var(--accent)] text-white'
              : 'rounded-bl-md border border-[var(--border-subtle)] bg-[var(--bg-elev-2)] text-[var(--text-primary)]'
          } ${hasMedia && !hasText ? 'p-1' : 'px-3.5 py-2.5'} ${isSending ? 'opacity-70' : ''}`}
        >
          {/* Media content */}
          {hasMedia && (
            <button
              onClick={() => onImageClick?.(message.mediaUrl)}
              className="block overflow-hidden rounded-xl"
              aria-label="View full image"
            >
              {message.mediaType === 'video' ? (
                <video
                  src={message.mediaUrl}
                  className="max-h-60 max-w-full rounded-xl object-cover"
                  controls
                  playsInline
                  preload="metadata"
                />
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={message.mediaUrl}
                  alt="Shared image"
                  loading="lazy"
                  className="max-h-60 max-w-full rounded-xl object-cover"
                />
              )}
            </button>
          )}

          {/* Text content */}
          {hasText && (
            <p
              className={`whitespace-pre-wrap break-words text-[15px] leading-5 ${hasMedia ? 'mx-2.5 mb-1.5 mt-2' : ''}`}
            >
              {message.text}
            </p>
          )}
        </div>

        {/* Time and status */}
        <div
          className={`mt-1 flex items-center gap-1 px-1 ${isOwn ? 'justify-end' : 'justify-start'}`}
        >
          <span className="text-[11px] text-[var(--text-tertiary)]">
            {formatMessageTime(message.createdAt)}
          </span>
          {isOwn && (
            <span className="ml-0.5">
              {isSending ? (
                <svg
                  className="h-3 w-3 animate-spin text-[var(--text-tertiary)]"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="h-3 w-3 text-[var(--text-tertiary)]"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(MessageBubble);
