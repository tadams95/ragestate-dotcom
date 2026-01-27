'use client';

import { Dialog, DialogPanel, DialogTitle, RadioGroup } from '@headlessui/react';
import { memo, useCallback, useState } from 'react';
import { useAuth } from '../../../firebase/context/FirebaseContext';
import { submitReport } from '../../../lib/firebase/reportService';
import { REPORT_REASON_LABELS } from '../../../lib/types/report';

const REPORT_REASONS = ['harassment', 'spam', 'inappropriate', 'scam', 'other'];

/**
 * @typedef {Object} ReportModalProps
 * @property {boolean} isOpen - Whether the modal is open
 * @property {() => void} onClose - Close handler
 * @property {'post' | 'comment' | 'profile' | 'chat'} contentType - Type of content being reported
 * @property {string} contentId - ID of the content being reported
 * @property {string} [reportedUserId] - ID of the user who owns the content
 */

/**
 * Modal for submitting content reports
 * @param {ReportModalProps} props
 */
function ReportModal({ isOpen, onClose, contentType, contentId, reportedUserId }) {
  const { currentUser } = useAuth();
  const [selectedReason, setSelectedReason] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!currentUser?.uid || !selectedReason) return;

    setIsSubmitting(true);
    setError('');

    try {
      await submitReport({
        reporterId: currentUser.uid,
        reportedUserId: reportedUserId || null,
        contentType,
        contentId,
        reason: selectedReason,
        description: description.trim() || undefined,
      });

      setSuccess(true);
      // Auto-close after short delay
      setTimeout(() => {
        onClose();
        // Reset state after close
        setSelectedReason('');
        setDescription('');
        setSuccess(false);
      }, 1500);
    } catch (err) {
      console.error('Failed to submit report:', err);
      setError(err.message || 'Failed to submit report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [currentUser?.uid, selectedReason, description, contentType, contentId, reportedUserId, onClose]);

  const handleClose = useCallback(() => {
    if (!isSubmitting) {
      onClose();
      // Reset state
      setSelectedReason('');
      setDescription('');
      setError('');
      setSuccess(false);
    }
  }, [isSubmitting, onClose]);

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onClose={handleClose} className="relative z-50">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60" aria-hidden="true" />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="w-full max-w-md rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elev-1)] p-6 shadow-xl">
          {success ? (
            // Success state
            <div className="flex flex-col items-center py-4 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-500/20">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="h-6 w-6 text-green-500"
                >
                  <path
                    fillRule="evenodd"
                    d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">Report Submitted</h3>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Thank you for helping keep our community safe.
              </p>
            </div>
          ) : (
            <>
              <DialogTitle className="text-lg font-semibold text-[var(--text-primary)]">
                Report Content
              </DialogTitle>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Help us understand what&apos;s wrong with this content.
              </p>

              {error && (
                <div className="mt-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-400">
                  {error}
                </div>
              )}

              {/* Reason selection */}
              <div className="mt-4">
                <label className="mb-2 block text-sm font-medium text-[var(--text-primary)]">
                  Reason for report
                </label>
                <RadioGroup value={selectedReason} onChange={setSelectedReason} className="space-y-2">
                  {REPORT_REASONS.map((reason) => (
                    <RadioGroup.Option
                      key={reason}
                      value={reason}
                      className={({ checked }) =>
                        `flex cursor-pointer items-center rounded-lg border p-3 transition-colors ${
                          checked
                            ? 'border-[var(--accent)] bg-[var(--accent)]/10'
                            : 'border-[var(--border-subtle)] hover:bg-[var(--bg-elev-2)]'
                        }`
                      }
                    >
                      {({ checked }) => (
                        <>
                          <div
                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                              checked
                                ? 'border-[var(--accent)] bg-[var(--accent)]'
                                : 'border-[var(--border-subtle)]'
                            }`}
                          >
                            {checked && (
                              <div className="h-2 w-2 rounded-full bg-white" />
                            )}
                          </div>
                          <span className="ml-3 text-sm text-[var(--text-primary)]">
                            {REPORT_REASON_LABELS[reason]}
                          </span>
                        </>
                      )}
                    </RadioGroup.Option>
                  ))}
                </RadioGroup>
              </div>

              {/* Optional description */}
              <div className="mt-4">
                <label
                  htmlFor="report-description"
                  className="mb-2 block text-sm font-medium text-[var(--text-primary)]"
                >
                  Additional details (optional)
                </label>
                <textarea
                  id="report-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide any additional context..."
                  rows={3}
                  maxLength={500}
                  className="w-full resize-none rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elev-2)] p-3 text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none transition-colors focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
                />
                <p className="mt-1 text-xs text-[var(--text-tertiary)]">
                  {description.length}/500 characters
                </p>
              </div>

              {/* Actions */}
              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="flex-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elev-2)] px-4 py-2.5 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-elev-1)] disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!selectedReason || isSubmitting}
                  className="flex-1 rounded-lg bg-red-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Report'}
                </button>
              </div>
            </>
          )}
        </DialogPanel>
      </div>
    </Dialog>
  );
}

export default memo(ReportModal);
