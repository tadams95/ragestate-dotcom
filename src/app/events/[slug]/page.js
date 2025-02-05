"use client";

import Header from "@/app/components/Header";
import { useState, useEffect } from "react";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { usePathname, useSearchParams } from "next/navigation";
import EventDetails from "../../../../components/EventDetails";
import EventStyling1 from "@/app/components/styling/EventStyling1";

// Function to format the slug to match the document ID in Firestore
const formatSlug = (slug) => {
  let formattedSlug = slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  // Handle specific case for "Concert + Rave"
  if (formattedSlug.includes("Concert Rave")) {
    formattedSlug = formattedSlug.replace("Concert Rave", "Concert + Rave");
  }

  return formattedSlug;
};

export default function EventDetail() {
  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState(null);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const db = getFirestore();

  let selectedEvent = null;
  if (typeof window !== "undefined") {
    selectedEvent = JSON.parse(localStorage.getItem("selectedEvent"));
  }

  useEffect(() => {
    const slug = pathname.split("/events/")[1];

    console.log("slug", slug);
    if (slug) {
      const fetchEvent = async () => {
        const formattedSlug = formatSlug(slug);

        const eventRef = doc(db, "events", formattedSlug);
        const eventSnap = await getDoc(eventRef);

        if (eventSnap.exists()) {
          setEvent(eventSnap.data());
        } else {
          console.log("No such document!");
        }
        setLoading(false);
      };

      fetchEvent();
    }
  }, [pathname, searchParams]);

  return (
    <div className="bg-transparent">
      <Header />
      <EventStyling1 />
      <div
        className={`transition-opacity ${
          loading ? "opacity-0" : "opacity-100 duration-1000"
        } bg-black px-4 py-20 lg:px-8`}
      >
        {!loading && <EventDetails event={selectedEvent || event} />}
      </div>
    </div>
  );
}
