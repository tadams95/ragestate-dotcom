'use client';
import { collection, doc, getDoc, getDocs, getFirestore } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { app } from '../../../firebase/firebase';

export default function AdminMetricsPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
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
        setEvents(list);
      } catch (e) {
        console.error('Load metrics failed', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="p-6">
      <h1 className="mb-4 text-2xl font-semibold">Event Metrics</h1>
      {loading ? (
        <div>Loading…</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="py-2 pr-4">Event</th>
                <th className="py-2 pr-4">Scans Accepted</th>
                <th className="py-2 pr-4">Scan Denials</th>
                <th className="py-2 pr-4">Avg Remaining (Preview)</th>
                <th className="py-2 pr-4">Last Updated</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.id} className="border-b hover:bg-gray-50">
                  <td className="py-2 pr-4">{e.id}</td>
                  <td className="py-2 pr-4">{e.scansAccepted}</td>
                  <td className="py-2 pr-4">{e.scanDenials}</td>
                  <td className="py-2 pr-4">{e.avgRemaining}</td>
                  <td className="py-2 pr-4">{e.lastUpdated}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
