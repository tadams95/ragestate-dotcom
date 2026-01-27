/**
 * Report Type Definitions
 * Types for content reports and moderation
 */

// ============================================
// REPORT REASONS
// ============================================

/**
 * Valid report reasons
 * @typedef {'harassment' | 'spam' | 'inappropriate' | 'scam' | 'other'} ReportReason
 */

/**
 * Content types that can be reported
 * @typedef {'post' | 'comment' | 'profile' | 'chat'} ReportContentType
 */

/**
 * Report status
 * @typedef {'pending' | 'reviewed' | 'resolved' | 'dismissed'} ReportStatus
 */

// ============================================
// CONTENT REPORT (contentReports/{reportId})
// ============================================

/**
 * Content report document
 * @typedef {Object} ContentReport
 * @property {string} id - Report document ID
 * @property {import('./common').UserId} reporterId - User who submitted the report
 * @property {import('./common').UserId} reportedUserId - User whose content is being reported
 * @property {ReportContentType} contentType - Type of content being reported
 * @property {string} contentId - ID of the reported content (postId, commentId, etc.)
 * @property {ReportReason} reason - Reason for the report
 * @property {string} [description] - Optional additional details
 * @property {Date} createdAt - When the report was submitted
 * @property {ReportStatus} status - Current status of the report
 * @property {import('./common').UserId | null} reviewedBy - Admin who reviewed (null if pending)
 * @property {Date | null} reviewedAt - When the report was reviewed (null if pending)
 * @property {string | null} action - Action taken by admin (null if pending)
 */

// ============================================
// REPORT REASON LABELS
// ============================================

/**
 * Human-readable labels for report reasons
 * @type {Record<ReportReason, string>}
 */
export const REPORT_REASON_LABELS = {
  harassment: 'Harassment or bullying',
  spam: 'Spam or misleading',
  inappropriate: 'Inappropriate content',
  scam: 'Scam or fraud',
  other: 'Other',
};

/**
 * Human-readable labels for report status
 * @type {Record<ReportStatus, string>}
 */
export const REPORT_STATUS_LABELS = {
  pending: 'Pending Review',
  reviewed: 'Under Review',
  resolved: 'Resolved',
  dismissed: 'Dismissed',
};

/**
 * Human-readable labels for content types
 * @type {Record<ReportContentType, string>}
 */
export const CONTENT_TYPE_LABELS = {
  post: 'Post',
  comment: 'Comment',
  profile: 'Profile',
  chat: 'Chat Message',
};
