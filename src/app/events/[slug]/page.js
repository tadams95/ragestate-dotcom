'use client';

import Header from '@/app/components/Header';
import EventStyling1 from '@/app/components/styling/EventStyling1';
import storage from '@/utils/storage';
import { doc, getDoc, getFirestore } from 'firebase/firestore';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
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
  }, [pathname, searchParams, db]);

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
            {/* Breadcrumbs + Share */}
            <div className="mx-auto mb-4 flex items-center justify-between">
              <nav aria-label="Breadcrumb" className="text-sm text-gray-400">
                <ol className="flex items-center gap-2">
                  <li>
                    <Link href="/" className="hover:text-white">
                      Home
                    </Link>
                  </li>
                  <li className="text-gray-600">/</li>
                  <li>
                    <Link href="/events" className="hover:text-white">
                      Events
                    </Link>
                  </li>
                  <li className="text-gray-600">/</li>
                  <li aria-current="page" className="line-clamp-1 max-w-[50vw] text-gray-300">
                    {(selectedEvent || event)?.name || 'Event'}
                  </li>
                </ol>
              </nav>
              <button
                type="button"
                onClick={async () => {
                  const url = typeof window !== 'undefined' ? window.location.href : '';
                  if (!url) return;
                  try {
                    await navigator.clipboard.writeText(url);
                    toast.success('Link copied');
                    return;
                  } catch (_) {}
                  try {
                    const ta = document.createElement('textarea');
                    ta.value = url;
                    ta.setAttribute('readonly', '');
                    ta.style.position = 'fixed';
                    ta.style.opacity = '0';
                    document.body.appendChild(ta);
                    ta.select();
                    document.execCommand('copy');
                    document.body.removeChild(ta);
                    toast.success('Link copied');
                  } catch (_) {}
                }}
                className="rounded border border-gray-700 px-3 py-1 text-sm text-gray-200 hover:border-gray-500"
                aria-label="Share this event"
              >
                Share
              </button>
            </div>
            <div className="mx-auto max-w-6xl">
              {/* Hero: title/date/location + CTA */}
              <div className="mb-8 flex flex-col items-center text-center">
                <div className="mb-4 mt-2 flex justify-center">
                  <Image
                    src="/assets/RSLogo2.png"
                    alt="RAGESTATE"
                    width={200}
                    height={56}
                    className="h-14 w-auto"
                    sizes="(max-width: 640px) 112px, 200px"
                  />
                </div>
                <h1 className="text-3xl font-bold leading-tight text-white">
                  {(selectedEvent || event)?.name || 'Event'}
                </h1>
                <p className="mt-2 text-gray-300">
                  {(() => {
                    const e = selectedEvent || event;
                    const dt = e?.dateTime;
                    let d = null;
                    try {
                      d =
                        typeof dt?.toDate === 'function'
                          ? dt.toDate()
                          : typeof dt?.seconds === 'number'
                            ? new Date(dt.seconds * 1000 + (dt.nanoseconds || 0) / 1e6)
                            : null;
                    } catch (_) {}
                    const dateStr = d
                      ? d.toLocaleDateString('en-US', {
                          weekday: 'long',
                          month: 'long',
                          day: 'numeric',
                        })
                      : '';
                    const timeStr = d
                      ? d.toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true,
                        })
                      : '';
                    const loc = e?.location || '';
                    return [dateStr && `${dateStr} • ${timeStr}`, loc].filter(Boolean).join(' — ');
                  })()}
                </p>
              </div>

              {/* Main content area with consistent border/shadow styling */}
              <div
                id="tickets"
                className="rounded-lg border border-gray-800 bg-gray-900/30 p-6 shadow-xl transition-all duration-300 hover:border-red-500/30"
              >
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
