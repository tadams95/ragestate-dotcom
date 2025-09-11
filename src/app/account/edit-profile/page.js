"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../../../firebase/context/FirebaseContext";
import { db } from "../../../../firebase/firebase";
import {
  collection,
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

function normalizeUsername(input) {
  const v = String(input || "")
    .trim()
    .toLowerCase();
  // Allow a-z, 0-9, dot and underscore; collapse spaces/dashes
  return v.replace(/[^a-z0-9._]/g, "").slice(0, 20);
}

export default function EditProfilePage() {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [photoURL, setPhotoURL] = useState("");
  const [bio, setBio] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!currentUser) {
        setLoading(false);
        return;
      }
      try {
        const snap = await getDoc(doc(db, "profiles", currentUser.uid));
        if (!cancelled) {
          const data = snap.exists() ? snap.data() : {};
          setDisplayName(data.displayName || currentUser.displayName || "");
          setPhotoURL(data.photoURL || currentUser.photoURL || "");
          setBio(data.bio || "");
          setUsername(data.usernameLower || "");
          setLoading(false);
        }
      } catch (e) {
        console.warn("Failed to load profile", e);
        setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [currentUser]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    if (!currentUser) return;
    const desired = normalizeUsername(username);
    if (!desired || desired.length < 3) {
      setError("Username must be at least 3 characters (a–z, 0–9, . or _)");
      return;
    }
    setSaving(true);
    try {
      await runTransaction(db, async (tx) => {
        const userKey = desired;
        const userRef = doc(db, "usernames", userKey);
        const existing = await tx.get(userRef);
        if (existing.exists()) {
          const data = existing.data();
          if (data.uid !== currentUser.uid) {
            throw new Error("That username is taken.");
          }
          // same user re-saving; proceed
        } else {
          tx.set(userRef, {
            uid: currentUser.uid,
            createdAt: serverTimestamp(),
          });
        }
        const profileRef = doc(db, "profiles", currentUser.uid);
        const profileData = {
          displayName: (displayName || "").trim(),
          photoURL: (photoURL || "").trim(),
          bio: (bio || "").slice(0, 500),
          usernameLower: userKey,
        };
        tx.set(profileRef, profileData, { merge: true });
      });
      setMessage("Saved.");
    } catch (e) {
      setError(e?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (!currentUser) {
    return (
      <div className="max-w-xl mx-auto py-10 text-center text-white">
        <p>Please sign in to edit your profile.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-xl mx-auto py-10 text-center text-white">
        <p>Loading…</p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto py-8 text-white">
      <h1 className="text-xl font-semibold mb-4">Edit Profile</h1>
      <form
        onSubmit={onSubmit}
        className="space-y-4 bg-[#0d0d0f] border border-white/10 rounded-xl p-4"
      >
        <div>
          <label className="block text-sm text-gray-300 mb-1">
            Display name
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full bg-[#16171a] border border-white/10 rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-300 mb-1">Photo URL</label>
          <input
            type="url"
            value={photoURL}
            onChange={(e) => setPhotoURL(e.target.value)}
            className="w-full bg-[#16171a] border border-white/10 rounded px-3 py-2"
            placeholder="https://…"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-300 mb-1">Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="w-full bg-[#16171a] border border-white/10 rounded px-3 py-2"
            maxLength={500}
            rows={3}
          />
        </div>
        <div>
          <label className="block text-sm text-gray-300 mb-1">Username</label>
          <div className="flex items-center gap-2">
            <span className="text-gray-400">ragestate.com/u/</span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(normalizeUsername(e.target.value))}
              className="flex-1 bg-[#16171a] border border-white/10 rounded px-3 py-2"
              placeholder="yourname"
              minLength={3}
              maxLength={20}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Lowercase letters, numbers, dot and underscore. 3–20 characters.
          </p>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}
        {message && <p className="text-sm text-green-400">{message}</p>}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-[#ff1f42] text-white disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}
