'use client';

import EnvelopeIcon from '@heroicons/react/24/outline/EnvelopeIcon';
import HomeIcon from '@heroicons/react/24/outline/HomeIcon';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import GlitchWarning from './components/GlitchWarning';

export default function NotFound() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="flex min-h-screen flex-col bg-black">
      {/* Header is rendered by layout.js */}

      <main className="flex flex-grow items-center justify-center px-6 py-16 sm:py-24">
        <div className="mx-auto max-w-2xl text-center">
          {/* Logo */}
          <div className="mb-6 flex justify-center">
            <Image
              src="/assets/RSLogo2.png"
              alt="RAGESTATE"
              width={120}
              height={80}
              className="h-20 w-auto"
            />
          </div>

          {/* Error Code with Animation */}
          <h1 className="animate-pulse text-9xl font-bold text-red-600">404</h1>

          <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-5xl">
            Page not found
          </h2>

          <div className="mx-auto mb-8 mt-6 h-1 w-40 bg-gradient-to-r from-transparent via-red-700 to-transparent"></div>

          <p className="mt-6 text-lg leading-7 text-gray-300">
            Sorry, the page you are looking for doesn't exist or has been moved.
          </p>

          <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/"
              className="flex w-full items-center justify-center rounded-md bg-red-700 px-6 py-2 text-base font-semibold text-white shadow-md transition-all duration-300 hover:bg-red-900 focus:outline-none focus:ring-2 focus:ring-red-500 sm:w-auto"
            >
              <HomeIcon className="mr-2 h-5 w-5" />
              Return Home
            </Link>
            <Link
              href="/contact"
              className="flex w-full items-center justify-center rounded-md border border-gray-700 px-6 py-2 text-base font-semibold text-gray-300 transition-all duration-300 hover:border-red-500 hover:bg-red-900 sm:w-auto"
            >
              <EnvelopeIcon className="mr-2 h-5 w-5" />
              Contact Support
            </Link>
          </div>

          {/* Cyberpunk Glitch Warning Animation */}
          <div className="mx-auto mt-12 flex justify-center">
            <GlitchWarning />
          </div>
        </div>
      </main>
    </div>
  );
}
