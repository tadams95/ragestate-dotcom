"use client";

import Footer from "../components/Footer";
import Header from "../components/Header";

export default function Events() {
  return (
    <>
      <div className="bg-black">
        <Header />
      </div>
      <main className="relative isolate">
        {/* Background */}
        <div
          className="absolute inset-x-0 top-4 -z-10 flex transform-gpu justify-center overflow-hidden blur-3xl"
          aria-hidden="true"
        >
          <div
            className="aspect-[1108/632] w-[69.25rem] flex-none bg-gradient-to-r from-[#8A041A] to-[#FFFFFF]  opacity-50"
            style={{
              clipPath:
                "polygon(73.6% 51.7%, 91.7% 11.8%, 100% 46.4%, 97.4% 82.2%, 92.5% 84.9%, 75.7% 64%, 55.3% 47.5%, 46.5% 49.4%, 45% 62.9%, 50.3% 87.2%, 21.3% 64.1%, 0.1% 100%, 5.4% 51.1%, 21.4% 63.9%, 58.9% 0.2%, 73.6% 51.7%)",
            }}
          />
        </div>

        <div className="px-6 pt-14 lg:px-8">
          <div className="mx-auto max-w-2xl pt-24 text-center sm:pt-40">
            <h2 className="text-4xl font-bold tracking-tight text-white sm:text-6xl">
              ABOUT RAGESTATE
            </h2>
            <p className="mt-6 text-lg leading-8 text-gray-300">
              RAGESTATE is more than just a location—it's an embodiment of a
              feeling, a primal urge to let loose and embrace the moment. While
              it may have originated at SDSU, its essence transcends any
              specific place or time.
            </p>

            <p className="mt-6 text-lg leading-8 text-gray-300">
              Our mission at RAGESTATE is to provide an outlet for uninhibited
              expression and celebration. Wherever you're from, RAGESTATE
              invites you to join us in embracing the exhilaration of living in
              the moment. Explore our platform to discover events, stories, and
              experiences that capture the essence of RAGESTATE.
            </p>

            <p className="mt-6 text-lg leading-8 text-gray-300">
              We curate moments that ignite the spirit and fuel the soul.{" "}
            </p>

            <p className="mt-6 text-lg leading-8 text-gray-300">
              Join us in celebrating life, freedom, and the unbridled energy of
              RAGESTATE. Welcome to the state of pure, unadulterated excitement.
              Welcome to RAGESTATE.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
