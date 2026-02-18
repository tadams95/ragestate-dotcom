'use server';

import { firestoreAdmin } from '../server/firebaseAdmin';

const EVENTS_COLLECTION = 'events';

/**
 * Fetch a single event by slug (document ID) server-side.
 * Returns null if not found or inactive (draft).
 * @param {string} slug - Event document ID
 * @returns {Promise<import('../types/event').Event | null>}
 */
export async function getEventData(slug) {
  if (!slug) return null;

  try {
    const snap = await firestoreAdmin.collection(EVENTS_COLLECTION).doc(slug).get();

    if (!snap.exists) {
      return null;
    }

    const data = snap.data();

    // Handle both dateTime and date field names
    const rawDate = data.dateTime || data.date;
    let startDate = null;
    if (rawDate?.toDate) {
      startDate = rawDate.toDate().toISOString();
    } else if (rawDate?.seconds) {
      startDate = new Date(rawDate.seconds * 1000).toISOString();
    } else if (rawDate) {
      startDate = new Date(rawDate).toISOString();
    }

    let endDate = null;
    if (data.endDate?.toDate) {
      endDate = data.endDate.toDate().toISOString();
    } else if (data.endDate?.seconds) {
      endDate = new Date(data.endDate.seconds * 1000).toISOString();
    } else if (data.endDate) {
      endDate = new Date(data.endDate).toISOString();
    }

    return {
      id: snap.id,
      name: data.name || '',
      slug: data.slug || snap.id,
      description: data.description || '',
      startDate,
      endDate,
      location: data.location || '',
      imgURL: data.imgURL || data.imageUrl || '',
      price: data.price ?? null,
      capacity: data.capacity ?? null,
      category: data.category || '',
      active: data.active !== false,
      attendees: Array.isArray(data.attendees) ? data.attendees.length : 0,
    };
  } catch (err) {
    console.error('[getEventData] Error fetching event:', err);
    return null;
  }
}

/**
 * Fetch all active event document IDs for generateStaticParams and sitemap.
 * @returns {Promise<string[]>}
 */
export async function getActiveEventSlugs() {
  try {
    const snapshot = await firestoreAdmin
      .collection(EVENTS_COLLECTION)
      .where('active', '==', true)
      .select()
      .get();

    return snapshot.docs.map((doc) => doc.id);
  } catch (err) {
    console.error('[getActiveEventSlugs] Error fetching event slugs:', err);
    return [];
  }
}
