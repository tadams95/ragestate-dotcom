"use client";

import EventStyling1 from "../components/styling/EventStyling1";
import EventStyling2 from "../components/styling/EventStyling2";
import Footer from "../components/Footer";
import Header from "../components/Header";

import { db } from "../../../firebase/firebase";
import { collection, getDocs } from "firebase/firestore";
import { useEffect, useState, useCallback } from "react";
import EventTile from "../../../components/EventTile";
import NoEventTile from "../../../components/NoEventTile";
import EventSkeleton from "../../../components/EventSkeleton";

export default function Events() {
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchEventData = useCallback(async () => {
    try {
      const eventCollectionRef = collection(db, "events");
      const eventSnapshot = await getDocs(eventCollectionRef);

      const currentDate = new Date().getTime();

      // Filter out past events
      const eventData = eventSnapshot.docs
        .map((doc) => ({ ...doc.data(), id: doc.id }))
        .filter((event) => {
          const eventDateTime = event.dateTime.toDate().getTime();
          return eventDateTime >= currentDate;
        })
        // Sort events by date (closest first)
        .sort((a, b) => a.dateTime.toDate().getTime() - b.dateTime.toDate().getTime());

      setEvents(eventData);
    } catch (error) {
      console.error("Error fetching event data:", error);
    } finally {
      // Set a small delay to make the transition smoother
      setTimeout(() => {
        setIsLoading(false);
      }, 300);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    fetchEventData();

    return () => {
      isMounted = false;
    };
  }, [fetchEventData]);

  return (
    <>
      <div className="bg-black isolate">
        <Header />
      </div>
      <EventStyling1 />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 items-center">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold tracking-tight text-gray-100 text-center mt-10 pt-8 mb-6">
            UPCOMING EVENTS
          </h2>
          
          {/* Loading state or content */}
          <div className="transition-all duration-500 ease-in-out">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(3)].map((_, index) => (
                  <EventSkeleton key={index} />
                ))}
              </div>
            ) : (
              <div className={`transition-opacity duration-700 ${events.length > 0 ? "opacity-100" : "opacity-100"}`}>
                {events.length === 0 ? (
                  <NoEventTile />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {events.map((event) => (
                      <EventTile key={event.id} event={event} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <EventStyling2 />
        </div>
        <Footer />
      </div>
    </>
  );
}
