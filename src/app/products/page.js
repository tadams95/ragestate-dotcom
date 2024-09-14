"use client";

import Link from "next/link";
import Footer from "../components/Footer";
import Header from "../components/Header";
import BackgroundPattern from "../components/BackgroundPattern";
import AppScreenshot from "../components/AppScreenshot";

export default function Products() {
  return (
    <div className="bg-black">
      <Header />
      <div className="relative isolate">
        <BackgroundPattern />
        <div className="mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:flex lg:items-center lg:gap-x-10 lg:px-8 lg:py-40">
          <div className="mx-auto max-w-2xl lg:mx-0 lg:flex-auto">
            <div className="flex">
              <div className="relative flex items-center gap-x-4 rounded-full px-4 py-1 text-sm leading-6 text-gray-600 ring-1 ring-gray-900/10 hover:ring-gray-900/20">
                <span className="font-semibold text-gray-100">
                  We’re building
                </span>
                <span className="h-4 w-px bg-gray-900/10" aria-hidden="true" />
              </div>
            </div>
            <h1 className="mt-10 max-w-lg text-4xl font-bold tracking-tight text-gray-100 sm:text-6xl">
              Download the RAGESTATE App
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-300">
              The RAGESTATE app is your one-stop shop for all things RAGESTATE.
              Shop merch, browse events, or send tickets to your friends.
              Everything you need in one place.
            </p>
            <div className="mt-10 flex items-center gap-x-6">
              <Link
                href="https://apps.apple.com/us/app/ragestate/id6449474339"
                target="_blank"
                className="rounded-md bg-gray-100 px-3.5 py-2.5 text-sm font-semibold text-black shadow-sm hover:bg-gray-00 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400"
              >
                iOS
              </Link>
              <Link
                href="https://play.google.com/store/apps/details?id=com.tyrelle.ragestate&pcampaignid=web_share"
                target="_blank"
                className="rounded-md bg-gray-100 px-3.5 py-2.5 text-sm font-semibold text-black shadow-sm hover:bg-gray-00 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400"
              >
                ANDROID
              </Link>
            </div>
          </div>
          <div className="mt-16 sm:mt-24 lg:mt-0 lg:flex-shrink-0 lg:flex-grow">
            <AppScreenshot />
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
