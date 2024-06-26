"use client";

import EventStyling1 from "../../../components/styling/EventStyling1";
import EventStyling2 from "../../../components/styling/EventStyling2";
import Footer from "../components/Footer";
import Header from "../components/Header";

import { db } from "../../../firebase/firebase";
import { collection, getDocs } from "firebase/firestore";

export default function Events() {
  return (
    <>
      <div className="bg-black">
        <Header />
      </div>
      <EventStyling1 />

      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="sm:flex sm:items-baseline sm:justify-between">
          <h2 className="text-2xl font-bold tracking-tight text-gray-100">
            RAGESTATE EVENTS
          </h2>
          <EventStyling2 />
        </div>
        <Footer />
      </div>
    </>
  );
}
