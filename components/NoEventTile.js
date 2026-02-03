export default function NoEventTile() {
  return (
    <div className="flex items-center justify-center px-4 pt-20">
      <div className="overflow-hidden rounded-lg border border-gray-900 bg-black">
        <video
          src="/assets/ragestate-yacht-party.mp4"
          aria-label="RAGESTATE yacht party video"
          className="block max-h-[calc(100dvh-200px)]"
          controls
          playsInline
        />
      </div>
    </div>
  );
}
