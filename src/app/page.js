'use client';

import { useCallback } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import dynamic from 'next/dynamic';
import Link from 'next/link';

const Home3DAnimation = dynamic(() => import('./components/animations/home-3d-animation'), {
  ssr: false,
  loading: () => null,
});

/** Detect which edge of an element the cursor entered/exited from */
function getEdge(e, el) {
  const { left, top, width, height } = el.getBoundingClientRect();
  const x = (e.clientX - left - width / 2) / (width / 2);
  const y = (e.clientY - top - height / 2) / (height / 2);
  return Math.abs(x) > Math.abs(y)
    ? (x > 0 ? 'right' : 'left')
    : (y > 0 ? 'bottom' : 'top');
}

const CLIP_HIDDEN = {
  left:   'inset(0 100% 0 0)',
  right:  'inset(0 0 0 100%)',
  top:    'inset(0 0 100% 0)',
  bottom: 'inset(100% 0 0 0)',
};

export default function Home() {
  const prefersReducedMotion = useReducedMotion();

  const handleMouseEnter = useCallback((e) => {
    const el = e.currentTarget;
    const edge = getEdge(e, el);
    el.classList.add('no-transition');
    el.style.setProperty('--wipe-clip', CLIP_HIDDEN[edge]);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.classList.remove('no-transition');
        el.style.setProperty('--wipe-clip', 'inset(0)');
      });
    });
  }, []);

  const handleMouseLeave = useCallback((e) => {
    const el = e.currentTarget;
    const edge = getEdge(e, el);
    el.style.setProperty('--wipe-clip', CLIP_HIDDEN[edge]);
  }, []);

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
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                  >
                    FEED
                  </motion.button>
                </Link>

                <Link href="/events">
                  <motion.button
                    className="btn-wipe-border min-w-[7rem] rounded-lg border border-[var(--border-subtle)] bg-transparent px-6 py-2 text-lg font-medium text-[var(--text-primary)]"
                    whileHover={prefersReducedMotion ? undefined : { scale: 1.05 }}
                    whileTap={prefersReducedMotion ? undefined : { scale: 0.95 }}
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                  >
                    EVENTS
                  </motion.button>
                </Link>

                <Link href="/shop">
                  <motion.button
                    className="btn-wipe-border min-w-[7rem] rounded-lg border border-[var(--border-subtle)] bg-transparent px-6 py-2 text-lg font-medium text-[var(--text-primary)]"
                    whileHover={prefersReducedMotion ? undefined : { scale: 1.05 }}
                    whileTap={prefersReducedMotion ? undefined : { scale: 0.95 }}
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                  >
                    SHOP
                  </motion.button>
                </Link>
              </div>

              <Link href="/create-account">
                <motion.button
                  className="rounded-lg bg-[var(--accent)] px-8 py-2 text-lg font-medium text-white transition-all hover:opacity-90"
                  whileHover={prefersReducedMotion ? undefined : { scale: 1.05 }}
                  whileTap={prefersReducedMotion ? undefined : { scale: 0.95 }}
                >
                  CREATE ACCOUNT
                </motion.button>
              </Link>
            </div>
          </motion.div>
        </section>
      </main>
    </div>
  );
}
