'use client';

import Header from '@/app/components/Header';
import EventStyling1 from '@/app/components/styling/EventStyling1';
import storage from '@/utils/storage';
import { useAuth } from '@fb/context/FirebaseContext';
import { getAuth } from 'firebase/auth';
import { doc, getDoc, getFirestore } from 'firebase/firestore';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import EventDetails from '../../../../components/EventDetails';

// Slugs are stored exactly as generated (kebab-case). No title-casing for lookup.

export default function EventDetail() {
  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState(null);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const db = getFirestore();
  const { currentUser } = useAuth();
  const [draftBlocked, setDraftBlocked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [toggling, setToggling] = useState(false);

  const selectedEvent = typeof window !== 'undefined' ? storage.getJSON('selectedEvent') : null;

  useEffect(() => {
    const slug = pathname.split('/events/')[1];

    console.log('slug', slug);
    if (!slug) return;
    let cancelled = false;
    const fetchEvent = async () => {
      const eventRef = doc(db, 'events', slug);
      const eventSnap = await getDoc(eventRef);
      if (!eventSnap.exists()) {
        console.log('No such document!');
        if (!cancelled) setLoading(false);
        return;
      }
      const data = eventSnap.data();
      let admin = false;
      if (currentUser) {
        try {
          const adminDoc = await getDoc(doc(db, 'adminUsers', currentUser.uid));
          admin = adminDoc.exists();
        } catch (_) {}
      }
      if (!cancelled) setIsAdmin(admin);
      if (data.active === false && !admin) {
        if (!cancelled) setDraftBlocked(true);
      } else if (!cancelled) {
        setEvent(data);
      }
      if (!cancelled) setLoading(false);
    };
    fetchEvent();
    return () => {
      cancelled = true;
    };
  }, [pathname, searchParams, db, currentUser]);

  const toggleActive = async (nextActive) => {
    if (!event || toggling) return;
    try {
      setToggling(true);
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) throw new Error('Not signed in');
      const token = await user.getIdToken();
      const res = await fetch('/api/admin/events/set-active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ slug: pathname.split('/events/')[1], active: nextActive }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) throw new Error(json.message || 'Failed');
      setEvent((e) => (e ? { ...e, active: nextActive } : e));
      if (!nextActive) {
        toast.success('Unpublished (draft)');
      } else {
        toast.success('Published');
      }
    } catch (e) {
      toast.error(e.message || 'Toggle failed');
    } finally {
      setToggling(false);
    }
  };

  if (draftBlocked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black p-6 text-gray-200">
        <div className="w-full max-w-md rounded-lg border border-gray-800 bg-gray-900/40 p-6 shadow-xl">
          <h1 className="mb-3 text-xl font-semibold tracking-tight">Not Published</h1>
          <p className="mb-5 text-sm leading-relaxed text-gray-400">
            This event is still in draft or you don\'t have permission to view it.
          </p>
          <Link
            href="/events"
            className="inline-flex items-center rounded-md border border-red-600 bg-red-600/10 px-4 py-2 text-sm font-medium text-red-300 hover:bg-red-600/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
          >
            View published events
          </Link>
        </div>
      </div>
    );
  }

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
            <div className="mx-auto mb-4 mt-4 flex items-center justify-between">
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
              <div className="flex items-center gap-2">
                {isAdmin && event && (
                  <div className="flex items-center gap-2 rounded border border-gray-700 bg-gray-800/40 px-2 py-1">
                    <span className="text-xs font-medium text-gray-300">
                      {event.active ? 'Published' : 'Draft'}
                    </span>
                    <button
                      disabled={toggling}
                      onClick={() => toggleActive(!event.active)}
                      className="rounded bg-gray-700 px-2 py-0.5 text-xs text-gray-200 hover:bg-gray-600 disabled:opacity-50"
                    >
                      {toggling ? '...' : event.active ? 'Unpublish' : 'Publish'}
                    </button>
                  </div>
                )}
                <button
                  type="button"
                  onClick={async () => {
                    const url = typeof window !== 'undefined' ? window.location.href : '';
                    if (!url) return;
                    let copied = false;
                    try {
                      await navigator.clipboard.writeText(url);
                      copied = true;
                    } catch (_) {}
                    if (!copied) {
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
                        copied = true;
                      } catch (_) {}
                    }
                    if (copied) toast.success('Link copied');
                  }}
                  className="rounded border border-gray-700 px-3 py-1 text-sm text-gray-200 hover:border-gray-500"
                  aria-label="Share this event"
                >
                  Share
                </button>
              </div>
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
                {isAdmin && event && !event.active && (
                  <p className="mt-2 rounded-md border border-amber-600/40 bg-amber-500/10 px-3 py-1 text-xs font-medium tracking-wide text-amber-300">
                    Draft (only admins can see this)
                  </p>
                )}
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
