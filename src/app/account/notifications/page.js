'use client';

import storage from '@/utils/storage';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import NotificationsTab from '../components/NotificationsTab';

export default function NotificationsPage() {
  const [userId, setUserId] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const containerStyling =
    'bg-gray-900/30 p-6 rounded-lg border border-gray-800 hover:border-red-500/30 transition-all duration-300 shadow-xl';

  const cardStyling =
    'bg-transparent p-5 rounded-lg border border-gray-800 shadow-md hover:border-red-500/30 transition-all duration-300';

  useEffect(() => {
    async function init() {
      if (typeof window !== 'undefined') {
        const storedUserId = storage.get('userId');
        if (storedUserId) {
          setUserId(storedUserId);
        }
        setIsLoading(false);
      }
    }
    init();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black pt-20">
        <div className="mx-auto max-w-2xl px-4 py-8">
          <div className="py-12 text-center text-gray-400">Loading…</div>
        </div>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="min-h-screen bg-black pt-20">
        <div className="mx-auto max-w-2xl px-4 py-8">
          <div className={containerStyling}>
            <p className="text-center text-gray-400">
              Please{' '}
              <Link href="/login" className="text-red-500 hover:underline">
                log in
              </Link>{' '}
              to view notifications.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pt-20">
      <div className="mx-auto max-w-2xl px-4 py-8">
        {/* Back navigation */}
        <div className="mb-6">
          <Link
            href="/account"
            className="inline-flex items-center gap-2 text-sm text-gray-400 transition hover:text-white"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Back to Account
          </Link>
        </div>

        {/* Page title */}
        <h1 className="mb-6 text-2xl font-bold text-white">Notifications</h1>

        {/* Notifications content - reuse existing component */}
        <NotificationsTab
          userId={userId}
          containerStyling={containerStyling}
          cardStyling={cardStyling}
          markReadOnView={true}
        />
      </div>
    </div>
  );
}
