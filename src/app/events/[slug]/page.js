"use client";

import Header from "@/app/components/Header";

import { useState, useEffect } from "react";

import EventDetails from "../../../../components/EventDetails";
import EventStyling1 from "@/app/components/styling/EventStyling1";

export default function EventDetail() {
  const [loading, setLoading] = useState(true);

  let selectedEvent = null;
  if (typeof window !== "undefined") {
    selectedEvent = JSON.parse(localStorage.getItem("selectedEvent"));
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false); // Simulate loading completion after 2000ms (adjust as needed)
    }, 100); // Adjust the timeout duration as per your requirement

    return () => clearTimeout(timer); // Clean up timeout on component unmount
  }, []);

  return (
    <div className="bg-transparent">
      <Header />
      <EventStyling1 />
      <div
        className={`transition-opacity ${
          loading ? "opacity-0" : "opacity-100 duration-1000"
        } bg-black px-4 py-20 lg:px-8`}
      >
        <EventDetails event={selectedEvent} />
      </div>
    </div>
  );
}
