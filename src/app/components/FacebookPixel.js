'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

import { FB_PIXEL_ID, pageview } from '../../../lib/fpixel';

function FacebookPixel() {
  const pathname = usePathname();

  useEffect(() => {
    if (FB_PIXEL_ID) {
      pageview();
    }
  }, [pathname]);

  if (!FB_PIXEL_ID) return null;

  return (
    <noscript>
      <img
        height="1"
        width="1"
        style={{ display: 'none' }}
        src={`https://www.facebook.com/tr?id=${FB_PIXEL_ID}&ev=PageView&noscript=1`}
        alt=""
      />
    </noscript>
  );
}

export default FacebookPixel;
