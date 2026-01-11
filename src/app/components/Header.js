'use client';

import storage, { AUTH_STORAGE_EVENT } from '@/utils/storage';
import { Dialog, DialogPanel } from '@headlessui/react';
import Bars3Icon from '@heroicons/react/24/outline/Bars3Icon';
import ShoppingBagIcon from '@heroicons/react/24/outline/ShoppingBagIcon';
import UserIcon from '@heroicons/react/24/outline/UserIcon';
import XMarkIcon from '@heroicons/react/24/outline/XMarkIcon';
import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../../firebase/context/FirebaseContext';
import { useTheme } from '../../../lib/context/ThemeContext';
import NotificationBell from './NotificationBell';

// Theme icons with shared animation classes
function SunIcon({ className }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z"
      />
    </svg>
  );
}

function MoonIcon({ className }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z"
      />
    </svg>
  );
}

function SystemIcon({ className }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25m18 0A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0V12a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 12V5.25"
      />
    </svg>
  );
}

// Theme toggle button with cycling and animation
function ThemeToggle() {
  const { theme, setTheme, resolvedTheme, mounted } = useTheme();
  const [isAnimating, setIsAnimating] = useState(false);

  // Cycle: light → dark → system → light
  const cycleTheme = useCallback(() => {
    const next = { light: 'dark', dark: 'system', system: 'light' };
    setIsAnimating(true);
    setTheme(next[theme]);
    // Reset animation state after transition
    setTimeout(() => setIsAnimating(false), 200);
  }, [theme, setTheme]);

  // Tooltip text
  const tooltipText = {
    light: 'Light mode',
    dark: 'Dark mode',
    system: `System (${resolvedTheme})`,
  }[theme];

  // Don't render until mounted to avoid hydration mismatch
  if (!mounted) {
    return (
      <div className="inline-flex h-11 w-11 items-center justify-center">
        <div aria-hidden className="h-5 w-5 animate-pulse rounded-md bg-zinc-800/60" />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={cycleTheme}
      className="group relative -m-2 inline-flex h-11 w-11 items-center justify-center text-[var(--text-primary)] transition-colors hover:text-[var(--text-primary)] active:opacity-80"
      aria-label={`Current theme: ${tooltipText}. Click to change.`}
      title={tooltipText}
    >
      {/* Icon container with rotation animation */}
      <span
        className={`inline-flex h-5 w-5 items-center justify-center transition-transform duration-200 ${
          isAnimating ? 'rotate-90 scale-75 opacity-50' : 'rotate-0 scale-100 opacity-100'
        }`}
      >
        {theme === 'light' && <SunIcon className="h-5 w-5" />}
        {theme === 'dark' && <MoonIcon className="h-5 w-5" />}
        {theme === 'system' && <SystemIcon className="h-5 w-5" />}
      </span>
      {/* Tooltip - visible on hover */}
      <span className="pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-[var(--bg-elev-2)] px-2 py-1 text-xs text-[var(--text-primary)] opacity-0 transition-opacity group-hover:opacity-100">
        {tooltipText}
      </span>
    </button>
  );
}

const navigation = [
  // { name: 'ABOUT', href: '/about' },
  { name: 'EVENTS', href: '/events' },
  { name: 'FEED', href: '/feed' },
  { name: 'SHOP', href: '/shop' },
  // { name: "PRODUCTS", href: "/products" },
  // { name: "BLOG", href: "/blog" },
];

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profilePicture, setProfilePicture] = useState('');
  const [userId, setUserId] = useState('');
  // Hydrated stays false for server + first client paint; set true after unified state load to avoid flicker & mismatch.
  const [hydrated, setHydrated] = useState(false);

  // Use Firebase auth context for immediate auth state (reacts to onAuthStateChanged)
  const { currentUser, loading: authLoading } = useAuth();

  // Derive auth state: prefer Firebase auth (instant), fallback to localStorage (persisted)
  const isAuthenticated = currentUser !== null || (hydrated && !!storage.get('idToken'));

  // Load persisted data from localStorage on mount and listen for changes
  const loadFromStorage = useCallback(() => {
    const keys = storage.readKeys(['profilePicture', 'userId']);
    setProfilePicture(keys.profilePicture || '');
    setUserId(keys.userId || '');
    setHydrated(true);
  }, []);

  useEffect(() => {
    loadFromStorage();

    // Listen for cross-tab storage changes (native event)
    const handleStorageEvent = (e) => {
      if (!e.key) return;
      if (['idToken', 'refreshToken', 'profilePicture', 'userId'].includes(e.key)) {
        loadFromStorage();
      }
    };

    // Listen for same-tab auth changes (custom event from storage.js)
    const handleAuthChange = () => {
      loadFromStorage();
    };

    window.addEventListener('storage', handleStorageEvent);
    window.addEventListener(AUTH_STORAGE_EVENT, handleAuthChange);

    return () => {
      window.removeEventListener('storage', handleStorageEvent);
      window.removeEventListener(AUTH_STORAGE_EVENT, handleAuthChange);
    };
  }, [loadFromStorage]);

  // Sync profile picture from Firebase user if available
  useEffect(() => {
    if (currentUser?.photoURL && !profilePicture) {
      setProfilePicture(currentUser.photoURL);
    }
  }, [currentUser, profilePicture]);

  // Clear local state immediately when Firebase user signs out
  useEffect(() => {
    if (!authLoading && currentUser === null && hydrated) {
      // User signed out — clear cached profile data so UI updates instantly
      setProfilePicture('');
      setUserId('');
    }
  }, [currentUser, authLoading, hydrated]);

  // Close mobile menu after navigation for better UX
  const handleNavClick = () => setMobileMenuOpen(false);

  // Determine what to show: loading skeleton during initial hydration, then auth-appropriate UI
  const showSkeleton = !hydrated || authLoading;
  const displayPicture = profilePicture || currentUser?.photoURL || '';

  return (
    <div className="bg-[var(--bg-root)] transition-colors duration-200">
      <header className="absolute inset-x-0 top-0 z-50">
        <nav className="relative flex items-center justify-between p-6 lg:px-8" aria-label="Global">
          <div className="flex lg:flex-1">
            <Link href="/" className="-m-1.5 p-1.5">
              <span className="sr-only">RAGESTATE</span>
              <Image
                src="/assets/RSLogo2.png"
                alt="RAGESTATE LOGO"
                width={120}
                height={32}
                priority
                sizes="(min-width: 1024px) 120px, 96px"
                className="h-8 w-auto"
              />
            </Link>
          </div>
          <div className="flex lg:hidden">
            <button
              type="button"
              className="-m-2.5 inline-flex h-11 w-11 items-center justify-center rounded-md p-2.5 text-[var(--text-primary)] active:opacity-80"
              onClick={() => setMobileMenuOpen(true)}
            >
              <span className="sr-only">Open main menu</span>
              <Bars3Icon className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
          <div className="hidden lg:absolute lg:left-1/2 lg:flex lg:-translate-x-1/2 lg:gap-x-12">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="text-sm font-semibold leading-6 text-[var(--text-primary)]"
              >
                {item.name}
              </Link>
            ))}
          </div>
          <div className="hidden gap-7 lg:flex lg:flex-1 lg:items-center lg:justify-end">
            <ThemeToggle />
            <Link
              href="/cart"
              aria-label="Cart"
              className="relative -m-2 inline-flex h-11 w-11 items-center justify-center text-[var(--text-primary)] active:opacity-80"
            >
              <ShoppingBagIcon className="h-5 w-5" aria-hidden="true" />
            </Link>
            {!showSkeleton && isAuthenticated && (
              <NotificationBell userId={currentUser?.uid || userId} className="-m-2 h-11 w-11" />
            )}
            <div className="-m-2 inline-flex h-11 w-11 items-center justify-center">
              {showSkeleton ? (
                <div aria-hidden className="h-5 w-5 animate-pulse rounded-md bg-zinc-800/60" />
              ) : isAuthenticated ? (
                <Link
                  href="/account"
                  className="inline-flex h-11 w-11 items-center justify-center text-sm font-semibold leading-6 text-[var(--text-primary)] active:opacity-80"
                  aria-label="Account"
                >
                  {displayPicture ? (
                    <Image
                      src={displayPicture}
                      alt="Profile"
                      width={24}
                      height={24}
                      sizes="24px"
                      loading="lazy"
                      className="h-5 w-5 rounded-md"
                    />
                  ) : (
                    <UserIcon className="h-5 w-5" aria-hidden="true" />
                  )}
                </Link>
              ) : (
                <Link
                  href="/login"
                  className="inline-flex h-11 w-11 items-center justify-center text-sm font-semibold leading-6 text-[var(--text-primary)] active:opacity-80"
                  aria-label="Login"
                >
                  <UserIcon className="h-5 w-5" aria-hidden="true" />
                  <span aria-hidden="true"></span>
                </Link>
              )}
            </div>
          </div>
        </nav>
        <Dialog className="lg:hidden" open={mobileMenuOpen} onClose={setMobileMenuOpen}>
          <div className="fixed inset-0 z-50" />
          <DialogPanel className="fixed inset-y-0 right-0 z-50 w-full overflow-y-auto bg-[var(--bg-root)] px-6 py-6 transition-colors duration-200 sm:max-w-sm sm:ring-1 sm:ring-[var(--border-subtle)]">
            <div className="flex items-center justify-between">
              <Link href="#" className="-m-1.5 p-1.5">
                <span className="sr-only">RAGESTATE</span>
                <Image
                  className="h-8 w-auto"
                  src="https://firebasestorage.googleapis.com/v0/b/ragestate-app.appspot.com/o/RSLogo2.png?alt=media&token=d13ebc08-9d8d-4367-99ec-ace3627132d2"
                  alt="RAGESTATE LOGO"
                  width={120}
                  height={32}
                  sizes="96px"
                />
              </Link>
              <button
                type="button"
                className="-m-2.5 h-11 w-11 rounded-md p-2.5 text-[var(--text-secondary)] active:opacity-80"
                onClick={() => setMobileMenuOpen(false)}
              >
                <span className="sr-only">Close menu</span>
                <XMarkIcon className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <div className="mt-6 flow-root">
              <div className="-my-6 divide-y divide-[var(--border-subtle)]">
                <div className="space-y-2 py-6">
                  {navigation.map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={handleNavClick}
                      className="-mx-3 block rounded-lg px-3 py-2 text-base font-semibold leading-7 text-[var(--text-primary)] hover:bg-[var(--bg-elev-1)]"
                    >
                      {item.name}
                    </Link>
                  ))}
                  {/* DRAFTS link removed on mobile as well */}
                </div>
                <div className="py-6">
                  <Link
                    href="/cart"
                    onClick={handleNavClick}
                    className="-mx-3 block rounded-lg px-3 py-2.5 text-base font-semibold leading-7 text-[var(--text-primary)] hover:bg-[var(--bg-elev-1)]"
                  >
                    CART
                  </Link>
                  {!showSkeleton && isAuthenticated && (
                    <Link
                      href="/account/notifications"
                      onClick={handleNavClick}
                      className="-mx-3 flex items-center justify-between rounded-lg px-3 py-2.5 text-base font-semibold leading-7 text-[var(--text-primary)] hover:bg-[var(--bg-elev-1)]"
                    >
                      <span>NOTIFICATIONS</span>
                      <NotificationBell
                        userId={currentUser?.uid || userId}
                        className="pointer-events-none"
                      />
                    </Link>
                  )}
                  {isAuthenticated ? (
                    <Link
                      href="/account"
                      onClick={handleNavClick}
                      className="-mx-3 block rounded-lg px-3 py-2.5 text-base font-semibold leading-7 text-[var(--text-primary)] hover:bg-[var(--bg-elev-1)]"
                    >
                      ACCOUNT
                    </Link>
                  ) : (
                    <Link
                      href="/login"
                      onClick={handleNavClick}
                      className="-mx-3 block rounded-lg px-3 py-2.5 text-base font-semibold leading-7 text-[var(--text-primary)] hover:bg-[var(--bg-elev-1)]"
                    >
                      LOGIN
                    </Link>
                  )}
                  {/* Mobile Theme Toggle */}
                  <MobileThemeToggle />
                </div>
              </div>
            </div>
          </DialogPanel>
        </Dialog>
      </header>
    </div>
  );
}

// Mobile-specific theme toggle with label
function MobileThemeToggle() {
  const { theme, setTheme, resolvedTheme, mounted } = useTheme();

  // Cycle: light → dark → system → light
  const cycleTheme = useCallback(() => {
    const next = { light: 'dark', dark: 'system', system: 'light' };
    setTheme(next[theme]);
  }, [theme, setTheme]);

  const label = {
    light: 'Light Mode',
    dark: 'Dark Mode',
    system: `System (${resolvedTheme})`,
  }[theme];

  if (!mounted) return null;

  return (
    <button
      type="button"
      onClick={cycleTheme}
      className="-mx-3 flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-base font-semibold leading-7 text-[var(--text-primary)] hover:bg-[var(--bg-elev-1)]"
    >
      <span>THEME</span>
      <span className="flex items-center gap-2 text-[var(--text-secondary)]">
        <span className="text-sm">{label}</span>
        {theme === 'light' && <SunIcon className="h-5 w-5" />}
        {theme === 'dark' && <MoonIcon className="h-5 w-5" />}
        {theme === 'system' && <SystemIcon className="h-5 w-5" />}
      </span>
    </button>
  );
}
