export const FB_PIXEL_ID = process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID;

/**
 * Fire a PageView event.
 */
export function pageview() {
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('track', 'PageView');
  }
}

/**
 * Fire a custom Facebook Pixel event.
 * @param {string} name - Event name (e.g. 'Purchase', 'AddToCart', 'ViewContent', 'Lead', 'CompleteRegistration')
 * @param {Record<string, any>} [options] - Optional event parameters
 */
export function event(name, options = {}) {
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('track', name, options);
  }
}
