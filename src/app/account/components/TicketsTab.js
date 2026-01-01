'use client';

import { TicketIcon } from '@heroicons/react/24/outline';
import {
  collection,
  collectionGroup,
  documentId,
  getDocs,
  getFirestore,
  query,
  where,
} from 'firebase/firestore';
import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

export default function TicketsTab({ userId, cardStyling, eventCardStyling, containerStyling }) {
  const [tickets, setTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(false);

  // Fetch user tickets function
  const fetchUserTickets = useCallback(async () => {
    if (!userId) return;

    setLoadingTickets(true);
    try {
      const firestore = getFirestore();

      // Single collectionGroup query across all events' ragers
      const ragersQ = query(
        collectionGroup(firestore, 'ragers'),
        where('firebaseId', '==', userId),
      );
      const ragersSnapshot = await getDocs(ragersQ);

      if (ragersSnapshot.empty) {
        setTickets([]);
        return;
      }

      const ragerDocs = ragersSnapshot.docs;
      // Derive parent event IDs from rager doc refs
      const eventIds = Array.from(
        new Set(
          ragerDocs
            .map((d) => d.ref.parent?.parent?.id)
            .filter((id) => typeof id === 'string' && id.length > 0),
        ),
      );

      // Batch fetch event docs in chunks of 10 for documentId() IN queries
      const eventsCol = collection(firestore, 'events');
      const chunks = [];
      for (let i = 0; i < eventIds.length; i += 10) {
        chunks.push(eventIds.slice(i, i + 10));
      }

      const eventMap = new Map();
      for (const chunk of chunks) {
        const q = query(eventsCol, where(documentId(), 'in', chunk));
        const snap = await getDocs(q);
        snap.forEach((doc) => eventMap.set(doc.id, doc.data()));
      }

      // Compose tickets with event metadata
      const allTickets = ragerDocs.map((ragerDoc) => {
        const ticketData = ragerDoc.data();
        const eventId = ragerDoc.ref.parent?.parent?.id;
        const eventData = (eventId && eventMap.get(eventId)) || {};

        return {
          id: ragerDoc.id,
          eventId,
          eventName: eventData.name || 'Unnamed Event',
          eventDate: eventData.date || new Date().toISOString(),
          eventTime: eventData.time || 'TBA',
          location: eventData.location || 'TBA',
          ticketType: ticketData.ticketType || 'General Admission',
          status: ticketData.active ? 'active' : 'inactive',
          imageUrl: eventData.imgURL || null,
          purchaseDate: ticketData.purchaseTimestamp
            ? new Date(ticketData.purchaseTimestamp).toISOString()
            : new Date().toISOString(),
          price: ticketData.price ? `$${ticketData.price.toFixed(2)}` : 'N/A',
          ...ticketData,
        };
      });

      // Sort tickets: active first, then inactive
      const orderedTickets = allTickets.slice().sort((a, b) => {
        const aActive = a.status === 'active';
        const bActive = b.status === 'active';
        if (aActive === bActive) return 0;
        return aActive ? -1 : 1;
      });

      // Expand multi-quantity ragers into individual ticket entries (minimal, non-breaking)
      const expandedTickets = orderedTickets.flatMap((t) => {
        const qty = Math.max(
          1,
          parseInt(t.ticketQuantity ?? t.quantity ?? t.qty ?? t.selectedQuantity ?? 1, 10),
        );
        if (qty <= 1) return [t];
        return Array.from({ length: qty }, (_, idx) => ({
          ...t,
          id: `${t.id}-${idx + 1}`,
          ticketIndex: idx + 1,
          ticketCount: qty,
        }));
      });

      setTickets(expandedTickets);
    } catch (error) {
      console.error('Error fetching user tickets:', error);
    } finally {
      setLoadingTickets(false);
    }
  }, [userId]);

  // useEffect to fetch tickets when userId is available
  useEffect(() => {
    if (userId) {
      fetchUserTickets();
    }
  }, [userId, fetchUserTickets]);

  return (
    <div className={containerStyling}>
      <h2 className="mb-6 text-2xl font-bold text-[var(--text-primary)]">My Tickets</h2>

      {loadingTickets ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-red-500"></div>
        </div>
      ) : tickets.length === 0 ? (
        <div className="py-10 text-center">
          <div className="mx-auto h-12 w-12 text-[var(--text-tertiary)]">
            <TicketIcon className="h-full w-full" aria-hidden="true" />
          </div>
          <h3 className="mt-2 text-sm font-medium text-[var(--text-primary)]">No tickets yet</h3>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Get started by purchasing tickets to an upcoming event.
          </p>
          <div className="mt-6">
            <Link
              href="/events"
              className="inline-flex items-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500"
            >
              Browse Events
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          {tickets.map((ticket) => (
            <div
              key={ticket.id}
              className={`${cardStyling} group flex flex-col overflow-hidden !p-0 sm:flex-row`}
            >
              {/* Left Column: Image */}
              <div className="relative h-48 w-full shrink-0 bg-[var(--bg-elev-3)] sm:h-auto sm:w-48">
                {ticket.imageUrl ? (
                  <Image
                    src={ticket.imageUrl}
                    alt={ticket.eventName}
                    fill
                    style={{ objectFit: 'cover' }}
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <TicketIcon className="h-12 w-12 text-[var(--text-tertiary)]" />
                  </div>
                )}
                <div className="absolute left-2 top-2">
                  <span
                    className={
                      `inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium shadow-sm backdrop-blur-md ` +
                      (ticket.status === 'active'
                        ? 'bg-green-500/20 text-green-500'
                        : 'bg-red-500/20 text-red-500')
                    }
                  >
                    {ticket.status}
                  </span>
                </div>
              </div>

              {/* Right Column: Event Details */}
              <div className="flex flex-grow flex-col justify-between p-4">
                <div>
                  <h3 className="line-clamp-1 text-lg font-bold text-[var(--text-primary)]">
                    {ticket.eventName}
                  </h3>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">
                    {new Date(ticket.eventDate).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })}
                    {ticket.eventTime && ticket.eventTime !== 'TBA' ? ` • ${ticket.eventTime}` : ''}
                  </p>
                  <p className="mt-1 line-clamp-1 text-xs text-[var(--text-tertiary)]">
                    {ticket.location}
                  </p>
                </div>

                <div className="mt-4 border-t border-[var(--border-subtle)] pt-3">
                  <div className="flex items-end justify-between">
                    <div>
                      <span className="block text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">
                        Ticket Type
                      </span>
                      <span className="text-sm font-medium text-[var(--text-primary)]">
                        {ticket.ticketType}
                      </span>
                    </div>
                    {ticket.price && (
                      <div className="text-right">
                        <span className="block text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">
                          Price
                        </span>
                        <span className="text-sm font-medium text-[var(--text-primary)]">
                          {ticket.price}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
