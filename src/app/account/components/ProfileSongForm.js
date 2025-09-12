'use client';

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../../../firebase/context/FirebaseContext';
import { db } from '../../../../firebase/firebase';

function isValidSoundCloudUrl(url) {
  if (!url) return false;
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`);
    return /(^|\.)soundcloud\.com$/.test(u.hostname) || u.hostname === 'snd.sc';
  } catch {
    return false;
  }
}

export default function ProfileSongForm({ inputStyling, buttonStyling, cardStyling }) {
  const { currentUser } = useAuth();
  const [saving, setSaving] = useState(false);
  const [initialUrl, setInitialUrl] = useState('');
  const [url, setUrl] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!currentUser) return;
      try {
        const snap = await getDoc(doc(db, 'profiles', currentUser.uid));
        const data = snap.exists() ? snap.data() : {};
        const existing = data.profileSongUrl || '';
        if (!cancelled) {
          setInitialUrl(existing);
          setUrl(existing);
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

  const canSave = useMemo(() => {
    if (saving || !currentUser) return false;
    if (!url && initialUrl) return true; // allow clearing
    return isValidSoundCloudUrl(url) && url !== initialUrl;
  }, [saving, currentUser, url, initialUrl]);

  const onSave = async (e) => {
    e?.preventDefault?.();
    if (!currentUser) return;
    setSaving(true);
    try {
      const normalized = url ? (url.startsWith('http') ? url : `https://${url}`) : '';
      await setDoc(
        doc(db, 'profiles', currentUser.uid),
        { profileSongUrl: normalized || null },
        { merge: true },
      );
      setInitialUrl(normalized);
      toast.success(normalized ? 'Profile song saved' : 'Profile song cleared');
    } catch (e) {
      toast.error(e?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const onClear = async () => {
    if (!currentUser) return;
    if (!initialUrl && !url) return;
    setUrl('');
    try {
      await setDoc(doc(db, 'profiles', currentUser.uid), { profileSongUrl: null }, { merge: true });
      setInitialUrl('');
      toast.success('Profile song cleared');
    } catch (e) {
      toast.error(e?.message || 'Failed to clear');
    }
  };

  const embedSrc = useMemo(() => {
    const trackUrl = url || initialUrl;
    if (!isValidSoundCloudUrl(trackUrl)) return '';
    const encoded = encodeURIComponent(
      trackUrl.startsWith('http') ? trackUrl : `https://${trackUrl}`,
    );
    const color = 'ff1f42';
    return `https://w.soundcloud.com/player/?url=${encoded}&color=%23${color}&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false`;
  }, [url, initialUrl]);

  if (!currentUser) return null;

  return (
    <div className={cardStyling}>
      <h3 className="mb-4 text-xl font-medium text-white">Profile Song</h3>
      <p className="mb-3 text-sm text-gray-400">
        Paste a SoundCloud track URL. This will appear on your public profile.
      </p>
      <form onSubmit={onSave} className="space-y-3">
        <input
          type="url"
          inputMode="url"
          placeholder="https://soundcloud.com/artist/track"
          className={inputStyling}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <div className="flex items-center gap-2 pt-1">
          <button type="submit" disabled={!canSave} className={buttonStyling}>
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button
            type="button"
            onClick={onClear}
            className="rounded-md border border-white/20 px-3 py-2 text-sm text-gray-200 hover:bg-white/10"
          >
            Clear
          </button>
        </div>
      </form>
      {embedSrc && (
        <div className="mt-4">
          <iframe
            title="SoundCloud player preview"
            width="100%"
            height="120"
            scrolling="no"
            frameBorder="no"
            allow="autoplay"
            src={embedSrc}
          />
        </div>
      )}
      <p className="mt-2 text-xs text-gray-500">We currently support SoundCloud tracks.</p>
    </div>
  );
}
