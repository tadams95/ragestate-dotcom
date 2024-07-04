import { memo } from "react";
import seedrandom from "seedrandom";

// Function to generate a random clip path with a consistent seed
const generateRandomClipPath = () => {
  const points = 16; // Number of points in the clip path polygon
  const seed = "hello."; // Seed value for deterministic randomness

  // Initialize seeded random number generator
  const random = seedrandom(seed);

  let clipPath = "polygon(";

  for (let i = 0; i < points; i++) {
    const x = random() * 100; // Random x-coordinate percentage
    const y = random() * 100; // Random y-coordinate percentage
    clipPath += `${x.toFixed(1)}% ${y.toFixed(1)}%`; // Add point to clip path
    if (i < points - 1) clipPath += ", "; // Add comma for all points except the last one
  }

  clipPath += ")";
  return clipPath;
};

const X = () => {
  const clipPath1 = generateRandomClipPath();
  const clipPath2 = generateRandomClipPath();

  return (
    <>
      <div className="relative isolate -z-10">
        <div
          className="absolute left-1/2 right-0 top-0 -z-10 -ml-24 transform-gpu overflow-hidden blur-3xl lg:ml-24 xl:ml-48"
          aria-hidden="true"
        >
          <div
            className="aspect-[701/1036] w-[50.0625rem] bg-gradient-to-tr from-[#FFF] to-[#000000] opacity-90"
            style={{
              clipPath: clipPath1,
            }}
          />
        </div>
      </div>
      <div className="relative isolate -z-10">
        <div
          className="absolute left-2 right-0 top-0 -z-10 -ml-24 transform-gpu overflow-hidden blur-3xl lg:ml-8 xl:ml-48"
          aria-hidden="true"
        >
          <div
            className="aspect-[701/1036] w-[50.0625rem] bg-gradient-to-tr from-[#8A041A] to-[#000000] opacity-90"
            style={{
              clipPath: clipPath2,
            }}
          />
        </div>
      </div>
    </>
  );
};

const RandomDetailStyling = memo(X);

export default RandomDetailStyling;
