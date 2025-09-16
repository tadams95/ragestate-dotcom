'use client';

import Header from '../components/Header';

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
  const searchParams = useSearchParams();

  const fetchEventData = useCallback(async () => {
    try {
      const eventCollectionRef = collection(db, 'events');
      // Targeted Firestore query: upcoming events only, sorted ascending, limited
      const q = query(
        eventCollectionRef,
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
    } catch (error) {
      console.error('Error fetching event data:', error);
    } finally {
      // Set a small delay to make the transition smoother
      if (typeof window !== 'undefined') {
        const id = setTimeout(() => {
          setIsLoading(false);
        }, 300);
        // Return a no-op for call site; caller handles cleanup in effect
        return () => clearTimeout(id);
      } else {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    let cleanup = null;
    (async () => {
      const maybeCleanup = await fetchEventData();
      if (typeof maybeCleanup === 'function') cleanup = maybeCleanup;
    })();

    return () => {
      if (cleanup) cleanup();
    };
  }, [fetchEventData]);

  // Minimal sort via URL param (?date=asc|desc)
  const sortDir = (searchParams?.get('date') || 'asc').toLowerCase() === 'desc' ? 'desc' : 'asc';
  const sortedEvents = useMemo(() => {
    const list = events.slice();
    list.sort((a, b) => {
      const da = a?.dateTime?.toDate?.() || 0;
      const db = b?.dateTime?.toDate?.() || 0;
      return sortDir === 'asc' ? da - db : db - da;
    });
    return list;
  }, [events, sortDir]);

  return (
    <div className="flex min-h-screen flex-col">
      <div className="isolate bg-black">
        <Header />
      </div>
      <EventStyling1 />

      <div className="flex-grow">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="mb-6 mt-10 pt-8 text-center text-3xl font-bold tracking-tight text-gray-100">
            {events.length > 0 ? 'UPCOMING EVENTS' : 'NO EVENTS AT THIS TIME, PLEASE STAY TUNED!'}
          </h2>

          {/* Loading state or content */}
          <div className="transition-all duration-500 ease-in-out">
            {isLoading ? (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {[...Array(3)].map((_, index) => (
                  <EventSkeleton key={index} />
                ))}
              </div>
            ) : (
              <div className="opacity-100 transition-opacity duration-700">
                {sortedEvents.length === 0 ? (
                  <NoEventTile />
                ) : (
                  <div className="mb-8 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
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
    <Suspense fallback={null}>
      <EventsPageContent />
    </Suspense>
  );
}
