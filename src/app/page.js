import HomeStyling1 from "./components/styling/HomeStyling1";
import HomeStyling2 from "./components/styling/HomeStyling2";
import Header from "./components/Header";
import Home3DAnimation from "./components/animations/home-3d-animation";

export default function Home() {
  return (
    <div className="bg-black min-h-screen relative overflow-hidden">
      <Home3DAnimation />
      <div className="relative z-10">
        <Header />
        <div className="relative isolate px-6 pt-14 lg:px-8">
          <HomeStyling1 />
          <div className="flex items-center justify-center min-h-[82vh]">
            <div className="text-center">
              <h1 className="text-4xl font-bold tracking-tight text-gray-100 sm:text-5xl font-sans">
                WELCOME TO RAGESTATE
              </h1>
            </div>
          </div>
          <HomeStyling2 />
        </div>
      </div>
      <p className="absolute bottom-0 w-full text-center text-xs leading-5 text-gray-100 z-10">
        &copy; 2024 RAGESTATE, LLC. All rights reserved.
      </p>
    </div>
  );
}
