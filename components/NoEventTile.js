import Image from "next/image";

export default function NoEventTile() {
  return (
    <div className="0 bg-opacity-40 rounded-lg shadow-lg p-8 max-w-3xl mx-auto transition-all">
      <div className="flex flex-col items-center text-center">
        <div className="w-full overflow-hidden rounded-lg mb-8">
          <video
            src={"/assets/SDSURAGE.mp4"}
            alt={"RAGESTATE"}
            className="w-full rounded-lg shadow-lg"
            controls
          />
        </div>

        <h3 className="text-2xl font-bold text-gray-100 mb-4">
          No Events Currently Scheduled
        </h3>

        <p className="text-xl font-medium text-gray-300 mb-8">
          STAY TUNED FOR UPCOMING EVENTS
        </p>

        <div className="flex space-x-4">
          <a
            href="https://www.instagram.com/ragestate/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-red-700 hover:bg-red-800 transition-colors"
          >
            Follow on Instagram
          </a>
          {/* <a 
            href="#newsletter" 
            className="inline-flex items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-300 bg-transparent hover:bg-gray-800 transition-colors"
          >
            Join Mailing List
          </a> */}
        </div>
      </div>
    </div>
  );
}
