import React from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import Feed from "../components/Feed"; // Import the Feed component

export default function FeedPage() {
  return (
    <div className="bg-black isolate min-h-screen text-white px-6 py-12 sm:py-24 lg:px-8">
      <Header />
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl text-center mb-8">
        Feed
      </h1>
      {/* Replace placeholder with the Feed component */}
      <Feed />
      <Footer />
    </div>
  );
}
