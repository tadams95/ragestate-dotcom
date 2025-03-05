"use client";

import Link from "next/link";
import Image from "next/image";
import Footer from "../components/Footer";
import Header from "../components/Header";
import BackgroundPattern from "../components/BackgroundPattern";
import AppScreenshot from "../components/AppScreenshot";
import { useState } from "react";

export default function Products() {
  const [activeTab, setActiveTab] = useState("features");

  const features = [
    {
      name: "Shop Merch",
      description:
        "Browse and purchase exclusive RAGESTATE merchandise directly from the app.",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="w-6 h-6"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007Z"
          />
        </svg>
      ),
    },
    {
      name: "Event Calendar",
      description: "Stay updated with upcoming events and never miss a show.",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="w-6 h-6"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5"
          />
        </svg>
      ),
    },
    {
      name: "Ticket Management",
      description:
        "Easily send and receive tickets to events with your friends.",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="w-6 h-6"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 0 1 0 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 0 1 0-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375Z"
          />
        </svg>
      ),
    },
    {
      name: "Community",
      description: "Connect with other RAGESTATE fans and build your network.",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="w-6 h-6"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.479m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z"
          />
        </svg>
      ),
    },
  ];

  const testimonials = [
    {
      content:
        "The RAGESTATE app makes it so easy to get tickets and connect with other fans. Love it!",
      author: "Alex T.",
    },
    {
      content:
        "I've been using this app for months now. The ticket transfer feature is a game-changer.",
      author: "Jamie L.",
    },
    {
      content:
        "The merch shop in the app has the best exclusive gear. Fast shipping too!",
      author: "Morgan P.",
    },
  ];

  const faqs = [
    {
      question: "Is the app free to download?",
      answer:
        "Yes, the RAGESTATE app is completely free to download on both iOS and Android devices.",
    },
    {
      question: "How do I transfer tickets to friends?",
      answer:
        "Simply go to your tickets section, select the ticket you want to share, press the transfer button, and enter your friend's email or username.",
    },
    {
      question: "Is the merchandise in the app the same as on the website?",
      answer:
        "The app features all website merchandise plus exclusive app-only limited editions.",
    },
    {
      question: "Can I get notifications for upcoming events?",
      answer:
        "Yes, you can enable notifications in the app settings to get alerts about new events, ticket sales, and more.",
    },
  ];

  return (
    <div className="bg-black">
      <Header />
      <div className="relative isolate">
        <BackgroundPattern />

        {/* Hero section with improved layout */}
        <div className="mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:flex lg:items-center lg:gap-x-10 lg:px-8 lg:py-40">
          <div className="mx-auto max-w-2xl lg:mx-0 lg:flex-auto">
            <div className="flex"></div>
            <h1 className="mt-10 max-w-lg text-4xl font-bold tracking-tight text-gray-100 sm:text-6xl">
              The <span className="text-red-700">RAGESTATE</span> App
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-300">
              The RAGESTATE app is your one-stop shop for all things RAGESTATE.
              Shop merch, browse events, or send tickets to your friends.
              Everything you need in one place.
            </p>

            {/* Improved app download buttons with app store badges */}
            <div className="mt-10 flex items-center gap-x-6">
              <Link
                href="https://apps.apple.com/us/app/ragestate/id6449474339"
                target="_blank"
                className="transition-transform duration-200 hover:scale-105"
              >
                <Image
                  src="/AppStore.svg"
                  alt="Download on App Store"
                  width={135}
                  height={40}
                  className="h-12 w-auto"
                />
              </Link>
              <Link
                href="https://play.google.com/store/apps/details?id=com.tyrelle.ragestate&pcampaignid=web_share"
                target="_blank"
                className="transition-transform duration-200 hover:scale-105"
              >
                <Image
                  src="/GooglePlay.png"
                  alt="Get it on Google Play"
                  width={135}
                  height={40}
                  className="h-12 w-auto"
                />
              </Link>
            </div>
          </div>
          <div className="mt-16 sm:mt-24 lg:mt-0 lg:flex-shrink-0 lg:flex-grow">
            <div className="relative">
              <AppScreenshot />
            </div>
          </div>
        </div>

        {/* Content tabs */}
        <div className="mx-auto max-w-7xl px-6 py-10 sm:py-16">
          <div className="flex justify-center space-x-4 mb-12">
            <button
              onClick={() => setActiveTab("features")}
              className={`px-4 py-2 rounded-md ${
                activeTab === "features"
                  ? "bg-red-700 text-white"
                  : "bg-transparent text-gray-300"
              }`}
            >
              Features
            </button>
            <button
              onClick={() => setActiveTab("testimonials")}
              className={`px-4 py-2 rounded-md ${
                activeTab === "testimonials"
                  ? "bg-red-700 text-white"
                  : "bg-transparent text-gray-300"
              }`}
            >
              Testimonials
            </button>
            <button
              onClick={() => setActiveTab("faq")}
              className={`px-4 py-2 rounded-md ${
                activeTab === "faq"
                  ? "bg-red-700 text-white"
                  : "bg-transparent text-gray-300"
              }`}
            >
              FAQ
            </button>
          </div>

          {/* Features grid */}
          {activeTab === "features" && (
            <div className="mx-auto max-w-7xl">
              <h2 className="text-3xl font-bold tracking-tight text-gray-100 text-center mb-12">
                Everything You Need in One App
              </h2>
              <div className="grid grid-cols-1  gap-x-8 gap-y-10 md:grid-cols-2 lg:grid-cols-4">
                {features.map((feature, index) => (
                  <div
                    key={index}
                    className="bg-transparent border border-white p-6 rounded-xl hover:bg-red-700  transition-colors duration-200"
                  >
                    <div className="bg-red-700/10 rounded-md p-2 w-fit mb-4">
                      <div className="text-red-700">{feature.icon}</div>
                    </div>
                    <h3 className="text-xl font-semibold text-gray-100 mb-2">
                      {feature.name}
                    </h3>
                    <p className="text-gray-400">{feature.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Testimonials */}
          {activeTab === "testimonials" && (
            <div className="mx-auto max-w-5xl">
              <h2 className="text-3xl font-bold tracking-tight text-gray-100 text-center mb-12">
                What Users Are Saying
              </h2>
              <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
                {testimonials.map((testimonial, index) => (
                  <div
                    key={index}
                    className="relative bg-transparent border border-white p-6 rounded-xl"
                  >
                    <svg
                      className="h-10 w-10 text-gray-700 absolute top-6 left-6 opacity-20"
                      fill="currentColor"
                      viewBox="0 0 32 32"
                    >
                      <path d="M9.352 4C4.456 7.456 1 13.12 1 19.36c0 5.088 3.072 8.064 6.624 8.064 3.36 0 5.856-2.688 5.856-5.856 0-3.168-2.208-5.472-5.088-5.472-.576 0-1.344.096-1.536.192.48-3.264 3.552-7.104 6.624-9.024L9.352 4zm16.512 0c-4.8 3.456-8.256 9.12-8.256 15.36 0 5.088 3.072 8.064 6.624 8.064 3.264 0 5.856-2.688 5.856-5.856 0-3.168-2.304-5.472-5.184-5.472-.576 0-1.248.096-1.44.192.48-3.264 3.456-7.104 6.528-9.024L25.864 4z" />
                    </svg>
                    <div className="relative z-10">
                      <p className="text-gray-300 mb-4">
                        {testimonial.content}
                      </p>
                      <p className="text-sm font-semibold text-red-700">
                        {testimonial.author}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* FAQ section */}
          {activeTab === "faq" && (
            <div className="mx-auto max-w-5xl">
              <h2 className="text-3xl font-bold tracking-tight text-gray-100 text-center mb-12">
                Frequently Asked Questions
              </h2>
              <div className="space-y-6">
                {faqs.map((faq, index) => (
                  <div key={index} className="bg-transparent  rounded-xl p-6">
                    <h3 className="text-xl font-medium text-gray-100 mb-3">
                      {faq.question}
                    </h3>
                    <p className="text-gray-400">{faq.answer}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
