/**
 * Report Service
 * Handles content report operations in Firestore
 */

import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  startAfter,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '../../firebase/firebase';

const REPORTS_COLLECTION = 'contentReports';

// Rate limiting: max 5 reports per hour per user
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_MAX = 5;

/**
 * Submit a content report
 * @param {Object} params
 * @param {string} params.reporterId - User submitting the report
 * @param {string} params.reportedUserId - User who owns the reported content
 * @param {'post' | 'comment' | 'profile' | 'chat'} params.contentType - Type of content
 * @param {string} params.contentId - ID of the reported content
 * @param {'harassment' | 'spam' | 'inappropriate' | 'scam' | 'other'} params.reason - Report reason
 * @param {string} [params.description] - Optional additional details
 * @returns {Promise<string>} Report document ID
 */
export async function submitReport({
  reporterId,
  reportedUserId,
  contentType,
  contentId,
  reason,
  description,
}) {
  if (!reporterId || !contentType || !contentId || !reason) {
    throw new Error('Missing required report fields');
  }

  // Check rate limit
  const isRateLimited = await checkRateLimit(reporterId);
  if (isRateLimited) {
    throw new Error('You have submitted too many reports. Please try again later.');
  }

  // Check for duplicate report
  const isDuplicate = await checkDuplicateReport(reporterId, contentType, contentId);
  if (isDuplicate) {
    throw new Error('You have already reported this content.');
  }

  const reportData = {
    reporterId,
    reportedUserId: reportedUserId || null,
    contentType,
    contentId,
    reason,
    description: description?.trim() || null,
    createdAt: serverTimestamp(),
    status: 'pending',
    reviewedBy: null,
    reviewedAt: null,
    action: null,
  };

  const docRef = await addDoc(collection(db, REPORTS_COLLECTION), reportData);
  return docRef.id;
}

/**
 * Check if user has exceeded rate limit for reports
 * @param {string} userId
 * @returns {Promise<boolean>}
 */
async function checkRateLimit(userId) {
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS);

  const q = query(
    collection(db, REPORTS_COLLECTION),
    where('reporterId', '==', userId),
    where('createdAt', '>=', windowStart),
    limit(RATE_LIMIT_MAX + 1)
  );

  const snap = await getDocs(q);
  return snap.size >= RATE_LIMIT_MAX;
}

/**
 * Check if user already reported this content
 * @param {string} reporterId
 * @param {string} contentType
 * @param {string} contentId
 * @returns {Promise<boolean>}
 */
async function checkDuplicateReport(reporterId, contentType, contentId) {
  const q = query(
    collection(db, REPORTS_COLLECTION),
    where('reporterId', '==', reporterId),
    where('contentType', '==', contentType),
    where('contentId', '==', contentId),
    limit(1)
  );

  const snap = await getDocs(q);
  return !snap.empty;
}

/**
 * Get reports for admin review
 * @param {Object} [options]
 * @param {'pending' | 'reviewed' | 'resolved' | 'dismissed'} [options.status] - Filter by status
 * @param {any} [options.lastDoc] - Last document for pagination
 * @param {number} [options.pageSize=20] - Number of reports per page
 * @returns {Promise<{ reports: Array, lastDoc: any }>}
 */
export async function getReports({ status, lastDoc, pageSize = 20 } = {}) {
  const constraints = [orderBy('createdAt', 'desc'), limit(pageSize)];

  if (status) {
    constraints.unshift(where('status', '==', status));
  }

  if (lastDoc) {
    constraints.push(startAfter(lastDoc));
  }

  const q = query(collection(db, REPORTS_COLLECTION), ...constraints);
  const snap = await getDocs(q);

  const reports = snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
    createdAt: d.data().createdAt?.toDate?.() || null,
    reviewedAt: d.data().reviewedAt?.toDate?.() || null,
  }));

  return {
    reports,
    lastDoc: snap.docs[snap.docs.length - 1] || null,
  };
}

/**
 * Get reports for a specific user (admin check for repeat offenders)
 * @param {string} reportedUserId
 * @param {number} [pageSize=50]
 * @returns {Promise<Array>}
 */
export async function getReportsByUser(reportedUserId, pageSize = 50) {
  const q = query(
    collection(db, REPORTS_COLLECTION),
    where('reportedUserId', '==', reportedUserId),
    orderBy('createdAt', 'desc'),
    limit(pageSize)
  );

  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
    createdAt: d.data().createdAt?.toDate?.() || null,
    reviewedAt: d.data().reviewedAt?.toDate?.() || null,
  }));
}

/**
 * Get count of reports by status
 * @returns {Promise<Record<string, number>>}
 */
export async function getReportCounts() {
  const statuses = ['pending', 'reviewed', 'resolved', 'dismissed'];
  const counts = {};

  await Promise.all(
    statuses.map(async (status) => {
      const q = query(
        collection(db, REPORTS_COLLECTION),
        where('status', '==', status),
        limit(1000)
      );
      const snap = await getDocs(q);
      counts[status] = snap.size;
    })
  );

  return counts;
}

/**
 * Update report status (admin only)
 * @param {string} reportId
 * @param {Object} updates
 * @param {'pending' | 'reviewed' | 'resolved' | 'dismissed'} updates.status
 * @param {string} updates.reviewedBy - Admin user ID
 * @param {string} [updates.action] - Action taken description
 */
export async function updateReportStatus(reportId, { status, reviewedBy, action }) {
  if (!reportId || !status || !reviewedBy) {
    throw new Error('Missing required fields for status update');
  }

  const updateData = {
    status,
    reviewedBy,
    reviewedAt: serverTimestamp(),
  };

  if (action) {
    updateData.action = action;
  }

  await updateDoc(doc(db, REPORTS_COLLECTION, reportId), updateData);
}
