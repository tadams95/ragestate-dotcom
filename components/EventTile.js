import Link from "next/link";
import Image from "next/image";

export default function EventTile({ events }) {
  return (
    <div className="bg-transparent">
      <div className="mx-auto max-w-2xl px-4 py-16 lg:max-w-7xl lg:px-4">
        <h2 className="sr-only">Events</h2>

        <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 xl:gap-x-8">
          {events.map((event, index) => (
            <a key={index} href={event.href} className="group">
              <div className="aspect-h-1 aspect-w-1 w-full overflow-hidden rounded-lg bg-gray-200 xl:aspect-h-8 xl:aspect-w-7">
                <Image
                  priority
                  src={event.imgURL}
                  alt={event.imageAlt}
                  className="h-full w-full object-cover object-center group-hover:opacity-75"
                  width={500}
                  height={500}
                />
              </div>
              <h3 className="mt-4 text-2xl text-gray-100 text-center">
                {event.name}
              </h3>
              <p className="mt-1 text-md font-medium text-gray-300 text-center">
                {event.dateTime.toDate().toDateString()}
              </p>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
