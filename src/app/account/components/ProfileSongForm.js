'use client';

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../../../firebase/context/FirebaseContext';
import { db } from '../../../../firebase/firebase';
import {
  detectMusicPlatform,
  fetchMusicMetadata,
  getPlatformInfo,
  isValidMusicUrl,
} from '../../../utils/musicPlatforms';
import ProfileMusicPlayer from '../../components/ProfileMusicPlayer';

// Supported platforms for display
const SUPPORTED_PLATFORMS = ['soundcloud', 'spotify', 'youtube', 'apple_music'];

export default function ProfileSongForm({ inputStyling, buttonStyling, cardStyling }) {
  const { currentUser } = useAuth();
  const [saving, setSaving] = useState(false);
  const [fetchingMetadata, setFetchingMetadata] = useState(false);
  const [initialUrl, setInitialUrl] = useState('');
  const [initialProfileMusic, setInitialProfileMusic] = useState(null);
  const [url, setUrl] = useState('');
  const [metadata, setMetadata] = useState(null);
  const [validationError, setValidationError] = useState('');

  // Detect platform from current URL
  const detectedPlatform = useMemo(() => detectMusicPlatform(url), [url]);
  const platformInfo = useMemo(
    () => (detectedPlatform ? getPlatformInfo(detectedPlatform) : null),
    [detectedPlatform],
  );

  // Load existing profile song on mount
  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!currentUser) return;
      try {
        const snap = await getDoc(doc(db, 'profiles', currentUser.uid));
        const data = snap.exists() ? snap.data() : {};
        // Prefer profileMusic.url, fall back to legacy profileSongUrl
        const existingMusic = data.profileMusic || null;
        const existingUrl = existingMusic?.url || data.profileSongUrl || '';
        if (!cancelled) {
          setInitialProfileMusic(existingMusic);
          setInitialUrl(existingUrl);
          setUrl(existingUrl);
          if (existingMusic) {
            setMetadata({
              title: existingMusic.title,
              artist: existingMusic.artist,
              artworkUrl: existingMusic.artworkUrl,
              platform: existingMusic.platform,
            });
          }
        }
      } catch (e) {
        // ignore
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [currentUser]);

  // Validate URL and fetch metadata when URL changes (debounced)
  useEffect(() => {
    const trimmedUrl = url.trim();

    // Clear validation if empty
    if (!trimmedUrl) {
      setValidationError('');
      setMetadata(null);
      return;
    }

    // Validate URL
    const normalizedUrl = trimmedUrl.startsWith('http') ? trimmedUrl : `https://${trimmedUrl}`;
    if (!isValidMusicUrl(normalizedUrl)) {
      setValidationError('Please enter a valid SoundCloud, Spotify, YouTube, or Apple Music URL');
      setMetadata(null);
      return;
    }

    setValidationError('');

    // Debounce metadata fetch
    const timeoutId = setTimeout(async () => {
      setFetchingMetadata(true);
      try {
        const fetchedMetadata = await fetchMusicMetadata(normalizedUrl);
        setMetadata(fetchedMetadata);
      } catch (e) {
        console.error('Failed to fetch metadata:', e);
        // Still allow saving even if metadata fetch fails
        setMetadata({ platform: detectMusicPlatform(normalizedUrl) });
      } finally {
        setFetchingMetadata(false);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [url]);

  // Determine if save is allowed
  const canSave = useMemo(() => {
    if (saving || fetchingMetadata || !currentUser) return false;
    const trimmedUrl = url.trim();
    // Allow clearing
    if (!trimmedUrl && initialUrl) return true;
    // Must be valid and different from initial
    const normalizedUrl = trimmedUrl.startsWith('http') ? trimmedUrl : `https://${trimmedUrl}`;
    return isValidMusicUrl(normalizedUrl) && trimmedUrl !== initialUrl && !validationError;
  }, [saving, fetchingMetadata, currentUser, url, initialUrl, validationError]);

  // Save handler
  const onSave = useCallback(
    async (e) => {
      e?.preventDefault?.();
      if (!currentUser || !canSave) return;

      setSaving(true);
      try {
        const trimmedUrl = url.trim();
        const normalized = trimmedUrl
          ? trimmedUrl.startsWith('http')
            ? trimmedUrl
            : `https://${trimmedUrl}`
          : '';

        // Build profileMusic object with metadata
        const profileMusic = normalized
          ? {
              platform: metadata?.platform || detectMusicPlatform(normalized),
              url: normalized,
              title: metadata?.title || null,
              artist: metadata?.artist || null,
              artworkUrl: metadata?.artworkUrl || null,
              cachedAt: new Date().toISOString(),
            }
          : null;

        // Save both profileSongUrl (legacy) and profileMusic (new)
        await setDoc(
          doc(db, 'profiles', currentUser.uid),
          {
            profileSongUrl: normalized || null,
            profileMusic: profileMusic,
          },
          { merge: true },
        );

        setInitialUrl(normalized);
        setInitialProfileMusic(profileMusic);
        toast.success(normalized ? 'Profile song saved' : 'Profile song cleared');
      } catch (e) {
        toast.error(e?.message || 'Failed to save');
      } finally {
        setSaving(false);
      }
    },
    [currentUser, canSave, url, metadata],
  );

  // Clear handler
  const onClear = useCallback(async () => {
    if (!currentUser) return;
    if (!initialUrl && !url.trim()) return;

    setUrl('');
    setMetadata(null);
    setValidationError('');

    try {
      await setDoc(
        doc(db, 'profiles', currentUser.uid),
        {
          profileSongUrl: null,
          profileMusic: null,
        },
        { merge: true },
      );
      setInitialUrl('');
      setInitialProfileMusic(null);
      toast.success('Profile song cleared');
    } catch (e) {
      toast.error(e?.message || 'Failed to clear');
    }
  }, [currentUser, initialUrl, url]);

  // Preview URL (use current input if valid, otherwise show saved)
  const previewUrl = useMemo(() => {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) return '';
    const normalized = trimmedUrl.startsWith('http') ? trimmedUrl : `https://${trimmedUrl}`;
    return isValidMusicUrl(normalized) ? normalized : '';
  }, [url]);

  if (!currentUser) return null;

  return (
    <div className={cardStyling}>
      <h3 className="mb-4 text-xl font-medium text-[var(--text-primary)]">Profile Song</h3>
      <p className="mb-3 text-sm text-[var(--text-secondary)]">
        Add a song to your profile from SoundCloud, Spotify, YouTube, or Apple Music.
      </p>

      {/* Supported platforms indicator */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {SUPPORTED_PLATFORMS.map((platformKey) => {
          const info = getPlatformInfo(platformKey);
          const isActive = detectedPlatform === platformKey;
          return (
            <span
              key={platformKey}
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-all ${
                isActive
                  ? 'ring-2 ring-offset-1 ring-offset-[var(--bg-elev-1)]'
                  : 'bg-[var(--bg-elev-2)] text-[var(--text-tertiary)]'
              }`}
              style={
                isActive
                  ? {
                      backgroundColor: info?.color + '20',
                      color: info?.color,
                      ringColor: info?.color,
                    }
                  : {}
              }
            >
              <PlatformIcon platform={platformKey} className="h-3.5 w-3.5" />
              {info?.name}
            </span>
          );
        })}
      </div>

      <form onSubmit={onSave} className="space-y-3">
        <div className="relative">
          <input
            type="url"
            inputMode="url"
            placeholder="https://open.spotify.com/track/... or any music URL"
            className={`${inputStyling} ${validationError ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          {fetchingMetadata && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <LoadingSpinner className="h-4 w-4" />
            </div>
          )}
        </div>

        {/* Validation error */}
        {validationError && <p className="text-sm text-red-500">{validationError}</p>}

        {/* Detected metadata preview */}
        {metadata && !validationError && url.trim() && (
          <div className="flex items-center gap-3 rounded-lg bg-[var(--bg-elev-2)] p-3">
            {metadata.artworkUrl && (
              <img
                src={metadata.artworkUrl}
                alt="Track artwork"
                className="h-12 w-12 rounded object-cover"
              />
            )}
            <div className="min-w-0 flex-1">
              {metadata.title && (
                <p className="truncate text-sm font-medium text-[var(--text-primary)]">
                  {metadata.title}
                </p>
              )}
              {metadata.artist && (
                <p className="truncate text-xs text-[var(--text-secondary)]">{metadata.artist}</p>
              )}
              {platformInfo && (
                <p className="mt-0.5 text-xs" style={{ color: platformInfo.color }}>
                  {platformInfo.name}
                </p>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 pt-1">
          <button type="submit" disabled={!canSave} className={buttonStyling}>
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button
            type="button"
            onClick={onClear}
            disabled={!initialUrl && !url.trim()}
            className="rounded-md border border-[var(--border-subtle)] px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-elev-2)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Clear
          </button>
        </div>
      </form>

      {/* Live preview player */}
      {previewUrl && !validationError && (
        <div className="mt-4">
          <p className="mb-2 text-xs font-medium text-[var(--text-tertiary)]">Preview</p>
          <ProfileMusicPlayer url={previewUrl} compact />
        </div>
      )}
    </div>
  );
}

// Loading spinner component
function LoadingSpinner({ className = '' }) {
  return (
    <svg
      className={`animate-spin text-[var(--text-tertiary)] ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
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

// Platform icon component
function PlatformIcon({ platform, className = '' }) {
  switch (platform) {
    case 'soundcloud':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M1.175 12.225c-.051 0-.094.046-.101.1l-.233 2.154.233 2.105c.007.058.05.098.101.098.05 0 .09-.04.099-.098l.255-2.105-.27-2.154c0-.057-.045-.1-.09-.1m-.899.828c-.06 0-.091.037-.104.094L0 14.479l.165 1.308c0 .055.045.094.09.094s.089-.045.104-.104l.21-1.319-.21-1.334c0-.06-.044-.09-.09-.09m1.83-1.229c-.061 0-.12.045-.12.104l-.21 2.563.225 2.458c0 .06.045.12.119.12.061 0 .105-.061.121-.12l.254-2.474-.254-2.548c-.016-.06-.061-.12-.121-.12m.945-.089c-.075 0-.135.06-.15.135l-.193 2.64.21 2.544c.016.077.075.138.149.138.075 0 .135-.061.15-.15l.24-2.532-.24-2.623c0-.075-.06-.135-.135-.15m1.004.384c-.09 0-.15.075-.15.165l-.18 2.13.18 2.505c0 .09.06.166.15.166.078 0 .149-.076.149-.166l.21-2.505-.21-2.115c-.015-.105-.06-.18-.149-.18m1.079-.63c-.104 0-.18.09-.18.181l-.18 2.76.165 2.52c0 .104.09.18.18.18s.165-.09.18-.18l.195-2.52-.18-2.775c0-.09-.075-.18-.18-.165m1.095-.194c-.104 0-.194.09-.194.194l-.165 2.94.165 2.535c0 .104.09.194.194.194.09 0 .18-.09.195-.21l.18-2.535-.18-2.94c0-.09-.09-.18-.195-.18m1.305-.12c-.121 0-.21.09-.225.21l-.15 3.06.15 2.52c0 .12.089.225.21.225.12 0 .21-.105.225-.225l.165-2.52-.15-3.06c0-.12-.105-.21-.225-.21m.96-.405c-.134 0-.225.105-.225.24l-.15 3.449.165 2.504c0 .135.09.24.225.24.119 0 .225-.105.225-.24l.15-2.504-.15-3.449c0-.135-.105-.24-.24-.24m1.065-.525c-.134 0-.239.12-.239.255l-.15 3.959.15 2.504c0 .136.105.256.239.256.136 0 .255-.12.255-.256l.135-2.504-.135-3.959c-.015-.136-.12-.255-.255-.255m1.185-.15c-.15 0-.27.12-.27.271l-.12 4.08.135 2.489c0 .15.12.27.27.27.136 0 .255-.12.255-.27l.15-2.489-.15-4.095c-.015-.15-.12-.255-.27-.255m1.125-.18c-.165 0-.285.135-.285.284l-.12 4.26.135 2.474c0 .165.12.3.285.3.15 0 .284-.135.284-.3l.135-2.474-.12-4.26c0-.165-.135-.3-.3-.3m1.2-.15c-.165 0-.3.135-.3.3l-.12 4.409.135 2.46c0 .164.135.3.3.3.164 0 .3-.136.3-.3l.12-2.46-.12-4.41c0-.164-.136-.3-.3-.3m1.23-.09c-.18 0-.315.15-.315.315l-.105 4.5.12 2.444c0 .18.135.315.315.315.165 0 .314-.135.314-.315l.12-2.444-.12-4.5c0-.165-.15-.315-.33-.315m1.275-.045c-.194 0-.33.15-.345.33l-.105 4.545.12 2.445c0 .195.15.345.345.345.18 0 .33-.15.33-.345l.12-2.445-.12-4.545c0-.195-.135-.33-.33-.33m1.29.015c-.194 0-.345.164-.345.359v.015l-.09 4.515.105 2.43c0 .194.15.344.344.344.195 0 .345-.15.345-.359l.12-2.415-.12-4.53c0-.195-.15-.36-.359-.36m1.35.165c-.21 0-.375.165-.375.375v.015l-.09 4.35.105 2.415c0 .21.165.375.375.375.195 0 .375-.165.375-.375l.09-2.415-.09-4.365c0-.21-.165-.375-.375-.375m1.335-.24c-.21 0-.39.18-.39.39l-.075 4.59.09 2.4c0 .21.18.39.39.39.195 0 .375-.18.39-.39l.09-2.4-.09-4.59c0-.21-.18-.39-.39-.39m2.16.66c-.12-.075-.255-.105-.39-.105-.195 0-.375.06-.525.165-.225.165-.375.42-.375.72l-.015 3.555.03 2.37c0 .33.165.63.42.795.12.075.27.12.42.12l6.21-.015c.87 0 1.575-.705 1.575-1.575v-.015c0-.87-.705-1.575-1.575-1.575-.315 0-.6.09-.855.255-.165-.795-.69-1.44-1.38-1.755-.315-.15-.66-.225-1.02-.225-.45 0-.87.12-1.245.315-.15.075-.255.03-.255-.12V8.834c0-.405-.255-.75-.63-.885m-14.505 4.56l-.105 2.535.105 2.49c0 .075.06.135.135.135.075 0 .12-.06.135-.135l.12-2.49-.12-2.535c-.015-.075-.06-.135-.135-.135-.075 0-.135.06-.135.135" />
        </svg>
      );
    case 'spotify':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
        </svg>
      );
    case 'youtube':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
      );
    case 'apple_music':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M23.994 6.124a9.23 9.23 0 0 0-.24-2.19c-.317-1.31-1.062-2.31-2.18-3.043a5.022 5.022 0 0 0-1.877-.726 10.496 10.496 0 0 0-1.564-.15c-.04-.003-.083-.01-.124-.013H5.986c-.152.01-.303.017-.455.026-.747.043-1.49.123-2.193.364-1.137.39-2.006 1.077-2.604 2.1a5.31 5.31 0 0 0-.618 1.785 9.843 9.843 0 0 0-.123 1.47c-.003.04-.01.082-.013.124v11.978c.01.152.017.304.026.455.043.747.123 1.49.364 2.193.39 1.137 1.077 2.006 2.1 2.605a5.31 5.31 0 0 0 1.785.618c.49.072.985.11 1.48.13.16.007.32.01.48.01h11.987c.152-.01.304-.017.456-.026.747-.043 1.49-.124 2.193-.364 1.137-.39 2.006-1.078 2.604-2.1a5.31 5.31 0 0 0 .618-1.785c.072-.49.11-.985.13-1.48.007-.16.01-.32.01-.48V6.124zm-8.146 7.988a3.96 3.96 0 0 1-2.633 1.314 2.48 2.48 0 0 1-.293.018c-.553 0-.992-.138-1.32-.414-.472-.397-.676-.98-.61-1.735.09-.99.57-1.68 1.437-2.07.62-.28 1.406-.448 2.336-.497l.596-.036V9.94c0-.506-.083-.86-.243-1.063-.17-.216-.446-.326-.82-.326-.296 0-.53.07-.693.207-.167.144-.26.37-.28.676l-2.16-.166c.06-.774.383-1.397.97-1.865.587-.47 1.34-.705 2.253-.705.993 0 1.76.254 2.303.76.545.507.82 1.207.82 2.1v4.406c0 .58.033 1.01.1 1.29.066.28.18.498.34.656l.08.08h-2.27a2.352 2.352 0 0 1-.222-.644 5.067 5.067 0 0 1-.08-.67 4.01 4.01 0 0 1-.61.607zm-.51-2.133v.63l-.387.026c-.592.04-1.04.16-1.345.36-.373.24-.57.57-.588.987-.01.203.04.377.15.523.157.21.4.316.726.316.404 0 .77-.12 1.098-.358.345-.238.528-.59.548-1.053l.003-.06V12c0-.014-.003-.028-.005-.022z" />
        </svg>
      );
    default:
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
        </svg>
      );
  }
}
