"use strict";

const {
  onDocumentCreated,
  onDocumentDeleted,
} = require("firebase-functions/v2/firestore");
const logger = require("firebase-functions/logger");
const { db } = require("./admin");

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
