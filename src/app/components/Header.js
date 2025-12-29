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
import NotificationBell from './NotificationBell';

const navigation = [
  // { name: 'ABOUT', href: '/about' },
  { name: 'EVENTS', href: '/events' },
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
    <div className="bg-black">
      <header className="absolute inset-x-0 top-0 z-50">
        <nav className="flex items-center justify-between p-6 lg:px-8" aria-label="Global">
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
              className="-m-2.5 inline-flex h-11 w-11 items-center justify-center rounded-md p-2.5 text-gray-100 active:opacity-80"
              onClick={() => setMobileMenuOpen(true)}
            >
              <span className="sr-only">Open main menu</span>
              <Bars3Icon className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
          <div className="hidden lg:flex lg:gap-x-12">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="text-sm font-semibold leading-6 text-gray-100"
              >
                {item.name}
              </Link>
            ))}
          </div>
          <div className="hidden gap-7 lg:flex lg:flex-1 lg:items-center lg:justify-end">
            <Link
              href="/cart"
              aria-label="Cart"
              className="relative -m-2 inline-flex h-11 w-11 items-center justify-center text-gray-100 active:opacity-80"
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
                  className="inline-flex h-11 w-11 items-center justify-center text-sm font-semibold leading-6 text-gray-100 active:opacity-80"
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
                  className="inline-flex h-11 w-11 items-center justify-center text-sm font-semibold leading-6 text-gray-100 active:opacity-80"
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
          <DialogPanel className="fixed inset-y-0 right-0 z-50 w-full overflow-y-auto bg-black px-6 py-6 sm:max-w-sm sm:ring-1 sm:ring-gray-900/10">
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
                className="-m-2.5 h-11 w-11 rounded-md p-2.5 text-gray-700 active:opacity-80"
                onClick={() => setMobileMenuOpen(false)}
              >
                <span className="sr-only">Close menu</span>
                <XMarkIcon className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <div className="mt-6 flow-root">
              <div className="-my-6 divide-y divide-gray-500/10">
                <div className="space-y-2 py-6">
                  {navigation.map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={handleNavClick}
                      className="-mx-3 block rounded-lg px-3 py-2 text-base font-semibold leading-7 text-gray-100 hover:bg-zinc-900"
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
                    className="-mx-3 block rounded-lg px-3 py-2.5 text-base font-semibold leading-7 text-gray-100 hover:bg-zinc-900"
                  >
                    CART
                  </Link>
                  {!showSkeleton && isAuthenticated && (
                    <Link
                      href="/account/notifications"
                      onClick={handleNavClick}
                      className="-mx-3 block rounded-lg px-3 py-2.5 text-base font-semibold leading-7 text-gray-100 hover:bg-zinc-900"
                    >
                      NOTIFICATIONS
                    </Link>
                  )}
                  {isAuthenticated ? (
                    <Link
                      href="/account"
                      onClick={handleNavClick}
                      className="-mx-3 block rounded-lg px-3 py-2.5 text-base font-semibold leading-7 text-gray-100 hover:bg-zinc-900"
                    >
                      ACCOUNT
                    </Link>
                  ) : (
                    <Link
                      href="/login"
                      onClick={handleNavClick}
                      className="-mx-3 block rounded-lg px-3 py-2.5 text-base font-semibold leading-7 text-gray-100 hover:bg-zinc-900"
                    >
                      LOGIN
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </DialogPanel>
        </Dialog>
      </header>
    </div>
  );
}
