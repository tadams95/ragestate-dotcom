'use client';

import { memo, useState } from 'react';
import { EyeSlashIcon } from '@heroicons/react/24/outline';

/**
 * @typedef {Object} ContentWarningOverlayProps
 * @property {string} [warning] - The warning text to display
 * @property {React.ReactNode} children - Content to blur/reveal
 */

/**
 * Overlay that blurs content behind a warning message
 * Click "Show content" to reveal the blurred content
 * @param {ContentWarningOverlayProps} props
 */
function ContentWarningOverlay({ warning, children }) {
  const [revealed, setRevealed] = useState(false);

  if (revealed) {
    return (
      <div className="relative">
        {children}
        {/* Small indicator that content was revealed */}
        <button
          type="button"
          onClick={() => setRevealed(false)}
          className="mt-2 flex items-center gap-1 text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
        >
          <EyeSlashIcon className="h-3 w-3" />
          <span>Hide content</span>
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Blurred content */}
      <div className="pointer-events-none select-none blur-xl">{children}</div>

      {/* Warning overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center rounded-xl bg-[var(--bg-elev-2)]/80 backdrop-blur-sm">
        <EyeSlashIcon className="mb-2 h-8 w-8 text-[var(--text-tertiary)]" />
        <p className="mb-3 text-sm font-medium text-[var(--text-primary)]">
          {warning || 'Sensitive content'}
        </p>
        <button
          type="button"
          onClick={() => setRevealed(true)}
          className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elev-1)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-elev-2)]"
        >
          Show content
        </button>
      </div>
    </div>
  );
}

export default memo(ContentWarningOverlay);
