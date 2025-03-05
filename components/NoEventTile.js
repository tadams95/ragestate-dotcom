export default function NoEventTile() {
  return (
    <>
      <div className="relative h-screen w-screen">
        <video
          src="/assets/SDSURAGE.mp4"
          alt="RAGESTATE"
          className="w-full h-full object-cover"
          controls
        />
      </div>
      <div className="absolute inset-0 flex items-center justify-center mt-52">
        <p className="text-xl font-medium text-white">
          STAY TUNED FOR WHAT'S UPCOMING
        </p>
      </div>
    </>
  );
}
