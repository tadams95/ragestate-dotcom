'use client';

import { memo, useState } from 'react';
import Image from 'next/image';

/**
 * @typedef {Object} LinkPreviewData
 * @property {string} url - Original URL
 * @property {string} title - Page title
 * @property {string} [description] - Page description
 * @property {string} [image] - OG image URL
 * @property {string} [siteName] - Site name
 * @property {string} [favicon] - Favicon URL
 */

/**
 * @typedef {Object} LinkPreviewCardProps
 * @property {LinkPreviewData} preview - The preview data to display
 * @property {string} [className] - Additional CSS classes
 */

/**
 * Displays a link preview card with OG metadata
 * @param {LinkPreviewCardProps} props
 */
function LinkPreviewCard({ preview, className = '' }) {
  const [imageError, setImageError] = useState(false);
  const [faviconError, setFaviconError] = useState(false);

  if (!preview || !preview.title) return null;

  const handleClick = () => {
    window.open(preview.url, '_blank', 'noopener,noreferrer');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <div
      role="link"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={`mt-3 cursor-pointer overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elev-1)] transition-colors hover:bg-[var(--bg-elev-2)] ${className}`}
    >
      {/* Image */}
      {preview.image && !imageError && (
        <div className="relative aspect-[1.91/1] w-full bg-[var(--bg-elev-2)]">
          <Image
            src={preview.image}
            alt={preview.title}
            fill
            className="object-cover"
            onError={() => setImageError(true)}
            unoptimized
          />
        </div>
      )}

      {/* Content */}
      <div className="p-3">
        {/* Site info */}
        <div className="mb-1 flex items-center gap-2">
          {preview.favicon && !faviconError && (
            <Image
              src={preview.favicon}
              alt=""
              width={16}
              height={16}
              className="rounded-sm"
              onError={() => setFaviconError(true)}
              unoptimized
            />
          )}
          <span className="text-xs text-[var(--text-tertiary)]">
            {preview.siteName || new URL(preview.url).hostname.replace('www.', '')}
          </span>
        </div>

        {/* Title */}
        <h4 className="line-clamp-2 text-sm font-semibold text-[var(--text-primary)]">
          {preview.title}
        </h4>

        {/* Description */}
        {preview.description && (
          <p className="mt-1 line-clamp-2 text-xs text-[var(--text-secondary)]">
            {preview.description}
          </p>
        )}
      </div>
    </div>
  );
}

export default memo(LinkPreviewCard);
