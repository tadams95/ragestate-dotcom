'use client';

import { motion, useReducedMotion } from 'framer-motion';
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useInView } from 'react-intersection-observer';

const Home3DAnimation = dynamic(() => import('../components/animations/home-3d-animation'), {
  ssr: false,
  loading: () => null,
});

import Link from 'next/link';

export default function Home() {
  const prefersReducedMotion = useReducedMotion();
  const [activeWorld, setActiveWorld] = useState('your'); // "your" or "ours"

  // Refs for scrolling sections
  const yourWorldRef = useRef(null); // Added ref for "your world" section
  const ourWorldRef = useRef(null);
  const timeoutRef = useRef(null);
  const { ref: heroRef, inView: heroInView } = useInView({ threshold: 0.3 });
  const { ref: manifestoRef, inView: manifestoInView } = useInView({
    threshold: 0.3,
  });

  // Improved scroll function that works for both sections
  const scrollToSection = useCallback((ref, worldType) => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      // Increase offset to decrease the scroll a bit
      const offset = 82;
      const scrollPosition = window.pageYOffset + rect.top - offset;

      window.scrollTo({
        top: scrollPosition,
        behavior: 'smooth',
      });

      // Clear any existing timer before setting a new one
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setActiveWorld(worldType), 500);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[var(--bg-root)] transition-colors duration-200">
      {/* Single dynamic background; keep mounted across both sections */}
      <div className="fixed inset-0 z-0 transition-all duration-700">
        <div
          className={`absolute inset-0 transition-opacity duration-700 ${
            activeWorld === 'ours' ? 'opacity-100' : 'opacity-80'
          } bg-gradient-to-b from-red-900/30 to-[var(--bg-root)]`}
        />
        <div
          className={`absolute inset-0 transition-opacity duration-700 ${
            activeWorld === 'your' ? 'opacity-100' : 'opacity-80'
          } bg-gradient-to-b from-blue-900/20 to-[var(--bg-root)]`}
        />
        <Home3DAnimation
          intensity={activeWorld === 'ours' ? 1 : 0.7}
          color={activeWorld === 'ours' ? '#EF4E4E' : '#3B82F6'}
        />
      </div>

      {/* Update the main content top padding to account for header */}
      <main className="relative z-10">
        {/* Hero Section - Your World */}
        <section
          ref={(node) => {
            // Assign both refs
            heroRef(node);
            yourWorldRef.current = node;
          }}
          className="flex min-h-screen flex-col items-center justify-center px-4 pt-4"
        >
          <motion.div
            className="container mx-auto max-w-4xl text-center"
            initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
            animate={
              prefersReducedMotion
                ? { opacity: 1, y: 0 }
                : { opacity: heroInView ? 1 : 0, y: heroInView ? 0 : 20 }
            }
            transition={{ duration: prefersReducedMotion ? 0 : 0.8 }}
          >
            <h1 className="mb-6 text-4xl font-extrabold md:text-7xl">
              <span className="text-[var(--text-primary)]">LIVE IN </span>
              <span className="text-blue-500">YOUR WORLD</span>
            </h1>

            <p className="mx-auto mb-12 max-w-2xl text-lg text-[var(--text-secondary)] md:text-xl">
              Everyday reality. Routine. Expectations. Structure. The world that shapes you.
            </p>

            <motion.button
              onClick={() => scrollToSection(ourWorldRef, 'ours')} // Updated to use the new function
              className="group rounded-md bg-[var(--accent)] px-8 py-2 text-lg font-medium text-white transition-all hover:opacity-90"
              whileHover={prefersReducedMotion ? undefined : { scale: 1.05 }}
              whileTap={prefersReducedMotion ? undefined : { scale: 0.95 }}
            >
              ENTER OUR WORLD
              <span className="ml-2 inline-block transform transition-transform group-hover:translate-x-1">
                →
              </span>
            </motion.button>
          </motion.div>
        </section>

        {/* Bridging Section */}
        <section ref={manifestoRef} className="relative px-4 py-32">
          <div className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--accent)] to-transparent"></div>

          <motion.div
            className="container mx-auto max-w-3xl text-center"
            initial={prefersReducedMotion ? false : { opacity: 0 }}
            animate={prefersReducedMotion ? { opacity: 1 } : { opacity: manifestoInView ? 1 : 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.8 }}
          >
            <h2 className="my-10 text-2xl font-bold text-[var(--text-primary)] md:text-4xl">
              RAGESTATE Unfiltered
            </h2>

            <p className="mb-8 text-xl italic text-[var(--text-secondary)] md:text-2xl">
              "In a world that expects you to play by the rules, we're here to break 'em – smart,
              bold, and unapologetic."
            </p>

            <div className="space-y-6 text-left text-[var(--text-tertiary)]">
              <p>
                Right at the crossroads of campus buzz and midnight spontaneity, RAGESTATE is more
                than a brand—it's a vibe, a rebellion, and your crew.
              </p>
              <p>
                When the day brings structure and deadlines, the night flips the script: here,
                authenticity reigns and you're free to be unapologetically yourself.
              </p>
              <p>
                With our events, threads, and everything in between, we're your passport to a life
                without limits. Ready to step beyond the ordinary?
              </p>
            </div>
          </motion.div>
        </section>

        {/* Our World Section */}
        <section
          ref={ourWorldRef}
          className="flex min-h-screen flex-col items-center justify-center px-4 pb-32 pt-12"
          onMouseEnter={() => setActiveWorld('ours')}
        >
          <motion.div
            className="container mx-auto max-w-4xl text-center"
            initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: prefersReducedMotion ? 0 : 0.8,
              delay: prefersReducedMotion ? 0 : 0.2,
            }}
          >
            <h2 className="mb-6 text-4xl font-extrabold md:text-7xl">
              <span className="text-[var(--text-primary)]">RAGE IN </span>
              <span className="text-[var(--accent)]">OURS</span>
            </h2>

            <p className="mx-auto mb-12 max-w-2xl text-lg text-[var(--text-secondary)] md:text-xl">
              Liberation. Expression. Community. Energy. The world we've created for you to
              transform.
            </p>
            {/* 
            <div className="relative h-[40vh] md:h-[50vh] w-full my-16">
              <SloganWorld world="ours" />
            </div> */}

            <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-2">
              <Link href="/events">
                <motion.div
                  data-testid="events-section"
                  className="group relative overflow-hidden rounded-lg border border-red-500/30 bg-[var(--bg-elev-1)] p-8 backdrop-blur-sm transition-all hover:border-[var(--accent)]"
                  whileHover={prefersReducedMotion ? undefined : { y: -5 }}
                  viewport={{ once: true, amount: 0.3 }}
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 to-transparent opacity-0 transition-opacity group-hover:opacity-100"></div>
                  <h3 className="mb-4 text-2xl font-bold text-[var(--accent)]">EVENTS</h3>
                  <p className="mb-6 text-[var(--text-secondary)]">
                    Immersive experiences that transport you to a realm of pure expression and
                    connection.
                  </p>
                  <span className="flex items-center text-[var(--accent-glow)]">
                    EXPLORE EVENTS
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="ml-2 h-4 w-4 transform transition-transform group-hover:translate-x-1"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </span>
                </motion.div>
              </Link>

              <Link href="/shop">
                <motion.div
                  data-testid="apparel-section"
                  className="group relative overflow-hidden rounded-lg border border-red-500/30 bg-[var(--bg-elev-1)] p-8 backdrop-blur-sm transition-all hover:border-[var(--accent)]"
                  whileHover={prefersReducedMotion ? undefined : { y: -5 }}
                  viewport={{ once: true, amount: 0.3 }}
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 to-transparent opacity-0 transition-opacity group-hover:opacity-100"></div>
                  <h3 className="mb-4 text-2xl font-bold text-[var(--accent)]">APPAREL</h3>
                  <p className="mb-6 text-[var(--text-secondary)]">
                    Carry our world with you. Each piece is a statement, a badge of the movement.
                  </p>
                  <span className="flex items-center text-[var(--accent-glow)]">
                    SHOP COLLECTION
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="ml-2 h-4 w-4 transform transition-transform group-hover:translate-x-1"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </span>
                </motion.div>
              </Link>
            </div>

            {/* Replace subscription form with create account CTA */}
            <div className="mt-32">
              <h3 className="mb-4 text-2xl font-bold text-[var(--text-primary)]">
                JOIN THE MOVEMENT
              </h3>
              <p className="mx-auto mb-8 max-w-2xl text-[var(--text-secondary)]">
                Create an account to unlock exclusive benefits, early access to events, and be the
                first to know about new merch drops.
              </p>

              <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link href="/create-account">
                  <motion.button
                    className="w-full rounded-md bg-[var(--accent)] px-8 py-2 text-lg font-medium text-white transition-all hover:opacity-90 sm:w-auto"
                    whileHover={prefersReducedMotion ? undefined : { scale: 1.05 }}
                    whileTap={prefersReducedMotion ? undefined : { scale: 0.95 }}
                  >
                    CREATE ACCOUNT
                  </motion.button>
                </Link>
              </div>
            </div>
          </motion.div>
        </section>
      </main>
    </div>
  );
}
