'use client';

import {
  detectMusicPlatform,
  getEmbedDimensions,
  getEmbedUrl,
  getPlatformInfo,
} from '@/utils/musicPlatforms';
import { useEffect, useMemo, useState } from 'react';

/**
 * ProfileMusicPlayer - Universal music player component for profile pages
 *
 * Supports: SoundCloud, Spotify, YouTube, Apple Music
 * Features:
 * - Auto-detects platform from URL
 * - Renders appropriate embed iframe
 * - Fallback button for unsupported/failed embeds
 * - Loading and error states
 * - Responsive dimensions
 *
 * @param {object} props
 * @param {string} props.url - Music URL (from profileSongUrl or profileMusic.url)
 * @param {object} props.profileMusic - Full profileMusic object with cached metadata
 * @param {string} props.className - Additional CSS classes
 * @param {boolean} props.compact - Use compact/mobile dimensions
 */
export default function ProfileMusicPlayer({ url, profileMusic, className = '', compact = false }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Determine the URL to use (profileMusic.url takes precedence over legacy url)
  const musicUrl = profileMusic?.url || url;

  // Detect platform
  const platform = useMemo(
    () => profileMusic?.platform || detectMusicPlatform(musicUrl),
    [musicUrl, profileMusic?.platform],
  );

  // Get platform info
  const platformInfo = useMemo(() => (platform ? getPlatformInfo(platform) : null), [platform]);

  // Generate embed URL
  const embedUrl = useMemo(() => {
    if (!platform || !musicUrl) return null;
    return getEmbedUrl(platform, musicUrl, {
      visual: !compact, // Use visual mode on desktop for SoundCloud
      color: 'ff1f42', // RAGESTATE red
    });
  }, [platform, musicUrl, compact]);

  // Get dimensions
  const dimensions = useMemo(
    () => (platform ? getEmbedDimensions(platform, compact) : null),
    [platform, compact],
  );

  // Reset loading state when URL changes, with timeout fallback
  useEffect(() => {
    setLoading(true);
    setError(false);

    // Fallback: if onLoad doesn't fire within 5 seconds, assume it loaded
    // (some cross-origin iframes don't fire onLoad reliably)
    const timeoutId = setTimeout(() => {
      setLoading(false);
    }, 5000);

    return () => clearTimeout(timeoutId);
  }, [musicUrl]);

  // Don't render if no URL
  if (!musicUrl) {
    return null;
  }

  // Unknown platform - show fallback link
  if (!platform || !platformInfo) {
    return (
      <div className={`flex flex-col items-center gap-2 ${className}`}>
        <p className="text-sm text-[var(--text-tertiary)]">Unsupported music platform</p>
        <a
          href={musicUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--bg-elev-2)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-elev-3)]"
        >
          <ExternalLinkIcon className="h-4 w-4" />
          Open Music Link
        </a>
      </div>
    );
  }

  // No embed URL available - show platform-specific fallback
  if (!embedUrl) {
    return <FallbackButton url={musicUrl} platformInfo={platformInfo} className={className} />;
  }

  // Platform-specific background colors for embeds with light backgrounds (like SoundCloud)
  const platformBgColor =
    {
      soundcloud: '#1a1a1a', // Dark bg for SoundCloud's white player
      spotify: '#121212', // Spotify's dark theme
      youtube: '#0f0f0f', // YouTube dark
      apple_music: '#1c1c1e', // Apple dark
    }[platform] || 'var(--bg-elev-2)';

  return (
    <div
      className={`relative overflow-hidden rounded-xl p-[2px] ${className}`}
      style={{
        minHeight: dimensions?.height,
        width: dimensions?.width,
        background: `linear-gradient(135deg, ${platformInfo.color}40, ${platformInfo.color}20, transparent)`,
        boxShadow: `0 0 20px ${platformInfo.color}15, 0 0 40px ${platformInfo.color}08`,
      }}
      role="region"
      aria-label={`${platformInfo.name} music player`}
      aria-busy={loading}
    >
      {/* Inner container with themed background */}
      <div
        className="relative h-full w-full overflow-hidden rounded-[10px]"
        style={{ backgroundColor: platformBgColor }}
      >
        {/* Loading state */}
        {loading && !error && (
          <div
            className="absolute inset-0 z-10 flex items-center justify-center"
            style={{ backgroundColor: platformBgColor }}
          >
            <div className="flex flex-col items-center gap-2">
              <LoadingSpinner color={platformInfo.color} />
              <span className="text-xs text-[var(--text-tertiary)]">
                Loading {platformInfo.name}...
              </span>
            </div>
          </div>
        )}

        {/* Error state - show fallback */}
        {error && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4"
            style={{ backgroundColor: platformBgColor }}
          >
            <p className="text-sm text-[var(--text-tertiary)]">
              Couldn&apos;t load {platformInfo.name} player
            </p>
            <FallbackButton url={musicUrl} platformInfo={platformInfo} />
          </div>
        )}

        {/* Embed iframe */}
        {!error && (
          <iframe
            src={embedUrl}
            title={`${platformInfo.name} player`}
            width={dimensions?.width}
            height={dimensions?.height}
            style={{
              border: 'none',
              borderRadius: '10px',
              opacity: loading ? 0 : 1,
              transition: 'opacity 0.2s ease-in-out',
            }}
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            onLoad={() => setLoading(false)}
            onError={() => {
              setLoading(false);
              setError(true);
            }}
          />
        )}
      </div>
    </div>
  );
}

/**
 * Fallback button when embed fails or isn't supported
 */
function FallbackButton({ url, platformInfo, className = '' }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-white transition-all hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--bg-elev-1)] ${className}`}
      style={{
        backgroundColor: platformInfo?.color || 'var(--bg-elev-2)',
        '--tw-ring-color': platformInfo?.color || '#ef4444',
      }}
      aria-label={`Open track in ${platformInfo?.name || 'Music App'}`}
    >
      <PlatformIcon platform={platformInfo?.name} className="h-5 w-5" />
      Open in {platformInfo?.name || 'Music App'}
      <ExternalLinkIcon className="h-4 w-4 opacity-70" />
    </a>
  );
}

/**
 * Platform-specific icon for fallback button
 */
function PlatformIcon({ platform, className = '' }) {
  switch (platform?.toLowerCase()) {
    case 'soundcloud':
      return (
        <svg fill="currentColor" viewBox="0 0 24 24" className={className}>
          <path d="M1.175 12.225c-.051 0-.094.046-.101.1l-.233 2.154.233 2.105c.007.058.05.098.101.098.05 0 .09-.04.099-.098l.255-2.105-.27-2.154c-.009-.06-.052-.1-.084-.1zm-.899 1.193c-.032 0-.058.035-.066.076l-.179 1.08.179 1.065c.008.039.034.072.066.072.03 0 .055-.033.065-.072l.211-1.065-.226-1.08c-.01-.041-.035-.076-.05-.076zm1.834-1.859c-.058 0-.103.05-.112.113l-.209 2.926.209 2.882c.009.063.054.111.112.111.054 0 .1-.048.11-.111l.239-2.882-.239-2.926c-.01-.063-.056-.113-.11-.113zm.936-.361c-.068 0-.12.058-.129.129l-.18 3.287.18 3.232c.009.07.061.126.129.126.066 0 .118-.056.127-.126l.204-3.232-.204-3.287c-.009-.071-.061-.129-.127-.129zm.955-.162c-.074 0-.131.063-.139.139l-.159 3.449.159 3.379c.008.076.065.137.139.137.073 0 .13-.061.14-.137l.179-3.379-.179-3.449c-.01-.076-.067-.139-.14-.139zm.987-.201c-.083 0-.148.071-.155.156l-.14 3.65.14 3.538c.007.084.072.152.155.152.081 0 .146-.068.154-.152l.159-3.538-.159-3.65c-.008-.085-.073-.156-.154-.156zm1.007-.168c-.09 0-.161.078-.167.17l-.12 3.818.12 3.686c.006.091.077.166.167.166.089 0 .16-.075.168-.166l.135-3.686-.135-3.818c-.008-.092-.079-.17-.168-.17zm1.031.028c-.097 0-.175.086-.18.183l-.1 3.807.1 3.688c.005.097.083.18.18.18.095 0 .173-.083.18-.18l.113-3.688-.113-3.807c-.007-.097-.085-.183-.18-.183zm1.061.048c-.104 0-.186.092-.19.199l-.08 3.759.08 3.667c.004.106.086.195.19.195.103 0 .185-.089.191-.195l.09-3.667-.09-3.759c-.006-.107-.088-.199-.191-.199zm1.09.104c-.112 0-.2.101-.204.215l-.06 3.655.06 3.586c.004.113.092.211.204.211.11 0 .199-.098.205-.211l.068-3.586-.068-3.655c-.006-.114-.095-.215-.205-.215zm1.127.141c-.119 0-.213.109-.216.232l-.04 3.514.04 3.471c.003.121.097.229.216.229.117 0 .211-.108.216-.229l.046-3.471-.046-3.514c-.005-.123-.099-.232-.216-.232zm1.165.218c-.125 0-.226.118-.227.247l-.021 3.296.021 3.279c.001.129.102.244.227.244.124 0 .224-.115.227-.244l.024-3.279-.024-3.296c-.003-.129-.103-.247-.227-.247zm1.201.346c-.133 0-.24.127-.24.262v.01l-.004 2.950.004 2.958v.007c0 .135.107.258.24.258.131 0 .238-.123.24-.265l.006-2.958-.006-2.950c-.002-.135-.109-.262-.24-.272zm1.236.466c-.14 0-.252.135-.252.279l.005 2.479-.005 2.506c0 .143.112.275.252.275.139 0 .25-.132.252-.275l.008-2.506-.008-2.479c-.002-.144-.113-.279-.252-.279zm5.5-.876c-.353 0-.691.06-1.008.169-.14-1.63-1.5-2.91-3.165-2.91-.461 0-.901.102-1.299.282-.148.068-.188.137-.19.272v5.735c.002.139.109.252.248.257h5.414c.985 0 1.786-.801 1.786-1.786 0-.986-.801-2.019-1.786-2.019z" />
        </svg>
      );
    case 'spotify':
      return (
        <svg fill="currentColor" viewBox="0 0 24 24" className={className}>
          <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
        </svg>
      );
    case 'youtube':
      return (
        <svg fill="currentColor" viewBox="0 0 24 24" className={className}>
          <path
            fillRule="evenodd"
            d="M19.812 5.418c.861.23 1.538.907 1.768 1.768C21.998 8.746 22 12 22 12s0 3.255-.418 4.814a2.504 2.504 0 0 1-1.768 1.768c-1.56.419-7.814.419-7.814.419s-6.255 0-7.814-.419a2.505 2.505 0 0 1-1.768-1.768C2 15.255 2 12 2 12s0-3.255.417-4.814a2.507 2.507 0 0 1 1.768-1.768C5.744 5 11.998 5 11.998 5s6.255 0 7.814.418ZM15.194 12 10 15V9l5.194 3Z"
            clipRule="evenodd"
          />
        </svg>
      );
    case 'apple music':
      return (
        <svg fill="currentColor" viewBox="0 0 24 24" className={className}>
          <path d="M23.994 6.124a9.23 9.23 0 00-.24-2.19c-.317-1.31-1.062-2.31-2.18-3.043a5.022 5.022 0 00-1.877-.726 10.496 10.496 0 00-1.564-.15c-.04-.003-.083-.01-.124-.013H5.986c-.152.01-.303.017-.455.026-.747.043-1.49.123-2.193.401-1.336.53-2.3 1.452-2.865 2.78-.192.448-.292.925-.363 1.408-.056.392-.088.785-.1 1.18 0 .032-.007.062-.01.093v12.223c.01.14.017.283.027.424.05.815.154 1.624.497 2.373.65 1.42 1.738 2.353 3.234 2.801.42.127.856.187 1.293.228.555.053 1.11.06 1.667.06h11.03a12.5 12.5 0 001.57-.1c.822-.106 1.596-.35 2.295-.81a5.046 5.046 0 001.88-2.207c.186-.42.293-.87.37-1.324.113-.675.138-1.358.137-2.04-.002-3.8 0-7.595-.003-11.393zm-6.423 3.99v5.712c0 .417-.058.827-.244 1.206-.29.59-.763.962-1.388 1.14-.35.1-.706.157-1.07.173-.95.042-1.785-.455-2.105-1.245-.38-.94.093-2.085 1.012-2.527.238-.114.492-.193.75-.254.5-.12 1.014-.178 1.512-.3.404-.1.663-.398.727-.814.02-.13.03-.263.03-.394V7.163c0-.28-.08-.47-.32-.57-.24-.1-.47-.07-.72 0l-4.75 1.17c-.08.02-.16.04-.23.07-.27.1-.39.3-.4.57v.05c-.01.56 0 1.12 0 1.68v5.49c0 .42-.05.85-.24 1.24-.29.59-.75.96-1.38 1.14-.35.1-.71.16-1.07.17-.95.05-1.79-.45-2.11-1.24-.38-.94.1-2.09 1.01-2.53.24-.11.49-.19.75-.25.51-.12 1.02-.18 1.52-.3.42-.1.67-.42.73-.85.01-.1.02-.19.02-.29V6.16c0-.18.02-.36.06-.53.11-.46.4-.77.86-.9l6.01-1.53c.3-.08.62-.14.94-.12.5.03.9.34.97.87.02.13.02.27.02.4v5.8h-.01z" />
        </svg>
      );
    default:
      return (
        <svg fill="currentColor" viewBox="0 0 24 24" className={className}>
          <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
        </svg>
      );
  }
}

/**
 * Simple loading spinner with optional color
 */
function LoadingSpinner({ color = '#ef4444' }) {
  return (
    <svg
      className="h-6 w-6 animate-spin"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      style={{ color }}
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

/**
 * External link icon
 */
function ExternalLinkIcon({ className = '' }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className}
    >
      <path
        fillRule="evenodd"
        d="M4.25 5.5a.75.75 0 00-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 00.75-.75v-4a.75.75 0 011.5 0v4A2.25 2.25 0 0112.75 17h-8.5A2.25 2.25 0 012 14.75v-8.5A2.25 2.25 0 014.25 4h5a.75.75 0 010 1.5h-5z"
        clipRule="evenodd"
      />
      <path
        fillRule="evenodd"
        d="M6.194 12.753a.75.75 0 001.06.053L16.5 4.44v2.81a.75.75 0 001.5 0v-4.5a.75.75 0 00-.75-.75h-4.5a.75.75 0 000 1.5h2.553l-9.056 8.194a.75.75 0 00-.053 1.06z"
        clipRule="evenodd"
      />
    </svg>
  );
}

/**
 * Skeleton loader for ProfileMusicPlayer
 *
 * @param {object} props
 * @param {boolean} props.compact - Use compact dimensions
 */
export function ProfileMusicPlayerSkeleton({ compact = false }) {
  const height = compact ? '166px' : '300px';

  return (
    <div
      className="animate-pulse rounded-xl bg-[var(--bg-elev-2)]"
      style={{ width: '100%', height }}
    />
  );
}
