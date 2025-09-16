'use client';

import Header from '@/app/components/Header';
import EventStyling1 from '@/app/components/styling/EventStyling1';
import storage from '@/utils/storage';
import { doc, getDoc, getFirestore } from 'firebase/firestore';
import Image from 'next/image';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import EventDetails from '../../../../components/EventDetails';

// Function to format the slug to match the document ID in Firestore
const formatSlug = (slug) => {
  let formattedSlug = slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  // Handle specific case for "Concert + Rave"
  if (formattedSlug.includes('Concert Rave')) {
    formattedSlug = formattedSlug.replace('Concert Rave', 'Concert + Rave');
  }

  return formattedSlug;
};

export default function EventDetail() {
  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState(null);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const db = getFirestore();

  const selectedEvent = typeof window !== 'undefined' ? storage.getJSON('selectedEvent') : null;

  useEffect(() => {
    const slug = pathname.split('/events/')[1];

    console.log('slug', slug);
    if (slug) {
      const fetchEvent = async () => {
        const formattedSlug = formatSlug(slug);

        const eventRef = doc(db, 'events', formattedSlug);
        const eventSnap = await getDoc(eventRef);

        if (eventSnap.exists()) {
          setEvent(eventSnap.data());
        } else {
          console.log('No such document!');
        }
        setLoading(false);
      };

      fetchEvent();
    }
  }, [pathname, searchParams]);

  return (
    <div className="min-h-screen bg-black">
      <Header />
      <EventStyling1 />

      <main className="flex-grow">
        {loading ? (
          <div className="flex h-[70vh] items-center justify-center">
            <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-red-500"></div>
          </div>
        ) : (
          <div className="mx-auto max-w-7xl px-4 pb-24 pt-16 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-6xl">
              {/* Event header with logo - matches account page */}
              <div className="mb-8 flex flex-col items-center">
                <div className="mb-4 mt-6 flex justify-center">
                  <Image
                    src="/assets/RSLogo2.png"
                    alt="RAGESTATE"
                    width={200}
                    height={56}
                    className="h-14 w-auto"
                    sizes="(max-width: 640px) 112px, 200px"
                  />
                </div>
                <h1 className="text-center text-3xl font-bold leading-tight text-white">
                  Event Details
                </h1>
                <p className="mt-2 max-w-2xl text-center text-gray-400">
                  View event information and secure your tickets.
                </p>
              </div>

              {/* Main content area with consistent border/shadow styling */}
              <div className="rounded-lg border border-gray-800 bg-gray-900/30 p-6 shadow-xl transition-all duration-300 hover:border-red-500/30">
                <EventDetails event={selectedEvent || event} />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer is rendered globally in RootLayout */}
    </div>
  );
}
