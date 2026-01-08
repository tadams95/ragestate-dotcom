'use client';

import { formatDate } from '@/utils/formatters';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  where,
} from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../../firebase/context/FirebaseContext';
import { db } from '../../../firebase/firebase';
import Post from '../components/Post';
import { VerifiedBadge } from '../components/PostHeader';
import ProfileMusicPlayer from '../components/ProfileMusicPlayer';
import SocialLinksRow from '../components/SocialLinksRow';

export default function ProfileView({ params }) {
  const router = useRouter();
  const { currentUser } = useAuth();
  const routeParam = params?.userId || '';
  const [resolvedUid, setResolvedUid] = useState('');
  const [paramUsername, setParamUsername] = useState('');

  const [profile, setProfile] = useState({
    displayName: '',
    photoURL: '',
    bio: '',
    usernameLower: '',
    profileSongUrl: '', // legacy - kept for backward compatibility
    profileMusic: null, // NEW: { platform, url, title, artist, artworkUrl, cachedAt }
    socialLinks: null, // NEW: { twitter, instagram, tiktok, soundcloud, spotify, youtube }
    isVerified: false,
  });
  const [profileLoading, setProfileLoading] = useState(true);

  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState(null);
  const initLoadGuard = useRef('');

  // Resolve route param to UID if a username was provided
  useEffect(() => {
    let cancelled = false;
    async function resolve() {
      const raw = String(routeParam || '').trim();
      if (!raw) {
        setResolvedUid('');
        setParamUsername('');
        return;
      }
      const maybeUsername = raw.toLowerCase();
      try {
        // Try username mapping first
        const snap = await getDoc(doc(db, 'usernames', maybeUsername));
        if (!cancelled && snap.exists()) {
          const { uid } = snap.data() || {};
          if (uid) {
            setResolvedUid(uid);
            setParamUsername(maybeUsername);
            return;
          }
        }
      } catch {}
      // Fallback: treat as UID
      setResolvedUid(raw);
      setParamUsername('');
    }
    resolve();
    return () => {
      cancelled = true;
    };
  }, [routeParam]);

  // Fetch profile document
  useEffect(() => {
    let cancelled = false;
    async function loadProfile() {
      if (!resolvedUid) return;
      setProfileLoading(true);
      try {
        // Always load the public profile document
        const profileSnap = await getDoc(doc(db, 'profiles', resolvedUid));
        const p = profileSnap.exists() ? profileSnap.data() : {};
        if (!cancelled) {
          setProfile({
            displayName: p.displayName || `${p.firstName || ''} ${p.lastName || ''}`.trim() || '',
            photoURL: p.photoURL || p.profilePicture || '',
            bio: p.bio || '',
            usernameLower: p.usernameLower || paramUsername || '',
            profileSongUrl: p.profileSongUrl || '', // legacy
            profileMusic: p.profileMusic || null, // NEW
            socialLinks: p.socialLinks || null, // NEW
            isVerified: p.isVerified === true,
          });
        }

        // Optional owner-only fallback: if viewing own profile and no photoURL yet, try customers.profilePicture
        if (!cancelled && !p.photoURL && !p.profilePicture && currentUser?.uid === resolvedUid) {
          try {
            const customerSnap = await getDoc(doc(db, 'customers', resolvedUid));
            const c = customerSnap.exists() ? customerSnap.data() : {};
            if (c.profilePicture) {
              setProfile((prev) => ({ ...prev, photoURL: c.profilePicture }));
            }
          } catch (err) {
            // Ignore permission errors for public viewers
          }
        }
      } catch (e) {
        console.warn('Failed to load profile', e);
      } finally {
        if (!cancelled) setProfileLoading(false);
      }
    }
    loadProfile();
    return () => {
      cancelled = true;
    };
  }, [resolvedUid, currentUser, paramUsername]);

  const loadPosts = useCallback(async () => {
    if (!resolvedUid || loadingPosts || !hasMore) return;
    setLoadingPosts(true);
    try {
      const isOwner = currentUser?.uid === resolvedUid;
      const constraints = [where('userId', '==', resolvedUid)];
      if (!isOwner) constraints.push(where('isPublic', '==', true));
      constraints.push(orderBy('timestamp', 'desc'));
      constraints.push(limit(10));
      if (lastDoc) constraints.push(startAfter(lastDoc));
      const q = query(collection(db, 'posts'), ...constraints);
      const snap = await getDocs(q);
      const batch = snap.docs.map((d) => {
        const p = d.data();
        return {
          id: d.id,
          userId: p.userId,
          author: p.usernameLower ? p.usernameLower : p.userDisplayName || p.userId || 'User',
          avatarUrl: p.userProfilePicture || null,
          timestamp: formatDate(p.timestamp?.toDate ? p.timestamp.toDate() : p.timestamp),
          content: p.content || '',
          isPublic: typeof p.isPublic === 'boolean' ? p.isPublic : true,
          likeCount: typeof p.likeCount === 'number' ? p.likeCount : 0,
          commentCount: typeof p.commentCount === 'number' ? p.commentCount : 0,
        };
      });
      // Deduplicate by id to avoid double-rendering under Strict Mode or rapid calls
      setPosts((prev) => {
        const seen = new Set(prev.map((x) => x.id));
        const unique = batch.filter((x) => !seen.has(x.id));
        return [...prev, ...unique];
      });
      setLastDoc(snap.docs[snap.docs.length - 1] || null);
      if (snap.size < 10) setHasMore(false);
    } catch (e) {
      console.error('Failed to load user posts', e);
    } finally {
      setLoadingPosts(false);
    }
  }, [resolvedUid, currentUser, loadingPosts, hasMore, lastDoc]);

  useEffect(() => {
    // Reset when navigating across profiles, guard initial load to prevent double-fetch in Strict Mode
    setPosts([]);
    setHasMore(true);
    setLastDoc(null);
    const key = String(resolvedUid || '');
    if (initLoadGuard.current !== key) {
      initLoadGuard.current = key;
      loadPosts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedUid]);

  return (
    <div className="min-h-screen bg-[var(--bg-root)] text-[var(--text-primary)] transition-colors duration-200">
      {/* Header is rendered by layout.js */}
      <div className="mx-auto max-w-6xl px-4 pb-6 pt-24">
        {/* Top nav: Back */}
        <div className="mb-4">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            aria-label="Go back"
          >
            <span aria-hidden>←</span> Back
          </button>
        </div>

        {/* Responsive two-column layout */}
        <div className="grid gap-6 md:grid-cols-12">
          {/* Left column: profile card + song */}
          <aside className="space-y-6 md:col-span-4">
            <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elev-1)] p-5 transition-colors duration-200">
              <div className="mb-4 flex items-center gap-4">
                <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-md bg-[var(--bg-elev-2)]">
                  {profileLoading ? (
                    <div className="h-full w-full animate-pulse bg-[var(--bg-elev-2)]" />
                  ) : profile.photoURL ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={profile.photoURL}
                      alt={profile.displayName || 'Profile photo'}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-2xl">👤</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  {profileLoading ? (
                    <div className="space-y-2">
                      <div className="h-4 w-40 animate-pulse rounded bg-[var(--bg-elev-2)]" />
                      <div className="h-3 w-24 animate-pulse rounded bg-[var(--bg-elev-2)]" />
                    </div>
                  ) : (
                    <>
                      <h1 className="flex items-center truncate text-xl font-semibold">
                        {profile.displayName || 'User'}
                        {profile.isVerified && <VerifiedBadge />}
                      </h1>
                      {profile.usernameLower && (
                        <p className="text-xs text-[var(--text-tertiary)]">
                          {profile.usernameLower}
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>
              {profile.bio && (
                <p className="whitespace-pre-line text-sm text-[var(--text-secondary)]">
                  {profile.bio}
                </p>
              )}
              {/* Social Links */}
              <SocialLinksRow socialLinks={profile.socialLinks} className="mt-4" />
            </div>

            {/* Profile Music Player - supports multiple platforms */}
            {profile.profileMusic?.url || profile.profileSongUrl ? (
              <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elev-1)] p-4 transition-colors duration-200">
                {/* Compact player on mobile */}
                <div className="md:hidden">
                  <ProfileMusicPlayer
                    profileMusic={profile.profileMusic}
                    url={profile.profileSongUrl}
                    compact
                  />
                </div>
                {/* Visual player on md+ for a richer presentation */}
                <div className="hidden md:block">
                  <ProfileMusicPlayer
                    profileMusic={profile.profileMusic}
                    url={profile.profileSongUrl}
                  />
                </div>
              </div>
            ) : null}
          </aside>

          {/* Right column: posts */}
          <main className="md:col-span-8">
            <div className="space-y-4">
              {posts.map((p) => (
                <Post key={p.id} postData={{ ...p, usernameLower: profile.usernameLower }} />
              ))}
              {loadingPosts && (
                <p className="py-4 text-center text-[var(--text-tertiary)]">Loading…</p>
              )}
              {!loadingPosts && hasMore && (
                <div className="flex justify-center py-4">
                  <button
                    onClick={loadPosts}
                    className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elev-2)] px-4 py-2 text-sm font-semibold transition-colors duration-200 hover:bg-[var(--bg-elev-1)]"
                  >
                    Load more
                  </button>
                </div>
              )}
              {!loadingPosts && !hasMore && posts.length === 0 && (
                <p className="py-8 text-center text-[var(--text-tertiary)]">No posts yet.</p>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
