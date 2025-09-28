'use client';
import { getAuth } from 'firebase/auth';
import { useCallback, useEffect, useState } from 'react';
import { app } from '../../../../firebase/firebase';

export default function DraftEventsPage() {
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toggling, setToggling] = useState({}); // slug -> boolean

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
    } catch (e) {
      alert(e.message || 'Failed to toggle');
    } finally {
      setToggling((t) => ({ ...t, [slug]: false }));
    }
  };

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="mb-4 text-2xl font-semibold">Draft Events</h1>
      <div className="mb-4 flex items-center gap-3">
        <button
          onClick={fetchDrafts}
          className="rounded bg-neutral-800 px-3 py-1 text-sm text-white"
          disabled={loading}
        >
          Refresh
        </button>
        {loading && <span className="text-sm text-neutral-500">Loading…</span>}
        {error && <span className="text-sm text-red-500">{error}</span>}
      </div>
      {!loading && drafts.length === 0 && (
        <p className="text-sm text-neutral-500">No drafts found.</p>
      )}
      <ul className="space-y-4">
        {drafts.map((ev) => (
          <li key={ev.slug} className="rounded border border-neutral-700 bg-neutral-900/40 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-medium">{ev.name || ev.slug}</h2>
                <p className="mb-2 text-xs text-neutral-400">Slug: {ev.slug}</p>
                <p className="line-clamp-3 text-sm text-neutral-300">
                  {ev.description || 'No description'}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <button
                  disabled={toggling[ev.slug]}
                  onClick={() => toggleActive(ev.slug, true)}
                  className="rounded bg-emerald-600 px-3 py-1 text-sm text-white hover:bg-emerald-500 disabled:opacity-50"
                >
                  {toggling[ev.slug] ? 'Publishing…' : 'Publish'}
                </button>
                <a
                  href={`/admin/events/new?clone=${encodeURIComponent(ev.slug)}`}
                  className="text-xs text-neutral-400 underline hover:text-neutral-200"
                >
                  Clone
                </a>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
