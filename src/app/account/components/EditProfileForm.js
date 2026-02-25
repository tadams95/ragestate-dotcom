'use client';

import {
  SOCIAL_PLATFORMS,
  SOCIAL_PLATFORM_ORDER,
  createEmptySocialLinks,
  isValidSocialUrl,
  normalizeSocialUrl,
} from '@/utils/socialLinks';
import { doc, getDoc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../../../firebase/context/FirebaseContext';
import { db } from '../../../../firebase/firebase';
import { invalidateProfileCache } from '../../../../lib/firebase/cachedServices';
import { normalizeUsername } from '../../../../lib/utils/username';

export default function EditProfileForm({ inputStyling, buttonStyling, cardStyling }) {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [username, setUsername] = useState('');
  const [initialUsername, setInitialUsername] = useState('');
  const [socialLinks, setSocialLinks] = useState(createEmptySocialLinks());
  const [socialLinksExpanded, setSocialLinksExpanded] = useState(false);
  const [socialLinkErrors, setSocialLinkErrors] = useState({});
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [availability, setAvailability] = useState('unknown'); // unknown | checking | available | taken
  const debounceRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!currentUser) {
        setLoading(false);
        return;
      }
      try {
        const snap = await getDoc(doc(db, 'profiles', currentUser.uid));
        if (!cancelled) {
          const data = snap.exists() ? snap.data() : {};
          setDisplayName(data.displayName || currentUser.displayName || '');
          setBio(data.bio || '');
          const existingUsername = data.usernameLower || '';
          setUsername(existingUsername);
          setInitialUsername(existingUsername);
          // Load social links (merge with empty to ensure all fields exist)
          setSocialLinks({ ...createEmptySocialLinks(), ...(data.socialLinks || {}) });
          setLoading(false);
        }
      } catch (e) {
        console.warn('Failed to load profile', e);
        setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [currentUser]);

  // Debounced availability check as the user types
  useEffect(() => {
    if (!currentUser) return;
    const desired = normalizeUsername(username);
    // If unchanged from initial, no need to check and no banner needed
    if (desired && desired === initialUsername) {
      setAvailability('unknown');
      if (debounceRef.current) clearTimeout(debounceRef.current);
      return;
    }
    // Reset for short inputs
    if (!desired || desired.length < 3) {
      setAvailability('unknown');
      if (debounceRef.current) clearTimeout(debounceRef.current);
      return;
    }
    setAvailability('checking');
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const userRef = doc(db, 'usernames', desired);
        const snap = await getDoc(userRef);
        if (!snap.exists()) {
          setAvailability('available');
        } else {
          const data = snap.data();
          if (data && data.uid === currentUser.uid) setAvailability('available');
          else setAvailability('taken');
        }
      } catch (_e) {
        setAvailability('unknown');
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [username, currentUser, initialUsername]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    if (!currentUser) return;
    const desired = normalizeUsername(username);
    if (!desired || desired.length < 3) {
      setError('Username must be at least 3 characters (a–z, 0–9, . or _)');
      return;
    }
    // Quick UX guard if obviously taken; server transaction still guarantees correctness
    if (availability === 'taken') {
      setError('That username is taken.');
      return;
    }
    // Validate social links before saving (normalize first, then validate strictly)
    const linkErrors = {};
    for (const platform of SOCIAL_PLATFORM_ORDER) {
      const url = (socialLinks[platform] || '').trim();
      if (url) {
        const normalized = normalizeSocialUrl(platform, url);
        if (!isValidSocialUrl(platform, normalized, { strict: true })) {
          linkErrors[platform] = `Invalid ${SOCIAL_PLATFORMS[platform].name} URL`;
        }
      }
    }
    if (Object.keys(linkErrors).length > 0) {
      setSocialLinkErrors(linkErrors);
      setError('Please fix the invalid social links.');
      setSocialLinksExpanded(true);
      return;
    }
    setSocialLinkErrors({});
    setSaving(true);
    try {
      await runTransaction(db, async (tx) => {
        const userKey = desired;
        const userRef = doc(db, 'usernames', userKey);
        const existing = await tx.get(userRef);
        if (existing.exists()) {
          const data = existing.data();
          if (data.uid !== currentUser.uid) {
            throw new Error('That username is taken.');
          }
        } else {
          tx.set(userRef, { uid: currentUser.uid, createdAt: serverTimestamp() });
        }

        // Delete old username document if username is changing
        if (initialUsername && initialUsername !== userKey) {
          tx.delete(doc(db, 'usernames', initialUsername));
        }

        const profileRef = doc(db, 'profiles', currentUser.uid);
        // Clean social links (remove empty strings, normalize URLs)
        const cleanedSocialLinks = {};
        for (const platform of SOCIAL_PLATFORM_ORDER) {
          const url = (socialLinks[platform] || '').trim();
          if (url) cleanedSocialLinks[platform] = normalizeSocialUrl(platform, url);
        }
        const profileData = {
          displayName: (displayName || '').trim(),
          bio: (bio || '').slice(0, 500),
          usernameLower: userKey,
          socialLinks: cleanedSocialLinks,
        };
        tx.set(profileRef, profileData, { merge: true });
      });
      setInitialUsername(desired);
      invalidateProfileCache(currentUser.uid);
      setMessage('Saved.');
      toast.success('Saved');
    } catch (e) {
      const msg = e?.message || 'Failed to save';
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (!currentUser) return null;

  return (
    <div className={cardStyling}>
      <div className="mb-6">
        <h3 className="text-lg font-medium text-[var(--text-primary)]">Public Profile</h3>
        <p className="text-xs text-[var(--text-secondary)]">
          This information will be displayed on your public profile page.
        </p>
      </div>

      {loading ? (
        <div className="py-8 text-center text-sm text-[var(--text-tertiary)]">
          Loading profile data…
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-6">
          {/* Display Name */}
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-[var(--text-tertiary)]">
              Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className={inputStyling}
              placeholder="Your Name"
            />
          </div>

          {/* Username */}
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-[var(--text-tertiary)]">
              Username
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <span className="text-sm text-[var(--text-tertiary)]">ragestate.com/</span>
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(normalizeUsername(e.target.value))}
                className={`${inputStyling} pl-[115px] pr-10`}
                placeholder="username"
                minLength={3}
                maxLength={20}
              />
              {/* Status Icon */}
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                {availability === 'checking' && (
                  <svg
                    className="h-4 w-4 animate-spin text-[var(--text-tertiary)]"
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
                )}
                {availability === 'available' && username !== initialUsername && (
                  <svg
                    className="h-4 w-4 text-green-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {availability === 'taken' && (
                  <svg
                    className="h-4 w-4 text-red-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </div>
            </div>

            <div className="mt-1.5 flex justify-between text-xs">
              <span
                className={`${
                  availability === 'taken'
                    ? 'text-red-500'
                    : availability === 'available' && username !== initialUsername
                      ? 'text-green-500'
                      : 'text-[var(--text-tertiary)]'
                }`}
              >
                {availability === 'taken'
                  ? 'Username is taken'
                  : availability === 'available' && username !== initialUsername
                    ? 'Username is available'
                    : 'Lowercase letters, numbers, dot & underscore.'}
              </span>
            </div>
          </div>

          {/* Bio */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="block text-xs font-medium uppercase tracking-wide text-[var(--text-tertiary)]">
                Bio
              </label>
              <span
                className={`text-[10px] ${bio.length > 450 ? 'text-yellow-500' : 'text-[var(--text-tertiary)]'}`}
              >
                {bio.length}/500
              </span>
            </div>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className={`${inputStyling} min-h-[100px] resize-y`}
              maxLength={500}
              rows={4}
              placeholder="Tell us about yourself..."
            />
          </div>

          {/* Social Links - Collapsible Section */}
          <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elev-2)]">
            <button
              type="button"
              onClick={() => setSocialLinksExpanded(!socialLinksExpanded)}
              className="flex w-full items-center justify-between p-4 text-left"
            >
              <div className="flex items-center gap-2">
                <SocialLinksIcon className="h-5 w-5 text-[var(--text-tertiary)]" />
                <span className="text-sm font-medium text-[var(--text-primary)]">Social Links</span>
                {Object.values(socialLinks).filter(Boolean).length > 0 && (
                  <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-xs text-red-500">
                    {Object.values(socialLinks).filter(Boolean).length}
                  </span>
                )}
              </div>
              <svg
                className={`h-5 w-5 text-[var(--text-tertiary)] transition-transform duration-200 ${
                  socialLinksExpanded ? 'rotate-180' : ''
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {socialLinksExpanded && (
              <div className="space-y-4 border-t border-[var(--border-subtle)] p-4">
                <p className="text-xs text-[var(--text-tertiary)]">
                  Add links to your social profiles. These will be displayed on your public profile.
                </p>
                {SOCIAL_PLATFORM_ORDER.map((platform) => {
                  const config = SOCIAL_PLATFORMS[platform];
                  const hasError = socialLinkErrors[platform];
                  return (
                    <div key={platform}>
                      <label className="mb-1.5 flex items-center gap-2 text-xs font-medium text-[var(--text-tertiary)]">
                        <SocialPlatformIcon platform={platform} className="h-4 w-4" />
                        {config.name}
                      </label>
                      <input
                        type="url"
                        value={socialLinks[platform] || ''}
                        onChange={(e) => {
                          setSocialLinks((prev) => ({ ...prev, [platform]: e.target.value }));
                          // Clear error when user types
                          if (socialLinkErrors[platform]) {
                            setSocialLinkErrors((prev) => {
                              const next = { ...prev };
                              delete next[platform];
                              return next;
                            });
                          }
                        }}
                        className={`${inputStyling} ${hasError ? 'border-red-500 focus:border-red-500' : ''}`}
                        placeholder={config.placeholder}
                      />
                      {hasError && <p className="mt-1 text-xs text-red-500">{hasError}</p>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {error && (
            <div className="rounded border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-500">
              {error}
            </div>
          )}

          {message && (
            <div className="flex items-center justify-between rounded border border-green-500/50 bg-green-500/10 p-3 text-sm text-green-500">
              <span>{message}</span>
              {username && (
                <a
                  href={`/${username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-medium underline underline-offset-2 hover:text-[var(--text-primary)]"
                >
                  View Profile &rarr;
                </a>
              )}
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={saving || availability === 'taken'}
              className={buttonStyling}
            >
              {saving ? 'Saving Profile…' : 'Save Public Profile'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

/**
 * Generic social links icon for the collapsible header
 */
function SocialLinksIcon({ className = '' }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

/**
 * Platform-specific icons for social link inputs
 */
function SocialPlatformIcon({ platform, className = '' }) {
  switch (platform) {
    case 'twitter':
      return (
        <svg fill="currentColor" viewBox="0 0 24 24" className={className}>
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      );
    case 'instagram':
      return (
        <svg fill="currentColor" viewBox="0 0 24 24" className={className}>
          <path
            fillRule="evenodd"
            d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z"
            clipRule="evenodd"
          />
        </svg>
      );
    case 'tiktok':
      return (
        <svg fill="currentColor" viewBox="0 0 24 24" className={className}>
          <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
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
    default:
      return null;
  }
}
