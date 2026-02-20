'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../../../firebase/context/FirebaseContext';
import { getReports, getReportCounts, updateReportStatus } from '../../../../lib/firebase/reportService';
import {
  REPORT_REASON_LABELS,
  REPORT_STATUS_LABELS,
  CONTENT_TYPE_LABELS,
} from '../../../../lib/types/report';
import { adminInput } from './shared/adminStyles';
import { AdminErrorState } from './shared';

const STATUS_COLORS = {
  pending: 'bg-amber-500/20 text-[var(--warning)]',
  reviewed: 'bg-red-500/20 text-[var(--accent)]',
  resolved: 'bg-green-500/20 text-[var(--success)]',
  dismissed: 'bg-gray-500/20 text-[var(--text-tertiary)]',
};

const ReportsTab = () => {
  const { currentUser } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [counts, setCounts] = useState({ pending: 0, reviewed: 0, resolved: 0, dismissed: 0 });
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

  // Load reports
  const loadReports = useCallback(async (reset = false) => {
    setLoading(true);
    setError(null);
    try {
      const { reports: newReports, lastDoc: newLastDoc } = await getReports({
        status: statusFilter === 'all' ? undefined : statusFilter,
        lastDoc: reset ? null : lastDoc,
        pageSize: 20,
      });

      if (reset) {
        setReports(newReports);
      } else {
        setReports((prev) => [...prev, ...newReports]);
      }
      setLastDoc(newLastDoc);
      setHasMore(newReports.length === 20);
    } catch (err) {
      console.error('Failed to load reports:', err);
      setError(err.message || 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, lastDoc]);

  // Load counts
  const loadCounts = useCallback(async () => {
    try {
      const newCounts = await getReportCounts();
      setCounts(newCounts);
    } catch (err) {
      console.error('Failed to load report counts:', err);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadReports(true);
    loadCounts();
  }, [statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle status change
  const handleStatusChange = async (reportId, newStatus, action = null) => {
    if (!currentUser?.uid) return;

    setUpdatingId(reportId);
    try {
      await updateReportStatus(reportId, {
        status: newStatus,
        reviewedBy: currentUser.uid,
        action,
      });

      // Update local state
      setReports((prev) =>
        prev.map((r) =>
          r.id === reportId
            ? { ...r, status: newStatus, reviewedBy: currentUser.uid, reviewedAt: new Date() }
            : r
        )
      );

      // Refresh counts
      loadCounts();
    } catch (err) {
      console.error('Failed to update report status:', err);
      alert('Failed to update report status. Please try again.');
    } finally {
      setUpdatingId(null);
    }
  };

  // Get content link based on type
  const getContentLink = (report) => {
    switch (report.contentType) {
      case 'post':
        return `/post/${report.contentId}`;
      case 'comment':
        return `/post/${report.contentId}`; // Comments link to the post
      case 'profile':
        return `/profile/${report.contentId}`;
      case 'chat':
        return null; // Chat messages can't be viewed by admins via URL
      default:
        return null;
    }
  };

  // Format date
  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elev-1)] p-6 shadow-xl">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">Content Reports</h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Review and moderate reported content
          </p>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={adminInput + ' sm:w-40'}
        >
          <option value="all">All Reports</option>
          <option value="pending">Pending ({counts.pending})</option>
          <option value="reviewed">Under Review ({counts.reviewed})</option>
          <option value="resolved">Resolved ({counts.resolved})</option>
          <option value="dismissed">Dismissed ({counts.dismissed})</option>
        </select>
      </div>

      {/* Stats */}
      <div className="wave-in-stagger mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Object.entries(counts).map(([status, count]) => (
          <div
            key={status}
            className="animate-wave-in rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elev-2)] p-4"
          >
            <p className="text-sm text-[var(--text-tertiary)]">{REPORT_STATUS_LABELS[status]}</p>
            <p className="mt-1 text-2xl font-semibold text-[var(--text-primary)]">{count}</p>
          </div>
        ))}
      </div>

      {/* Reports list */}
      {error ? (
        <AdminErrorState
          title="Error loading reports"
          message={error}
          onRetry={() => loadReports(true)}
        />
      ) : loading && reports.length === 0 ? (
        <div className="flex h-32 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-[var(--accent)]" />
        </div>
      ) : reports.length === 0 ? (
        <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elev-2)] p-8 text-center">
          <div className="mb-3 flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--bg-elev-1)]">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="h-6 w-6 text-[var(--text-tertiary)]"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
          <p className="text-[var(--text-secondary)]">No reports found</p>
          <p className="mt-1 text-sm text-[var(--text-tertiary)]">
            {statusFilter === 'pending'
              ? 'Great! No pending reports to review.'
              : 'Try adjusting the filter to see more reports.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => {
            const contentLink = getContentLink(report);
            const isUpdating = updatingId === report.id;

            return (
              <div
                key={report.id}
                className="card-wipe-border rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elev-2)] p-4 transition-shadow hover:shadow-lg"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  {/* Report info */}
                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_COLORS[report.status]}`}
                      >
                        {REPORT_STATUS_LABELS[report.status]}
                      </span>
                      <span className="rounded bg-[var(--bg-elev-1)] px-2 py-0.5 text-xs text-[var(--text-secondary)]">
                        {CONTENT_TYPE_LABELS[report.contentType]}
                      </span>
                      <span className="rounded bg-[var(--bg-elev-1)] px-2 py-0.5 text-xs text-[var(--text-secondary)]">
                        {REPORT_REASON_LABELS[report.reason]}
                      </span>
                    </div>

                    <div className="text-sm text-[var(--text-secondary)]">
                      <span className="text-[var(--text-tertiary)]">Reported by:</span>{' '}
                      <Link
                        href={`/profile/${report.reporterId}`}
                        className="hover:text-[var(--text-primary)] hover:underline"
                      >
                        {report.reporterId.slice(0, 12)}...
                      </Link>
                      {report.reportedUserId && (
                        <>
                          {' | '}
                          <span className="text-[var(--text-tertiary)]">Against:</span>{' '}
                          <Link
                            href={`/profile/${report.reportedUserId}`}
                            className="hover:text-[var(--text-primary)] hover:underline"
                          >
                            {report.reportedUserId.slice(0, 12)}...
                          </Link>
                        </>
                      )}
                    </div>

                    {report.description && (
                      <p className="text-sm text-[var(--text-secondary)]">
                        <span className="text-[var(--text-tertiary)]">Details:</span>{' '}
                        {report.description}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-4 text-xs text-[var(--text-tertiary)]">
                      <span>Created: {formatDate(report.createdAt)}</span>
                      {report.reviewedAt && (
                        <span>Reviewed: {formatDate(report.reviewedAt)}</span>
                      )}
                      {report.action && <span>Action: {report.action}</span>}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2">
                    {contentLink && (
                      <Link
                        href={contentLink}
                        target="_blank"
                        className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-elev-1)] px-3 py-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-elev-2)] hover:text-[var(--text-primary)]"
                      >
                        View Content
                      </Link>
                    )}

                    {report.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleStatusChange(report.id, 'reviewed')}
                          disabled={isUpdating}
                          className="rounded-md bg-[var(--accent-muted)] px-3 py-1.5 text-sm text-[var(--accent)] transition-colors hover:bg-red-500/30 disabled:opacity-50"
                        >
                          Start Review
                        </button>
                        <button
                          onClick={() => handleStatusChange(report.id, 'dismissed', 'No action needed')}
                          disabled={isUpdating}
                          className="rounded-md bg-gray-500/20 px-3 py-1.5 text-sm text-gray-400 transition-colors hover:bg-gray-500/30 disabled:opacity-50"
                        >
                          Dismiss
                        </button>
                      </>
                    )}

                    {report.status === 'reviewed' && (
                      <>
                        <button
                          onClick={() => {
                            const action = prompt('Enter action taken (e.g., "Content removed", "User warned"):');
                            if (action) handleStatusChange(report.id, 'resolved', action);
                          }}
                          disabled={isUpdating}
                          className="rounded-md bg-green-500/20 px-3 py-1.5 text-sm text-[var(--success)] transition-colors hover:bg-green-500/30 disabled:opacity-50"
                        >
                          Resolve
                        </button>
                        <button
                          onClick={() => handleStatusChange(report.id, 'dismissed', 'No action needed')}
                          disabled={isUpdating}
                          className="rounded-md bg-gray-500/20 px-3 py-1.5 text-sm text-gray-400 transition-colors hover:bg-gray-500/30 disabled:opacity-50"
                        >
                          Dismiss
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Load more */}
          {hasMore && (
            <div className="flex justify-center pt-4">
              <button
                onClick={() => loadReports(false)}
                disabled={loading}
                className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elev-2)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-elev-1)] disabled:opacity-50"
              >
                {loading ? 'Loading...' : 'Load More'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ReportsTab;
