'use client';

import { useCallback, useRef, useState } from 'react';

/**
 * @typedef {Object} MentionState
 * @property {boolean} isOpen - Whether dropdown is visible
 * @property {string} query - Current search query (after @)
 * @property {number} startIndex - Position of @ in text
 * @property {number} selectedIndex - Currently highlighted result
 */

/**
 * Detect if cursor is within a valid @mention trigger
 * @param {string} text - Full text content
 * @param {number} cursorPos - Current cursor position
 * @returns {{ isOpen: boolean, query: string, startIndex: number }}
 */
function detectMention(text, cursorPos) {
  const beforeCursor = text.slice(0, cursorPos);
  const atIndex = beforeCursor.lastIndexOf('@');

  if (atIndex >= 0) {
    const charBefore = text[atIndex - 1];
    // Valid start: @ is at beginning or preceded by whitespace
    const isValidStart = atIndex === 0 || /\s/.test(charBefore);

    if (isValidStart) {
      const query = beforeCursor.slice(atIndex + 1);
      // Query must only contain valid username characters (alphanumeric + underscore)
      if (/^[a-zA-Z0-9_]*$/.test(query)) {
        return { isOpen: true, query, startIndex: atIndex };
      }
    }
  }

  return { isOpen: false, query: '', startIndex: -1 };
}

/**
 * Hook for detecting @ mentions in text input
 * @returns {Object} Mention detection state and handlers
 */
export function useMentionDetection() {
  const [mentionState, setMentionState] = useState({
    isOpen: false,
    query: '',
    startIndex: -1,
    selectedIndex: 0,
  });

  // Track current text and cursor for insertMention
  const textRef = useRef('');
  const cursorRef = useRef(0);

  /**
   * Handle text and cursor changes - call this on every input change
   * @param {string} text - Current text value
   * @param {number} cursorPos - Current cursor position
   */
  const handleTextChange = useCallback((text, cursorPos) => {
    textRef.current = text;
    cursorRef.current = cursorPos;

    const detection = detectMention(text, cursorPos);

    setMentionState((prev) => ({
      ...prev,
      isOpen: detection.isOpen,
      query: detection.query,
      startIndex: detection.startIndex,
      // Reset selection when query changes significantly
      selectedIndex: detection.query !== prev.query ? 0 : prev.selectedIndex,
    }));
  }, []);

  /**
   * Insert a selected mention into the text
   * @param {string} currentText - Current text content
   * @param {string} username - Username to insert (without @)
   * @returns {{ text: string, cursorPos: number }} New text and cursor position
   */
  const insertMention = useCallback(
    (currentText, username) => {
      const { startIndex } = mentionState;
      if (startIndex < 0) {
        return { text: currentText, cursorPos: currentText.length };
      }

      // Replace @query with @username + space
      const beforeMention = currentText.slice(0, startIndex);
      const afterCursor = currentText.slice(cursorRef.current);
      const newText = `${beforeMention}@${username} ${afterCursor}`;
      const newCursorPos = startIndex + username.length + 2; // +2 for @ and space

      return { text: newText, cursorPos: newCursorPos };
    },
    [mentionState],
  );

  /**
   * Close the mention dropdown
   */
  const closeMention = useCallback(() => {
    setMentionState((prev) => ({
      ...prev,
      isOpen: false,
      query: '',
      startIndex: -1,
      selectedIndex: 0,
    }));
  }, []);

  /**
   * Navigate selection up in the dropdown
   */
  const navigateUp = useCallback(() => {
    setMentionState((prev) => ({
      ...prev,
      selectedIndex: Math.max(0, prev.selectedIndex - 1),
    }));
  }, []);

  /**
   * Navigate selection down in the dropdown
   * @param {number} maxIndex - Maximum valid index (results.length - 1)
   */
  const navigateDown = useCallback((maxIndex = 9) => {
    setMentionState((prev) => ({
      ...prev,
      selectedIndex: Math.min(maxIndex, prev.selectedIndex + 1),
    }));
  }, []);

  /**
   * Set the selected index directly (e.g., on hover)
   * @param {number} index - Index to select
   */
  const setSelectedIndex = useCallback((index) => {
    setMentionState((prev) => ({
      ...prev,
      selectedIndex: index,
    }));
  }, []);

  return {
    mentionState,
    handleTextChange,
    insertMention,
    closeMention,
    navigateUp,
    navigateDown,
    setSelectedIndex,
  };
}

export default useMentionDetection;
