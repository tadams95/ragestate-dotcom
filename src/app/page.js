import HomeStyling1 from "../../components/styling/HomeStyling1";
import HomeStyling2 from "../../components/styling/HomeStyling2";
import Header from "./components/Header";

export default function Home() {
  return (
    <div className="bg-black">
      <div className="bg-black">
        <Header />
        <div className="relative isolate px-6 pt-14 lg:px-8">
          <HomeStyling1 />
          <div className="mx-auto max-w-2xl py-20 pt-72">
            <div className="text-center">
              <h1 className="text-4xl font-bold tracking-tight text-gray-100 sm:text-5xl font-sans pt-10">
                WELCOME TO RAGESTATE
              </h1>
              <p className="mt-6 text-lg leading-8 text-gray-300"></p>
            </div>
          </div>
          <HomeStyling2 />
        </div>
      </div>
      <p className="mt-60 text-center text-xs leading-5 text-gray-500">
        &copy; 2024 RAGESTATE, LLC. All rights reserved.
      </p>
    </div>
  );
}
