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
      <h3 className="mb-4 text-xl font-medium text-white">Public Profile (Handle & Bio)</h3>
      {loading ? (
        <p className="text-gray-400">Loading…</p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-gray-300">Display name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className={`${inputStyling}`}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-gray-300">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className={`${inputStyling}`}
              maxLength={500}
              rows={3}
            />
            <p className="mt-1 text-xs text-gray-500">Max 500 characters.</p>
          </div>
          <div>
            <label className="mb-1 block text-sm text-gray-300">Username</label>
            <div className="flex items-center gap-2">
              <span className="text-gray-400">ragestate.com/</span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(normalizeUsername(e.target.value))}
                className={`${inputStyling}`}
                placeholder="yourname"
                minLength={3}
                maxLength={20}
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Lowercase letters, numbers, dot and underscore. 3–20 characters.
            </p>
            {availability === 'checking' && (
              <p className="mt-1 text-xs text-gray-400">Checking availability…</p>
            )}
            {availability === 'available' && username !== initialUsername && (
              <p className="mt-1 text-xs text-green-400">Username is available</p>
            )}
            {availability === 'taken' && (
              <p className="mt-1 text-xs text-red-400">That username is taken</p>
            )}
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}
          {message && (
            <p className="text-sm text-green-400">
              {message}
              {username ? (
                <>
                  {' '}
                  <a
                    href={`/${username}`}
                    className="ml-1 underline underline-offset-2 hover:text-green-300"
                  >
                    View profile
                  </a>
                </>
              ) : null}
            </p>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={saving || availability === 'taken'}
              className={buttonStyling}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
