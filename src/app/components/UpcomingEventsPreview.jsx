'use client';

import { collection, getDocs, limit, orderBy, query, Timestamp, where } from 'firebase/firestore';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import EventTile from '../../../components/EventTile';
import { db } from '../../../firebase/firebase';

export default function UpcomingEventsPreview() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const q = query(
          collection(db, 'events'),
          where('active', '==', true),
          where('dateTime', '>=', Timestamp.now()),
          orderBy('dateTime', 'asc'),
          limit(3),
        );
        const snap = await getDocs(q);
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        if (!cancelled) setEvents(list);
      } catch (e) {
        if (!cancelled) setError('Failed to load events');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const visible = useMemo(() => events.slice(0, 2), [events]);

  if (loading) return null;
  if (error || visible.length === 0) return null;

  return (
    <section aria-labelledby="upcoming-events" className="bg-black">
      <div className="mx-auto max-w-7xl px-6 pb-16 sm:px-8">
        <div className="mb-6 flex items-end justify-between">
          <h2 id="upcoming-events" className="text-xl font-semibold tracking-tight text-white">
            Upcoming events
          </h2>
          <Link href="/events" className="text-sm font-medium text-gray-300 hover:text-white">
            View all
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {visible.map((e) => (
            <EventTile key={e.id} event={e} />
          ))}
        </div>
      </div>
    </section>
  );
}
