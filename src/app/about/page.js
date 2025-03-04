"use client";

import { motion } from "framer-motion";
import AboutStyling from "../components/styling/AboutStyling";
import Footer from "../components/Footer";
import Header from "../components/Header";

export default function About() {
  return (
    <div className="bg-transparent min-h-screen">
      <Header />
      <AboutStyling />

      <main className="relative isolate overflow-hidden">
        <div className="relative">
          <div className="mx-auto max-w-7xl px-6 lg:px-8 py-24 sm:py-32">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="mx-auto max-w-3xl text-center"
            >
              <h2 className="text-4xl font-bold tracking-tight text-white sm:text-6xl mb-8">
                ABOUT RAGESTATE
              </h2>
              
              <div className="space-y-12">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="relative rounded-2xl bg-gray-900/50 p-8 backdrop-blur-sm ring-1 ring-white/10 hover:ring-red-500/30 transition-all duration-300"
                >
                  <p className="text-xl leading-8 text-gray-300">
                    RAGESTATE is more than just a location—it's an embodiment of a
                    feeling, a primal urge to let loose and embrace the moment. While
                    it may have originated at SDSU, its essence transcends any
                    specific place or time.
                  </p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="relative rounded-2xl bg-gray-900/50 p-8 backdrop-blur-sm ring-1 ring-white/10 hover:ring-red-500/30 transition-all duration-300"
                >
                  <div className="absolute -inset-px bg-gradient-to-r from-red-500/10 to-purple-500/10 rounded-2xl [mask-image:linear-gradient(black,transparent)] group-hover:from-red-500/30 group-hover:to-purple-500/30" />
                  <p className="text-xl leading-8 text-gray-300">
                    Our mission at RAGESTATE is to provide an outlet for uninhibited
                    expression and celebration. Wherever you're from, RAGESTATE
                    invites you to join us in embracing the exhilaration of living in
                    the moment.
                  </p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.9 }}
                  className="grid grid-cols-1 md:grid-cols-2 gap-8"
                >
                  <div className="relative rounded-2xl bg-gray-900/50 p-8 backdrop-blur-sm ring-1 ring-white/10 hover:ring-red-500/30 transition-all duration-300">
                    <p className="text-xl leading-8 text-gray-300">
                      We curate moments that ignite the spirit and fuel the soul.
                    </p>
                  </div>

                  <div className="relative rounded-2xl bg-gray-900/50 p-8 backdrop-blur-sm ring-1 ring-white/10 hover:ring-red-500/30 transition-all duration-300">
                    <p className="text-xl leading-8 text-gray-300">
                      Join us in celebrating life, freedom, and the unbridled energy
                      of RAGESTATE.
                    </p>
                  </div>
                </motion.div>
              </div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2 }}
                className="mt-28 text-2xl font-semibold text-red-600"
              >
                LIVE IN YOUR WORLD, RAGE IN OURS.
              </motion.p>
            </motion.div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
