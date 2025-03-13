"use client";

import Link from "next/link";
import Footer from "./components/Footer";
import Header from "./components/Header";
import Image from "next/image";
import { useEffect, useState } from "react";
import { HomeIcon, EnvelopeIcon } from "@heroicons/react/24/outline";

export default function NotFound() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="bg-black min-h-screen flex flex-col">
      <Header />

      <main className="flex-grow flex items-center justify-center px-6 py-16 sm:py-24">
        <div className="max-w-2xl mx-auto text-center">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <Image
              src="/assets/RSLogo2.png"
              alt="RAGESTATE"
              width={120}
              height={80}
              className="h-20 w-auto"
            />
          </div>

          {/* Error Code with Animation */}
          <h1 className="text-red-600 font-bold text-9xl animate-pulse">404</h1>

          <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-5xl">
            Page not found
          </h2>

          <div className="mt-6 mb-8 h-1 w-40 bg-gradient-to-r from-transparent via-red-700 to-transparent mx-auto"></div>

          <p className="mt-6 text-lg leading-7 text-gray-300">
            Sorry, the page you are looking for doesn't exist or has been moved.
          </p>

          <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/"
              className="w-full sm:w-auto flex items-center justify-center rounded-md bg-red-700 px-6 py-2 text-base font-semibold text-white shadow-md hover:bg-red-900 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all duration-300"
            >
              <HomeIcon className="h-5 w-5 mr-2" />
              Return Home
            </Link>
            <Link
              href="/contact"
              className="w-full sm:w-auto flex items-center justify-center rounded-md border border-gray-700 px-6 py-2 text-base font-semibold text-gray-300 hover:bg-red-900 hover:border-red-500 transition-all duration-300"
            >
              <EnvelopeIcon className="h-5 w-5 mr-2" />
              Contact Support
            </Link>
          </div>

          {/* Optional: Add a cool glitch effect or animation */}
          <div className="mt-12 relative h-32 w-32 mx-auto">
            <div className="absolute inset-0 opacity-75 animate-ping rounded-full bg-gradient-to-r from-red-700 to-transparent"></div>
            <div className="relative flex items-center justify-center h-full">
              <span className="text-3xl">⚠️</span>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
