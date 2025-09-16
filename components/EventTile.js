import Image from 'next/image';
import Link from 'next/link';

export default function EventTile({ event }) {
  // Function to format slug
  const formatSlug = (title) => {
    return title
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w\-]+/g, '')
      .replace(/\-\-+/g, '-');
  };

  const handleLinkClick = () => {
    // Save product to localStorage or sessionStorage
    localStorage.setItem('selectedEvent', JSON.stringify(event));
  };

  // Format date in a more readable way
  const formatDate = (dateTime) => {
    const date = dateTime.toDate();
    const options = {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    };
    return {
      date: date.toLocaleDateString('en-US', options),
      time: date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }),
    };
  };

  const imgSrc = event?.imgURL || '/assets/EventHero.png';

  return (
    <div className="mb-8 transform overflow-hidden rounded-lg border border-gray-800 bg-gray-800/50 shadow-lg backdrop-blur-sm transition duration-300 hover:scale-105 hover:shadow-2xl">
      <div className="mx-auto">
        <Link
          href={`/events/${formatSlug(event.name)}`}
          className="group"
          onClick={handleLinkClick}
        >
          <div className="relative h-60 w-full overflow-hidden sm:h-64 lg:h-72">
            <Image
              priority
              src={imgSrc}
              alt={event?.name || 'Event image'}
              fill
              sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw"
              className="object-cover object-center transition-opacity duration-300 group-hover:opacity-75"
            />
            {/* {event.category && (
              <span className="absolute top-4 right-4 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                {event.category}
              </span>
            )} */}
          </div>
          <div className="p-6">
            <h3 className="text-2xl font-bold text-gray-100 transition-colors group-hover:text-red-500">
              {event.name}
            </h3>
            {/* {event.description && (
              <p className="mt-2 text-gray-400 text-sm line-clamp-2">
                {event.description}
              </p>
            )} */}
            <div className="mt-4 flex items-center text-gray-400">
              <svg className="mr-2 h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
              </svg>
              <div>
                <p className="font-medium">{formatDate(event.dateTime).date}</p>
                <p className="text-sm">{formatDate(event.dateTime).time}</p>
              </div>
            </div>

            {event.location && (
              <p className="mt-3 flex items-center text-sm text-gray-400">
                <svg className="mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                {event.location}
              </p>
            )}

            <div className="mt-4 flex items-center justify-between">
              {event.price && <p className="text-lg font-bold text-red-700">${event.price}</p>}
              {event.capacity && (
                <div className="text-sm text-gray-400">
                  <span className="font-medium">{event.attendees?.length || 0}</span>
                  <span className="mx-1">/</span>
                  <span>{event.capacity}</span>
                  <span className="ml-1">spots</span>
                </div>
              )}
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
