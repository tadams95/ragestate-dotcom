'use client';

import { forwardRef, memo, useCallback, useEffect, useLayoutEffect, useRef } from 'react';

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/**
 * Renders text with highlighted mentions
 * @param {string} text - The text content
 * @param {Set<string>} confirmedMentions - Set of confirmed usernames (lowercase)
 * @returns {JSX.Element[]} Array of span elements
 */
function renderHighlightedText(text, confirmedMentions) {
  if (!text) return null;

  const parts = [];
  const mentionRegex = /@(\w+)/g;
  let lastIndex = 0;
  let match;

  while ((match = mentionRegex.exec(text)) !== null) {
    const username = match[1].toLowerCase();
    const isConfirmed = confirmedMentions?.has(username);

    // Text before mention
    if (match.index > lastIndex) {
      parts.push(<span key={`text-${lastIndex}`}>{text.slice(lastIndex, match.index)}</span>);
    }

    // Mention (highlighted only if confirmed)
    parts.push(
      <span
        key={`mention-${match.index}`}
        className={isConfirmed ? 'font-medium text-[#ff1f42]' : ''}
      >
        {match[0]}
      </span>,
    );

    lastIndex = match.index + match[0].length;
  }

  // Remaining text
  if (lastIndex < text.length) {
    parts.push(<span key={`text-${lastIndex}`}>{text.slice(lastIndex)}</span>);
  }

  // Add a trailing space to match textarea behavior
  if (text.endsWith('\n')) {
    parts.push(
      <span key="trailing-space" className="invisible">
        {' '}
      </span>,
    );
  }

  return parts;
}

/**
 * Textarea with mention highlighting overlay
 * Uses the overlay technique since HTML textarea doesn't support rich text
 *
 * @param {Object} props
 * @param {string} props.value - Current text value
 * @param {Set<string>} props.confirmedMentions - Set of confirmed usernames (lowercase)
 * @param {(e: React.ChangeEvent<HTMLTextAreaElement>) => void} props.onChange - Change handler
 * @param {(e: React.KeyboardEvent<HTMLTextAreaElement>) => void} [props.onKeyDown] - Keydown handler
 * @param {(e: React.SyntheticEvent<HTMLTextAreaElement>) => void} [props.onSelect] - Selection change handler
 * @param {string} [props.className] - Additional CSS classes for textarea
 * @param {boolean} [props.mentionOpen] - Whether mention autocomplete is open (for aria-expanded)
 * @param {React.Ref<HTMLTextAreaElement>} ref - Forwarded ref
 */
const HighlightedTextarea = forwardRef(function HighlightedTextarea(
  {
    value,
    confirmedMentions,
    onChange,
    onKeyDown,
    onSelect,
    className = '',
    mentionOpen = false,
    ...props
  },
  ref,
) {
  const overlayRef = useRef(null);
  const internalRef = useRef(null);

  // Merge forwarded ref with internal ref so parent (PostComposer) and
  // auto-resize both have access to the textarea DOM node
  const setRefs = useCallback(
    (node) => {
      internalRef.current = node;
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
    },
    [ref],
  );

  // Auto-resize textarea to fit content (pattern from ChatInput.jsx)
  useIsomorphicLayoutEffect(() => {
    const textarea = internalRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [value]);

  const handleScroll = useCallback((e) => {
    if (overlayRef.current) {
      overlayRef.current.scrollTop = e.target.scrollTop;
    }
  }, []);

  return (
    <div
      className="relative w-full"
      role="combobox"
      aria-expanded={mentionOpen}
      aria-haspopup="listbox"
      aria-owns="mention-listbox"
      aria-controls="mention-listbox"
    >
      {/* Highlighted text overlay - renders visible text behind transparent textarea */}
      <div
        ref={overlayRef}
        className={`${className} pointer-events-none absolute inset-0 z-0 max-h-[300px] overflow-y-auto whitespace-pre-wrap break-words !border-transparent !text-[var(--text-primary)]`}
        aria-hidden="true"
      >
        {renderHighlightedText(value || '', confirmedMentions)}
      </div>

      {/* Actual textarea - transparent text, caret visible, receives input */}
      <textarea
        ref={setRefs}
        className={`${className} relative z-10 m-0 block max-h-[300px] overflow-y-auto !bg-transparent !text-transparent caret-[var(--text-primary)] selection:bg-[var(--accent-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]`}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        onScroll={handleScroll}
        onSelect={onSelect}
        aria-autocomplete="list"
        {...props}
      />
    </div>
  );
});

export default memo(HighlightedTextarea);
