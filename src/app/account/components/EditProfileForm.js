'use client';

import { doc, getDoc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../../../firebase/context/FirebaseContext';
import { db } from '../../../../firebase/firebase';

function normalizeUsername(input) {
  const v = String(input || '')
    .trim()
    .toLowerCase();
  return v.replace(/[^a-z0-9._]/g, '').slice(0, 20);
}

export default function EditProfileForm({ inputStyling, buttonStyling, cardStyling }) {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [username, setUsername] = useState('');
  const [initialUsername, setInitialUsername] = useState('');
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
        const profileRef = doc(db, 'profiles', currentUser.uid);
        const profileData = {
          displayName: (displayName || '').trim(),
          bio: (bio || '').slice(0, 500),
          usernameLower: userKey,
        };
        tx.set(profileRef, profileData, { merge: true });
      });
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
