"use client";

import { Dialog, DialogPanel } from "@headlessui/react";
import {
  Bars3Icon,
  XMarkIcon,
  ShoppingBagIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";

const navigation = [
  { name: "SHOP", href: "/shop" },
  { name: "EVENTS", href: "/events" },
  // { name: "ABOUT", href: "/about" },
  { name: "PRODUCTS", href: "/products" },
  // { name: "BLOG", href: "/blog" },
];

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [idToken, setIdToken] = useState(null);
  const [refreshToken, setRefreshToken] = useState(null);
  const [profilePicture, setProfilePicture] = useState("");

  useEffect(() => {
    // Check if window object is defined (ensures we are in the browser)
    if (typeof window !== "undefined") {
      const storedIdToken = localStorage.getItem("idToken");
      const storedRefreshToken = localStorage.getItem("refreshToken");
      const storedProfilePicture = localStorage.getItem("profilePicture");

      setIdToken(storedIdToken);
      setRefreshToken(storedRefreshToken);
      setProfilePicture(storedProfilePicture || "");
    }
  }, []);

  return (
    <div className="bg-black">
      <header className="absolute inset-x-0 top-0 z-50">
        <nav
          className="flex items-center justify-between p-6 lg:px-8"
          aria-label="Global"
        >
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
              className="-m-2.5 inline-flex items-center justify-center rounded-md p-2.5 text-gray-100"
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
          <div className="hidden lg:flex lg:flex-1 lg:justify-end">
            <Link
              href="/cart"
              className="text-sm font-semibold leading-6 text-gray-100 px-20"
            >
              <ShoppingBagIcon className="h-6 w-6" aria-hidden="true" />
              <span aria-hidden="true"></span>
            </Link>
            {idToken && refreshToken ? (
              <Link
                href="/account"
                className="text-sm font-semibold leading-6 text-gray-100"
              >
                {profilePicture ? (
                  <Image
                    src={profilePicture}
                    alt="Profile"
                    width={60}
                    height={24}
                    className="h-6 w-6 rounded-md"
                  />
                ) : (
                  <UserIcon className="h-6 w-6" aria-hidden="true" />
                )}
              </Link>
            ) : (
              <Link
                href="/login"
                className="text-sm font-semibold leading-6 text-gray-100"
              >
                <UserIcon className="h-6 w-6" aria-hidden="true" />
                <span aria-hidden="true"></span>
              </Link>
            )}
          </div>
        </nav>
        <Dialog
          className="lg:hidden"
          open={mobileMenuOpen}
          onClose={setMobileMenuOpen}
        >
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
                className="-m-2.5 rounded-md p-2.5 text-gray-700"
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
