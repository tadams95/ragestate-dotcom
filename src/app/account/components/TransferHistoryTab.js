'use client';

import {
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { collection, getDocs, limit, orderBy, query, startAfter, where } from 'firebase/firestore';
import { useCallback, useEffect, useState } from 'react';
import { db } from '../../../../firebase/firebase';

const PAGE_SIZE = 10;

/**
 * Get status badge styling based on transfer status
 */
function getStatusBadge(status) {
  switch (status) {
    case 'claimed':
      return {
        label: 'Claimed',
        icon: CheckCircleIcon,
        className: 'bg-green-500/20 text-green-400',
      };
    case 'pending':
      return {
        label: 'Pending',
        icon: ClockIcon,
        className: 'bg-amber-500/20 text-amber-400',
      };
    case 'expired':
      return {
        label: 'Expired',
        icon: XCircleIcon,
        className: 'bg-gray-500/30 text-gray-400',
      };
    case 'cancelled':
      return {
        label: 'Cancelled',
        icon: XCircleIcon,
        className: 'bg-red-500/20 text-red-400',
      };
    default:
      return {
        label: status || 'Unknown',
        icon: ClockIcon,
        className: 'bg-gray-500/30 text-gray-400',
      };
  }
}

/**
 * Format relative time (e.g., "2 days ago", "3 hours ago")
 */
function formatRelativeTime(date) {
  if (!date) return '';
  const now = new Date();
  const then = date instanceof Date ? date : date.toDate ? date.toDate() : new Date(date);
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return then.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function TransferHistoryTab({ userId, containerStyling, cardStyling }) {
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'sent' | 'received'
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);

  // Fetch transfers based on filter
  const fetchTransfers = useCallback(
    async (cursor = null) => {
      if (!userId) return;

      const transfersRef = collection(db, 'ticketTransfers');
      let constraints = [];

      if (activeFilter === 'sent') {
        constraints = [where('fromUserId', '==', userId)];
      } else if (activeFilter === 'received') {
        constraints = [where('toUserId', '==', userId)];
      } else {
        // For 'all', we need to fetch both sent and received separately
        // Firestore doesn't support OR queries across different fields easily
        // So we'll do two queries and merge
      }

      if (activeFilter === 'all') {
        // Fetch sent
        const sentQuery = query(
          transfersRef,
          where('fromUserId', '==', userId),
          orderBy('createdAt', 'desc'),
          limit(PAGE_SIZE),
        );
        // Fetch received
        const receivedQuery = query(
          transfersRef,
          where('toUserId', '==', userId),
          orderBy('createdAt', 'desc'),
          limit(PAGE_SIZE),
        );

        const [sentSnap, receivedSnap] = await Promise.all([
          getDocs(sentQuery),
          getDocs(receivedQuery),
        ]);

        const sentDocs = sentSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
          direction: 'sent',
        }));
        const receivedDocs = receivedSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
          direction: 'received',
        }));

        // Merge and sort by createdAt
        const allDocs = [...sentDocs, ...receivedDocs].sort((a, b) => {
          const aTime = a.createdAt?.toDate?.() || new Date(a.createdAt);
          const bTime = b.createdAt?.toDate?.() || new Date(b.createdAt);
          return bTime - aTime;
        });

        // Dedupe (in case same transfer appears in both - shouldn't happen but safety)
        const seen = new Set();
        const uniqueDocs = allDocs.filter((d) => {
          if (seen.has(d.id)) return false;
          seen.add(d.id);
          return true;
        });

        setTransfers(uniqueDocs.slice(0, PAGE_SIZE * 2));
        setHasMore(false); // Simplified - no pagination for 'all' filter
        return;
      }

      // Single direction query with pagination
      let q = query(transfersRef, ...constraints, orderBy('createdAt', 'desc'), limit(PAGE_SIZE));

      if (cursor) {
        q = query(
          transfersRef,
          ...constraints,
          orderBy('createdAt', 'desc'),
          startAfter(cursor),
          limit(PAGE_SIZE),
        );
      }

      const snap = await getDocs(q);
      const docs = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        direction: activeFilter === 'sent' ? 'sent' : 'received',
      }));

      if (cursor) {
        setTransfers((prev) => [...prev, ...docs]);
      } else {
        setTransfers(docs);
      }

      setLastDoc(snap.docs[snap.docs.length - 1] || null);
      setHasMore(snap.docs.length === PAGE_SIZE);
    },
    [userId, activeFilter],
  );

  // Load on mount and when filter changes
  useEffect(() => {
    setLoading(true);
    setLastDoc(null);
    fetchTransfers().finally(() => setLoading(false));
  }, [fetchTransfers]);

  // Load more handler
  const handleLoadMore = async () => {
    if (!hasMore || loadingMore || !lastDoc) return;
    setLoadingMore(true);
    await fetchTransfers(lastDoc);
    setLoadingMore(false);
  };

  return (
    <div className={containerStyling}>
      <h2 className="mb-4 text-2xl font-bold text-[var(--text-primary)]">Transfer History</h2>
      <p className="mb-6 text-sm text-[var(--text-secondary)]">
        View tickets you&apos;ve sent to friends or received from others.
      </p>

      {/* Filter Tabs */}
      <div className="mb-6 flex gap-2">
        {[
          { key: 'all', label: 'All' },
          { key: 'sent', label: 'Sent', icon: ArrowUpTrayIcon },
          { key: 'received', label: 'Received', icon: ArrowDownTrayIcon },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveFilter(key)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              activeFilter === key
                ? 'bg-red-600 text-white'
                : 'bg-[var(--bg-elev-2)] text-[var(--text-secondary)] hover:bg-[var(--bg-elev-3)] hover:text-[var(--text-primary)]'
            }`}
          >
            {Icon && <Icon className="h-4 w-4" />}
            {label}
          </button>
        ))}
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-red-500"></div>
        </div>
      ) : transfers.length === 0 ? (
        /* Empty State */
        <div className="py-10 text-center">
          <div className="mx-auto h-12 w-12 text-[var(--text-tertiary)]">
            {activeFilter === 'sent' ? (
              <ArrowUpTrayIcon className="h-full w-full" />
            ) : activeFilter === 'received' ? (
              <ArrowDownTrayIcon className="h-full w-full" />
            ) : (
              <ClockIcon className="h-full w-full" />
            )}
          </div>
          <h3 className="mt-2 text-sm font-medium text-[var(--text-primary)]">No transfers yet</h3>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {activeFilter === 'sent'
              ? "You haven't sent any tickets yet."
              : activeFilter === 'received'
                ? "You haven't received any tickets yet."
                : 'Your transfer history will appear here.'}
          </p>
        </div>
      ) : (
        /* Transfer List */
        <div className="space-y-3">
          {transfers.map((transfer) => {
            const { label, icon: StatusIcon, className } = getStatusBadge(transfer.status);
            const isSent = transfer.direction === 'sent' || transfer.fromUserId === userId;

            return (
              <div key={transfer.id} className={`${cardStyling} flex items-center gap-4 !p-4`}>
                {/* Direction Icon */}
                <div
                  className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${
                    isSent ? 'bg-red-500/20' : 'bg-green-500/20'
                  }`}
                >
                  {isSent ? (
                    <ArrowUpTrayIcon className="h-5 w-5 text-red-400" />
                  ) : (
                    <ArrowDownTrayIcon className="h-5 w-5 text-green-400" />
                  )}
                </div>

                {/* Transfer Details */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[var(--text-primary)]">
                      {transfer.eventName || 'Event'}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${className}`}
                    >
                      <StatusIcon className="h-3 w-3" />
                      {label}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm text-[var(--text-secondary)]">
                    {isSent ? (
                      <>
                        Sent to{' '}
                        <span className="font-medium text-[var(--text-primary)]">
                          {transfer.toUsername
                            ? `@${transfer.toUsername}`
                            : transfer.toEmail || 'Unknown'}
                        </span>
                      </>
                    ) : (
                      <>
                        From{' '}
                        <span className="font-medium text-[var(--text-primary)]">
                          {transfer.fromName || 'Someone'}
                        </span>
                      </>
                    )}
                  </p>
                  {transfer.ticketQuantity > 1 && (
                    <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">
                      {transfer.ticketQuantity} tickets
                    </p>
                  )}
                </div>

                {/* Timestamp */}
                <div className="flex-shrink-0 text-right">
                  <span className="text-xs text-[var(--text-tertiary)]">
                    {formatRelativeTime(transfer.createdAt)}
                  </span>
                </div>
              </div>
            );
          })}

          {/* Load More Button */}
          {hasMore && activeFilter !== 'all' && (
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="flex h-10 w-full items-center justify-center rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elev-2)] text-sm font-medium text-[var(--text-secondary)] transition hover:bg-[var(--bg-elev-3)] hover:text-[var(--text-primary)] disabled:opacity-50"
            >
              {loadingMore ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--border-subtle)] border-t-red-500"></div>
              ) : (
                'Load More'
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
