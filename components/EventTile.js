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

  return (
    <div className="bg-transparent">
      <div className="mx-auto max-w-2xl px-4 pt-16 lg:max-w-7xl lg:px-4">
        <h2 className="sr-only">Events</h2>

        <div>
          <Link
            href={`/events/${formatSlug(event.name)}`}
            className="group"
            onClick={handleLinkClick}
          >
            <div className="aspect-h-1 aspect-w-1 w-full overflow-hidden rounded-lg">
              <Image
                priority
                src={event.imgURL}
                alt={event.name}
                className="object-center group-hover:opacity-75"
                height={500}
                width={500}
              />
            </div>
            <h3 className="mt-4 text-2xl text-gray-100 text-center">
              {event.name}
            </h3>
            <p className="mt-1 text-md font-medium text-gray-300 text-center">
              {event.dateTime.toDate().toDateString()}
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}
