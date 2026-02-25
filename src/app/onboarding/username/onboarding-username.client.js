'use client';

import { doc, getDoc } from 'firebase/firestore';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../../../firebase/context/FirebaseContext';
import { db } from '../../../../firebase/firebase';
import { invalidateProfileCache } from '../../../../lib/firebase/cachedServices';
import {
  checkUsernameAvailability,
  claimUsername,
  generateDefaultUsername,
  normalizeUsername,
  validateUsername,
} from '../../../../lib/utils/username';

export default function OnboardingUsernameClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentUser, loading: authLoading } = useAuth();

  const [username, setUsername] = useState('');
  const [defaultUsername, setDefaultUsername] = useState('');
  const [availability, setAvailability] = useState('unknown'); // unknown | checking | available | taken
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [loadingProfile, setLoadingProfile] = useState(true);
  const debounceRef = useRef(null);

  const next = searchParams.get('next');

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !currentUser) {
      router.push('/login');
    }
  }, [authLoading, currentUser, router]);

  // Check if user already has a username — redirect away if so
  useEffect(() => {
    if (!currentUser) return;
    let cancelled = false;

    (async () => {
      try {
        const snap = await getDoc(doc(db, 'profiles', currentUser.uid));
        if (!cancelled && snap.exists() && snap.data()?.usernameLower) {
          router.push(next || '/');
          return;
        }
      } catch (_) {}

      // Load customer data to generate default username
      try {
        const customerSnap = await getDoc(doc(db, 'customers', currentUser.uid));
        if (!cancelled && customerSnap.exists()) {
          const data = customerSnap.data();
          const firstName = data.firstName || '';
          const lastName = data.lastName || '';
          const generated = generateDefaultUsername(firstName, lastName);
          setDefaultUsername(generated);
          setUsername(generated);
        } else if (!cancelled) {
          // Fallback: use displayName from auth
          const displayName = currentUser.displayName || '';
          const parts = displayName.split(' ');
          const generated = generateDefaultUsername(parts[0] || '', parts.slice(1).join(' ') || '');
          setDefaultUsername(generated);
          setUsername(generated);
        }
      } catch (_) {
        if (!cancelled) {
          const generated = generateDefaultUsername('user', '');
          setDefaultUsername(generated);
          setUsername(generated);
        }
      }

      if (!cancelled) setLoadingProfile(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [currentUser, next, router]);

  // Debounced availability check
  useEffect(() => {
    if (!currentUser || loadingProfile) return;

    const desired = normalizeUsername(username);
    const { valid } = validateUsername(desired);

    if (!valid) {
      setAvailability('unknown');
      if (debounceRef.current) clearTimeout(debounceRef.current);
      return;
    }

    setAvailability('checking');
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      const result = await checkUsernameAvailability(desired, currentUser.uid);
      setAvailability(result === 'error' ? 'unknown' : result);
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [username, currentUser, loadingProfile]);

  const handleClaim = useCallback(
    async (usernameToUse) => {
      if (!currentUser) return;
      setError('');
      setSaving(true);

      const desired = normalizeUsername(usernameToUse);
      const { valid, error: validError } = validateUsername(desired);
      if (!valid) {
        setError(validError);
        setSaving(false);
        return;
      }

      // Build profile defaults from customer data
      let displayName = currentUser.displayName || '';
      try {
        const customerSnap = await getDoc(doc(db, 'customers', currentUser.uid));
        if (customerSnap.exists()) {
          displayName = customerSnap.data().displayName || displayName;
        }
      } catch (_) {}

      try {
        await claimUsername(currentUser.uid, desired, { displayName, bio: '' });
        invalidateProfileCache(currentUser.uid);
        toast.success('Username claimed!');
        router.push(next || '/');
      } catch (e) {
        const msg = e?.message || 'Failed to claim username.';
        setError(msg);
        setSaving(false);
      }
    },
    [currentUser, next, router],
  );

  const handleSkip = useCallback(async () => {
    if (!defaultUsername || !currentUser) return;
    setError('');
    setSaving(true);

    // Resolve displayName for profile defaults
    let displayName = currentUser.displayName || '';
    try {
      const customerSnap = await getDoc(doc(db, 'customers', currentUser.uid));
      if (customerSnap.exists()) {
        displayName = customerSnap.data().displayName || displayName;
      }
    } catch (_) {}

    // Try claiming the pre-filled default, retry once with a new suffix if taken
    let target = defaultUsername;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        await claimUsername(currentUser.uid, target, { displayName, bio: '' });
        invalidateProfileCache(currentUser.uid);
        toast.success('Username claimed!');
        router.push(next || '/');
        return;
      } catch (e) {
        if (attempt === 0 && e?.message === 'That username is taken.') {
          // Regenerate with a new random suffix
          let firstName = 'user';
          let lastName = '';
          try {
            const snap = await getDoc(doc(db, 'customers', currentUser.uid));
            if (snap.exists()) {
              firstName = snap.data().firstName || 'user';
              lastName = snap.data().lastName || '';
            }
          } catch (__) {}
          target = generateDefaultUsername(firstName, lastName);
          setDefaultUsername(target);
          setUsername(target);
          continue;
        }
        // Non-retryable error or second attempt failed
        setError(e?.message || 'Failed to claim username.');
        setSaving(false);
        return;
      }
    }
  }, [defaultUsername, currentUser, next, router]);

  // Show loading while auth or profile check is in progress
  if (authLoading || loadingProfile || !currentUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-root)]">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--border-subtle)] border-t-[var(--accent)]" />
      </div>
    );
  }

  const normalized = normalizeUsername(username);
  const { valid } = validateUsername(normalized);
  const canClaim = valid && availability === 'available' && !saving;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg-root)] px-4">
      <div className="w-full max-w-md rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elev-1)] p-8 shadow-xl">
        {/* Logo */}
        <div className="mb-6 flex justify-center">
          <Image src="/assets/RSLogo2.png" alt="RAGESTATE" width={112} height={56} priority />
        </div>

        <h1 className="text-center text-2xl font-bold text-[var(--text-primary)]">
          Choose your username
        </h1>
        <p className="mt-2 text-center text-sm text-[var(--text-secondary)]">
          This is how people will find you on RAGESTATE.
        </p>

        {/* Username input */}
        <div className="mt-6">
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <span className="text-sm text-[var(--text-tertiary)]">ragestate.com/</span>
            </div>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(normalizeUsername(e.target.value))}
              className="block w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elev-2)] py-3 pl-[115px] pr-10 text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] sm:text-sm"
              placeholder="username"
              minLength={3}
              maxLength={20}
              autoFocus
            />
            {/* Status icon */}
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
              {availability === 'available' && valid && (
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

          {/* Helper text */}
          <p
            className={`mt-1.5 text-xs ${
              availability === 'taken'
                ? 'text-red-500'
                : availability === 'available' && valid
                  ? 'text-green-500'
                  : 'text-[var(--text-tertiary)]'
            }`}
          >
            {availability === 'taken'
              ? 'That username is taken.'
              : availability === 'available' && valid
                ? 'Username is available!'
                : 'Lowercase letters, numbers, dot & underscore. Min 3 characters.'}
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-4 rounded-lg border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-500">
            {error}
          </div>
        )}

        {/* Claim button */}
        <button
          onClick={() => handleClaim(username)}
          disabled={!canClaim}
          className="mt-6 flex w-full items-center justify-center rounded-lg bg-[var(--accent)] px-4 py-3 font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? (
            <>
              <svg className="-ml-1 mr-2 h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
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
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Claiming...
            </>
          ) : (
            'Claim Username'
          )}
        </button>

        {/* Skip link */}
        <button
          onClick={handleSkip}
          disabled={saving}
          className="mt-3 w-full text-center text-sm text-[var(--text-tertiary)] transition-colors hover:text-[var(--text-primary)]"
        >
          Skip — we&apos;ll pick one for you
        </button>

        {/* Footer note */}
        <p className="mt-6 text-center text-xs text-[var(--text-tertiary)]">
          You can change this later in Settings.
        </p>
      </div>
    </div>
  );
}
