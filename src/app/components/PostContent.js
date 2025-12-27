'use client';

import { linkifyAll } from '@/app/utils/linkify';
import { Dialog, DialogPanel } from '@headlessui/react';
import Image from 'next/image';
import { useMemo, useState } from 'react';

// Clamp long content to ~5 lines and reveal with a toggle per design spec
export default function PostContent({ content, mediaUrls = [] }) {
  const [expanded, setExpanded] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const text = content || 'This is the post content.';
  const shouldClamp = useMemo(() => (text?.length || 0) > 300, [text]);
  const images = Array.isArray(mediaUrls) ? mediaUrls.filter(Boolean) : [];

  const openLightbox = (index) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const closeLightbox = () => setLightboxOpen(false);

  const goNext = () => setLightboxIndex((i) => (i + 1) % images.length);
  const goPrev = () => setLightboxIndex((i) => (i - 1 + images.length) % images.length);

  return (
    <div className="mb-3">
      {/* Text content */}
      {text && (
        <>
          <p
            className={
              shouldClamp && !expanded
                ? 'line-clamp-5 whitespace-pre-line break-words text-[15px] leading-6 text-white'
                : 'whitespace-pre-line break-words text-[15px] leading-6 text-white'
            }
          >
            {linkifyAll(text)}
          </p>
          {shouldClamp && (
            <button
              type="button"
              onClick={() => setExpanded((s) => !s)}
              className="mt-2 text-sm font-semibold text-[#ff1f42] hover:text-[#ff415f]"
            >
              {expanded ? 'See less' : 'See more'}
            </button>
          )}
        </>
      )}

      {/* Media grid - X/Twitter-style layout */}
      {images.length > 0 && (
        <div
          className={`mt-3 overflow-hidden rounded-xl ${
            images.length === 1
              ? ''
              : images.length === 3
                ? 'grid grid-cols-2 gap-0.5'
                : 'grid grid-cols-2 gap-0.5'
          }`}
          style={{ maxHeight: '510px' }}
        >
          {images.length === 1 && (
            <div
              role="button"
              tabIndex={0}
              onClick={() => openLightbox(0)}
              onKeyDown={(e) => e.key === 'Enter' && openLightbox(0)}
              className="relative cursor-pointer overflow-hidden bg-white/5"
              style={{ aspectRatio: '16/9', maxHeight: '510px' }}
            >
              <Image
                src={images[0]}
                alt="Post image 1"
                fill
                className="object-cover transition-transform hover:scale-[1.02]"
                sizes="(max-width: 768px) 100vw, 600px"
              />
            </div>
          )}

          {images.length === 2 &&
            images.slice(0, 2).map((url, idx) => (
              <div
                key={url}
                role="button"
                tabIndex={0}
                onClick={() => openLightbox(idx)}
                onKeyDown={(e) => e.key === 'Enter' && openLightbox(idx)}
                className="relative cursor-pointer overflow-hidden bg-white/5"
                style={{ aspectRatio: '1/1' }}
              >
                <Image
                  src={url}
                  alt={`Post image ${idx + 1}`}
                  fill
                  className="object-cover transition-transform hover:scale-[1.02]"
                  sizes="50vw"
                />
              </div>
            ))}

          {images.length === 3 && (
            <>
              {/* Left: taller image */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => openLightbox(0)}
                onKeyDown={(e) => e.key === 'Enter' && openLightbox(0)}
                className="relative row-span-2 cursor-pointer overflow-hidden bg-white/5"
                style={{ aspectRatio: '4/5' }}
              >
                <Image
                  src={images[0]}
                  alt="Post image 1"
                  fill
                  className="object-cover transition-transform hover:scale-[1.02]"
                  sizes="50vw"
                />
              </div>
              {/* Right: two stacked images */}
              <div className="flex flex-col gap-0.5">
                {images.slice(1, 3).map((url, idx) => (
                  <div
                    key={url}
                    role="button"
                    tabIndex={0}
                    onClick={() => openLightbox(idx + 1)}
                    onKeyDown={(e) => e.key === 'Enter' && openLightbox(idx + 1)}
                    className="relative flex-1 cursor-pointer overflow-hidden bg-white/5"
                    style={{ aspectRatio: '4/5' }}
                  >
                    <Image
                      src={url}
                      alt={`Post image ${idx + 2}`}
                      fill
                      className="object-cover transition-transform hover:scale-[1.02]"
                      sizes="50vw"
                    />
                  </div>
                ))}
              </div>
            </>
          )}

          {images.length >= 4 &&
            images.slice(0, 4).map((url, idx) => (
              <div
                key={url}
                role="button"
                tabIndex={0}
                onClick={() => openLightbox(idx)}
                onKeyDown={(e) => e.key === 'Enter' && openLightbox(idx)}
                className="relative cursor-pointer overflow-hidden bg-white/5"
                style={{ aspectRatio: '16/10' }}
              >
                <Image
                  src={url}
                  alt={`Post image ${idx + 1}`}
                  fill
                  className="object-cover transition-transform hover:scale-[1.02]"
                  sizes="50vw"
                />
                {/* Show "+N" overlay on 4th image if more than 4 */}
                {idx === 3 && images.length > 4 && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                    <span className="text-2xl font-bold text-white">+{images.length - 4}</span>
                  </div>
                )}
              </div>
            ))}
        </div>
      )}

      {/* Lightbox modal */}
      <Dialog open={lightboxOpen} onClose={closeLightbox} className="relative z-50">
        <div className="fixed inset-0 bg-black/90" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel className="relative max-h-[90vh] max-w-[90vw]">
            {/* Close button */}
            <button
              onClick={closeLightbox}
              className="absolute -top-12 right-0 p-2 text-white/80 hover:text-white"
              aria-label="Close"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="h-8 w-8"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            {/* Main image */}
            <div className="relative flex items-center justify-center">
              {/* Previous button */}
              {images.length > 1 && (
                <button
                  onClick={goPrev}
                  className="absolute left-2 z-10 rounded-full bg-black/50 p-3 text-white/80 hover:bg-black/70 hover:text-white sm:left-4"
                  aria-label="Previous image"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="h-6 w-6"
                  >
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                </button>
              )}

              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={images[lightboxIndex]}
                alt={`Post image ${lightboxIndex + 1}`}
                className="max-h-[85vh] max-w-[85vw] rounded-lg object-contain"
              />

              {/* Next button */}
              {images.length > 1 && (
                <button
                  onClick={goNext}
                  className="absolute right-2 z-10 rounded-full bg-black/50 p-3 text-white/80 hover:bg-black/70 hover:text-white sm:right-4"
                  aria-label="Next image"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="h-6 w-6"
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              )}
            </div>

            {/* Image counter */}
            {images.length > 1 && (
              <div className="mt-4 text-center text-sm text-white/70">
                {lightboxIndex + 1} / {images.length}
              </div>
            )}
          </DialogPanel>
        </div>
      </Dialog>
    </div>
  );
}
