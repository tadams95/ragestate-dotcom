/**
 * Event Service - Firestore operations for events and tickets
 * Abstracts event, ticket, and transfer operations
 */

import {
  collection,
  collectionGroup,
  doc,
  documentId,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getFirestore,
} from 'firebase/firestore';
import { db } from '../../firebase/firebase';

const EVENTS_COLLECTION = 'events';
const PAGE_SIZE = 20;

// ============================================
// EVENT OPERATIONS
// ============================================

/**
 * Get a single event by ID
 * @param {string} eventId
 * @returns {Promise<import('../types/event').Event | null>}
 */
export async function getEvent(eventId) {
  if (!eventId) return null;

  const eventDoc = await getDoc(doc(db, EVENTS_COLLECTION, eventId));
  if (!eventDoc.exists()) return null;

  const data = eventDoc.data();
  return {
    id: eventDoc.id,
    ...data,
    date: data.date?.toDate?.() || data.dateTime?.toDate?.() || data.date,
  };
}

/**
 * Get upcoming events with pagination
 * @param {import('../types/common').DocumentSnapshot} [lastDoc]
 * @param {number} [pageSize]
 * @returns {Promise<{events: import('../types/event').Event[], lastDoc: import('../types/common').DocumentSnapshot | null}>}
 */
export async function getUpcomingEvents(lastDoc = null, pageSize = PAGE_SIZE) {
  const now = new Date();

  const constraints = [
    where('date', '>=', now),
    orderBy('date', 'asc'),
    limit(pageSize),
  ];

  if (lastDoc) {
    constraints.push(startAfter(lastDoc));
  }

  const q = query(collection(db, EVENTS_COLLECTION), ...constraints);
  const snapshot = await getDocs(q);

  const events = snapshot.docs.map((docSnap) => {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      ...data,
      date: data.date?.toDate?.() || data.dateTime?.toDate?.() || data.date,
    };
  });

  const newLastDoc = snapshot.docs[snapshot.docs.length - 1] || null;

  return { events, lastDoc: newLastDoc };
}

/**
 * Get all events with pagination (for admin)
 * @param {import('../types/common').DocumentSnapshot} [lastDoc]
 * @param {number} [pageSize]
 * @returns {Promise<{events: import('../types/event').Event[], lastDoc: import('../types/common').DocumentSnapshot | null}>}
 */
export async function getEvents(lastDoc = null, pageSize = PAGE_SIZE) {
  const constraints = [
    orderBy('date', 'desc'),
    limit(pageSize),
  ];

  if (lastDoc) {
    constraints.push(startAfter(lastDoc));
  }

  const q = query(collection(db, EVENTS_COLLECTION), ...constraints);
  const snapshot = await getDocs(q);

  const events = snapshot.docs.map((docSnap) => {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      ...data,
      date: data.date?.toDate?.() || data.dateTime?.toDate?.() || data.date,
    };
  });

  const newLastDoc = snapshot.docs[snapshot.docs.length - 1] || null;

  return { events, lastDoc: newLastDoc };
}

// ============================================
// TICKET OPERATIONS
// ============================================

/**
 * Get tickets for a user across all events
 * Uses collectionGroup query on 'ragers' subcollection
 * @param {import('../types/common').UserId} userId
 * @returns {Promise<import('../types/event').Ticket[]>}
 */
export async function getUserTickets(userId) {
  if (!userId) return [];

  const firestore = getFirestore();

  // Query all ragers subcollections for this user
  const ragersQ = query(
    collectionGroup(firestore, 'ragers'),
    where('firebaseId', '==', userId),
  );
  const ragersSnapshot = await getDocs(ragersQ);

  if (ragersSnapshot.empty) return [];

  const ragerDocs = ragersSnapshot.docs;

  // Extract event IDs from rager doc refs
  const eventIds = Array.from(
    new Set(
      ragerDocs
        .map((d) => d.ref.parent?.parent?.id)
        .filter((id) => typeof id === 'string' && id.length > 0),
    ),
  );

  // Batch fetch event docs (Firestore IN queries limited to 10)
  const eventsCol = collection(firestore, EVENTS_COLLECTION);
  const eventMap = new Map();

  for (let i = 0; i < eventIds.length; i += 10) {
    const chunk = eventIds.slice(i, i + 10);
    const q = query(eventsCol, where(documentId(), 'in', chunk));
    const snap = await getDocs(q);
    snap.forEach((eventDoc) => eventMap.set(eventDoc.id, eventDoc.data()));
  }

  // Compose tickets with event metadata
  const tickets = ragerDocs.map((ragerDoc) => {
    const ticketData = ragerDoc.data();
    const eventId = ragerDoc.ref.parent?.parent?.id;
    const eventData = (eventId && eventMap.get(eventId)) || {};

    // Handle dateTime (new schema) or date (legacy)
    const rawDate = eventData.dateTime || eventData.date;
    let eventDate;
    if (rawDate?.toDate) {
      eventDate = rawDate.toDate();
    } else if (rawDate) {
      eventDate = new Date(rawDate);
    } else {
      eventDate = null;
    }

    return {
      id: ragerDoc.id,
      ticketId: ragerDoc.id,
      eventId,
      eventName: eventData.name || 'Unnamed Event',
      eventDate,
      userId,
      tierName: ticketData.ticketType || 'General Admission',
      status: ticketData.active ? 'active' : 'inactive',
      quantity: ticketData.ticketQuantity || ticketData.quantity || 1,
      usedCount: ticketData.usedCount || 0,
      price: ticketData.price || eventData.price || 0,
      imageUrl: eventData.imgURL || null,
      location: eventData.location || 'TBA',
      createdAt: ticketData.purchaseTimestamp
        ? new Date(ticketData.purchaseTimestamp)
        : new Date(),
    };
  });

  // Sort: active first, then by event date
  return tickets.sort((a, b) => {
    const aActive = a.status === 'active';
    const bActive = b.status === 'active';
    if (aActive !== bActive) return aActive ? -1 : 1;
    if (a.eventDate && b.eventDate) {
      return new Date(a.eventDate) - new Date(b.eventDate);
    }
    return 0;
  });
}

/**
 * Get tickets for a specific event
 * @param {string} eventId
 * @returns {Promise<import('../types/event').Ticket[]>}
 */
export async function getEventTickets(eventId) {
  if (!eventId) return [];

  const ragersRef = collection(db, EVENTS_COLLECTION, eventId, 'ragers');
  const snapshot = await getDocs(ragersRef);

  return snapshot.docs.map((docSnap) => {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      ticketId: docSnap.id,
      eventId,
      userId: data.firebaseId,
      owner: data.owner || '',
      ragerEmail: data.email || '',
      tierName: data.ticketType || 'General Admission',
      status: data.active ? 'active' : 'inactive',
      quantity: data.ticketQuantity || data.quantity || 1,
      usedCount: data.usedCount || 0,
      lastScanAt: data.lastScanAt?.toDate?.() || null,
      price: data.price || 0,
      createdAt: data.purchaseTimestamp
        ? new Date(data.purchaseTimestamp)
        : new Date(),
    };
  });
}

// ============================================
// TRANSFER OPERATIONS
// ============================================

/**
 * Get ticket transfers for a user (sent and received)
 * @param {import('../types/common').UserId} userId
 * @returns {Promise<{sent: import('../types/event').TicketTransfer[], received: import('../types/event').TicketTransfer[]}>}
 */
export async function getUserTransfers(userId) {
  if (!userId) return { sent: [], received: [] };

  // Note: This assumes a 'ticketTransfers' collection exists
  // Adjust collection name based on actual schema
  const TRANSFERS_COLLECTION = 'ticketTransfers';

  const [sentSnapshot, receivedSnapshot] = await Promise.all([
    getDocs(query(
      collection(db, TRANSFERS_COLLECTION),
      where('fromUserId', '==', userId),
      orderBy('createdAt', 'desc'),
    )),
    getDocs(query(
      collection(db, TRANSFERS_COLLECTION),
      where('toUserId', '==', userId),
      orderBy('createdAt', 'desc'),
    )),
  ]);

  const sent = sentSnapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
    createdAt: docSnap.data().createdAt?.toDate?.() || new Date(),
  }));

  const received = receivedSnapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
    createdAt: docSnap.data().createdAt?.toDate?.() || new Date(),
  }));

  return { sent, received };
}
