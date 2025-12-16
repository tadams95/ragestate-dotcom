export default function NoEventTile() {
  return (
    <>
      <div className="mx-auto my-8 w-full max-w-5xl">
        <div className="overflow-hidden rounded-lg border border-gray-900 bg-black">
          <video
            src="/assets/ragestate-yacht-party.mp4"
            aria-label="RAGESTATE"
            className="block h-auto w-full"
            controls
            playsInline
          />
        </div>
      </div>
    </>
  );
}
