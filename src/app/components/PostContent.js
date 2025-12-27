'use client';

import { linkifyAll } from '@/app/utils/linkify';
import { Dialog, DialogPanel } from '@headlessui/react';
import Image from 'next/image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

// Detect if URL is a video based on extension or Firebase Storage path
const isVideoUrl = (url) => {
  if (!url) return false;
  const lower = url.toLowerCase();
  // Common video extensions
  if (/\.(mp4|mov|webm|avi|mkv|m4v)(\?|$)/i.test(lower)) return true;
  // Firebase Storage video content type hint
  if (lower.includes('video%2f') || lower.includes('video/')) return true;
  return false;
};

// TikTok/Reels-style video player component
function VideoPlayer({ src, optimizedSrc, isProcessing = false, className = '' }) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef(null);

  // Prefer optimized URL if available, fallback to original
  const videoSrc = optimizedSrc || src;

  // Auto-play when in viewport (Intersection Observer)
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            video.play().catch(() => {}); // Auto-play may fail without user interaction
          } else {
            video.pause();
          }
        });
      },
      { threshold: 0.5 },
    );

    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  // Update playing state on video events
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleTimeUpdate = () => {
      if (video.duration) {
        setProgress((video.currentTime / video.duration) * 100);
      }
    };
    const handleLoadedMetadata = () => setDuration(video.duration);

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, []);

  // Hide controls after inactivity
  const showControlsTemporarily = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 2500);
  }, [isPlaying]);

  // Toggle play/pause on tap
  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
    showControlsTemporarily();
  };

  // Toggle mute
  const toggleMute = (e) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
    showControlsTemporarily();
  };

  // Seek on progress bar click
  const handleSeek = (e) => {
    e.stopPropagation();
    const video = videoRef.current;
    const bar = e.currentTarget;
    if (!video || !bar) return;
    const rect = bar.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    video.currentTime = percent * video.duration;
    showControlsTemporarily();
  };

  // Format time as m:ss
  const formatTime = (seconds) => {
    if (!seconds || !isFinite(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Show processing placeholder while video is being transcoded
  if (isProcessing && !optimizedSrc) {
    return (
      <div
        className={`relative flex items-center justify-center overflow-hidden rounded-xl bg-black/80 ${className}`}
        style={{ aspectRatio: '16/9', maxHeight: '510px' }}
      >
        <div className="flex flex-col items-center gap-3 text-white/70">
          {/* Animated spinner */}
          <svg
            className="h-10 w-10 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span className="text-sm font-medium">Processing video…</span>
          <span className="text-xs text-white/50">This may take a moment</span>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden rounded-xl bg-black ${className}`}
      onClick={togglePlay}
      onMouseMove={showControlsTemporarily}
      onTouchStart={showControlsTemporarily}
    >
      <video
        ref={videoRef}
        src={videoSrc}
        className="h-full w-full object-contain"
        muted={isMuted}
        loop
        playsInline
        preload="metadata"
        style={{ maxHeight: '510px' }}
      />

      {/* Center play button (shown when paused) */}
      {!isPlaying && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="rounded-full bg-black/50 p-4 backdrop-blur-sm">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="white"
              className="h-10 w-10"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      )}

      {/* Controls overlay */}
      <div
        className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 transition-opacity duration-200 ${
          showControls || !isPlaying ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* Progress bar */}
        <div className="mb-2 h-1 cursor-pointer rounded-full bg-white/30" onClick={handleSeek}>
          <div
            className="h-full rounded-full bg-[#ff1f42] transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Bottom controls row */}
        <div className="flex items-center justify-between">
          {/* Time display */}
          <span className="text-xs text-white/80">
            {formatTime(videoRef.current?.currentTime)} / {formatTime(duration)}
          </span>

          {/* Mute button */}
          <button
            onClick={toggleMute}
            className="rounded-full bg-black/40 p-2 text-white hover:bg-black/60"
            aria-label={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="h-5 w-5"
              >
                <path d="M3.63 3.63a.75.75 0 00-1.06 1.06L7.5 9.62v4.88a.75.75 0 001.28.53l4.72-4.72v4.19a.75.75 0 001.28.53l.69-.69 3.22 3.22a.75.75 0 101.06-1.06L3.63 3.63z" />
                <path d="M19.5 12a6.48 6.48 0 01-.94 3.37l1.12 1.12A7.97 7.97 0 0021 12a8 8 0 00-4.47-7.16.75.75 0 00-.66 1.35A6.5 6.5 0 0119.5 12z" />
                <path d="M12 4.5v3.38l1.5 1.5V4.5a.75.75 0 00-1.28-.53l-2.1 2.1 1.06 1.06L12 6.31v-1.8z" />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="h-5 w-5"
              >
                <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 001.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06z" />
                <path d="M18.584 5.106a.75.75 0 011.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 11-1.06-1.06 8.25 8.25 0 000-11.668.75.75 0 010-1.06z" />
                <path d="M15.932 7.757a.75.75 0 011.061 0 6 6 0 010 8.486.75.75 0 01-1.06-1.061 4.5 4.5 0 000-6.364.75.75 0 010-1.06z" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Muted indicator (top-right, always visible when muted) */}
      {isMuted && isPlaying && (
        <div className="absolute right-3 top-3 rounded-full bg-black/50 p-1.5 backdrop-blur-sm">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="white"
            className="h-4 w-4"
          >
            <path d="M3.63 3.63a.75.75 0 00-1.06 1.06L7.5 9.62v4.88a.75.75 0 001.28.53l4.72-4.72v4.19a.75.75 0 001.28.53l.69-.69 3.22 3.22a.75.75 0 101.06-1.06L3.63 3.63z" />
          </svg>
        </div>
      )}
    </div>
  );
}

// Clamp long content to ~5 lines and reveal with a toggle per design spec
export default function PostContent({
  content,
  mediaUrls = [],
  optimizedMediaUrls = [],
  isProcessing = false,
}) {
  const [expanded, setExpanded] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const text = content || 'This is the post content.';
  const shouldClamp = useMemo(() => (text?.length || 0) > 300, [text]);

  // Separate images and videos
  const allMedia = Array.isArray(mediaUrls) ? mediaUrls.filter(Boolean) : [];
  const images = allMedia.filter((url) => !isVideoUrl(url));
  const videos = allMedia.filter((url) => isVideoUrl(url));

  // Build a map of original video URL -> optimized URL (if available)
  const optimizedUrlMap = useMemo(() => {
    const map = {};
    const optimized = Array.isArray(optimizedMediaUrls) ? optimizedMediaUrls : [];
    // Match by filename: original posts/{postId}/video.mp4 -> optimized posts-optimized/{postId}/video.mp4
    videos.forEach((originalUrl) => {
      // Extract filename from original URL
      const originalFileName = originalUrl.split('/').pop()?.split('?')[0];
      if (!originalFileName) return;
      const originalBaseName = originalFileName.replace(/\.[^.]+$/, ''); // Remove extension
      // Find matching optimized URL
      const match = optimized.find((optUrl) => {
        const optFileName = optUrl.split('/').pop()?.split('?')[0];
        return optFileName && optFileName.startsWith(originalBaseName);
      });
      if (match) {
        map[originalUrl] = match;
      }
    });
    return map;
  }, [videos, optimizedMediaUrls]);

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

      {/* Video player - TikTok/Reels style */}
      {videos.length > 0 && (
        <div className="mt-3 space-y-3">
          {videos.map((videoUrl, idx) => (
            <VideoPlayer
              key={videoUrl}
              src={videoUrl}
              optimizedSrc={optimizedUrlMap[videoUrl]}
              isProcessing={isProcessing && !optimizedUrlMap[videoUrl]}
              className="w-full"
            />
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
