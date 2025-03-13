"use client";

import { useDispatch } from "react-redux";
import { addToCart } from "../lib/features/todos/cartSlice";
import toast, { Toaster } from "react-hot-toast";

import Image from "next/image";
import RandomDetailStyling from "@/app/components/styling/RandomDetailStyling";
import Footer from "@/app/components/Footer";

export default function EventDetails({ event }) {
  const dispatch = useDispatch();

  let selectedEvent = null;
  if (typeof window !== "undefined") {
    selectedEvent = JSON.parse(localStorage.getItem("selectedEvent"));
  }

  let timestamp = event.dateTime;
  const date = new Date(
    timestamp.seconds * 1000 + timestamp.nanoseconds / 1000000
  );

  // Format date nicely
  const formattedDate = date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const formattedTime = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const location = event.location;

  // Function to generate Google Maps link
  const generateGoogleMapsLink = (location) => {
    const encodedLocation = encodeURIComponent(location);
    return `https://www.google.com/maps/search/?api=1&query=${encodedLocation}`;
  };

  // Function to generate Apple Maps link (for iOS users)
  const generateAppleMapsLink = (location) => {
    const encodedLocation = encodeURIComponent(location);
    return `https://maps.apple.com/?q=${encodedLocation}`;
  };

  const handleAddToCart = () => {
    if (selectedEvent && selectedEvent.quantity > 0) {
      const cartItem = {
        productId: selectedEvent.name,
        title: selectedEvent.name,
        productImageSrc: selectedEvent.imgURL,
        selectedQuantity: 1,
        price: selectedEvent.price,
        eventDetails: {
          location: selectedEvent.location,
        },
        isDigital: selectedEvent.isDigital,
      };

      // Dispatch the addToCart action with the cart item
      dispatch(addToCart(cartItem));

      toast.success("Event added to cart!", {
        duration: 3000,
        position: "bottom-center",
        style: {
          background: "#333",
          color: "#fff",
          border: "1px solid #444",
        },
      });
    } else {
      toast.error("Unable to add event to cart", {
        duration: 3000,
        position: "bottom-center",
        style: {
          background: "#333",
          color: "#fff",
          border: "1px solid #444",
        },
      });
    }
  };

  return (
    <>
      <div className="mx-auto px-4 py-16 sm:px-6 sm:py-24 lg:max-w-7xl lg:px-8 isolate">
        <Toaster />

        {/* Product */}
        <div className="lg:grid lg:grid-cols-7 lg:grid-rows-1 lg:gap-x-8 lg:gap-y-10 xl:gap-x-16">
          {/* Product image */}
          <div className="lg:col-span-4 lg:row-end-1">
            <div className="aspect-h-3 aspect-w-4 w-full overflow-hidden rounded-xl shadow-2xl">
              <Image
                priority
                src={event.imgURL}
                alt={event.name}
                className="object-cover object-center"
                height={800}
                width={1200}
                style={{ width: "100%", height: "auto" }}
              />
            </div>
          </div>

          {/* Product details */}
          <div className="mx-auto mt-14 max-w-2xl sm:mt-16 lg:col-span-3 lg:row-span-2 lg:row-end-2 lg:mt-0 lg:max-w-none">
            <div className="flex flex-col-reverse">
              <div>
                {event.category && (
                  <div className="mb-4">
                    <span className="inline-flex items-center rounded-full bg-red-500/10 px-3 py-1 text-xs font-medium text-red-400 ring-1 ring-inset ring-red-500/20">
                      {event.category}
                    </span>
                  </div>
                )}
                <h1 className="text-2xl font-bold tracking-tight text-gray-100 sm:text-3xl">
                  {event.name}
                </h1>
              </div>
            </div>

            <div className="mt-6 flex items-center">
              <div className="flex items-center">
                <svg
                  className="h-5 w-5 text-red-500"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="ml-2 text-sm text-gray-300">
                  {formattedDate} • {formattedTime}
                </span>
              </div>
            </div>

            <p className="mt-6 text-gray-300">{event.description}</p>

            <div className="mt-8 flex items-center">
              <p className="text-2xl font-bold text-white">${event.price}</p>
              {event.capacity && (
                <div className="ml-4 text-sm text-gray-400">
                  <span className="font-medium">
                    {event.attendees?.length || 0}
                  </span>
                  <span className="mx-1">/</span>
                  <span>{event.capacity}</span>
                  <span className="ml-1">spots remaining</span>
                </div>
              )}
            </div>

            <div className="mt-8">
              <button
                type="button"
                className="w-full rounded-md bg-red-500 px-8 py-3 text-base font-medium text-white hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
                onClick={handleAddToCart}
              >
                Add to Cart
              </button>
            </div>

            <div className="mt-10 border-t border-gray-700/50 pt-10">
              <h3 className="text-sm font-medium text-gray-100">Location</h3>
              <div className="mt-4 text-gray-300">
                <p>{location}</p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <a
                    href={generateGoogleMapsLink(location)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center rounded-md bg-gray-800 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                  >
                    <svg
                      className="h-4 w-4 mr-2"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                    </svg>
                    Open in Google Maps
                  </a>
                  <a
                    href={generateAppleMapsLink(location)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center rounded-md bg-gray-800 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                  >
                    <svg
                      className="h-4 w-4 mr-2"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                    </svg>
                    Open in Apple Maps
                  </a>
                </div>
              </div>
            </div>

            {event.age && (
              <div className="mt-8 border-t border-gray-700/50 pt-8">
                <h3 className="text-sm font-medium text-gray-100">
                  Age Restriction
                </h3>
                <p className="mt-4 text-sm text-gray-300">{event.age}+ years</p>
              </div>
            )}

            {/* Rest of the component remains unchanged */}
          </div>
        </div>
      </div>
    </>
  );
}
