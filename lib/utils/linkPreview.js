/**
 * Link Preview Utilities
 * Extract URLs from text and helpers for link preview functionality
 */

// URL regex pattern (matches http, https, and www URLs)
const URL_PATTERN = /((https?:\/\/|www\.)[^\s<]+)/gi;

// Domains to skip for previews (social media embeds, media files, etc.)
const SKIP_DOMAINS = [
  'twitter.com',
  'x.com',
  'instagram.com',
  'facebook.com',
  'tiktok.com',
  'youtube.com',
  'youtu.be',
  'spotify.com',
  'soundcloud.com',
];

// File extensions to skip (media files don't have OG metadata)
const SKIP_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.mp4', '.mov', '.webm', '.mp3', '.wav'];

/**
 * Extract URLs from text content
 * @param {string} text - Text to extract URLs from
 * @returns {string[]} Array of URLs found in the text
 */
export function extractUrls(text) {
  if (!text || typeof text !== 'string') return [];

  const matches = text.match(URL_PATTERN) || [];

  // Clean up and normalize URLs
  return matches
    .map((url) => {
      // Remove trailing punctuation
      let cleaned = url;
      while (/[),.;:!?]$/.test(cleaned)) {
        cleaned = cleaned.slice(0, -1);
      }
      // Add https if missing
      if (cleaned.startsWith('www.')) {
        cleaned = `https://${cleaned}`;
      }
      return cleaned;
    })
    .filter((url, index, arr) => arr.indexOf(url) === index); // Deduplicate
}

/**
 * Check if a URL should show a link preview
 * @param {string} url - URL to check
 * @returns {boolean} True if URL should show preview
 */
export function shouldShowPreview(url) {
  if (!url) return false;

  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();

    // Skip certain domains (social media, etc.)
    if (SKIP_DOMAINS.some((domain) => hostname.includes(domain))) {
      return false;
    }

    // Skip media file URLs
    const pathname = parsed.pathname.toLowerCase();
    if (SKIP_EXTENSIONS.some((ext) => pathname.endsWith(ext))) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Get the first previewable URL from text
 * @param {string} text - Text to search
 * @returns {string|null} First previewable URL or null
 */
export function getFirstPreviewableUrl(text) {
  const urls = extractUrls(text);
  return urls.find(shouldShowPreview) || null;
}

/**
 * @typedef {Object} LinkPreviewData
 * @property {string} url - Original URL
 * @property {string} title - Page title
 * @property {string} [description] - Page description
 * @property {string} [image] - OG image URL
 * @property {string} [siteName] - Site name
 * @property {string} [favicon] - Favicon URL
 */

// Simple in-memory cache for link previews (client-side)
const previewCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get cached preview or null
 * @param {string} url
 * @returns {LinkPreviewData|null}
 */
export function getCachedPreview(url) {
  const cached = previewCache.get(url);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  return null;
}

/**
 * Set cached preview
 * @param {string} url
 * @param {LinkPreviewData} data
 */
export function setCachedPreview(url, data) {
  previewCache.set(url, { data, timestamp: Date.now() });
}

/**
 * Fetch link preview data from API
 * @param {string} url - URL to fetch preview for
 * @returns {Promise<LinkPreviewData|null>}
 */
export async function fetchLinkPreview(url) {
  if (!url) return null;

  // Check cache first
  const cached = getCachedPreview(url);
  if (cached) return cached;

  try {
    const response = await fetch('/api/og-metadata', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    if (data.error) return null;

    // Cache the result
    setCachedPreview(url, data);
    return data;
  } catch (error) {
    console.warn('Failed to fetch link preview:', error);
    return null;
  }
}
