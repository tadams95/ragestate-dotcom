'use client';

import storage from '@/utils/storage';
import { Dialog, DialogPanel } from '@headlessui/react';
import Bars3Icon from '@heroicons/react/24/outline/Bars3Icon';
import BellIcon from '@heroicons/react/24/outline/BellIcon';
import ShoppingBagIcon from '@heroicons/react/24/outline/ShoppingBagIcon';
import UserIcon from '@heroicons/react/24/outline/UserIcon';
import XMarkIcon from '@heroicons/react/24/outline/XMarkIcon';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useUnreadNotificationsCount } from '../../../lib/hooks';

const navigation = [
  { name: 'ABOUT', href: '/about' },
  { name: 'EVENTS', href: '/events' },
  { name: 'SHOP', href: '/shop' },
  // { name: "PRODUCTS", href: "/products" },
  // { name: "BLOG", href: "/blog" },
];

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [idToken, setIdToken] = useState(null);
  const [refreshToken, setRefreshToken] = useState(null);
  const [profilePicture, setProfilePicture] = useState('');
  const [userId, setUserId] = useState('');
  const [hydrated, setHydrated] = useState(false);
  const [unreadCount] = useUnreadNotificationsCount(userId);

  useEffect(() => {
    const {
      idToken: idTok,
      refreshToken: refTok,
      profilePicture: pic,
      userId: uid,
    } = storage.readKeys(['idToken', 'refreshToken', 'profilePicture', 'userId']);
    setIdToken(idTok || null);
    setRefreshToken(refTok || null);
    setProfilePicture(pic || '');
    setUserId(uid || '');
    setHydrated(true);
  }, []);

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
              <Bars3Icon className="h-6 w-6" aria-hidden="true" />
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
          <div className="hidden gap-3 lg:flex lg:flex-1 lg:items-center lg:justify-end">
            <Link
              href="/cart"
              aria-label="Cart"
              className="relative -m-2 inline-flex h-11 w-11 items-center justify-center text-gray-100 active:opacity-80"
            >
              <ShoppingBagIcon className="h-6 w-6" aria-hidden="true" />
            </Link>
            {hydrated && idToken && refreshToken && (
              <Link
                href="/account"
                aria-label="Notifications"
                className="relative -m-2 inline-flex h-11 w-11 items-center justify-center text-gray-100 active:opacity-80"
              >
                <BellIcon className="h-6 w-6" aria-hidden="true" />
                {unreadCount > 0 && (
                  <span
                    aria-label={`${unreadCount} unread notifications`}
                    className="pointer-events-none absolute -right-0.5 -top-0.5 inline-flex min-w-[18px] max-w-[30px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold leading-4 text-white shadow ring-1 ring-black/40"
                  >
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </Link>
            )}
            <div className="-m-2 inline-flex h-11 w-11 items-center justify-center">
              {!hydrated ? (
                <div aria-hidden className="h-6 w-6 rounded-md bg-zinc-800/60" />
              ) : idToken && refreshToken ? (
                <Link
                  href="/account"
                  className="inline-flex h-11 w-11 items-center justify-center text-sm font-semibold leading-6 text-gray-100 active:opacity-80"
                  aria-label="Account"
                >
                  {profilePicture ? (
                    <Image
                      src={profilePicture}
                      alt="Profile"
                      width={24}
                      height={24}
                      sizes="24px"
                      loading="lazy"
                      className="h-6 w-6 rounded-md"
                    />
                  ) : (
                    <UserIcon className="h-6 w-6" aria-hidden="true" />
                  )}
                </Link>
              ) : (
                <Link
                  href="/login"
                  className="inline-flex h-11 w-11 items-center justify-center text-sm font-semibold leading-6 text-gray-100 active:opacity-80"
                  aria-label="Login"
                >
                  <UserIcon className="h-6 w-6" aria-hidden="true" />
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
                <XMarkIcon className="h-6 w-6" aria-hidden="true" />
              </button>
            </div>
            <div className="mt-6 flow-root">
              <div className="-my-6 divide-y divide-gray-500/10">
                <div className="space-y-2 py-6">
                  {navigation.map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      className="-mx-3 block rounded-lg px-3 py-2 text-base font-semibold leading-7 text-gray-100 hover:bg-zinc-900"
                    >
                      {item.name}
                    </Link>
                  ))}
                </div>
                <div className="py-6">
                  <Link
                    href="/cart"
                    className="-mx-3 block rounded-lg px-3 py-2.5 text-base font-semibold leading-7 text-gray-100 hover:bg-zinc-900"
                  >
                    CART
                  </Link>
                  {hydrated && idToken && refreshToken && (
                    <Link
                      href="/account"
                      className="-mx-3 block rounded-lg px-3 py-2.5 text-base font-semibold leading-7 text-gray-100 hover:bg-zinc-900"
                    >
                      NOTIFICATIONS
                      {unreadCount > 0 && (
                        <span className="ml-2 inline-flex items-center rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                      )}
                    </Link>
                  )}
                  {idToken && refreshToken ? (
                    <Link
                      href="/account"
                      className="-mx-3 block rounded-lg px-3 py-2.5 text-base font-semibold leading-7 text-gray-100 hover:bg-zinc-900"
                    >
                      ACCOUNT
                    </Link>
                  ) : (
                    <Link
                      href="/login"
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
