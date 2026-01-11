'use client';

import { forwardRef, memo } from 'react';

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
      parts.push(
        <span key={`text-${lastIndex}`} className="text-[var(--text-primary)]">
          {text.slice(lastIndex, match.index)}
        </span>,
      );
    }

    // Mention (highlighted only if confirmed)
    parts.push(
      <span
        key={`mention-${match.index}`}
        className={isConfirmed ? 'font-medium text-[#ff1f42]' : 'text-[var(--text-primary)]'}
      >
        {match[0]}
      </span>,
    );

    lastIndex = match.index + match[0].length;
  }

  // Remaining text
  if (lastIndex < text.length) {
    parts.push(
      <span key={`text-${lastIndex}`} className="text-[var(--text-primary)]">
        {text.slice(lastIndex)}
      </span>,
    );
  }

  // Add a trailing space to match textarea behavior
  if (text.endsWith('\n')) {
    parts.push(<br key="trailing-br" />);
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
  return (
    <div
      className="relative"
      role="combobox"
      aria-expanded={mentionOpen}
      aria-haspopup="listbox"
      aria-owns="mention-listbox"
      aria-controls="mention-listbox"
    >
      {/* Highlighted text overlay - renders visible text on top of transparent textarea */}
      <div
        className="pointer-events-none absolute inset-0 z-10 overflow-y-auto whitespace-pre-wrap break-words p-3"
        aria-hidden="true"
      >
        {renderHighlightedText(value || '', confirmedMentions)}
      </div>

      {/* Actual textarea - transparent text, caret visible, receives input */}
      <textarea
        ref={ref}
        className={`${className} relative z-0 bg-[var(--bg-elev-2)] text-transparent caret-[var(--text-primary)] selection:bg-[var(--accent-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]`}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        onSelect={onSelect}
        aria-autocomplete="list"
        {...props}
      />
    </div>
  );
});

export default memo(HighlightedTextarea);
