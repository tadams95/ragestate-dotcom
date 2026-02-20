import { useCallback, useEffect, useRef, useState } from 'react';
import { searchUsersByEmail, searchUsersByUsername } from '../firebase/userSearch';

/**
 * @typedef {import('../firebase/userSearch').MentionUser} MentionUser
 */

/** Debounce delay in milliseconds */
const DEBOUNCE_MS = 300;

/** Maximum results to fetch per query */
const MAX_RESULTS = 10;

/**
 * @typedef {Object} UseUserSearchOptions
 * @property {boolean} [includeEmail=false] - Also search by email prefix (for admin use)
 */

/**
 * Hook for searching users with debounce and caching
 * Features:
 * - 300ms debounced search
 * - In-memory result caching
 * - Request cancellation for stale queries
 * - Error handling
 * - Optional email search (for admin contexts)
 *
 * @param {UseUserSearchOptions} [options]
 * @returns {Object} Search state and controls
 * @returns {MentionUser[]} returns.results - Current search results
 * @returns {boolean} returns.isLoading - Whether a search is in progress
 * @returns {Error|null} returns.error - Last error, if any
 * @returns {(query: string) => void} returns.search - Trigger a search
 * @returns {() => void} returns.clear - Clear results and cancel pending search
 */
export function useUserSearch({ includeEmail = false } = {}) {
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Refs for managing async state
  const debounceRef = useRef(null);
  const currentQueryRef = useRef('');
  const cacheRef = useRef(new Map());

  /**
   * Clear results and cancel any pending search
   */
  const clear = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    currentQueryRef.current = '';
    setResults([]);
    setIsLoading(false);
    setError(null);
  }, []);

  /**
   * Trigger a debounced search
   * @param {string} query - Search query (text after @)
   */
  const search = useCallback((query) => {
    // Clear previous debounce timer
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    const normalizedQuery = query.toLowerCase().trim();

    // Empty query - clear results
    if (!normalizedQuery) {
      setResults([]);
      setIsLoading(false);
      setError(null);
      currentQueryRef.current = '';
      return;
    }

    // Track current query for cancellation
    currentQueryRef.current = normalizedQuery;

    // Check cache first
    if (cacheRef.current.has(normalizedQuery)) {
      setResults(cacheRef.current.get(normalizedQuery));
      setIsLoading(false);
      setError(null);
      return;
    }

    // Set loading state immediately
    setIsLoading(true);
    setError(null);

    // Debounce the actual search
    debounceRef.current = setTimeout(async () => {
      try {
        // Run username search (and optionally email search) in parallel
        const searches = [searchUsersByUsername(normalizedQuery, MAX_RESULTS)];
        if (includeEmail) {
          searches.push(searchUsersByEmail(normalizedQuery, MAX_RESULTS));
        }
        const searchResults = await Promise.all(searches);

        // Merge and deduplicate by uid
        const seen = new Set();
        const users = [];
        for (const batch of searchResults) {
          for (const user of batch) {
            if (!seen.has(user.uid)) {
              seen.add(user.uid);
              users.push(user);
            }
          }
        }

        // Only update if this is still the current query (cancellation check)
        if (currentQueryRef.current === normalizedQuery) {
          // Cache the results
          cacheRef.current.set(normalizedQuery, users);

          // Limit cache size to prevent memory bloat
          if (cacheRef.current.size > 50) {
            const firstKey = cacheRef.current.keys().next().value;
            cacheRef.current.delete(firstKey);
          }

          setResults(users);
          setError(null);
        }
      } catch (err) {
        // Only update error if this is still the current query
        if (currentQueryRef.current === normalizedQuery) {
          console.error('User search failed:', err);
          setError(err);
          setResults([]);
        }
      } finally {
        // Only clear loading if this is still the current query
        if (currentQueryRef.current === normalizedQuery) {
          setIsLoading(false);
        }
      }
    }, DEBOUNCE_MS);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return {
    results,
    isLoading,
    error,
    search,
    clear,
  };
}
