"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { db } from "../../../../firebase/firebase";
import { doc, getDoc } from "firebase/firestore";

export default function UsernameResolverPage({ params }) {
  const router = useRouter();
  const usernameParam = params?.username || "";
  const [status, setStatus] = useState("Resolving username…");

  useEffect(() => {
    let cancelled = false;
    async function go() {
      const usernameLower = String(usernameParam || "")
        .trim()
        .toLowerCase();
      if (!usernameLower) {
        setStatus("Invalid username");
        return;
      }
      try {
        const snap = await getDoc(doc(db, "usernames", usernameLower));
        if (cancelled) return;
        if (snap.exists()) {
          const { uid } = snap.data() || {};
          if (uid) {
            router.replace(`/profile/${uid}`);
            return;
          }
        }
        setStatus("User not found");
      } catch (e) {
        console.warn("Username resolve error", e);
        setStatus("Error resolving username");
      }
    }
    go();
    return () => {
      cancelled = true;
    };
  }, [router, usernameParam]);

  return (
    <div className="max-w-xl mx-auto py-10 text-center text-white">
      <p className="text-gray-300">{status}</p>
    </div>
  );
}
