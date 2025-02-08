import Image from "next/image";

export default function NoEventTile() {
  return (
    <div className="bg-transparent">
      <div className="mx-auto max-w-2xl px-4 pt-16 lg:max-w-7xl lg:px-4">
        <h2 className="sr-only">Events</h2>

        <div>
          <div className="aspect-h-1 aspect-w-1 w-full overflow-hidden rounded-lg mt-10">
            <video
              src={"/assets/SDSURAGE.mp4"}
              alt={"RAGESTATE"}
              className="object-center group-hover:opacity-75"
              height={600}
              width={600}
              controls
            />
          </div>

          <p className="mt-20 text-xl font-medium text-gray-300 text-center">
            STAY TUNED FOR UPCOMING EVENTS
          </p>
        </div>
      </div>
    </div>
  );
}
