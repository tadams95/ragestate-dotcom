/**
 * API Route: Fetch Open Graph metadata for URLs
 * Server-side to avoid CORS issues
 */

import { NextResponse } from 'next/server';

// Rate limiting: simple in-memory store (resets on server restart)
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 30; // requests per minute per IP

// URL allowlist patterns (prevent SSRF)
const BLOCKED_HOSTS = [
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '10.',
  '172.16.',
  '172.17.',
  '172.18.',
  '172.19.',
  '172.20.',
  '172.21.',
  '172.22.',
  '172.23.',
  '172.24.',
  '172.25.',
  '172.26.',
  '172.27.',
  '172.28.',
  '172.29.',
  '172.30.',
  '172.31.',
  '192.168.',
  '169.254.',
];

/**
 * Check rate limit
 * @param {string} ip
 * @returns {boolean} True if allowed
 */
function checkRateLimit(ip) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW) {
    rateLimitMap.set(ip, { windowStart: now, count: 1 });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return false;
  }

  entry.count++;
  return true;
}

/**
 * Validate URL is safe to fetch
 * @param {string} url
 * @returns {boolean}
 */
function isUrlSafe(url) {
  try {
    const parsed = new URL(url);

    // Must be http or https
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return false;
    }

    // Check for blocked hosts
    const hostname = parsed.hostname.toLowerCase();
    if (BLOCKED_HOSTS.some((blocked) => hostname.startsWith(blocked) || hostname === blocked)) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Extract OG metadata from HTML
 * @param {string} html
 * @param {string} url
 * @returns {Object}
 */
function extractMetadata(html, url) {
  const result = {
    url,
    title: null,
    description: null,
    image: null,
    siteName: null,
    favicon: null,
  };

  // Helper to extract meta content
  const getMeta = (property) => {
    // Try og: prefix
    const ogMatch = html.match(
      new RegExp(`<meta[^>]*property=["']og:${property}["'][^>]*content=["']([^"']+)["']`, 'i')
    );
    if (ogMatch) return ogMatch[1];

    // Try content before property
    const ogMatch2 = html.match(
      new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:${property}["']`, 'i')
    );
    if (ogMatch2) return ogMatch2[1];

    // Try twitter: prefix
    const twitterMatch = html.match(
      new RegExp(`<meta[^>]*name=["']twitter:${property}["'][^>]*content=["']([^"']+)["']`, 'i')
    );
    if (twitterMatch) return twitterMatch[1];

    // Try content before name
    const twitterMatch2 = html.match(
      new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*name=["']twitter:${property}["']`, 'i')
    );
    if (twitterMatch2) return twitterMatch2[1];

    return null;
  };

  // Try standard meta description
  const getDescription = () => {
    const match = html.match(
      /<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i
    );
    if (match) return match[1];

    const match2 = html.match(
      /<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i
    );
    if (match2) return match2[1];

    return null;
  };

  // Extract title
  result.title = getMeta('title');
  if (!result.title) {
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) result.title = titleMatch[1].trim();
  }

  // Extract description
  result.description = getMeta('description') || getDescription();

  // Extract image
  result.image = getMeta('image');
  if (result.image && !result.image.startsWith('http')) {
    // Make relative URL absolute
    try {
      const baseUrl = new URL(url);
      result.image = new URL(result.image, baseUrl.origin).href;
    } catch {
      result.image = null;
    }
  }

  // Extract site name
  result.siteName = getMeta('site_name');
  if (!result.siteName) {
    try {
      result.siteName = new URL(url).hostname.replace('www.', '');
    } catch {}
  }

  // Extract favicon
  const faviconMatch = html.match(/<link[^>]*rel=["'](?:shortcut )?icon["'][^>]*href=["']([^"']+)["']/i);
  if (faviconMatch) {
    let favicon = faviconMatch[1];
    if (!favicon.startsWith('http')) {
      try {
        const baseUrl = new URL(url);
        favicon = new URL(favicon, baseUrl.origin).href;
      } catch {
        favicon = null;
      }
    }
    result.favicon = favicon;
  }
  if (!result.favicon) {
    try {
      const baseUrl = new URL(url);
      result.favicon = `${baseUrl.origin}/favicon.ico`;
    } catch {}
  }

  // Decode HTML entities in text fields
  const decodeEntities = (str) => {
    if (!str) return str;
    return str
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&#x27;/g, "'")
      .replace(/&#x2F;/g, '/');
  };

  result.title = decodeEntities(result.title);
  result.description = decodeEntities(result.description);

  // Truncate description if too long
  if (result.description && result.description.length > 300) {
    result.description = result.description.slice(0, 297) + '...';
  }

  return result;
}

export async function POST(request) {
  try {
    // Get client IP for rate limiting
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0] ||
      request.headers.get('x-real-ip') ||
      'unknown';

    // Rate limit check
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { url } = body;

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Validate URL
    if (!isUrlSafe(url)) {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }

    // Fetch the URL with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; RAGESTATEBot/1.0)',
        Accept: 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch URL' }, { status: 502 });
    }

    // Only process HTML
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) {
      return NextResponse.json({ error: 'Not an HTML page' }, { status: 400 });
    }

    // Get HTML content (limit to first 50KB to avoid memory issues)
    const text = await response.text();
    const html = text.slice(0, 50000);

    // Extract metadata
    const metadata = extractMetadata(html, url);

    // Must have at least a title
    if (!metadata.title) {
      return NextResponse.json({ error: 'No metadata found' }, { status: 404 });
    }

    return NextResponse.json(metadata);
  } catch (error) {
    console.error('OG metadata fetch error:', error);

    if (error.name === 'AbortError') {
      return NextResponse.json({ error: 'Request timed out' }, { status: 504 });
    }

    return NextResponse.json({ error: 'Failed to fetch metadata' }, { status: 500 });
  }
}
