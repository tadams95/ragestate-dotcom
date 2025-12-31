'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

/**
 * Theme options: 'light' | 'dark' | 'system'
 * - light: Force light mode
 * - dark: Force dark mode
 * - system: Follow OS preference
 */

const STORAGE_KEY = 'theme';

const ThemeContext = createContext(undefined);

/**
 * Get the resolved theme based on user preference and system setting
 * @param {string} theme - User's theme preference ('light' | 'dark' | 'system')
 * @param {boolean} systemIsDark - Whether system prefers dark mode
 * @returns {'light' | 'dark'} - The actual theme to apply
 */
function getResolvedTheme(theme, systemIsDark) {
  if (theme === 'system') {
    return systemIsDark ? 'dark' : 'light';
  }
  return theme;
}

/**
 * Get stored theme from localStorage (browser only)
 */
function getStoredTheme() {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * ThemeProvider - Manages theme state with system preference detection
 *
 * Features:
 * - Three modes: light, dark, system (follows OS)
 * - Detects system preference via matchMedia
 * - Listens for system preference changes
 * - Persists to localStorage
 * - Applies .dark class to <html> element
 * - SSR-safe (inline script prevents flash)
 */
export function ThemeProvider({ children, defaultTheme = 'system' }) {
  // Theme preference stored by user ('light' | 'dark' | 'system')
  const [theme, setThemeState] = useState(() => {
    // Initialize from localStorage if available (client-side only)
    if (typeof window !== 'undefined') {
      const stored = getStoredTheme();
      if (stored && ['light', 'dark', 'system'].includes(stored)) {
        return stored;
      }
    }
    return defaultTheme;
  });

  // Track system preference
  const [systemIsDark, setSystemIsDark] = useState(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  // Whether we've mounted (for SSR safety)
  const [mounted, setMounted] = useState(false);

  // Detect system preference on mount and listen for changes
  useEffect(() => {
    setMounted(true);

    // Check if matchMedia is available (browser environment)
    if (typeof window === 'undefined' || !window.matchMedia) {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    // Set initial system preference
    setSystemIsDark(mediaQuery.matches);

    // Listen for system preference changes
    const handleChange = (e) => {
      setSystemIsDark(e.matches);
    };

    // Modern browsers use addEventListener, older use addListener
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else {
      mediaQuery.addListener(handleChange);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange);
      } else {
        mediaQuery.removeListener(handleChange);
      }
    };
  }, []);

  // Calculate the resolved theme (what's actually displayed)
  const resolvedTheme = useMemo(() => {
    return getResolvedTheme(theme, systemIsDark);
  }, [theme, systemIsDark]);

  // Apply .dark class to <html> and persist to localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const root = document.documentElement;

    // Apply or remove .dark class
    if (resolvedTheme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
    }

    // Persist theme preference to localStorage
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // localStorage might be unavailable (private browsing, etc.)
    }
  }, [theme, resolvedTheme]);

  // Stable setter function
  const setTheme = useCallback((newTheme) => {
    if (!['light', 'dark', 'system'].includes(newTheme)) {
      console.warn(`Invalid theme: ${newTheme}. Must be 'light', 'dark', or 'system'.`);
      return;
    }
    setThemeState(newTheme);
  }, []);

  // Memoize context value to prevent unnecessary re-renders
  const value = useMemo(
    () => ({
      theme, // User's preference: 'light' | 'dark' | 'system'
      setTheme, // Function to change theme
      resolvedTheme, // Actual theme applied: 'light' | 'dark'
      systemIsDark, // Whether system prefers dark
      mounted, // Whether component has mounted (for SSR)
    }),
    [theme, setTheme, resolvedTheme, systemIsDark, mounted],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/**
 * useTheme hook - Access theme context
 *
 * @returns {{
 *   theme: 'light' | 'dark' | 'system',
 *   setTheme: (theme: 'light' | 'dark' | 'system') => void,
 *   resolvedTheme: 'light' | 'dark',
 *   systemIsDark: boolean,
 *   mounted: boolean
 * }}
 *
 * @example
 * const { theme, setTheme, resolvedTheme } = useTheme();
 *
 * // Toggle between light and dark
 * setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
 *
 * // Cycle through all options
 * const nextTheme = { light: 'dark', dark: 'system', system: 'light' };
 * setTheme(nextTheme[theme]);
 */
export function useTheme() {
  const context = useContext(ThemeContext);

  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }

  return context;
}

export default ThemeContext;
