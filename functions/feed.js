"use strict";

const {
  onDocumentCreated,
  onDocumentDeleted,
} = require("firebase-functions/v2/firestore");
const logger = require("firebase-functions/logger");
const { db } = require("./admin");
const admin = require("firebase-admin");

async function updatePostCounter(postId, field, delta) {
  const postRef = db.collection("posts").doc(postId);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(postRef);
    if (!snap.exists) return;
    const data = snap.data() || {};
    const current = typeof data[field] === "number" ? data[field] : 0;
    const next = Math.max(0, current + delta);
    tx.update(postRef, { [field]: next });
  });
}

exports.onPostLikeCreate = onDocumentCreated(
  "postLikes/{likeId}",
  async (event) => {
    const like = event.data?.data() || {};
    const postId = like.postId;
    if (!postId) return null;
    try {
      await updatePostCounter(postId, "likeCount", 1);
    } catch (err) {
      logger.error("onPostLikeCreate failed", { postId, err });
    }
    return null;
  }
);

exports.onPostLikeDelete = onDocumentDeleted(
  "postLikes/{likeId}",
  async (event) => {
    const like = event.data?.data() || {};
    const postId = like.postId;
    if (!postId) return null;
    try {
      await updatePostCounter(postId, "likeCount", -1);
    } catch (err) {
      logger.error("onPostLikeDelete failed", { postId, err });
    }
    return null;
  }
);

exports.onPostCommentCreate = onDocumentCreated(
  "postComments/{commentId}",
  async (event) => {
    const c = event.data?.data() || {};
    const postId = c.postId;
    if (!postId) return null;
    try {
      await updatePostCounter(postId, "commentCount", 1);
    } catch (err) {
      logger.error("onPostCommentCreate failed", { postId, err });
    }
    return null;
  }
);

exports.onPostCommentDelete = onDocumentDeleted(
  "postComments/{commentId}",
  async (event) => {
    const c = event.data?.data() || {};
    const postId = c.postId;
    if (!postId) return null;
    try {
      await updatePostCounter(postId, "commentCount", -1);
    } catch (err) {
      logger.error("onPostCommentDelete failed", { postId, err });
    }
    return null;
  }
);

// --- Personal feed fan-out (userFeeds/{userId}/feedItems) ---

async function commitInChunks(writes) {
  if (!writes.length) return;
  let batch = db.batch();
  let count = 0;
  for (const fn of writes) {
    fn(batch);
    count++;
    if (count >= 450) {
      await batch.commit();
      batch = db.batch();
      count = 0;
    }
  }
  if (count > 0) {
    await batch.commit();
  }
}

exports.onPostCreated = onDocumentCreated("posts/{postId}", async (event) => {
  const post = event.data?.data() || {};
  const postId = event.params.postId;
  const authorId = post.userId;
  if (!authorId || !postId) return null;

  try {
    // Fetch followers of author
    const followersSnap = await db
      .collection("follows")
      .where("followedId", "==", authorId)
      .get();

    // Build recipients: author always, followers if public
    const recipients = new Set([authorId]);
    if (post.isPublic) {
      followersSnap.forEach((doc) => {
        const d = doc.data() || {};
        if (d.followerId) recipients.add(d.followerId);
      });
    }

    const ts = post.timestamp || admin.firestore.FieldValue.serverTimestamp();
    const writes = [];
    for (const uid of recipients) {
      const feedDoc = db
        .collection("userFeeds")
        .doc(uid)
        .collection("feedItems")
        .doc(postId);
      writes.push((batch) =>
        batch.set(
          feedDoc,
          {
            postId,
            authorId,
            isPublic: !!post.isPublic,
            timestamp: ts,
          },
          { merge: true }
        )
      );
    }
    await commitInChunks(writes);
  } catch (err) {
    logger.error("onPostCreated fan-out failed", { postId, authorId, err });
  }
  return null;
});

exports.onPostDeleted = onDocumentDeleted("posts/{postId}", async (event) => {
  const post = event.data?.data() || {};
  const postId = event.params.postId;
  const authorId = post.userId;
  if (!authorId || !postId) return null;

  try {
    const followersSnap = await db
      .collection("follows")
      .where("followedId", "==", authorId)
      .get();

    const recipients = new Set([authorId]);
    followersSnap.forEach((doc) => {
      const d = doc.data() || {};
      if (d.followerId) recipients.add(d.followerId);
    });

    const writes = [];
    for (const uid of recipients) {
      const feedDoc = db
        .collection("userFeeds")
        .doc(uid)
        .collection("feedItems")
        .doc(postId);
      writes.push((batch) => batch.delete(feedDoc));
    }
    await commitInChunks(writes);
  } catch (err) {
    logger.error("onPostDeleted fan-out cleanup failed", {
      postId,
      authorId,
      err,
    });
  }
  return null;
});

exports.onFollowCreate = onDocumentCreated(
  "follows/{edgeId}",
  async (event) => {
    const edge = event.data?.data() || {};
    const followerId = edge.followerId;
    const followedId = edge.followedId;
    if (!followerId || !followedId) return null;

    try {
      // Backfill latest public posts from followed user into follower's feed
      const postsSnap = await db
        .collection("posts")
        .where("userId", "==", followedId)
        .where("isPublic", "==", true)
        .orderBy("timestamp", "desc")
        .limit(20)
        .get();

      const writes = [];
      postsSnap.forEach((doc) => {
        const p = doc.data() || {};
        const postId = doc.id;
        const ts = p.timestamp || admin.firestore.FieldValue.serverTimestamp();
        const feedDoc = db
          .collection("userFeeds")
          .doc(followerId)
          .collection("feedItems")
          .doc(postId);
        writes.push((batch) =>
          batch.set(
            feedDoc,
            {
              postId,
              authorId: followedId,
              isPublic: true,
              timestamp: ts,
            },
            { merge: true }
          )
        );
      });
      await commitInChunks(writes);
    } catch (err) {
      logger.error("onFollowCreate backfill failed", {
        followerId,
        followedId,
        err,
      });
    }
    return null;
  }
);

exports.onFollowDelete = onDocumentDeleted(
  "follows/{edgeId}",
  async (event) => {
    const edge = event.data?.data() || {};
    const followerId = edge.followerId;
    const followedId = edge.followedId;
    if (!followerId || !followedId) return null;

    try {
      // Remove items from follower's feed authored by followedId
      const feedSnap = await db
        .collection("userFeeds")
        .doc(followerId)
        .collection("feedItems")
        .where("authorId", "==", followedId)
        .get();

      const writes = [];
      feedSnap.forEach((doc) => {
        writes.push((batch) => batch.delete(doc.ref));
      });
      await commitInChunks(writes);
    } catch (err) {
      logger.error("onFollowDelete cleanup failed", {
        followerId,
        followedId,
        err,
      });
    }
    return null;
  }
);
