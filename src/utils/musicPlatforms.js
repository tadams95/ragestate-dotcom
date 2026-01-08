/**
 * Music Platform Detection & Embed Utilities
 *
 * Supports: SoundCloud, Spotify, YouTube, Apple Music
 * Used for profile music player feature.
 */

// Platform configuration with detection patterns, oEmbed endpoints, and embed URL generators
export const PLATFORMS = {
  soundcloud: {
    name: 'SoundCloud',
    color: '#FF5500',
    patterns: [/soundcloud\.com/, /snd\.sc/, /on\.soundcloud\.com/],
    oEmbed: 'https://soundcloud.com/oembed',
    supportsEmbed: true,
  },
  spotify: {
    name: 'Spotify',
    color: '#1DB954',
    patterns: [/open\.spotify\.com/, /spotify\.link/],
    oEmbed: 'https://open.spotify.com/oembed',
    supportsEmbed: true,
  },
  youtube: {
    name: 'YouTube',
    color: '#FF0000',
    patterns: [/youtube\.com/, /youtu\.be/, /music\.youtube\.com/],
    oEmbed: 'https://www.youtube.com/oembed',
    supportsEmbed: true,
  },
  apple_music: {
    name: 'Apple Music',
    color: '#FC3C44',
    patterns: [/music\.apple\.com/],
    oEmbed: null, // Apple Music requires API, no public oEmbed
    supportsEmbed: true,
  },
};

/**
 * Detect music platform from URL
 * @param {string} url - The music URL to analyze
 * @returns {string|null} - Platform key (soundcloud, spotify, youtube, apple_music) or null
 */
export function detectMusicPlatform(url) {
  if (!url || typeof url !== 'string') return null;

  const normalizedUrl = url.toLowerCase().trim();

  for (const [platformKey, config] of Object.entries(PLATFORMS)) {
    if (config.patterns.some((pattern) => pattern.test(normalizedUrl))) {
      return platformKey;
    }
  }

  return null;
}

/**
 * Check if a URL is a valid music platform URL
 * @param {string} url - The URL to validate
 * @returns {boolean}
 */
export function isValidMusicUrl(url) {
  return detectMusicPlatform(url) !== null;
}

/**
 * Extract YouTube video ID from various URL formats
 * @param {string} url - YouTube URL
 * @returns {string|null} - Video ID or null
 */
export function extractYouTubeId(url) {
  if (!url) return null;

  // Handle youtu.be short URLs
  const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (shortMatch) return shortMatch[1];

  // Handle youtube.com/watch?v= URLs
  const watchMatch = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (watchMatch) return watchMatch[1];

  // Handle youtube.com/embed/ URLs
  const embedMatch = url.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
  if (embedMatch) return embedMatch[1];

  // Handle youtube.com/shorts/ URLs
  const shortsMatch = url.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/);
  if (shortsMatch) return shortsMatch[1];

  // Handle music.youtube.com URLs
  const musicMatch = url.match(/music\.youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/);
  if (musicMatch) return musicMatch[1];

  return null;
}

/**
 * Extract Spotify track/album/artist ID from URL
 * @param {string} url - Spotify URL
 * @returns {{ type: string, id: string }|null}
 */
export function extractSpotifyId(url) {
  if (!url) return null;

  // Match patterns like /track/ID, /album/ID, /artist/ID, /playlist/ID
  const match = url.match(/open\.spotify\.com\/(track|album|artist|playlist)\/([a-zA-Z0-9]+)/);
  if (match) {
    return { type: match[1], id: match[2] };
  }

  return null;
}

/**
 * Generate embed URL for a given platform and source URL
 * @param {string} platform - Platform key
 * @param {string} url - Original music URL
 * @param {object} options - Embed options
 * @param {boolean} options.visual - Use visual mode (SoundCloud)
 * @param {string} options.color - Accent color (hex without #)
 * @returns {string|null} - Embed URL or null if unsupported
 */
export function getEmbedUrl(platform, url, options = {}) {
  if (!platform || !url) return null;

  const { visual = false, color = 'ff1f42' } = options;

  switch (platform) {
    case 'soundcloud': {
      const encoded = encodeURIComponent(url.startsWith('http') ? url : `https://${url}`);
      const visualParam = visual ? '&visual=true' : '&visual=false';
      return `https://w.soundcloud.com/player/?url=${encoded}&color=%23${color}&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false${visualParam}`;
    }

    case 'spotify': {
      // Convert https://open.spotify.com/track/XXX to https://open.spotify.com/embed/track/XXX
      const spotifyInfo = extractSpotifyId(url);
      if (spotifyInfo) {
        return `https://open.spotify.com/embed/${spotifyInfo.type}/${spotifyInfo.id}?utm_source=generator&theme=0`;
      }
      // Fallback: try simple replacement
      return url.replace('open.spotify.com/', 'open.spotify.com/embed/');
    }

    case 'youtube': {
      const videoId = extractYouTubeId(url);
      if (videoId) {
        return `https://www.youtube-nocookie.com/embed/${videoId}`;
      }
      return null;
    }

    case 'apple_music': {
      // Convert music.apple.com to embed.music.apple.com
      if (url.includes('music.apple.com')) {
        return url.replace('music.apple.com', 'embed.music.apple.com');
      }
      return null;
    }

    default:
      return null;
  }
}

/**
 * Fetch metadata from oEmbed endpoint
 * @param {string} url - Music URL
 * @returns {Promise<{ title: string, artist: string, artworkUrl: string, platform: string }|null>}
 */
export async function fetchMusicMetadata(url) {
  const platform = detectMusicPlatform(url);
  if (!platform) return null;

  const config = PLATFORMS[platform];
  if (!config.oEmbed) {
    // Platform doesn't support oEmbed, return basic info
    return {
      title: null,
      artist: null,
      artworkUrl: null,
      platform,
    };
  }

  try {
    const oEmbedUrl = `${config.oEmbed}?url=${encodeURIComponent(url)}&format=json`;
    const response = await fetch(oEmbedUrl);

    if (!response.ok) {
      console.warn(`oEmbed fetch failed for ${platform}:`, response.status);
      return { title: null, artist: null, artworkUrl: null, platform };
    }

    const data = await response.json();

    // Normalize response across platforms
    return {
      title: data.title || null,
      artist: data.author_name || data.provider_name || null,
      artworkUrl: data.thumbnail_url || null,
      platform,
      // Include raw data for platform-specific needs
      raw: data,
    };
  } catch (error) {
    console.error(`Failed to fetch oEmbed for ${url}:`, error);
    return { title: null, artist: null, artworkUrl: null, platform };
  }
}

/**
 * Get platform display info
 * @param {string} platform - Platform key
 * @returns {{ name: string, color: string, supportsEmbed: boolean }|null}
 */
export function getPlatformInfo(platform) {
  const config = PLATFORMS[platform];
  if (!config) return null;

  return {
    name: config.name,
    color: config.color,
    supportsEmbed: config.supportsEmbed,
  };
}

/**
 * Get recommended embed dimensions for a platform
 * @param {string} platform - Platform key
 * @param {boolean} isMobile - Whether to return mobile dimensions
 * @returns {{ width: string, height: string }}
 */
export function getEmbedDimensions(platform, isMobile = false) {
  const dimensions = {
    soundcloud: {
      mobile: { width: '100%', height: '166px' },
      desktop: { width: '100%', height: '300px' },
    },
    spotify: {
      mobile: { width: '100%', height: '152px' },
      desktop: { width: '100%', height: '352px' },
    },
    youtube: {
      mobile: { width: '100%', height: '200px' },
      desktop: { width: '100%', height: '315px' },
    },
    apple_music: {
      mobile: { width: '100%', height: '150px' },
      desktop: { width: '100%', height: '175px' },
    },
  };

  const platformDims = dimensions[platform];
  if (!platformDims) {
    return { width: '100%', height: '200px' };
  }

  return isMobile ? platformDims.mobile : platformDims.desktop;
}
