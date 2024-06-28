"use client";

import EventStyling1 from "../components/styling/EventStyling1";
import EventStyling2 from "../components/styling/EventStyling2";
import Footer from "../components/Footer";
import Header from "../components/Header";

import { db } from "../../../firebase/firebase";
import { collection, getDocs } from "firebase/firestore";
import { useEffect, useState } from "react";
import EventTile from "../../../components/EventTile";

export default function Events() {
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchEventData = async () => {
      try {
        const eventCollectionRef = collection(db, "events");
        const eventSnapshot = await getDocs(eventCollectionRef);

        const currentDate = new Date();

        // Filter out past events
        const eventData = eventSnapshot.docs
          .map((doc) => doc.data())
          .filter((event) => {
            const eventDateTime = event.dateTime.toDate();
            return eventDateTime >= currentDate;
          });

        setEvents(eventData);
        console.log("Event Data: ", eventData);
      } catch (error) {
        console.error("Error fetching event data:", error);
      } finally {
        setIsLoading(false); // Set isLoading to false regardless of success or error
      }
    };

    fetchEventData();
  }, []);

  return (
    <>
      <div className="bg-black isolate">
        <Header />
      </div>
      <EventStyling1 />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 sm:pt-24 lg:px-8">
        {/* <h2 className="text-2xl font-bold tracking-tight text-gray-100">
          RAGESTATE EVENTS
        </h2> */}
        <div className="sm:flex sm:items-baseline sm:justify-between">
          <div
            className={`transition-opacity ${
              isLoading ? "opacity-0" : "opacity-100 duration-1000"
            }`}
          >
            <EventTile events={events} />
          </div>

          <EventStyling2 />
        </div>
        <Footer />
      </div>
    </>
  );
}
