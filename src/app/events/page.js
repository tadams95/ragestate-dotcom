'use client';

import { collection, getDocs, limit, orderBy, query, Timestamp, where } from 'firebase/firestore';
import { useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import EventSkeleton from '../../../components/EventSkeleton';
import EventTile from '../../../components/EventTile';
import NoEventTile from '../../../components/NoEventTile';
import { db } from '../../../firebase/firebase';
import EventStyling1 from '../components/styling/EventStyling1';

function EventsPageContent() {
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const searchParams = useSearchParams();

  const fetchEventData = useCallback(async () => {
    try {
      const eventCollectionRef = collection(db, 'events');
      // Targeted Firestore query: upcoming events only, sorted ascending, limited
      const q = query(
        eventCollectionRef,
        where('active', '==', true), // hide drafts
        where('dateTime', '>=', Timestamp.now()),
        orderBy('dateTime', 'asc'),
        limit(24),
      );
      const eventSnapshot = await getDocs(q);

      const eventData = eventSnapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      }));

      setEvents(eventData);
      setError(null);
    } catch (error) {
      console.error('Error fetching event data:', error);
      setError("We couldn't load events. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEventData();
  }, [fetchEventData]);

  const sortDir = (searchParams?.get('date') || 'asc').toLowerCase() === 'desc' ? 'desc' : 'asc';
  const sortedEvents = useMemo(() => {
    const list = events.slice();
    list.sort((a, b) => {
      const da =
        a?.dateTime?.toDate?.() ||
        (typeof a?.dateTime?.seconds === 'number'
          ? new Date(a.dateTime.seconds * 1000 + (a.dateTime.nanoseconds || 0) / 1e6)
          : 0);
      const dbv =
        b?.dateTime?.toDate?.() ||
        (typeof b?.dateTime?.seconds === 'number'
          ? new Date(b.dateTime.seconds * 1000 + (b.dateTime.nanoseconds || 0) / 1e6)
          : 0);
      return sortDir === 'asc' ? da - dbv : dbv - da;
    });
    return list;
  }, [events, sortDir]);

  return (
    <div className="flex min-h-screen flex-col">
      <EventStyling1 />

      <div className="flex-grow">
        <div className="mx-auto max-w-7xl px-4 pb-16 pt-10 sm:px-6 sm:pt-12 lg:px-8">
          <h1 className="mb-8 mt-8 text-center text-3xl font-bold tracking-tight text-gray-100">
            {events.length > 0 ? 'UPCOMING EVENTS' : 'NO EVENTS AT THIS TIME, PLEASE STAY TUNED!'}
          </h1>

          {/* SR-only live region for async status/errors */}
          <p className="sr-only" role="status" aria-live="polite">
            {error ? 'Error loading events' : isLoading ? 'Loading events' : 'Events loaded'}
          </p>

          {/* Loading state or content */}
          <div className="transition-all duration-500 ease-in-out">
            {isLoading ? (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {[...Array(3)].map((_, index) => (
                  <EventSkeleton key={index} />
                ))}
              </div>
            ) : error ? (
              <div className="mt-6 rounded border border-gray-800 bg-gray-900/50 p-4 text-gray-200">
                <p>{error}</p>
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsLoading(true);
                      setError(null);
                      // Fire and forget; loading skeleton will show
                      fetchEventData();
                    }}
                    className="rounded-md bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                  >
                    Retry
                  </button>
                </div>
              </div>
            ) : (
              <div className="opacity-100 transition-opacity duration-700">
                {sortedEvents.length === 0 ? (
                  <NoEventTile />
                ) : (
                  <div
                    className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
                    aria-busy={isLoading ? 'true' : 'false'}
                  >
                    {sortedEvents.map((event) => (
                      <EventTile key={event.id} event={event} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Footer is rendered globally in RootLayout */}
    </div>
  );
}

export default function Events() {
  return (
    <Suspense fallback={<EventsFallback />}>
      <EventsPageContent />
    </Suspense>
  );
}

function EventsFallback() {
  return (
    <div className="flex min-h-screen flex-col">
      <EventStyling1 />

      <div className="flex-grow">
        <div className="mx-auto max-w-7xl px-4 pb-16 pt-10 sm:px-6 sm:pt-12 lg:px-8">
          <h1 className="mb-8 mt-12 text-center text-3xl font-bold tracking-tight text-gray-100">
            UPCOMING EVENTS
          </h1>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, index) => (
              <EventSkeleton key={index} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
