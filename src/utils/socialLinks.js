/**
 * Social Links Validation & Utilities
 *
 * Supports: Twitter/X, Instagram, TikTok, SoundCloud, Spotify, YouTube
 * Used for profile social links feature.
 */

// Platform configuration with validation patterns and display info
export const SOCIAL_PLATFORMS = {
  twitter: {
    name: 'X (Twitter)',
    key: 'twitter',
    color: '#000000',
    patterns: [/^https?:\/\/(www\.)?(twitter\.com|x\.com)\/[a-zA-Z0-9_]+\/?$/i],
    // More lenient pattern for partial validation during typing
    loosePatterns: [/^https?:\/\/(www\.)?(twitter\.com|x\.com)\/.+/i],
    placeholder: 'https://x.com/username',
    extractUsername: (url) => {
      const match = url.match(/(?:twitter\.com|x\.com)\/([a-zA-Z0-9_]+)/i);
      return match ? match[1] : null;
    },
  },
  instagram: {
    name: 'Instagram',
    key: 'instagram',
    color: '#E4405F',
    patterns: [/^https?:\/\/(www\.)?instagram\.com\/[a-zA-Z0-9_.]+\/?$/i],
    loosePatterns: [/^https?:\/\/(www\.)?instagram\.com\/.+/i],
    placeholder: 'https://instagram.com/username',
    extractUsername: (url) => {
      const match = url.match(/instagram\.com\/([a-zA-Z0-9_.]+)/i);
      return match ? match[1] : null;
    },
  },
  tiktok: {
    name: 'TikTok',
    key: 'tiktok',
    color: '#000000',
    patterns: [/^https?:\/\/(www\.)?tiktok\.com\/@[a-zA-Z0-9_.]+\/?$/i],
    loosePatterns: [/^https?:\/\/(www\.)?tiktok\.com\/@?.+/i],
    placeholder: 'https://tiktok.com/@username',
    extractUsername: (url) => {
      const match = url.match(/tiktok\.com\/@?([a-zA-Z0-9_.]+)/i);
      return match ? match[1] : null;
    },
  },
  soundcloud: {
    name: 'SoundCloud',
    key: 'soundcloud',
    color: '#FF5500',
    patterns: [/^https?:\/\/(www\.)?soundcloud\.com\/[a-zA-Z0-9_-]+\/?$/i],
    loosePatterns: [/^https?:\/\/(www\.)?soundcloud\.com\/.+/i],
    placeholder: 'https://soundcloud.com/artist',
    extractUsername: (url) => {
      const match = url.match(/soundcloud\.com\/([a-zA-Z0-9_-]+)/i);
      return match ? match[1] : null;
    },
  },
  spotify: {
    name: 'Spotify',
    key: 'spotify',
    color: '#1DB954',
    patterns: [/^https?:\/\/open\.spotify\.com\/(artist|user)\/[a-zA-Z0-9]+\/?$/i],
    loosePatterns: [/^https?:\/\/open\.spotify\.com\/(artist|user)\/.+/i],
    placeholder: 'https://open.spotify.com/artist/...',
    extractUsername: (url) => {
      const match = url.match(/open\.spotify\.com\/(?:artist|user)\/([a-zA-Z0-9]+)/i);
      return match ? match[1] : null;
    },
  },
  youtube: {
    name: 'YouTube',
    key: 'youtube',
    color: '#FF0000',
    patterns: [
      /^https?:\/\/(www\.)?youtube\.com\/@[a-zA-Z0-9_-]+\/?$/i,
      /^https?:\/\/(www\.)?youtube\.com\/channel\/[a-zA-Z0-9_-]+\/?$/i,
      /^https?:\/\/(www\.)?youtube\.com\/c\/[a-zA-Z0-9_-]+\/?$/i,
      /^https?:\/\/(www\.)?youtube\.com\/user\/[a-zA-Z0-9_-]+\/?$/i,
    ],
    loosePatterns: [/^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\/.+/i],
    placeholder: 'https://youtube.com/@channel',
    extractUsername: (url) => {
      // Handle @username format
      const atMatch = url.match(/youtube\.com\/@([a-zA-Z0-9_-]+)/i);
      if (atMatch) return atMatch[1];

      // Handle /channel/ID format
      const channelMatch = url.match(/youtube\.com\/channel\/([a-zA-Z0-9_-]+)/i);
      if (channelMatch) return channelMatch[1];

      // Handle /c/name format
      const cMatch = url.match(/youtube\.com\/c\/([a-zA-Z0-9_-]+)/i);
      if (cMatch) return cMatch[1];

      // Handle /user/name format
      const userMatch = url.match(/youtube\.com\/user\/([a-zA-Z0-9_-]+)/i);
      if (userMatch) return userMatch[1];

      return null;
    },
  },
};

// Ordered list of platforms for consistent display
export const SOCIAL_PLATFORM_ORDER = [
  'twitter',
  'instagram',
  'tiktok',
  'soundcloud',
  'spotify',
  'youtube',
];

/**
 * Validate a social URL for a specific platform
 * @param {string} platform - Platform key
 * @param {string} url - URL to validate
 * @param {object} options - Validation options
 * @param {boolean} options.strict - Use strict validation (default: false)
 * @returns {boolean}
 */
export function isValidSocialUrl(platform, url, options = {}) {
  // Empty is valid (social links are optional)
  if (!url || url.trim() === '') return true;

  const config = SOCIAL_PLATFORMS[platform];
  if (!config) return false;

  const { strict = false } = options;
  const patterns = strict ? config.patterns : config.loosePatterns;

  return patterns.some((pattern) => pattern.test(url.trim()));
}

/**
 * Validate all social links in an object
 * @param {object} socialLinks - Object with platform keys and URL values
 * @param {object} options - Validation options
 * @returns {{ valid: boolean, errors: object }}
 */
export function validateSocialLinks(socialLinks, options = {}) {
  if (!socialLinks || typeof socialLinks !== 'object') {
    return { valid: true, errors: {} };
  }

  const errors = {};
  let valid = true;

  for (const [platform, url] of Object.entries(socialLinks)) {
    if (url && !isValidSocialUrl(platform, url, options)) {
      errors[platform] = `Invalid ${SOCIAL_PLATFORMS[platform]?.name || platform} URL`;
      valid = false;
    }
  }

  return { valid, errors };
}

/**
 * Normalize a social URL (add https:// if missing, trim whitespace)
 * @param {string} platform - Platform key
 * @param {string} url - URL to normalize
 * @returns {string} - Normalized URL or empty string
 */
export function normalizeSocialUrl(platform, url) {
  if (!url || typeof url !== 'string') return '';

  let normalized = url.trim();

  // Return empty if only whitespace
  if (!normalized) return '';

  // Add https:// if no protocol
  if (!/^https?:\/\//i.test(normalized)) {
    normalized = `https://${normalized}`;
  }

  // Ensure consistent https (not http)
  normalized = normalized.replace(/^http:\/\//i, 'https://');

  // Remove trailing slash for consistency
  normalized = normalized.replace(/\/+$/, '');

  return normalized;
}

/**
 * Extract username from a social URL
 * @param {string} platform - Platform key
 * @param {string} url - URL to parse
 * @returns {string|null} - Username or null
 */
export function extractSocialUsername(platform, url) {
  if (!url) return null;

  const config = SOCIAL_PLATFORMS[platform];
  if (!config || !config.extractUsername) return null;

  return config.extractUsername(url);
}

/**
 * Get platform info by key
 * @param {string} platform - Platform key
 * @returns {{ name: string, color: string, placeholder: string }|null}
 */
export function getPlatformInfo(platform) {
  const config = SOCIAL_PLATFORMS[platform];
  if (!config) return null;

  return {
    name: config.name,
    color: config.color,
    placeholder: config.placeholder,
  };
}

/**
 * Check if any social links are present (non-empty)
 * @param {object} socialLinks - Object with platform keys and URL values
 * @returns {boolean}
 */
export function hasSocialLinks(socialLinks) {
  if (!socialLinks || typeof socialLinks !== 'object') return false;

  return Object.values(socialLinks).some((url) => url && url.trim() !== '');
}

/**
 * Filter social links to only include non-empty values
 * @param {object} socialLinks - Object with platform keys and URL values
 * @returns {object} - Filtered object with only non-empty URLs
 */
export function getActiveSocialLinks(socialLinks) {
  if (!socialLinks || typeof socialLinks !== 'object') return {};

  const active = {};
  for (const [platform, url] of Object.entries(socialLinks)) {
    if (url && url.trim() !== '') {
      active[platform] = url;
    }
  }

  return active;
}

/**
 * Create an empty social links object with all platforms
 * @returns {object}
 */
export function createEmptySocialLinks() {
  const empty = {};
  for (const platform of SOCIAL_PLATFORM_ORDER) {
    empty[platform] = '';
  }
  return empty;
}
