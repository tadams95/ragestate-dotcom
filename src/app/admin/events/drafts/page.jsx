'use client';
import { getAuth } from 'firebase/auth';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
// NOTE: path needed five '../' segments to reach repository root from this nested route directory.
import { app } from '../../../../../firebase/firebase';

// Simple utility to format Firestore Timestamp / date-ish objects
function formatDate(ts) {
  if (!ts) return '';
  try {
    const d =
      typeof ts.toDate === 'function'
        ? ts.toDate()
        : ts.seconds
          ? new Date(ts.seconds * 1000 + (ts.nanoseconds || 0) / 1e6)
          : new Date(ts);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch (_) {
    return '';
  }
}

export default function DraftEventsPage() {
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toggling, setToggling] = useState({}); // slug -> boolean
  const [announce, setAnnounce] = useState(''); // accessibility live region

  const fetchDrafts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Use REST query (no admin privileges on client) limited to inactive events
      // NOTE: Security rules must allow admin user to read drafts. We rely on user having admin claim/doc.
      const auth = getAuth(app);
      const user = auth.currentUser;
      if (!user) {
        setError('Not signed in');
        setLoading(false);
        return;
      }
      await user.getIdToken();
      // Using Firestore client directly; admin-only access enforced by security rules.
      const { getFirestore, collection, query, where, getDocs, orderBy, limit } = await import(
        'firebase/firestore'
      );
      const db = getFirestore(app);
      const q = query(
        collection(db, 'events'),
        where('active', '==', false),
        orderBy('createdAt', 'desc'),
        limit(50),
      );
      const snap = await getDocs(q);
      const items = snap.docs.map((d) => ({ slug: d.id, ...d.data() }));
      setDrafts(items);
    } catch (e) {
      console.error(e);
      setError(e.message || 'Failed to load drafts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDrafts();
  }, [fetchDrafts]);

  const toggleActive = async (slug, nextActive) => {
    setToggling((t) => ({ ...t, [slug]: true }));
    try {
      const auth = getAuth(app);
      const user = auth.currentUser;
      if (!user) {
        throw new Error('Not signed in');
      }
      const token = await user.getIdToken();
      const res = await fetch('/api/admin/events/set-active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ slug, active: nextActive }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.message || 'Failed');
      setDrafts((d) => d.filter((ev) => ev.slug !== slug));
      setAnnounce(`Published event ${slug}`);
    } catch (e) {
      alert(e.message || 'Failed to toggle');
    } finally {
      setToggling((t) => ({ ...t, [slug]: false }));
    }
  };

  return (
    <div className="min-h-screen bg-black px-4 pb-16 pt-28 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-white">Draft Events</h1>
            <p className="mt-1 text-sm text-neutral-400">
              Manage unpublished events. Publish to make them visible to users.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchDrafts}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-md border border-neutral-600 bg-neutral-800 px-3 py-2 text-sm font-medium text-neutral-200 shadow-sm hover:bg-neutral-700 disabled:opacity-50"
            >
              {loading && (
                <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-neutral-400 border-t-transparent" />
              )}
              Refresh
            </button>
            {error && (
              <span className="text-sm font-medium text-red-500" role="alert">
                {error}
              </span>
            )}
          </div>
        </div>

        <div aria-live="polite" className="sr-only">
          {announce}
        </div>

        {loading && (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-40 animate-pulse rounded-lg border border-neutral-800 bg-neutral-900/40 p-4"
              >
                <div className="mb-3 h-5 w-40 rounded bg-neutral-700/40" />
                <div className="mb-2 h-3 w-24 rounded bg-neutral-700/30" />
                <div className="mb-2 h-3 w-5/6 rounded bg-neutral-700/20" />
                <div className="h-3 w-2/3 rounded bg-neutral-700/20" />
                <div className="mt-4 h-8 w-24 rounded bg-neutral-700/40" />
              </div>
            ))}
          </div>
        )}

        {!loading && drafts.length === 0 && !error && (
          <div className="mt-10 flex flex-col items-center justify-center rounded-lg border border-neutral-800 bg-neutral-900/40 p-12 text-center">
            <p className="mb-3 text-lg font-medium text-neutral-200">No Drafts</p>
            <p className="mb-6 max-w-sm text-sm text-neutral-400">
              You don't have any draft events right now. Create one from the new event page and mark
              it as Draft to stage content.
            </p>
            <Link
              href="/admin/events/new"
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-red-500"
            >
              Create Event
            </Link>
          </div>
        )}

        {!loading && drafts.length > 0 && (
          <ul className="grid gap-5 md:grid-cols-2 xl:grid-cols-3" role="list">
            {drafts.map((ev) => (
              <li
                key={ev.slug}
                className="group relative flex flex-col rounded-lg border border-neutral-800 bg-neutral-900/40 p-5 shadow-sm transition hover:border-neutral-600 hover:bg-neutral-900/60"
              >
                <div className="mb-3 flex items-start justify-between gap-4">
                  <h2 className="line-clamp-2 text-base font-semibold leading-tight text-neutral-100">
                    {ev.name || ev.slug}
                  </h2>
                  <span className="rounded-md border border-amber-600/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-300">
                    Draft
                  </span>
                </div>
                <p className="mb-3 line-clamp-3 text-xs leading-relaxed text-neutral-300/90">
                  {ev.description || 'No description provided.'}
                </p>
                <div className="mt-auto flex items-center justify-between pt-2">
                  <div className="text-[11px] font-medium text-neutral-500">
                    {formatDate(ev.createdAt) && <>Created {formatDate(ev.createdAt)}</>}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      disabled={toggling[ev.slug]}
                      onClick={() => toggleActive(ev.slug, true)}
                      className="inline-flex items-center justify-center rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white shadow hover:bg-emerald-500 disabled:opacity-50"
                    >
                      {toggling[ev.slug] ? '...' : 'Publish'}
                    </button>
                    <a
                      href={`/admin/events/new?clone=${encodeURIComponent(ev.slug)}`}
                      className="inline-flex items-center justify-center rounded-md border border-neutral-600 bg-neutral-800 px-2.5 py-1 text-xs font-medium text-neutral-200 hover:bg-neutral-700"
                    >
                      Clone
                    </a>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
