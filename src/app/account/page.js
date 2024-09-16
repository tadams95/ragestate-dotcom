"use client";

import { useEffect, useState, useMemo } from "react";
import { Dialog, DialogPanel } from "@headlessui/react";
import { useRouter } from "next/navigation";

import { Bars3Icon } from "@heroicons/react/20/solid";

import { XMarkIcon as XMarkIconOutline } from "@heroicons/react/24/outline";

import QRCode from "qrcode.react";
import Link from "next/link";
import OrderHistory from "../../../components/OrderHistory";
import RandomDetailStyling from "../components/styling/RandomDetailStyling";
import Footer from "../components/Footer";
import Image from "next/image";

const navigation = [
  { name: "SHOP", href: "/shop" },
  { name: "EVENTS", href: "/events" },
  { name: "ABOUT", href: "/about" },
  { name: "PRODUCTS", href: "/products" },
  { name: "BLOG", href: "/blog" },
];

export default function Account() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [profilePicture, setProfilePicture] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedUserId = localStorage.getItem("userId");
      const storedProfilePicture = localStorage.getItem("profilePicture");

      setUserId(storedUserId);
      setProfilePicture(storedProfilePicture);
    }
  }, []);

  const handleLogout = (event) => {
    event.preventDefault();

    // Clear all items from localStorage
    localStorage.clear();

    // Redirect to login page after logout
    router.push("/login");
  };

  const profileImage = useMemo(
    () => (
      <Image
        priority
        alt="ProfilePicture"
        src={profilePicture || "/assets/trollFace.png"}
        className="h-8 w-8 rounded-full"
        height={50}
        width={50}
      />
    ),
    [profilePicture]
  );

  return (
    <>
      <RandomDetailStyling />
      <header className="absolute inset-x-0 top-0 z-50 flex h-16 border-b border-gray-900/10 ">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex flex-1 items-center gap-x-6">
            <Link href="/">
              <img
                alt="RAGESTATE"
                src="/assets/RSLogoW.png"
                className="h-8 w-auto"
              />
            </Link>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="-m-3 p-3 md:hidden"
            >
              <span className="sr-only">Open main menu</span>
              <Bars3Icon aria-hidden="true" className="h-5 w-5 text-gray-100" />
            </button>
          </div>
          <nav className="hidden md:flex md:gap-x-11 md:text-sm md:font-semibold md:leading-6 text-gray-100">
            {navigation.map((item, itemIdx) => (
              <a key={itemIdx} href={item.href}>
                {item.name}
              </a>
            ))}
          </nav>
          <div className="flex flex-1 items-center justify-end gap-x-8">
            {/* <button
              type="button"
              className="-m-2.5 p-2.5 text-gray-400 hover:text-gray-500"
            >
              <span className="sr-only">View notifications</span>
              <BellIcon aria-hidden="true" className="h-6 w-6" />
            </button> */}
            <Link href="/account" className="-m-1.5 p-1.5">
              <span className="sr-only">Your profile</span>
              <div>{profileImage}</div>
            </Link>
          </div>
        </div>
        <Dialog
          open={mobileMenuOpen}
          onClose={setMobileMenuOpen}
          className="lg:hidden"
        >
          <div className="fixed inset-0 z-50" />
          <DialogPanel className="fixed inset-y-0 right-0 z-50 w-full overflow-y-auto bg-black px-6 py-6 sm:max-w-sm sm:ring-1 sm:ring-gray-900/10">
            <div className="flex items-center justify-between">
              <Link href="#" className="-m-1.5 p-1.5">
                <span className="sr-only">RAGESTATE</span>
                <img
                  className="h-8 w-auto"
                  src="/assets/RSLogoW.png"
                  alt="RAGESTATE LOGO"
                />
              </Link>
              <button
                type="button"
                className="-m-2.5 rounded-md p-2.5 text-gray-700"
                onClick={() => setMobileMenuOpen(false)}
              >
                <span className="sr-only">Close menu</span>
                <XMarkIconOutline className="h-6 w-6" aria-hidden="true" />
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
                  {/* {idToken && refreshToken ? (
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
                  )} */}
                </div>
              </div>
            </div>
          </DialogPanel>
        </Dialog>
      </header>
      <main>
        <header className="relative isolate pt-16" />

        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-2xl grid-cols-1 grid-rows-1 items-start gap-x-8 gap-y-8 lg:mx-0 lg:max-w-none lg:grid-cols-3">
            {/* Invoice summary */}
            <div className="lg:col-start-3 lg:row-end-1 flex justify-center items-center">
              <h2 className="sr-only">QR Code</h2>
              <div className="">
                <h1
                  id="your-orders-heading"
                  className="text-3xl font-bold tracking-tight text-gray-100 text-center mb-6"
                >
                  Your QR Code
                </h1>
                <div className="rounded-lg bg-white shadow-sm ring-1 ring-gray-900/5 p-4">
                  <QRCode value={userId} size={250} />
                </div>
              </div>
            </div>
            {/* Invoice */}
            <div className="-mx-4 px-4  shadow-sm ring-1 ring-gray-900/5 sm:mx-0 sm:rounded-lg sm:px-8 sm:pb-14 lg:col-span-2 lg:row-span-2 lg:row-end-2 xl:px-16 xl:pb-20 ">
              <OrderHistory />
            </div>
            {/* temporary logout button */}
            <div>
              <button
                onClick={handleLogout}
                className="flex w-full justify-center rounded-md border border-white bg-transparent px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
