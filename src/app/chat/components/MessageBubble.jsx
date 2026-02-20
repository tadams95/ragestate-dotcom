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
 * @property {(messageId: string) => void} [onDelete] - Callback when message is deleted
 */

/**
 * Individual message bubble component
 * @param {MessageBubbleProps} props
 */
function MessageBubble({ message, isOwn, showSender = false, onImageClick, onDelete }) {
  const hasMedia = !!message.mediaUrl;
  const hasText = !!message.text;
  const isSending = message.status === 'sending';

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  return (
    <div
      className={`group/message my-1 flex ${isOwn ? 'justify-end' : 'justify-start'}`}
      role="listitem"
      aria-label={`${isOwn ? 'Your message' : `Message from ${message.senderName}`}${isSending ? ', sending' : ''}`}
    >
      {/* Delete controls (left of bubble, own messages only) */}
      {isOwn && onDelete && !isSending && (
        <div className="mr-1 flex items-end opacity-0 transition-opacity group-hover/message:opacity-100">
          {showDeleteConfirm ? (
            <div className="mb-1 flex items-center gap-1">
              <button
                onClick={() => {
                  onDelete(message.id);
                  setShowDeleteConfirm(false);
                }}
                className="rounded px-2 py-1 text-xs font-medium text-[var(--danger)] hover:bg-[var(--bg-elev-2)]"
              >
                Delete
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="rounded px-2 py-1 text-xs text-[var(--text-tertiary)] hover:bg-[var(--bg-elev-2)]"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="mb-1 rounded-full p-1.5 text-[var(--text-tertiary)] hover:bg-[var(--bg-elev-2)] hover:text-[var(--danger)]"
              aria-label="Delete message"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="h-4 w-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                />
              </svg>
            </button>
          )}
        </div>
      )}

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
