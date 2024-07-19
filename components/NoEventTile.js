import Image from "next/image";

export default function NoEventTile() {
  return (
    <div className="bg-transparent">
      <div className="mx-auto max-w-2xl px-4 pt-16 lg:max-w-7xl lg:px-4">
        <h2 className="sr-only">Events</h2>

        <div>
          <div className="aspect-h-1 aspect-w-1 w-full overflow-hidden rounded-lg">
            <Image
              priority
              src={"/assets/BlurHero_1.png"}
              alt={"RAGESTATE"}
              className="object-center group-hover:opacity-75"
              height={500}
              width={500}
            />
          </div>

          <p className="mt-8 text-xl font-medium text-gray-300 text-center">
            NO EVENTS AT THIS TIME, BUT THERE WILL BE
          </p>
        </div>
      </div>
    </div>
  );
}
