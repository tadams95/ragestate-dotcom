'use client';

import { useEffect, useState } from 'react';

const GLITCH_SYMBOLS = ['⚠️', '█', '▓', '░', '⚡', '✕', '◈', '⬡'];

export default function GlitchWarning({ className = '' }) {
  const [symbolIndex, setSymbolIndex] = useState(0);
  const [isGlitching, setIsGlitching] = useState(false);

  // Cycle through corrupted symbols
  useEffect(() => {
    const symbolInterval = setInterval(() => {
      setSymbolIndex((prev) => (prev + 1) % GLITCH_SYMBOLS.length);
    }, 150);

    return () => clearInterval(symbolInterval);
  }, []);

  // Random glitch bursts
  useEffect(() => {
    const triggerGlitch = () => {
      setIsGlitching(true);
      setTimeout(() => setIsGlitching(false), 100 + Math.random() * 200);
    };

    const glitchInterval = setInterval(() => {
      if (Math.random() > 0.6) {
        triggerGlitch();
      }
    }, 500);

    return () => clearInterval(glitchInterval);
  }, []);

  return (
    <div
      className={`glitch-warning-container group relative ${className}`}
      aria-label="Warning indicator"
    >
      {/* Main container with shake */}
      <div className={`relative h-32 w-32 ${isGlitching ? 'animate-glitch-shake' : ''}`}>
        {/* Outer glow ring */}
        <div className="absolute inset-0 animate-pulse rounded-full bg-gradient-to-r from-red-600 to-red-800 opacity-30 blur-xl" />

        {/* CRT Scan lines overlay */}
        <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden rounded-full opacity-40">
          <div className="animate-scanlines absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(0,0,0,0.3)_2px,rgba(0,0,0,0.3)_4px)]" />
        </div>

        {/* VHS Tracking line */}
        <div className="animate-vhs-tracking pointer-events-none absolute left-0 right-0 z-30 h-1 bg-white/20 blur-[1px]" />

        {/* Static noise overlay */}
        <div
          className={`pointer-events-none absolute inset-0 z-10 rounded-full transition-opacity duration-75 ${
            isGlitching ? 'opacity-60' : 'opacity-0'
          }`}
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.5'/%3E%3C/svg%3E")`,
          }}
        />

        {/* RGB Split layers - Red channel */}
        <div className="animate-rgb-red absolute inset-0 flex items-center justify-center">
          <span className="select-none text-4xl opacity-70" style={{ filter: 'url(#red-channel)' }}>
            {GLITCH_SYMBOLS[symbolIndex]}
          </span>
        </div>

        {/* RGB Split layers - Green channel (base) */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative flex items-center justify-center">
            {/* Ping animation background */}
            <div className="absolute inset-0 -m-4 animate-ping rounded-full bg-gradient-to-r from-red-700 to-transparent opacity-50" />

            {/* Main symbol */}
            <span className="relative z-10 select-none text-4xl drop-shadow-[0_0_10px_rgba(255,0,0,0.8)]">
              {GLITCH_SYMBOLS[symbolIndex]}
            </span>
          </div>
        </div>

        {/* RGB Split layers - Blue channel */}
        <div className="animate-rgb-blue absolute inset-0 flex items-center justify-center">
          <span
            className="select-none text-4xl opacity-70"
            style={{ filter: 'url(#blue-channel)' }}
          >
            {GLITCH_SYMBOLS[symbolIndex]}
          </span>
        </div>

        {/* Glitch slice artifacts */}
        {isGlitching && (
          <>
            <div
              className="absolute left-0 right-0 z-40 h-2 overflow-hidden bg-red-500/40"
              style={{ top: `${20 + Math.random() * 60}%` }}
            >
              <div
                className="h-full w-full"
                style={{ transform: `translateX(${(Math.random() - 0.5) * 20}px)` }}
              />
            </div>
            <div
              className="absolute left-0 right-0 z-40 h-1 overflow-hidden bg-cyan-500/40"
              style={{ top: `${30 + Math.random() * 40}%` }}
            >
              <div
                className="h-full w-full"
                style={{ transform: `translateX(${(Math.random() - 0.5) * 30}px)` }}
              />
            </div>
          </>
        )}

        {/* Hover intensify border */}
        <div className="absolute inset-0 rounded-full border-2 border-red-500/0 transition-all duration-300 group-hover:border-red-500/80 group-hover:shadow-[0_0_30px_rgba(255,0,0,0.6)]" />
      </div>

      {/* SVG Filters for RGB channel separation */}
      <svg className="absolute h-0 w-0" aria-hidden="true">
        <defs>
          <filter id="red-channel">
            <feColorMatrix
              type="matrix"
              values="1 0 0 0 0
                      0 0 0 0 0
                      0 0 0 0 0
                      0 0 0 1 0"
            />
          </filter>
          <filter id="blue-channel">
            <feColorMatrix
              type="matrix"
              values="0 0 0 0 0
                      0 0 0 0 0
                      0 0 1 0 0
                      0 0 0 1 0"
            />
          </filter>
        </defs>
      </svg>
    </div>
  );
}
