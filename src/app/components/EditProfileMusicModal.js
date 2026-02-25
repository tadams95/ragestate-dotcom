'use client';

import {
  detectMusicPlatform,
  fetchMusicMetadata,
  getPlatformInfo,
  isValidMusicUrl,
  PLATFORMS,
} from '@/utils/musicPlatforms';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { doc, setDoc } from 'firebase/firestore';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { db } from '../../../firebase/firebase';
import { invalidateProfileCache } from '../../../lib/firebase/cachedServices';
import ProfileMusicPlayer from './ProfileMusicPlayer';

const PLATFORM_KEYS = Object.keys(PLATFORMS);

/**
 * @typedef {Object} EditProfileMusicModalProps
 * @property {boolean} isOpen
 * @property {() => void} onClose
 * @property {string} userId
 * @property {object|null} initialProfileMusic
 * @property {string} initialProfileSongUrl
 * @property {(result: { profileMusic: object|null, profileSongUrl: string|null }) => void} onSave
 */

/**
 * Modal for editing the profile song from the profile page
 * @param {EditProfileMusicModalProps} props
 */
function EditProfileMusicModal({
  isOpen,
  onClose,
  userId,
  initialProfileMusic,
  initialProfileSongUrl,
  onSave,
}) {
  const [url, setUrl] = useState('');
  const [metadata, setMetadata] = useState(null);
  const [validationError, setValidationError] = useState('');
  const [fetchingMetadata, setFetchingMetadata] = useState(false);
  const [saving, setSaving] = useState(false);
  const debounceRef = useRef(null);

  // Reset form state when modal opens
  useEffect(() => {
    if (isOpen) {
      const initialUrl = initialProfileMusic?.url || initialProfileSongUrl || '';
      setUrl(initialUrl);
      setValidationError('');
      setFetchingMetadata(false);
      setSaving(false);
      // Set initial metadata from cached profile data if available
      if (initialProfileMusic?.title) {
        setMetadata({
          title: initialProfileMusic.title,
          artist: initialProfileMusic.artist,
          artworkUrl: initialProfileMusic.artworkUrl,
          platform: initialProfileMusic.platform,
        });
      } else {
        setMetadata(null);
      }
    }
  }, [isOpen, initialProfileMusic, initialProfileSongUrl]);

  // Debounced URL validation and metadata fetch
  useEffect(() => {
    if (!isOpen) return;

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    const trimmed = url.trim();
    if (!trimmed) {
      setValidationError('');
      setMetadata(null);
      setFetchingMetadata(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      // Normalize: add https:// if needed
      let normalized = trimmed;
      if (!/^https?:\/\//i.test(normalized)) {
        normalized = `https://${normalized}`;
      }

      if (!isValidMusicUrl(normalized)) {
        setValidationError('Please enter a valid SoundCloud, Spotify, YouTube, or Apple Music URL');
        setMetadata(null);
        return;
      }

      setValidationError('');
      setFetchingMetadata(true);

      try {
        const result = await fetchMusicMetadata(normalized);
        setMetadata(result);
      } catch {
        setMetadata(null);
      } finally {
        setFetchingMetadata(false);
      }
    }, 500);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [url, isOpen]);

  const handleClose = useCallback(() => {
    if (saving) return;
    setUrl('');
    setMetadata(null);
    setValidationError('');
    onClose();
  }, [saving, onClose]);

  const detectedPlatform = detectMusicPlatform(
    url.trim().startsWith('http') ? url.trim() : `https://${url.trim()}`,
  );

  const handleSave = useCallback(async () => {
    if (saving || !userId) return;

    const trimmed = url.trim();
    if (!trimmed) {
      setValidationError('Please enter a music URL');
      return;
    }

    // Normalize URL
    let normalized = trimmed;
    if (!/^https?:\/\//i.test(normalized)) {
      normalized = `https://${normalized}`;
    }

    if (!isValidMusicUrl(normalized)) {
      setValidationError('Please enter a valid SoundCloud, Spotify, YouTube, or Apple Music URL');
      return;
    }

    setSaving(true);
    try {
      const platform = detectMusicPlatform(normalized);
      const profileMusic = {
        platform,
        url: normalized,
        title: metadata?.title || null,
        artist: metadata?.artist || null,
        artworkUrl: metadata?.artworkUrl || null,
        cachedAt: new Date().toISOString(),
      };

      await setDoc(
        doc(db, 'profiles', userId),
        { profileSongUrl: normalized, profileMusic },
        { merge: true },
      );

      invalidateProfileCache(userId);
      onSave({ profileMusic, profileSongUrl: normalized });
      toast.success('Profile song saved');
      onClose();
    } catch (err) {
      console.error('Failed to save profile song:', err);
      toast.error('Failed to save profile song');
    } finally {
      setSaving(false);
    }
  }, [saving, userId, url, metadata, onSave, onClose]);

  const handleClear = useCallback(async () => {
    if (saving || !userId) return;

    setSaving(true);
    try {
      await setDoc(
        doc(db, 'profiles', userId),
        { profileSongUrl: null, profileMusic: null },
        { merge: true },
      );

      invalidateProfileCache(userId);
      onSave({ profileMusic: null, profileSongUrl: '' });
      toast.success('Profile song cleared');
      onClose();
    } catch (err) {
      console.error('Failed to clear profile song:', err);
      toast.error('Failed to clear profile song');
    } finally {
      setSaving(false);
    }
  }, [saving, userId, onSave, onClose]);

  if (!isOpen) return null;

  const normalizedUrl = url.trim().startsWith('http') ? url.trim() : `https://${url.trim()}`;
  const hasValidUrl = url.trim() && isValidMusicUrl(normalizedUrl);
  const hasExistingSong = !!(initialProfileMusic?.url || initialProfileSongUrl);

  return (
    <Dialog open={isOpen} onClose={handleClose} className="relative z-50">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60" aria-hidden="true" />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center overflow-y-auto p-4">
        <DialogPanel className="w-full max-w-md rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elev-1)] p-6 shadow-xl">
          <DialogTitle className="text-lg font-semibold text-[var(--text-primary)]">
            Edit Profile Song
          </DialogTitle>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Add a song to your profile. Paste a link from SoundCloud, Spotify, YouTube, or Apple
            Music.
          </p>

          {/* Platform badges */}
          <div className="mt-4 flex flex-wrap gap-2">
            {PLATFORM_KEYS.map((key) => {
              const info = getPlatformInfo(key);
              const isActive = detectedPlatform === key;
              return (
                <span
                  key={key}
                  className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                    isActive
                      ? 'text-white'
                      : 'border border-[var(--border-subtle)] bg-[var(--bg-elev-2)] text-[var(--text-tertiary)]'
                  }`}
                  style={isActive ? { backgroundColor: info?.color } : undefined}
                >
                  {info?.name}
                </span>
              );
            })}
          </div>

          {/* URL input */}
          <div className="mt-4">
            <label className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">
              Music URL
            </label>
            <div className="relative">
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://soundcloud.com/artist/track"
                className={`w-full rounded-lg border bg-[var(--bg-elev-2)] px-3 py-2 pr-10 text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none transition-colors focus:ring-1 ${
                  validationError
                    ? 'border-[var(--danger)] focus:border-[var(--danger)] focus:ring-[var(--danger)]'
                    : 'border-[var(--border-subtle)] focus:border-[var(--accent)] focus:ring-[var(--accent)]'
                }`}
              />
              {fetchingMetadata && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <svg
                    className="h-4 w-4 animate-spin text-[var(--text-tertiary)]"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                </div>
              )}
            </div>
            {validationError && (
              <p className="mt-1 text-xs text-[var(--danger)]">{validationError}</p>
            )}
          </div>

          {/* Metadata preview */}
          {metadata && (metadata.title || metadata.artist) && (
            <div className="mt-4 flex items-center gap-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elev-2)] p-3">
              {metadata.artworkUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={metadata.artworkUrl}
                  alt={metadata.title || 'Track artwork'}
                  className="h-12 w-12 rounded-md object-cover"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-md bg-[var(--bg-root)]">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="h-6 w-6 text-[var(--text-tertiary)]"
                  >
                    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                  </svg>
                </div>
              )}
              <div className="min-w-0 flex-1">
                {metadata.title && (
                  <p className="truncate text-sm font-medium text-[var(--text-primary)]">
                    {metadata.title}
                  </p>
                )}
                {metadata.artist && (
                  <p className="truncate text-xs text-[var(--text-secondary)]">
                    {metadata.artist}
                  </p>
                )}
                {metadata.platform && (
                  <p className="text-xs text-[var(--text-tertiary)]">
                    {getPlatformInfo(metadata.platform)?.name}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Compact player preview */}
          {hasValidUrl && !fetchingMetadata && (
            <div className="mt-4 overflow-hidden rounded-xl">
              <ProfileMusicPlayer
                profileMusic={
                  metadata
                    ? { platform: detectedPlatform, url: normalizedUrl, ...metadata }
                    : null
                }
                url={normalizedUrl}
                compact
              />
            </div>
          )}

          {/* Actions */}
          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={saving}
              className="flex-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elev-2)] px-4 py-2.5 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-elev-1)] disabled:opacity-50"
            >
              Cancel
            </button>
            {hasExistingSong && (
              <button
                type="button"
                onClick={handleClear}
                disabled={saving}
                className="rounded-lg border border-[var(--danger)]/30 px-4 py-2.5 text-sm font-semibold text-[var(--danger)] transition-colors hover:bg-[var(--danger)]/10 disabled:opacity-50"
              >
                Clear
              </button>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !hasValidUrl}
              className="flex-1 rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}

export default memo(EditProfileMusicModal);
