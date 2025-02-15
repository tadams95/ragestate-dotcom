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
        .map((doc) => doc.data())
        .filter((event) => {
          const eventDateTime = event.dateTime.toDate().getTime();
          return eventDateTime >= currentDate;
        });

      setEvents(eventData);
      // console.log("Event Data: ", eventData);
    } catch (error) {
      console.error("Error fetching event data:", error);
    } finally {
      setIsLoading(false); // Set isLoading to false regardless of success or error
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    fetchEventData().finally(() => {
      if (isMounted) setIsLoading(false);
    });

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
        {/* <h2 className="text-2xl font-bold tracking-tight text-gray-100">
          RAGESTATE EVENTS
        </h2> */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex justify-center">
          <div
            className={`transition-opacity pt-12 ${
              isLoading ? "opacity-0" : "opacity-100 duration-1000"
            } flex flex-wrap`}
          >
            {/* Conditionally render events or "No Events" message */}
            {isLoading ? (
              <p className="text-center text-gray-300">Loading Events...</p>
            ) : events.length === 0 ? (
              <NoEventTile />
            ) : (
              events.map((event) => <EventTile key={event.id} event={event} />)
            )}
          </div>
          <EventStyling2 />
        </div>
        <Footer />
      </div>
    </>
  );
}
