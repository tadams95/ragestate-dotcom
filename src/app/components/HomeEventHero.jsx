'use client';

import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  Timestamp,
  where,
} from 'firebase/firestore';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { db } from '../../../firebase/firebase';
import EventStyling1 from './styling/EventStyling1';

export default function HomeEventHero() {
  const [featured, setFeatured] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        // 1) Try to use Harvest Rage explicitly if it exists and is active/upcoming
        const harvestSlug = 'harvest-rage';
        let picked = null;
        try {
          const ref = doc(db, 'events', harvestSlug);
          const snap = await getDoc(ref);
          if (snap.exists()) {
            const data = snap.data();
            const dt = data?.dateTime;
            const now = Timestamp.now();
            const isUpcoming = (() => {
              try {
                if (dt && typeof dt.toMillis === 'function') return dt.toMillis() >= now.toMillis();
                if (dt && typeof dt.seconds === 'number') return dt.seconds >= now.seconds;
              } catch (_) {}
              return true; // best-effort if no date
            })();
            if (data?.active !== false && isUpcoming) {
              picked = { ...data, id: snap.id };
            }
          }
        } catch (_) {}

        // 2) Fallback to next upcoming active event
        if (!picked) {
          const eventCollectionRef = collection(db, 'events');
          const q = query(
            eventCollectionRef,
            where('active', '==', true),
            where('dateTime', '>=', Timestamp.now()),
            orderBy('dateTime', 'asc'),
            limit(1),
          );
          const snapshot = await getDocs(q);
          if (!snapshot.empty) {
            const docSnap = snapshot.docs[0];
            picked = { ...docSnap.data(), id: docSnap.id };
          }
        }

        if (!cancelled) setFeatured(picked);
      } catch (e) {
        if (!cancelled) setError('Unable to load the featured event.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const { name, imgURL, location, dateTime } = featured || {};
  const { dateStr, timeStr } = useMemo(() => {
    let d = null;
    try {
      if (dateTime && typeof dateTime.toDate === 'function') d = dateTime.toDate();
      else if (dateTime && typeof dateTime.seconds === 'number')
        d = new Date(dateTime.seconds * 1000 + (dateTime.nanoseconds || 0) / 1e6);
    } catch (_) {}
    return {
      dateStr: d
        ? d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
        : '',
      timeStr: d
        ? d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
        : '',
    };
  }, [dateTime]);

  if (loading) {
    return (
      <div className="relative isolate min-h-[70vh] w-full bg-black">
        <EventStyling1 />
        <div className="mx-auto flex max-w-7xl items-center justify-center px-6 py-24 sm:py-32 lg:px-8">
          <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-red-500" />
        </div>
      </div>
    );
  }

  if (error || !featured) {
    return (
      <div className="relative isolate min-h-[60vh] w-full bg-black">
        <EventStyling1 />
        <div className="mx-auto max-w-7xl px-6 py-24 text-center sm:py-32 lg:px-8">
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            No upcoming events
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-gray-300">
            We couldn't find an upcoming event right now. Check the full events page for updates.
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <Link
              href="/events"
              className="rounded-md bg-red-700 px-6 py-3 text-sm font-semibold text-white hover:bg-red-800"
            >
              See all events
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const slug = featured?.slug || featured?.id;
  const imgSrc = imgURL || '/assets/EventHero.png';

  return (
    <div className="relative isolate w-full overflow-hidden bg-black">
      <EventStyling1 />
      {/* Soft background image for ambiance */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <Image
          src={imgSrc}
          alt=""
          fill
          sizes="100vw"
          priority
          className="object-cover object-center opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/70 to-black" />
      </div>

      {/* Foreground content with flyer on top and CTAs below */}
      <div className="mx-auto max-w-7xl px-6 pb-16 pt-28 sm:px-8 sm:pb-24 sm:pt-36">
        <div className="mb-6 inline-flex items-center rounded-full bg-red-600/10 px-3 py-1 text-xs font-medium text-red-400 ring-1 ring-inset ring-red-600/30">
          FEATURED EVENT
        </div>

        {/* Clickable flyer on top */}
        <Link
          href={slug ? `/events/${slug}` : '/events'}
          onClick={() => {
            try {
              if (featured) localStorage.setItem('selectedEvent', JSON.stringify(featured));
            } catch (_) {}
          }}
          className="block"
          aria-label={(name || 'Event') + ' details'}
        >
          <div className="relative mx-auto w-full max-w-3xl overflow-hidden rounded-2xl border border-gray-800 bg-gray-900/40 shadow-2xl ring-1 ring-black/30">
            <div className="relative aspect-[3/4] w-full bg-black">
              <Image
                src={imgSrc}
                alt={(name || 'Event') + ' flyer'}
                fill
                sizes="(min-width: 1024px) 56vw, 100vw"
                priority
                className="object-contain object-center"
              />
            </div>
          </div>
        </Link>

        {/* <div className="mt-4 flex justify-center gap-4">
          {imgSrc && (
            <a
              href={imgSrc}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-gray-300 underline decoration-gray-600 underline-offset-4 hover:text-white"
            >
              View full flyer
            </a>
          )}
        </div> */}

        {/* Details & CTAs below */}
        <div className="mt-8 text-center">
          {/* <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
            {name || 'Upcoming Event'}
          </h1>
          <p className="mt-3 text-base text-gray-300">
            {[dateStr && `${dateStr} • ${timeStr}`, location].filter(Boolean).join(' — ')}
          </p> */}
          <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center sm:justify-center">
            <Link
              href={slug ? `/events/${slug}#tickets` : '/events'}
              onClick={() => {
                try {
                  if (featured) localStorage.setItem('selectedEvent', JSON.stringify(featured));
                } catch (_) {}
              }}
              className="rounded-md bg-red-700 px-8 py-3 text-center text-sm font-semibold text-white hover:bg-red-800"
            >
              Get tickets
            </Link>
            <Link
              href={slug ? `/events/${slug}` : '/events'}
              onClick={() => {
                try {
                  if (featured) localStorage.setItem('selectedEvent', JSON.stringify(featured));
                } catch (_) {}
              }}
              className="rounded-md border border-gray-700 bg-gray-900/40 px-8 py-3 text-center text-sm font-semibold text-gray-200 hover:border-gray-500"
            >
              Event details
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
