import Link from "next/link";
import Image from "next/image";

export default function EventTile({ event }) {
  // Function to format slug
  const formatSlug = (title) => {
    return title
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^\w\-]+/g, "")
      .replace(/\-\-+/g, "-");
  };

  const handleLinkClick = () => {
    // Save product to localStorage or sessionStorage
    localStorage.setItem("selectedEvent", JSON.stringify(event));
  };

  // Format date in a more readable way
  const formatDate = (dateTime) => {
    const date = dateTime.toDate();
    const options = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    };
    return date.toLocaleDateString("en-US", options);
  };

  return (
    <div className=" rounded-lg overflow-hidden shadow-lg transform transition duration-300 hover:scale-105 hover:shadow-2xl">
      <div className="mx-auto">
        <Link
          href={`/events/${formatSlug(event.name)}`}
          className="group"
          onClick={handleLinkClick}
        >
          <div className="aspect-h-3 aspect-w-4 w-full overflow-hidden">
            <Image
              priority
              src={event.imgURL}
              alt={event.name}
              className="object-cover object-center group-hover:opacity-75 transition-opacity duration-300"
              height={500}
              width={500}
              style={{ height: "250px", objectFit: "cover", width: "100%" }}
            />
          </div>
          <div className="p-5">
            <h3 className="text-xl font-semibold text-gray-100 group-hover:text-red-500 transition-colors">
              {event.name}
            </h3>
            <p className="mt-2 text-gray-400">{formatDate(event.dateTime)}</p>
            {event.location && (
              <p className="mt-2 text-sm text-gray-500 flex items-center">
                <svg
                  className="w-4 h-4 mr-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  ></path>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  ></path>
                </svg>
                {event.location}
              </p>
            )}
            {event.price && (
              <p className="mt-3 text-lg font-medium text-red-500">
                ${event.price}
              </p>
            )}
          </div>
        </Link>
      </div>
    </div>
  );
}
