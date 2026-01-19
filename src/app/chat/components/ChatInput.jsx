'use client';

import { memo, useRef, useState } from 'react';

/**
 * @typedef {Object} ChatInputProps
 * @property {(text: string, mediaFile?: File) => Promise<void>} onSend - Send message callback
 * @property {boolean} [isSending=false] - Whether a message is being sent
 * @property {string} [placeholder='Message...'] - Placeholder text
 */

/**
 * Chat input component with text and image support
 * @param {ChatInputProps} props
 */
function ChatInput({ onSend, isSending = false, placeholder = 'Message...' }) {
  const [text, setText] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  const handleRemoveImage = () => {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    setSelectedImage(null);
    setImagePreview(null);
  };

  const handleSend = async () => {
    const trimmedText = text.trim();
    if ((!trimmedText && !selectedImage) || isSending) return;

    try {
      await onSend(trimmedText, selectedImage || undefined);
      setText('');
      handleRemoveImage();
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextChange = (e) => {
    setText(e.target.value);
    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
  };

  const canSend = (text.trim().length > 0 || selectedImage) && !isSending;

  return (
    <div className="pb-[env(safe-area-inset-bottom)]" role="form" aria-label="Message composer">
      {/* Image Preview */}
      {imagePreview && (
        <div className="px-4 pt-4">
          <div className="relative inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imagePreview}
              alt="Selected"
              className="h-20 w-20 rounded-md object-cover"
            />
            <button
              onClick={handleRemoveImage}
              disabled={isSending}
              className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--danger)] text-white transition-opacity disabled:opacity-50"
              aria-label="Remove image"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="h-4 w-4"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Input Row - 12px gap, 16px padding, items aligned to bottom */}
      <div className="flex items-end gap-3 p-4">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          aria-label="Select image to attach"
        />

        {/* Attach button - 44px square for touch target, visually 40px */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isSending}
          className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-md text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-elev-2)] hover:text-[var(--text-primary)] disabled:opacity-50"
          aria-label="Attach image"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="h-6 w-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
            />
          </svg>
        </button>

        {/* Text input - 44px height to match buttons, expands as needed */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isSending}
          rows={1}
          className="max-h-[120px] min-h-[44px] flex-1 resize-none rounded-md border-0 bg-[var(--bg-elev-2)] px-4 py-3 text-[15px] leading-[18px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none ring-2 ring-transparent focus:outline-none focus:ring-2 focus:ring-[var(--accent)] disabled:opacity-50"
        />

        {/* Send button - 44px square to match */}
        <button
          onClick={handleSend}
          disabled={!canSend}
          className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-md bg-[var(--accent)] text-white transition-opacity disabled:opacity-40"
          aria-label="Send message"
        >
          {isSending ? (
            <svg
              className="h-5 w-5 animate-spin"
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
              viewBox="0 0 24 24"
              fill="currentColor"
              className="h-5 w-5"
            >
              <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}

export default memo(ChatInput);
