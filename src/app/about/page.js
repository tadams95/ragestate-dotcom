'use client';

import { motion, useReducedMotion } from 'framer-motion';
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useInView } from 'react-intersection-observer';
import Header from '../components/Header';
const Home3DAnimation = dynamic(() => import('../components/animations/home-3d-animation'), {
  ssr: false,
  loading: () => null,
});

import Link from 'next/link';

export default function Home() {
  const prefersReducedMotion = useReducedMotion();
  const [activeWorld, setActiveWorld] = useState('your'); // "your" or "ours"
  const [scrolled, setScrolled] = useState(false);

  // Refs for scrolling sections
  const yourWorldRef = useRef(null); // Added ref for "your world" section
  const ourWorldRef = useRef(null);
  const timeoutRef = useRef(null);
  const { ref: heroRef, inView: heroInView } = useInView({ threshold: 0.3 });
  const { ref: manifestoRef, inView: manifestoInView } = useInView({
    threshold: 0.3,
  });

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
    <div className="relative min-h-screen overflow-x-hidden bg-black">
      {/* Single dynamic background; lazy-mount when hero in view */}
      {(heroInView || manifestoInView) && (
        <div className="fixed inset-0 z-0 transition-all duration-700">
          <div
            className={`absolute inset-0 transition-opacity duration-700 ${
              activeWorld === 'ours' ? 'opacity-100' : 'opacity-80'
            } bg-gradient-to-b from-red-900/30 to-black`}
          />
          <div
            className={`absolute inset-0 transition-opacity duration-700 ${
              activeWorld === 'your' ? 'opacity-100' : 'opacity-80'
            } bg-gradient-to-b from-blue-900/20 to-black`}
          />
          <Home3DAnimation
            intensity={activeWorld === 'ours' ? 1 : 0.7}
            color={activeWorld === 'ours' ? '#EF4E4E' : '#3B82F6'}
          />
        </div>
      )}

      {/* Split slogan navigation */}
      <div
        className={`fixed left-0 top-0 z-40 w-full transition-all duration-500 ${
          scrolled ? 'bg-black/80 backdrop-blur-md' : ''
        }`}
      >
        <Header /> {/* Added Header component here */}
        {/* Added pt-20 to create space below the header */}
        <div className="container mx-auto flex justify-center px-4 py-4 pt-20">
          <div className="flex items-center space-x-2 sm:space-x-6">
            <button
              onClick={() => scrollToSection(yourWorldRef, 'your')} // Updated to use the new function
              className={`text-xl font-bold transition-all sm:text-3xl ${
                activeWorld === 'your'
                  ? 'scale-110 text-white'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              LIVE IN YOUR WORLD
            </button>

            <span className="text-2xl font-extrabold text-red-600 sm:text-4xl">/</span>

            <button
              onClick={() => scrollToSection(ourWorldRef, 'ours')} // Updated to use the new function
              className={`text-xl font-bold transition-all sm:text-3xl ${
                activeWorld === 'ours'
                  ? 'scale-110 text-red-600'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              RAGE IN OURS
            </button>
          </div>
        </div>
      </div>

      {/* Update the main content top padding to account for both header and split slogan */}
      <main className="relative z-10">
        {/* Hero Section - Your World */}
        <section
          ref={(node) => {
            // Assign both refs
            heroRef(node);
            yourWorldRef.current = node;
          }}
          className="flex min-h-screen flex-col items-center justify-center px-4 pt-24"
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
              <span className="text-white">LIVE IN </span>
              <span className="text-blue-400">YOUR WORLD</span>
            </h1>

            <p className="mx-auto mb-12 max-w-2xl text-lg text-gray-300 md:text-xl">
              Everyday reality. Routine. Expectations. Structure. The world that shapes you.
            </p>

            {/* <div className="relative h-[40vh] md:h-[50vh] w-full my-16">
              <SloganWorld world="your" />
            </div> */}

            <motion.button
              onClick={() => scrollToSection(ourWorldRef, 'ours')} // Updated to use the new function
              className="group rounded-md bg-red-700 px-8 py-2 text-lg font-medium text-white transition-all hover:bg-red-900"
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
          <div className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-red-600 to-transparent"></div>

          <motion.div
            className="container mx-auto max-w-3xl text-center"
            initial={prefersReducedMotion ? false : { opacity: 0 }}
            animate={prefersReducedMotion ? { opacity: 1 } : { opacity: manifestoInView ? 1 : 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.8 }}
          >
            <h2 className="my-10 text-2xl font-bold text-white md:text-4xl">
              RAGESTATE Unfiltered
            </h2>

            <p className="mb-8 text-xl italic text-gray-300 md:text-2xl">
              "In a world that expects you to play by the rules, we’re here to break ‘em – smart,
              bold, and unapologetic."
            </p>

            <div className="space-y-6 text-left text-gray-400">
              <p>
                Right at the crossroads of campus buzz and midnight spontaneity, RAGESTATE is more
                than a brand—it’s a vibe, a rebellion, and your crew.
              </p>
              <p>
                When the day brings structure and deadlines, the night flips the script: here,
                authenticity reigns and you’re free to be unapologetically yourself.
              </p>
              <p>
                With our events, threads, and everything in between, we’re your passport to a life
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
              <span className="text-white">RAGE IN </span>
              <span className="text-red-600">OURS</span>
            </h2>

            <p className="mx-auto mb-12 max-w-2xl text-lg text-gray-300 md:text-xl">
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
                  className="group relative overflow-hidden rounded-lg border border-red-900/50 bg-black/60 p-8 backdrop-blur-sm transition-all hover:border-red-600"
                  whileHover={prefersReducedMotion ? undefined : { y: -5 }}
                  viewport={{ once: true, amount: 0.3 }}
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-red-900/20 to-transparent opacity-0 transition-opacity group-hover:opacity-100"></div>
                  <h3 className="mb-4 text-2xl font-bold text-red-600">EVENTS</h3>
                  <p className="mb-6 text-gray-300">
                    Immersive experiences that transport you to a realm of pure expression and
                    connection.
                  </p>
                  <span className="flex items-center text-red-400">
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
                  className="group relative overflow-hidden rounded-lg border border-red-900/50 bg-black/60 p-8 backdrop-blur-sm transition-all hover:border-red-600"
                  whileHover={prefersReducedMotion ? undefined : { y: -5 }}
                  viewport={{ once: true, amount: 0.3 }}
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-red-900/20 to-transparent opacity-0 transition-opacity group-hover:opacity-100"></div>
                  <h3 className="mb-4 text-2xl font-bold text-red-600">APPAREL</h3>
                  <p className="mb-6 text-gray-300">
                    Carry our world with you. Each piece is a statement, a badge of the movement.
                  </p>
                  <span className="flex items-center text-red-400">
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
              <h3 className="mb-4 text-2xl font-bold text-white">JOIN THE MOVEMENT</h3>
              <p className="mx-auto mb-8 max-w-2xl text-gray-300">
                Create an account to unlock exclusive benefits, early access to events, special
                promoter opportunities, and be the first to know about new merch drops.
              </p>

              <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link href="/create-account">
                  <motion.button
                    className="w-full rounded-md bg-red-700 px-8 py-2 text-lg font-medium text-white transition-all hover:bg-red-700 sm:w-auto"
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

      <footer className="relative z-10 border-t border-gray-800 py-6">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center justify-between md:flex-row">
            <div className="mb-4 md:mb-0">
              <p className="text-sm text-gray-500">
                &copy; {new Date().getFullYear()} RAGESTATE, LLC. All rights reserved.
              </p>
            </div>

            <div className="flex space-x-6">
              <a href="#" className="text-gray-400 transition-colors hover:text-white">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fillRule="evenodd"
                    d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"
                    clipRule="evenodd"
                  ></path>
                </svg>
              </a>
              <a href="#" className="text-gray-400 transition-colors hover:text-white">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z"></path>
                </svg>
              </a>
              <a href="#" className="text-gray-400 transition-colors hover:text-white">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84"></path>
                </svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
