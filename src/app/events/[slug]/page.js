"use client";

import Header from "@/app/components/Header";
import Link from "next/link";
import Image from "next/image";

import EventDetails from "../../../../components/EventDetails";

export default function EventDetail() {
  let selectedEvent = null;
  if (typeof window !== "undefined") {
    selectedEvent = JSON.parse(localStorage.getItem("selectedEvent"));
  }

  return (
    <div className="bg-transparent">
      <Header />
      <EventDetails event={selectedEvent} />
    </div>
  );
}
