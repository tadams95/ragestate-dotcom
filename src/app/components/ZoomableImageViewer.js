'use client';

import { Dialog, DialogBackdrop, DialogPanel } from '@headlessui/react';
import { useGesture } from '@use-gesture/react';
import { AnimatePresence, motion } from 'framer-motion';
import { memo, useCallback, useRef, useState } from 'react';

/**
 * @typedef {Object} ZoomableImageViewerProps
 * @property {boolean} isOpen - Whether the viewer is open
 * @property {() => void} onClose - Callback to close the viewer
 * @property {string} imageUrl - URL of the image to display
 * @property {string} [alt] - Alt text for the image
 */

/**
 * Full-screen modal image viewer with double-tap to zoom and pinch-to-zoom support
 * @param {ZoomableImageViewerProps} props
 */
function ZoomableImageViewer({ isOpen, onClose, imageUrl, alt = 'Profile image' }) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const imageRef = useRef(null);
  const lastTapRef = useRef(0);

  const MIN_SCALE = 1;
  const MAX_SCALE = 4;
  const DOUBLE_TAP_SCALE = 2;
  const DOUBLE_TAP_DELAY = 300;

  const resetZoom = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  const handleClose = useCallback(() => {
    resetZoom();
    onClose();
  }, [onClose, resetZoom]);

  const clampPosition = useCallback(
    (x, y, currentScale) => {
      if (currentScale <= 1) {
        return { x: 0, y: 0 };
      }

      const imageEl = imageRef.current;
      if (!imageEl) return { x, y };

      const rect = imageEl.getBoundingClientRect();
      const scaledWidth = rect.width * currentScale;
      const scaledHeight = rect.height * currentScale;

      const maxX = Math.max(0, (scaledWidth - window.innerWidth) / 2);
      const maxY = Math.max(0, (scaledHeight - window.innerHeight) / 2);

      return {
        x: Math.max(-maxX, Math.min(maxX, x)),
        y: Math.max(-maxY, Math.min(maxY, y)),
      };
    },
    [],
  );

  const bind = useGesture(
    {
      onDrag: ({ offset: [x, y], memo: initialScale }) => {
        const currentScale = initialScale ?? scale;
        if (currentScale > 1) {
          const clamped = clampPosition(x, y, currentScale);
          setPosition(clamped);
        }
        return currentScale;
      },
      onPinch: ({ offset: [s], memo }) => {
        const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, s));
        setScale(newScale);

        if (newScale <= 1) {
          setPosition({ x: 0, y: 0 });
        } else {
          const clamped = clampPosition(position.x, position.y, newScale);
          setPosition(clamped);
        }

        return memo;
      },
    },
    {
      drag: {
        from: () => [position.x, position.y],
        enabled: scale > 1,
        filterTaps: true,
      },
      pinch: {
        scaleBounds: { min: MIN_SCALE, max: MAX_SCALE },
        from: () => [scale, 0],
      },
    },
  );

  const handleDoubleTap = useCallback(() => {
    const now = Date.now();
    const timeSinceLastTap = now - lastTapRef.current;

    if (timeSinceLastTap < DOUBLE_TAP_DELAY && timeSinceLastTap > 0) {
      // Double-tap detected - toggle zoom
      if (scale === 1) {
        setScale(DOUBLE_TAP_SCALE);
      } else {
        setScale(1);
        setPosition({ x: 0, y: 0 });
      }
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
    }
  }, [scale]);

  return (
    <AnimatePresence>
      {isOpen && (
        <Dialog open={isOpen} onClose={handleClose} className="relative z-50">
          <DialogBackdrop
            as={motion.div}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/90"
          />

          <div className="fixed inset-0 flex items-center justify-center overflow-hidden">
            <DialogPanel
              as={motion.div}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="relative flex h-full w-full items-center justify-center"
            >
              {/* Close button */}
              <button
                onClick={handleClose}
                className="absolute right-4 top-4 z-10 rounded-full bg-black/50 p-2 text-white transition-colors hover:bg-black/70"
                aria-label="Close image viewer"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="h-6 w-6"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* Zoom indicator */}
              {scale > 1 && (
                <div className="absolute left-4 top-4 z-10 rounded-full bg-black/50 px-3 py-1 text-sm text-white">
                  {Math.round(scale * 100)}%
                </div>
              )}

              {/* Zoomable image container */}
              <motion.div
                {...bind()}
                onClick={handleDoubleTap}
                animate={{
                  scale,
                  x: position.x,
                  y: position.y,
                }}
                transition={{
                  type: 'spring',
                  stiffness: 300,
                  damping: 30,
                }}
                className="touch-none select-none"
                style={{ cursor: scale > 1 ? 'grab' : 'zoom-in' }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  ref={imageRef}
                  src={imageUrl}
                  alt={alt}
                  className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
                  draggable={false}
                />
              </motion.div>

              {/* Instructions hint */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-4 py-2 text-xs text-white/70">
                Double-tap to zoom {scale > 1 ? 'out' : 'in'}
              </div>
            </DialogPanel>
          </div>
        </Dialog>
      )}
    </AnimatePresence>
  );
}

export default memo(ZoomableImageViewer);
