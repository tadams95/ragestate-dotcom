'use client';

import { EnvelopeIcon, PaperAirplaneIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import { getAuth } from 'firebase/auth';
import { collection, getDocs, getFirestore, limit, orderBy, query } from 'firebase/firestore';
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  adminButtonOutline,
  adminButtonPrimary,
  adminCard,
  adminInput,
} from './shared/adminStyles';
import { useDirectionalWipe } from '../../../../lib/hooks/useDirectionalWipe';

/**
 * CampaignsTab - Admin tool for managing email captures and sending campaigns
 * Uses existing SES infrastructure via Cloud Function endpoint
 */
export default function CampaignsTab() {
  const [captures, setCaptures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [stats, setStats] = useState({ total: 0, subscribed: 0, bySource: {} });

  // Campaign form state
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [filterSource, setFilterSource] = useState('all');
  const [filterEventId, setFilterEventId] = useState('');
  const [previewMode, setPreviewMode] = useState(false);

  const db = getFirestore();
  const { onMouseEnter, onMouseLeave } = useDirectionalWipe();

  // Fetch email captures
  const fetchCaptures = useCallback(async () => {
    setLoading(true);
    try {
      const capturesRef = collection(db, 'emailCaptures');
      const q = query(capturesRef, orderBy('capturedAt', 'desc'), limit(500));
      const snap = await getDocs(q);

      const data = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        capturedAt: doc.data().capturedAt?.toDate?.() || null,
      }));

      setCaptures(data);

      // Calculate stats
      const subscribed = data.filter((c) => c.subscribed !== false);
      const bySource = data.reduce((acc, c) => {
        const src = c.source || 'unknown';
        acc[src] = (acc[src] || 0) + 1;
        return acc;
      }, {});

      setStats({
        total: data.length,
        subscribed: subscribed.length,
        bySource,
      });
    } catch (err) {
      console.error('Failed to fetch captures:', err);
      toast.error('Failed to load email captures');
    } finally {
      setLoading(false);
    }
  }, [db]);

  useEffect(() => {
    fetchCaptures();
  }, [fetchCaptures]);

  // Get filtered recipients based on current filters
  const getFilteredRecipients = useCallback(() => {
    let filtered = captures.filter((c) => c.subscribed !== false && c.email);

    if (filterSource !== 'all') {
      filtered = filtered.filter((c) => c.source === filterSource);
    }

    if (filterEventId.trim()) {
      filtered = filtered.filter((c) => c.eventId === filterEventId.trim());
    }

    // Dedupe by email
    const seen = new Set();
    return filtered.filter((c) => {
      const email = c.email.toLowerCase();
      if (seen.has(email)) return false;
      seen.add(email);
      return true;
    });
  }, [captures, filterSource, filterEventId]);

  // Send campaign
  const handleSendCampaign = async () => {
    if (!subject.trim() || !message.trim()) {
      toast.error('Subject and message are required');
      return;
    }

    const recipients = getFilteredRecipients();
    if (recipients.length === 0) {
      toast.error('No recipients match your filters');
      return;
    }

    // Confirm before sending
    const confirmed = window.confirm(
      `Send campaign to ${recipients.length} recipient${recipients.length > 1 ? 's' : ''}?\n\nSubject: ${subject}`,
    );
    if (!confirmed) return;

    setSending(true);
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) throw new Error('Not authenticated');

      const token = await user.getIdToken();
      const res = await fetch('/api/admin/send-campaign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          subject: subject.trim(),
          message: message.trim(),
          recipients: recipients.map((r) => r.email),
          filterSource: filterSource !== 'all' ? filterSource : undefined,
          filterEventId: filterEventId.trim() || undefined,
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        // Special handling for duplicate campaign error
        if (json.code === 'DUPLICATE_CAMPAIGN') {
          throw new Error(
            'This campaign was already sent recently. Wait 5 minutes before resending.',
          );
        }
        throw new Error(json.message || json.error || 'Failed to send');
      }

      toast.success(`Campaign sent to ${json.sent || recipients.length} recipients!`);
      setSubject('');
      setMessage('');
      setPreviewMode(false);
    } catch (err) {
      console.error('Send campaign error:', err);
      toast.error(err.message || 'Failed to send campaign');
    } finally {
      setSending(false);
    }
  };

  const filteredCount = getFilteredRecipients().length;
  const uniqueSources = [...new Set(captures.map((c) => c.source).filter(Boolean))];

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="wave-in-stagger grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className={`${adminCard} card-wipe-border animate-wave-in transition-shadow hover:shadow-lg`} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10">
              <EnvelopeIcon className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.total}</p>
              <p className="text-sm text-[var(--text-secondary)]">Total Captures</p>
            </div>
          </div>
        </div>
        <div className={`${adminCard} card-wipe-border animate-wave-in transition-shadow hover:shadow-lg`} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent-muted)]">
              <UserGroupIcon className="h-5 w-5 text-[var(--accent)]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.subscribed}</p>
              <p className="text-sm text-[var(--text-secondary)]">Subscribed</p>
            </div>
          </div>
        </div>
        <div className={`${adminCard} card-wipe-border animate-wave-in transition-shadow hover:shadow-lg`} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--bg-elev-2)]">
              <PaperAirplaneIcon className="h-5 w-5 text-[var(--text-secondary)]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--text-primary)]">{filteredCount}</p>
              <p className="text-sm text-[var(--text-secondary)]">Recipients (filtered)</p>
            </div>
          </div>
        </div>
      </div>

      {/* Campaign Composer */}
      <div className={adminCard}>
        <h3 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">Send Campaign</h3>

        {/* Filters */}
        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">
              Filter by Source
            </label>
            <select
              value={filterSource}
              onChange={(e) => setFilterSource(e.target.value)}
              className={adminInput}
            >
              <option value="all">All Sources ({stats.subscribed})</option>
              {uniqueSources.map((src) => (
                <option key={src} value={src}>
                  {src} ({stats.bySource[src] || 0})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">
              Filter by Event ID (optional)
            </label>
            <input
              type="text"
              value={filterEventId}
              onChange={(e) => setFilterEventId(e.target.value)}
              placeholder="e.g., event-slug"
              className={adminInput}
            />
          </div>
        </div>

        {/* Subject */}
        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">
            Subject
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="🎉 New Event Dropping Soon..."
            className={adminInput}
          />
        </div>

        {/* Message */}
        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">
            Message (plain text)
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={6}
            placeholder="Hey there! We've got something special coming up..."
            className={adminInput}
          />
          <p className="mt-1 text-xs text-[var(--text-tertiary)]">
            Keep it short and punchy. Links will be clickable.
          </p>
        </div>

        {/* Preview Toggle */}
        {previewMode && (
          <div className="mb-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elev-2)] p-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--text-tertiary)]">
              Preview ({filteredCount} recipient{filteredCount !== 1 ? 's' : ''})
            </p>
            <p className="mb-1 font-medium text-[var(--text-primary)]">
              {subject || '(No subject)'}
            </p>
            <p className="whitespace-pre-wrap text-sm text-[var(--text-secondary)]">
              {message || '(No message)'}
            </p>
            <p className="mt-3 text-xs text-[var(--text-tertiary)]">
              — RAGESTATE Team
              <br />
              <span className="text-[var(--text-tertiary)] opacity-60">
                Unsubscribe: support@ragestate.com
              </span>
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setPreviewMode(!previewMode)}
            className={adminButtonOutline}
          >
            {previewMode ? 'Hide Preview' : 'Preview'}
          </button>
          <button
            type="button"
            onClick={handleSendCampaign}
            disabled={sending || !subject.trim() || !message.trim() || filteredCount === 0}
            className={adminButtonPrimary}
          >
            {sending
              ? 'Sending...'
              : `Send to ${filteredCount} recipient${filteredCount !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>

      {/* Recent Captures Table */}
      <div className={adminCard}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">Recent Captures</h3>
          <button onClick={fetchCaptures} disabled={loading} className={adminButtonOutline}>
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        {loading ? (
          <div className="flex h-32 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-[var(--accent)]"></div>
          </div>
        ) : captures.length === 0 ? (
          <p className="py-8 text-center text-[var(--text-secondary)]">
            No email captures yet. They'll appear here when users subscribe.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] text-[var(--text-tertiary)]">
                  <th className="pb-2 pr-4 font-medium">Email</th>
                  <th className="pb-2 pr-4 font-medium">Source</th>
                  <th className="pb-2 pr-4 font-medium">Event</th>
                  <th className="pb-2 pr-4 font-medium">Date</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {captures.slice(0, 50).map((cap) => (
                  <tr key={cap.id} className="border-l-2 border-l-transparent border-b border-[var(--border-subtle)] transition-colors hover:border-l-[var(--accent)] last:border-0">
                    <td className="py-2 pr-4 text-[var(--text-primary)]">{cap.email}</td>
                    <td className="py-2 pr-4 text-[var(--text-secondary)]">{cap.source || '—'}</td>
                    <td className="py-2 pr-4 font-mono text-xs text-[var(--text-tertiary)]">
                      {cap.eventId || '—'}
                    </td>
                    <td className="py-2 pr-4 text-[var(--text-secondary)]">
                      {cap.capturedAt
                        ? cap.capturedAt.toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })
                        : '—'}
                    </td>
                    <td className="py-2">
                      {cap.subscribed !== false ? (
                        <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-xs text-[var(--success)]">
                          Subscribed
                        </span>
                      ) : (
                        <span className="rounded-full bg-gray-500/10 px-2 py-0.5 text-xs text-gray-500">
                          Unsubscribed
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {captures.length > 50 && (
              <p className="mt-2 text-center text-xs text-[var(--text-tertiary)]">
                Showing 50 of {captures.length} captures
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
