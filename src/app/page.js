'use client';

import { motion, useReducedMotion } from 'framer-motion';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useDirectionalWipe } from '../../lib/hooks/useDirectionalWipe';

const Home3DAnimation = dynamic(() => import('./components/animations/home-3d-animation'), {
  ssr: false,
  loading: () => null,
});

export default function Home() {
  const prefersReducedMotion = useReducedMotion();
  const { onMouseEnter, onMouseLeave } = useDirectionalWipe();

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[var(--bg-root)]">
      {/* 3D particle background */}
      <div className="fixed inset-0 z-0">
        <Home3DAnimation />
      </div>

      <main className="relative z-10">
        <section className="flex min-h-screen flex-col items-center justify-center px-4">
          <motion.div
            className="text-center"
            initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.8 }}
          >
            <h1 className="mb-8 text-4xl font-extrabold leading-tight md:text-7xl">
              <span className="text-[var(--text-primary)]">LIVE IN YOUR WORLD</span>
              <br />
              <span className="text-[var(--accent)]">RAGE IN OURS</span>
            </h1>

            <div className="flex flex-col items-center gap-6">
              <div className="flex flex-wrap justify-center gap-3">
                <Link href="/feed">
                  <motion.button
                    className="btn-wipe-border min-w-[7rem] rounded-lg border border-[var(--border-subtle)] bg-transparent px-6 py-2 text-lg font-medium text-[var(--text-primary)]"
                    whileHover={prefersReducedMotion ? undefined : { scale: 1.05 }}
                    whileTap={prefersReducedMotion ? undefined : { scale: 0.95 }}
                    onMouseEnter={onMouseEnter}
                    onMouseLeave={onMouseLeave}
                  >
                    FEED
                  </motion.button>
                </Link>

                <Link href="/events">
                  <motion.button
                    className="btn-wipe-border min-w-[7rem] rounded-lg border border-[var(--border-subtle)] bg-transparent px-6 py-2 text-lg font-medium text-[var(--text-primary)]"
                    whileHover={prefersReducedMotion ? undefined : { scale: 1.05 }}
                    whileTap={prefersReducedMotion ? undefined : { scale: 0.95 }}
                    onMouseEnter={onMouseEnter}
                    onMouseLeave={onMouseLeave}
                  >
                    EVENTS
                  </motion.button>
                </Link>

                <Link href="/shop">
                  <motion.button
                    className="btn-wipe-border min-w-[7rem] rounded-lg border border-[var(--border-subtle)] bg-transparent px-6 py-2 text-lg font-medium text-[var(--text-primary)]"
                    whileHover={prefersReducedMotion ? undefined : { scale: 1.05 }}
                    whileTap={prefersReducedMotion ? undefined : { scale: 0.95 }}
                    onMouseEnter={onMouseEnter}
                    onMouseLeave={onMouseLeave}
                  >
                    SHOP
                  </motion.button>
                </Link>
              </div>

              <Link href="/create-account">
                <motion.button
                  className="btn-wipe-fill rounded-lg border border-[var(--border-subtle)] bg-transparent px-8 py-2 text-lg font-medium text-[var(--text-primary)] transition-colors dark:hover:text-white"
                  whileHover={prefersReducedMotion ? undefined : { scale: 1.05 }}
                  whileTap={prefersReducedMotion ? undefined : { scale: 0.95 }}
                  onMouseEnter={onMouseEnter}
                  onMouseLeave={onMouseLeave}
                >
                  <span className="relative z-10">CREATE ACCOUNT</span>
                </motion.button>
              </Link>
            </div>
          </motion.div>
        </section>
      </main>
    </div>
  );
}
