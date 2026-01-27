'use client';

import { memo } from 'react';
import { REACTION_EMOJIS } from '../../../lib/firebase/reactionService';

/**
 * @typedef {Object} ReactionPickerProps
 * @property {(emoji: string) => void} onSelect - Callback when emoji is selected
 * @property {() => void} onClose - Callback to close the picker
 * @property {string[]} [userReactions] - Emojis the user has already reacted with
 */

/**
 * Emoji reaction picker overlay
 * @param {ReactionPickerProps} props
 */
function ReactionPicker({ onSelect, onClose, userReactions = [] }) {
  return (
    <>
      {/* Backdrop to close on click outside */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Picker container */}
      <div
        className="absolute bottom-full left-0 z-50 mb-2 flex items-center gap-1 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-elev-1)] px-2 py-1.5 shadow-lg"
        role="dialog"
        aria-label="Add a reaction"
      >
        {REACTION_EMOJIS.map((emoji) => {
          const isSelected = userReactions.includes(emoji);
          return (
            <button
              key={emoji}
              className={`rounded-full p-1.5 text-lg transition-transform duration-150 hover:scale-125 active:scale-95 ${
                isSelected
                  ? 'bg-[var(--accent)]/20 ring-2 ring-[var(--accent)]'
                  : 'hover:bg-[var(--bg-elev-2)]'
              }`}
              onClick={() => onSelect(emoji)}
              aria-label={`React with ${emoji}`}
              aria-pressed={isSelected}
            >
              {emoji}
            </button>
          );
        })}
      </div>
    </>
  );
}

export default memo(ReactionPicker);
