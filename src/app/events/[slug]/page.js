"use client";

import Header from "@/app/components/Header";
import { useState, useEffect } from "react";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { usePathname, useSearchParams } from "next/navigation";
import EventDetails from "../../../../components/EventDetails";
import Image from "next/image";
import EventStyling1 from "@/app/components/styling/EventStyling1";
import Footer from "@/app/components/Footer";

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
    <div className="bg-black min-h-screen">
      <Header />
      <EventStyling1 />

      <main className="flex-grow">
        {loading ? (
          <div className="flex justify-center items-center h-[70vh]">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500"></div>
          </div>
        ) : (
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-16 pb-24">
            <div className="max-w-6xl mx-auto">
              {/* Event header with logo - matches account page */}
              <div className="flex flex-col items-center mb-8">
                <div className="flex justify-center mt-6 mb-4">
                  <Image
                    src="/assets/RSLogo2.png"
                    alt="RAGESTATE"
                    width={200}
                    height={56}
                    className="h-14 w-auto"
                    sizes="(max-width: 640px) 112px, 200px"
                  />
                </div>
                <h1 className="text-3xl font-bold leading-tight text-white text-center">
                  Event Details
                </h1>
                <p className="mt-2 text-gray-400 text-center max-w-2xl">
                  View event information and secure your tickets.
                </p>
              </div>

              {/* Main content area with consistent border/shadow styling */}
              <div className="bg-gray-900/30 p-6 rounded-lg border border-gray-800 hover:border-red-500/30 transition-all duration-300 shadow-xl">
                <EventDetails event={selectedEvent || event} />
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
