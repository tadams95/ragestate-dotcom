'use client';

import { memo, useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../../../../firebase/firebase';
import { adminInput } from '../shared/adminStyles';

const STORAGE_KEY = 'eventDaySelectedEvent';

/**
 * @param {{ selectedEventId: string, onEventChange: (id: string) => void }} props
 */
function EventSelector({ selectedEventId, onEventChange }) {
  const [events, setEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadEvents() {
      try {
        setLoadingEvents(true);
        const snap = await getDocs(collection(db, 'events'));
        if (cancelled) return;

        const list = snap.docs.map((d) => {
          const data = d.data();
          const rawDate = data.dateTime || data.date;
          let dateVal = null;
          if (rawDate?.toDate) {
            dateVal = rawDate.toDate();
          } else if (rawDate) {
            dateVal = new Date(rawDate);
          }
          return {
            id: d.id,
            title: data.title || data.name || d.id,
            date: dateVal,
          };
        });

        // Sort by date descending (most recent first)
        list.sort((a, b) => {
          if (a.date && b.date) return b.date - a.date;
          if (a.date) return -1;
          if (b.date) return 1;
          return 0;
        });

        setEvents(list);

        // Restore from localStorage if no selection yet
        if (!selectedEventId && list.length > 0) {
          let saved = '';
          try {
            saved = localStorage.getItem(STORAGE_KEY) || '';
          } catch {}
          const initial = saved && list.some((e) => e.id === saved) ? saved : '';
          if (initial) {
            onEventChange(initial);
          }
        }
      } catch (err) {
        console.error('Error loading events:', err);
      } finally {
        if (!cancelled) setLoadingEvents(false);
      }
    }

    loadEvents();
    return () => {
      cancelled = true;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleChange = (e) => {
    const id = e.target.value;
    onEventChange(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {}
  };

  return (
    <div className="flex-1 sm:max-w-xs">
      <select
        value={selectedEventId}
        onChange={handleChange}
        className={adminInput}
      >
        <option value="">
          {loadingEvents ? 'Loading events...' : 'Select event'}
        </option>
        {events.map((e) => (
          <option key={e.id} value={e.id}>
            {e.title}
          </option>
        ))}
      </select>
    </div>
  );
}

export default memo(EventSelector);
