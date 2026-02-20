'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { getEventTickets } from '../../../../../lib/firebase/eventService';
import { getAdminUserView } from '../../../../../lib/firebase/adminService';

/**
 * Hook for loading event guest data with user enrichment and check-in stats
 * @param {string} eventId
 * @returns {{ guests: Array, stats: Object, loading: boolean, error: string|null, refreshGuests: () => void, updateGuestAfterCheckIn: (ragerId: string, scanResult: Object) => void }}
 */
export function useEventDayData(eventId) {
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadGuests = useCallback(async (eid, signal) => {
    if (!eid) {
      setGuests([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const ragers = await getEventTickets(eid);
      if (signal?.cancelled) return;

      // Deduplicate userIds for enrichment
      const uniqueIds = [...new Set(ragers.map((r) => r.userId).filter(Boolean))];

      // Batch resolve user data from RTDB
      const results = await Promise.allSettled(
        uniqueIds.map((uid) => getAdminUserView(uid)),
      );
      if (signal?.cancelled) return;

      // Build lookup map
      const userMap = new Map();
      uniqueIds.forEach((uid, i) => {
        const rtdb = results[i].status === 'fulfilled' ? results[i].value : null;
        if (rtdb) {
          userMap.set(uid, {
            displayName: rtdb.name || rtdb.displayName || '',
            email: rtdb.email || '',
            photoURL: rtdb.photoURL || rtdb.profilePicture || null,
          });
        }
      });

      // Merge user data into each rager
      const enriched = ragers.map((rager) => {
        const userData = userMap.get(rager.userId) || {};
        return {
          ...rager,
          displayName: userData.displayName || rager.owner || rager.ragerEmail || 'Unknown',
          email: userData.email || rager.ragerEmail || '',
          photoURL: userData.photoURL || null,
        };
      });

      if (signal?.cancelled) return;
      setGuests(enriched);
    } catch (err) {
      if (signal?.cancelled) return;
      console.error('Error loading event day data:', err);
      setError(err.message || 'Failed to load guest list');
    } finally {
      if (!signal?.cancelled) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const signal = { cancelled: false };
    loadGuests(eventId, signal);
    return () => {
      signal.cancelled = true;
    };
  }, [eventId, loadGuests]);

  const stats = useMemo(() => {
    const totalTickets = guests.reduce((sum, g) => sum + (g.quantity || 0), 0);
    const usedTickets = guests.reduce((sum, g) => sum + (g.usedCount || 0), 0);
    const remaining = totalTickets - usedTickets;
    const percentage = totalTickets > 0 ? Math.round((usedTickets / totalTickets) * 100) : 0;
    return { totalTickets, usedTickets, remaining, percentage };
  }, [guests]);

  const refreshGuests = useCallback(() => {
    loadGuests(eventId, { cancelled: false });
  }, [eventId, loadGuests]);

  const updateGuestAfterCheckIn = useCallback((ragerId, scanResult) => {
    setGuests((prev) =>
      prev.map((g) => {
        if (g.id === ragerId || g.userId === scanResult?.ragerId) {
          return {
            ...g,
            usedCount: (g.usedCount || 0) + 1,
            status: scanResult?.status === 'inactive' ? 'inactive' : 'active',
            lastScanAt: new Date(),
          };
        }
        return g;
      }),
    );
  }, []);

  return { guests, stats, loading, error, refreshGuests, updateGuestAfterCheckIn };
}
