#!/usr/bin/env node
/**
 * Seed initial Firestore feed collections (posts, postLikes, postComments, follows, userFeeds)
 * This creates sample documents so the collections exist and validates security (must run with service credentials).
 *
 * Usage: FIREBASE_PROJECT_ID=your-project GOOGLE_APPLICATION_CREDENTIALS=path/to/serviceAccount.json npm run seed:feed
 */

const { randomUUID } = require("crypto");
const admin = require("firebase-admin");

if (!process.env.FIREBASE_PROJECT_ID) {
  console.error("Missing FIREBASE_PROJECT_ID");
  process.exit(1);
}

try {
  if (!admin.apps.length) {
    admin.initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID,
      credential: admin.credential.applicationDefault(),
    });
  }
} catch (e) {
  console.error("Failed to initialize Firebase Admin:", e);
  process.exit(1);
}

const db = admin.firestore();

async function seed() {
  const now = admin.firestore.Timestamp.now();
  const authorId = "demoUser1";
  const postId = randomUUID();

  console.log("Creating sample post...");
  await db
    .collection("posts")
    .doc(postId)
    .set({
      userId: authorId,
      userDisplayName: "Demo User",
      userProfilePicture: "",
      content: "Hello RAGESTATE – first seed post",
      mediaUrls: [],
      mediaType: null,
      timestamp: now,
      likeCount: 0,
      commentCount: 0,
      tags: ["intro"],
      isPublic: true,
    });

  console.log("Adding to userFeeds for author (self timeline)...");
  await db
    .collection("userFeeds")
    .doc(authorId)
    .set(
      {
        postIds: [postId],
        lastUpdated: now,
      },
      { merge: true }
    );

  console.log("Creating follows doc (self follow for demo)...");
  await db.collection("follows").doc(`${authorId}_${authorId}`).set({
    followerId: authorId,
    followedId: authorId,
    createdAt: now,
  });

  console.log("Done.");
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
