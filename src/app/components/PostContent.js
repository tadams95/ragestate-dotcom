'use client';

import { linkifyAll } from '@/app/utils/linkify';
import { useMemo, useState } from 'react';

// Clamp long content to ~5 lines and reveal with a toggle per design spec
export default function PostContent({ content }) {
  const [expanded, setExpanded] = useState(false);
  const text = content || 'This is the post content.';
  const shouldClamp = useMemo(() => (text?.length || 0) > 300, [text]);

  return (
    <div className="mb-3">
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
      {/* Media grid placeholder (Phase 2): images/videos with aspect ratio */}
    </div>
  );
}
