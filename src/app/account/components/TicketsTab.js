"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { TicketIcon } from "@heroicons/react/24/outline";
import {
  collection,
  getDocs,
  getFirestore,
  query,
  where,
} from "firebase/firestore";

export default function TicketsTab({
  userId,
  cardStyling,
  eventCardStyling,
  containerStyling,
}) {
  const [tickets, setTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(false);

  // Fetch user tickets function
  const fetchUserTickets = useCallback(async () => {
    if (!userId) return;

    setLoadingTickets(true);
    try {
      const firestore = getFirestore();

      // First, get all events
      const eventsCollectionRef = collection(firestore, "events");
      const eventsSnapshot = await getDocs(eventsCollectionRef);

      const ticketsPromises = eventsSnapshot.docs.map(async (doc) => {
        const eventData = doc.data();
        const ragersCollectionRef = collection(
          firestore,
          "events",
          doc.id,
          "ragers"
        );

        // Query tickets where the user is the owner and ticket is active
        const ragersQuerySnapshot = await getDocs(
          query(
            ragersCollectionRef,
            where("firebaseId", "==", userId),
            where("active", "==", true)
          )
        );

        // Map through ragers (tickets) and include event data
        return ragersQuerySnapshot.docs.map((ragerDoc) => {
          const ticketData = ragerDoc.data();
          return {
            id: ragerDoc.id,
            eventId: doc.id,
            eventName: eventData.name || "Unnamed Event",
            eventDate: eventData.date || new Date().toISOString(),
            eventTime: eventData.time || "TBA",
            location: eventData.location || "TBA",
            ticketType: ticketData.ticketType || "General Admission",
            status: ticketData.active ? "active" : "inactive",
            imageUrl: eventData.imgURL || null,
            purchaseDate: ticketData.purchaseTimestamp
              ? new Date(ticketData.purchaseTimestamp).toISOString()
              : new Date().toISOString(),
            price: ticketData.price ? `$${ticketData.price.toFixed(2)}` : "N/A",
            ...ticketData,
          };
        });
      });

      // Flatten the array of arrays into a single array of tickets
      const allTicketsArrays = await Promise.all(ticketsPromises);
      const allTickets = allTicketsArrays.flat();

      console.log("Fetched user tickets:", allTickets);
      setTickets(allTickets);
    } catch (error) {
      console.error("Error fetching user tickets:", error);
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
      <h2 className="text-2xl font-bold text-white mb-6">My Tickets</h2>

      {loadingTickets ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500"></div>
        </div>
      ) : tickets.length === 0 ? (
        <div className="text-center py-10">
          <div className="mx-auto h-12 w-12 text-gray-400">
            <TicketIcon className="h-full w-full" aria-hidden="true" />
          </div>
          <h3 className="mt-2 text-sm font-medium text-gray-200">
            No tickets yet
          </h3>
          <p className="mt-1 text-sm text-gray-500">
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {tickets.map((ticket) => (
            <div key={ticket.id} className={`${cardStyling} overflow-hidden`}>
              <div
                key={ticket.id}
                className={`${eventCardStyling} overflow-hidden`}
              >
                {/* Two-column grid: left for the image, right for event details */}
                <div className="grid grid-cols-1 md:grid-cols-2 h-full">
                  {/* Left Column: Image */}
                  <div className="relative min-h-[150px] md:min-h-full">
                    {" "}
                    {/* Added min-height */}
                    {ticket.imageUrl ? (
                      <Image
                        src={ticket.imageUrl}
                        alt={ticket.eventName}
                        fill
                        style={{ objectFit: "cover" }}
                        className="object-cover rounded-md"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-gray-800 rounded-md">
                        <TicketIcon className="h-16 w-16 text-gray-500" />
                      </div>
                    )}
                    <div className="absolute top-0 right-0 mt-2 mr-2">
                      <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                        {ticket.status}
                      </span>
                    </div>
                  </div>

                  {/* Right Column: Event Details */}
                  <div className="p-4 flex flex-col gap-4 md:ml-6">
                    <h3 className="text-lg font-medium text-white">
                      {ticket.eventName}
                    </h3>

                    <div className="grid grid-cols-2 gap-2">
                      <p className="text-sm text-gray-400 col-span-2">
                        {new Date(ticket.eventDate).toLocaleDateString(
                          "en-US",
                          {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          }
                        )}
                        {ticket.eventTime && ticket.eventTime !== "TBA"
                          ? ` at ${ticket.eventTime}`
                          : ""}
                      </p>
                      <p className="text-sm text-gray-400 col-span-2">
                        {ticket.location}
                      </p>
                    </div>

                    <div className="mt-auto border-t border-gray-700 pt-3">
                      <div>
                        <span className="block text-xs text-gray-500">
                          Ticket Type
                        </span>
                        <span className="text-sm text-white">
                          {ticket.ticketType}
                        </span>
                      </div>
                    </div>
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
