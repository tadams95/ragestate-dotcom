import React from "react";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import Feed from "../../components/Feed";

export default function LatestFeedPage() {
  return (
    <div className="bg-black isolate min-h-screen text-white px-6 py-12 sm:py-24 lg:px-8">
      <Header />
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl text-center mb-8">
        Latest
      </h1>
      <Feed forcePublic={true} />
      <Footer />
    </div>
  );
}
