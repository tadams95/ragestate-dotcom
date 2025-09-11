import React from "react";
import Header from "../components/Header";
import Feed from "../components/Feed"; // Import the Feed component
import PostComposer from "../components/PostComposer";

export default function FeedPage() {
  return (
    <div className="bg-black isolate min-h-screen text-white px-4 sm:px-6 lg:px-8 pt-24 pb-12 sm:pb-24">
      <Header />
      <h1 className="font-bold tracking-tight text-center mb-8 text-[clamp(18px,5vw,20px)] sm:text-4xl">
        Feed
      </h1>
      <PostComposer />
      <Feed />
    </div>
  );
}
