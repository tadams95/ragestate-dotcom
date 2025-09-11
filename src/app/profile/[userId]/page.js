"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAuth } from "../../../../firebase/context/FirebaseContext";
import { db } from "../../../../firebase/firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  getCountFromServer,
  limit,
  orderBy,
  query,
  startAfter,
  where,
} from "firebase/firestore";
import Post from "../../components/Post";
import Followbutton from "../../components/Followbutton";
import { formatDate } from "@/utils/formatters";
import Header from "@/app/components/Header";
import { useRouter } from "next/navigation";

export default function ProfilePage({ params }) {
  const router = useRouter();
  const { currentUser } = useAuth();
  const profileUserId = params?.userId;

  const [profile, setProfile] = useState({
    displayName: "",
    photoURL: "",
    bio: "",
    usernameLower: "",
  });
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [loadingCounts, setLoadingCounts] = useState(false);

  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState(null);
  const initLoadGuard = useRef("");

  // Fetch profile document
  useEffect(() => {
    let cancelled = false;
    async function loadProfile() {
      if (!profileUserId) return;
      try {
        // Always load the public profile document
        const profileSnap = await getDoc(doc(db, "profiles", profileUserId));
        const p = profileSnap.exists() ? profileSnap.data() : {};
        if (!cancelled) {
          setProfile({
            displayName:
              p.displayName ||
              `${p.firstName || ""} ${p.lastName || ""}`.trim() ||
              "User",
            photoURL: p.photoURL || p.profilePicture || "",
            bio: p.bio || "",
            usernameLower: p.usernameLower || "",
          });
        }

        // Optional owner-only fallback: if viewing own profile and no photoURL yet, try customers.profilePicture
        if (
          !cancelled &&
          !p.photoURL &&
          !p.profilePicture &&
          currentUser?.uid === profileUserId
        ) {
          try {
            const customerSnap = await getDoc(
              doc(db, "customers", profileUserId)
            );
            const c = customerSnap.exists() ? customerSnap.data() : {};
            if (c.profilePicture) {
              setProfile((prev) => ({ ...prev, photoURL: c.profilePicture }));
            }
          } catch (err) {
            // Ignore permission errors for public viewers
          }
        }
      } catch (e) {
        console.warn("Failed to load profile", e);
      }
    }
    loadProfile();
    return () => {
      cancelled = true;
    };
  }, [profileUserId, currentUser]);

  const refreshCounts = useCallback(async () => {
    if (!profileUserId) return;
    setLoadingCounts(true);
    try {
      const followersQ = query(
        collection(db, "follows"),
        where("followedId", "==", profileUserId)
      );
      const followingQ = query(
        collection(db, "follows"),
        where("followerId", "==", profileUserId)
      );
      const [followersAgg, followingAgg] = await Promise.all([
        getCountFromServer(followersQ),
        getCountFromServer(followingQ),
      ]);
      setFollowersCount(followersAgg.data().count || 0);
      setFollowingCount(followingAgg.data().count || 0);
    } catch (e) {
      console.warn("Failed to load follow counts", e);
    } finally {
      setLoadingCounts(false);
    }
  }, [profileUserId]);

  useEffect(() => {
    refreshCounts();
  }, [refreshCounts]);

  const loadPosts = useCallback(async () => {
    if (!profileUserId || loadingPosts || !hasMore) return;
    setLoadingPosts(true);
    try {
      const constraints = [
        where("userId", "==", profileUserId),
        where("isPublic", "==", true),
        orderBy("timestamp", "desc"),
        limit(10),
      ];
      if (lastDoc) constraints.push(startAfter(lastDoc));
      const q = query(collection(db, "posts"), ...constraints);
      const snap = await getDocs(q);
      const batch = snap.docs.map((d) => {
        const p = d.data();
        return {
          id: d.id,
          author: p.userDisplayName || p.userId || "User",
          avatarUrl: p.userProfilePicture || null,
          timestamp: formatDate(
            p.timestamp?.toDate ? p.timestamp.toDate() : p.timestamp
          ),
          content: p.content || "",
          likeCount: typeof p.likeCount === "number" ? p.likeCount : 0,
          commentCount: typeof p.commentCount === "number" ? p.commentCount : 0,
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
      console.error("Failed to load user posts", e);
    } finally {
      setLoadingPosts(false);
    }
  }, [profileUserId, loadingPosts, hasMore, lastDoc]);

  useEffect(() => {
    // Reset when navigating across profiles, guard initial load to prevent double-fetch in Strict Mode
    setPosts([]);
    setHasMore(true);
    setLastDoc(null);
    const key = String(profileUserId || "");
    if (initLoadGuard.current !== key) {
      initLoadGuard.current = key;
      loadPosts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileUserId]);

  const isOwnProfile = currentUser?.uid === profileUserId;

  return (
    <div className="bg-black min-h-screen text-white">
      <Header />
      <div className="max-w-3xl mx-auto px-4 pt-24 pb-6">
        {/* Top nav: Back */}
        <div className="mb-4">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-sm text-gray-300 hover:text-white"
            aria-label="Go back"
          >
            <span aria-hidden>←</span> Back
          </button>
        </div>
        {/* Header */}
        <div className="bg-[#0d0d0f] border border-white/10 rounded-2xl p-5 mb-6 flex items-center gap-4">
          <div className="w-16 h-16 rounded-md overflow-hidden bg-white/10 flex items-center justify-center">
            {profile.photoURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.photoURL}
                alt={profile.displayName}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-xl">👤</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-semibold truncate">
              {profile.displayName || "User"}
            </h1>
            {profile.usernameLower && (
              <p className="text-xs text-gray-500">@{profile.usernameLower}</p>
            )}
            {profile.bio && (
              <p className="text-sm text-gray-300 mt-1 line-clamp-2">
                {profile.bio}
              </p>
            )}
            <div className="mt-2 text-sm text-gray-400 flex items-center gap-4">
              <span>
                <strong className="text-white">{followersCount}</strong>{" "}
                Followers
              </span>
              <span>
                <strong className="text-white">{followingCount}</strong>{" "}
                Following
              </span>
            </div>
          </div>
          {!isOwnProfile && (
            <Followbutton
              targetUserId={profileUserId}
              onChange={refreshCounts}
            />
          )}
        </div>

        {/* Tabs (only Posts for now) */}
        <div className="flex items-center gap-3 mb-4 border-b border-white/10">
          <button className="py-2 px-1 text-sm font-semibold text-white border-b-2 border-[#ff1f42]">
            Posts
          </button>
          {/* Future tabs: About, Followers, Following */}
        </div>

        {/* Posts list */}
        <div className="space-y-4">
          {posts.map((p) => (
            <Post
              key={p.id}
              postData={{ ...p, usernameLower: profile.usernameLower }}
            />
          ))}
          {loadingPosts && (
            <p className="text-center text-gray-400 py-4">Loading…</p>
          )}
          {!loadingPosts && hasMore && (
            <div className="flex justify-center py-4">
              <button
                onClick={loadPosts}
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-[#16171a] border border-white/10 hover:bg-white/10"
              >
                Load more
              </button>
            </div>
          )}
          {!loadingPosts && !hasMore && posts.length === 0 && (
            <p className="text-center text-gray-400 py-8">No posts yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
