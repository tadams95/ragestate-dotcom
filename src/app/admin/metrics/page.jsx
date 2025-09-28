'use client';
import { collection, doc, getDoc, getDocs, getFirestore } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { app } from '../../../../firebase/firebase';

export default function AdminMetricsPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const db = getFirestore(app);
        const eventsSnap = await getDocs(collection(db, 'events'));
        const list = [];
        for (const ev of eventsSnap.docs) {
          const id = ev.id;
          const mref = doc(db, 'metrics/events/events', id);
          const ms = await getDoc(mref);
          const mv = ms.exists() ? ms.data() : {};
          const previewCount = mv.previewCount || 0;
          const avgRemaining = previewCount > 0 ? (mv.previewRemainingSum || 0) / previewCount : 0;
          list.push({
            id,
            scansAccepted: mv.scansAccepted || 0,
            scanDenials: mv.scanDenials || 0,
            avgRemaining: Number(avgRemaining.toFixed(2)),
            lastUpdated: mv.lastUpdated?.toDate?.().toLocaleString?.() || '',
          });
        }
        list.sort((a, b) => a.id.localeCompare(b.id));
        if (!cancelled) setEvents(list);
      } catch (e) {
        console.error('Load metrics failed', e);
        if (!cancelled) setError('Failed to load metrics');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-black px-4 pb-16 pt-28 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-white">Event Metrics</h1>
            <p className="mt-1 text-sm text-neutral-400">
              Operational scanning & preview indicators per event.
            </p>
          </div>
          <div className="text-xs font-medium text-neutral-500">
            {!loading && !error && `${events.length} event${events.length === 1 ? '' : 's'}`}
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-md border border-red-700/40 bg-red-600/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {loading && (
          <div className="overflow-hidden rounded-lg border border-neutral-800 bg-neutral-900/40">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-800 bg-neutral-900/60 text-left text-neutral-300">
                    <th className="py-3 pl-4 pr-4 font-medium">Event</th>
                    <th className="py-3 pr-4 font-medium">Scans Accepted</th>
                    <th className="py-3 pr-4 font-medium">Scan Denials</th>
                    <th className="py-3 pr-4 font-medium">Avg Remaining (Preview)</th>
                    <th className="py-3 pr-4 font-medium">Last Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="py-3 pl-4 pr-4">
                        <div className="h-4 w-40 rounded bg-neutral-700/40" />
                      </td>
                      <td className="py-3 pr-4">
                        <div className="h-4 w-24 rounded bg-neutral-700/30" />
                      </td>
                      <td className="py-3 pr-4">
                        <div className="h-4 w-20 rounded bg-neutral-700/30" />
                      </td>
                      <td className="py-3 pr-4">
                        <div className="h-4 w-28 rounded bg-neutral-700/30" />
                      </td>
                      <td className="py-3 pr-4">
                        <div className="h-4 w-32 rounded bg-neutral-700/30" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!loading && !error && events.length === 0 && (
          <div className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-10 text-center">
            <p className="mb-2 text-lg font-medium text-neutral-200">No Events</p>
            <p className="text-sm text-neutral-400">Create an event to start collecting metrics.</p>
          </div>
        )}

        {!loading && !error && events.length > 0 && (
          <div className="overflow-hidden rounded-lg border border-neutral-800 bg-neutral-900/40 shadow">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-800 bg-neutral-900/60 text-left text-neutral-300">
                    <th className="py-3 pl-4 pr-4 font-medium">Event</th>
                    <th className="py-3 pr-4 font-medium">Scans Accepted</th>
                    <th className="py-3 pr-4 font-medium">Scan Denials</th>
                    <th className="py-3 pr-4 font-medium">Avg Remaining (Preview)</th>
                    <th className="py-3 pr-4 font-medium">Last Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800 text-neutral-200">
                  {events.map((e) => (
                    <tr key={e.id} className="hover:bg-neutral-800/60">
                      <td className="py-3 pl-4 pr-4 font-medium text-white">{e.id}</td>
                      <td className="py-3 pr-4 tabular-nums">{e.scansAccepted}</td>
                      <td className="py-3 pr-4 tabular-nums">{e.scanDenials}</td>
                      <td className="py-3 pr-4 tabular-nums">{e.avgRemaining}</td>
                      <td className="whitespace-nowrap py-3 pr-4 text-xs text-neutral-400">
                        {e.lastUpdated}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
