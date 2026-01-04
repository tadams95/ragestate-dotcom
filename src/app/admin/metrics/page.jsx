'use client';
import { collection, doc, getDoc, getDocs, getFirestore } from 'firebase/firestore';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { app } from '../../../../firebase/firebase';
import { useMetricsData } from './hooks/useMetricsData';

// Dynamically import chart components to avoid SSR issues with Recharts
const RevenueChart = dynamic(() => import('./components/RevenueChart'), { ssr: false });
const UserGrowthChart = dynamic(() => import('./components/UserGrowthChart'), { ssr: false });
const FeedEngagement = dynamic(() => import('./components/FeedEngagement'), { ssr: false });

export default function AdminMetricsPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch business metrics
  const {
    loading: metricsLoading,
    error: metricsError,
    revenueData,
    totalRevenue,
    userGrowthData,
    totalUsers,
    feedStats,
    refetch,
  } = useMetricsData();

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
    <div className="min-h-screen bg-[var(--bg-root)] px-4 pb-16 pt-28 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Page Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
              Admin Metrics
            </h1>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Business intelligence and operational metrics dashboard.
            </p>
          </div>
          <button
            onClick={refetch}
            disabled={metricsLoading}
            className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors hover:bg-[var(--bg-elev-2)] disabled:opacity-50"
            style={{
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-secondary)',
            }}
          >
            <svg
              className={`h-4 w-4 ${metricsLoading ? 'animate-spin' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Refresh
          </button>
        </div>

        {/* Business Metrics Section */}
        <div className="mb-12 space-y-6">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Business Metrics</h2>

          {metricsError && (
            <div className="rounded-md border border-red-700/40 bg-red-600/10 px-4 py-3 text-sm text-red-300">
              {metricsError}
            </div>
          )}

          {metricsLoading ? (
            <div className="grid gap-6 lg:grid-cols-2">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="h-80 animate-pulse rounded-xl border bg-[var(--bg-elev-1)]"
                  style={{ borderColor: 'var(--border-subtle)' }}
                />
              ))}
              <div
                className="col-span-full h-64 animate-pulse rounded-xl border bg-[var(--bg-elev-1)]"
                style={{ borderColor: 'var(--border-subtle)' }}
              />
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-2">
              <RevenueChart data={revenueData} totalRevenue={totalRevenue} />
              <UserGrowthChart data={userGrowthData} totalUsers={totalUsers} />
              <div className="lg:col-span-2">
                <FeedEngagement stats={feedStats} />
              </div>
            </div>
          )}
        </div>

        {/* Event Scanning Metrics Section */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-[var(--text-primary)]">
              Event Scanning Metrics
            </h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Operational scanning & preview indicators per event.
            </p>
          </div>
          <div className="text-xs font-medium text-[var(--text-tertiary)]">
            {!loading && !error && `${events.length} event${events.length === 1 ? '' : 's'}`}
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-md border border-red-700/40 bg-red-600/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {loading && (
          <div className="overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elev-1)]">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-elev-2)] text-left text-[var(--text-secondary)]">
                    <th className="py-3 pl-4 pr-4 font-medium">Event</th>
                    <th className="py-3 pr-4 font-medium">Scans Accepted</th>
                    <th className="py-3 pr-4 font-medium">Scan Denials</th>
                    <th className="py-3 pr-4 font-medium">Avg Remaining (Preview)</th>
                    <th className="py-3 pr-4 font-medium">Last Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="py-3 pl-4 pr-4">
                        <div className="h-4 w-40 rounded bg-[var(--bg-elev-2)]" />
                      </td>
                      <td className="py-3 pr-4">
                        <div className="h-4 w-24 rounded bg-[var(--bg-elev-2)]" />
                      </td>
                      <td className="py-3 pr-4">
                        <div className="h-4 w-20 rounded bg-[var(--bg-elev-2)]" />
                      </td>
                      <td className="py-3 pr-4">
                        <div className="h-4 w-28 rounded bg-[var(--bg-elev-2)]" />
                      </td>
                      <td className="py-3 pr-4">
                        <div className="h-4 w-32 rounded bg-[var(--bg-elev-2)]" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!loading && !error && events.length === 0 && (
          <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elev-1)] p-10 text-center">
            <p className="mb-2 text-lg font-medium text-[var(--text-primary)]">No Events</p>
            <p className="text-sm text-[var(--text-secondary)]">
              Create an event to start collecting metrics.
            </p>
          </div>
        )}

        {!loading && !error && events.length > 0 && (
          <div className="overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elev-1)] shadow">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-elev-2)] text-left text-[var(--text-secondary)]">
                    <th className="py-3 pl-4 pr-4 font-medium">Event</th>
                    <th className="py-3 pr-4 font-medium">Scans Accepted</th>
                    <th className="py-3 pr-4 font-medium">Scan Denials</th>
                    <th className="py-3 pr-4 font-medium">Avg Remaining (Preview)</th>
                    <th className="py-3 pr-4 font-medium">Last Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)] text-[var(--text-primary)]">
                  {events.map((e) => (
                    <tr key={e.id} className="hover:bg-[var(--bg-elev-2)]">
                      <td className="py-3 pl-4 pr-4 font-medium text-[var(--text-primary)]">
                        {e.id}
                      </td>
                      <td className="py-3 pr-4 tabular-nums">{e.scansAccepted}</td>
                      <td className="py-3 pr-4 tabular-nums">{e.scanDenials}</td>
                      <td className="py-3 pr-4 tabular-nums">{e.avgRemaining}</td>
                      <td className="whitespace-nowrap py-3 pr-4 text-xs text-[var(--text-tertiary)]">
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
