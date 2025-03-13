"use client";

import { useDispatch } from "react-redux";
import { addToCart } from "../lib/features/todos/cartSlice";
import toast, { Toaster } from "react-hot-toast";
import Image from "next/image";

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

  // Consistent button styling with account page
  const buttonStyling = "flex w-full justify-center rounded-md bg-red-500 px-8 py-3 text-base font-medium text-white hover:bg-red-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 transition-colors";

  return (
    <>
      <div className="isolate">
        <Toaster />

        {/* Product - using a similar grid to account page sections */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8 items-start">
          {/* Product image - takes up more space on larger screens */}
          <div className="md:col-span-3">
            <div className="overflow-hidden rounded-xl border border-gray-800 shadow-2xl">
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
            
            {/* Event description section - add border consistent with account page */}
            <div className="mt-8 bg-gray-900/50 p-5 rounded-lg border border-gray-800 shadow-md">
              <h3 className="text-xl font-medium text-white mb-4">About This Event</h3>
              <p className="text-gray-300">{event.description}</p>
            </div>
          </div>

          {/* Product details */}
          <div className="md:col-span-2 space-y-6">
            {/* Event header in card - matches account page card styling */}
            <div className="bg-gray-900/50 p-5 rounded-lg border border-gray-800 shadow-md">
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

              <div className="mt-4 flex items-center">
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

              <div className="mt-6 flex items-center">
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

              <div className="mt-6">
                <button
                  type="button"
                  className={buttonStyling}
                  onClick={handleAddToCart}
                >
                  Add to Cart
                </button>
              </div>
            </div>

            {/* Location information - separate card like in account page */}
            <div className="bg-gray-900/50 p-5 rounded-lg border border-gray-800 shadow-md">
              <h3 className="text-lg font-medium text-gray-100 mb-3">Location</h3>
              <p className="text-gray-300">{location}</p>
              <div className="mt-4 flex flex-wrap gap-3">
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

            {/* Age restriction - separate card like in account page */}
            {event.age && (
              <div className="bg-gray-900/50 p-5 rounded-lg border border-gray-800 shadow-md">
                <h3 className="text-lg font-medium text-gray-100 mb-3">
                  Age Restriction
                </h3>
                <p className="text-gray-300">{event.age}+ years</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
