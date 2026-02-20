'use client';

import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../../../firebase/context/FirebaseContext';
import { getAdminUserView } from '../../../../lib/firebase/adminService';
import { getProfile } from '../../../../lib/firebase/userService';
import { AdminErrorState, UserDetailSkeleton } from './shared';

/**
 * @typedef {Object} UserDetailModalProps
 * @property {string|null} userId
 * @property {boolean} isOpen
 * @property {() => void} onClose
 * @property {(uid: string, disabled: boolean) => void} onUserUpdated
 */

/**
 * Modal showing full user details with ban/unban actions
 * @param {UserDetailModalProps} props
 */
export default function UserDetailModal({ userId, isOpen, onClose, onUserUpdated }) {
  const { currentUser } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [rtdbData, setRtdbData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showBanConfirm, setShowBanConfirm] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchUserData = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    setShowBanConfirm(false);

    const [profileResult, rtdbResult] = await Promise.allSettled([
      getProfile(userId),
      getAdminUserView(userId),
    ]);

    const profile = profileResult.status === 'fulfilled' ? profileResult.value : null;
    const rtdb = rtdbResult.status === 'fulfilled' ? rtdbResult.value : null;

    if (!profile && !rtdb) {
      setError('Could not load user data from any source.');
    }

    setProfileData(profile);
    setRtdbData(rtdb);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    if (isOpen && userId) {
      fetchUserData();
    }
    return () => {
      setProfileData(null);
      setRtdbData(null);
      setLoading(true);
      setError(null);
      setShowBanConfirm(false);
    };
  }, [isOpen, userId, fetchUserData]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen || !userId) return null;

  const isDisabled = rtdbData?.disabled === true;
  const isAdmin = rtdbData?.isAdmin === true || rtdbData?.role === 'admin';
  const displayName =
    profileData?.displayName ||
    (rtdbData?.firstName && rtdbData?.lastName
      ? `${rtdbData.firstName} ${rtdbData.lastName}`
      : rtdbData?.displayName || rtdbData?.name || 'Unknown');
  const username = profileData?.username || rtdbData?.username;
  const avatarUrl = profileData?.photoURL || profileData?.profilePicture;
  const initial = (displayName?.[0] || '?').toUpperCase();

  const handleBanUnban = async () => {
    setActionLoading(true);
    try {
      const idToken = await currentUser.getIdToken();
      const res = await fetch('/api/admin/users/set-disabled', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, disabled: !isDisabled }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || 'Failed to update user');
        return;
      }
      toast.success(isDisabled ? 'User unbanned' : 'User banned');
      onUserUpdated(userId, !isDisabled);
      setShowBanConfirm(false);
      // Refresh data to reflect new state
      setRtdbData((prev) => (prev ? { ...prev, disabled: !isDisabled } : prev));
    } catch (e) {
      console.error('Ban/unban error:', e);
      toast.error('An error occurred');
    } finally {
      setActionLoading(false);
    }
  };

  const formatJoinDate = (date) => {
    if (!date) return 'N/A';
    const d = date instanceof Date ? date : date?.toDate?.() || new Date(date);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(d);
  };

  const statusBadge = isAdmin
    ? 'bg-[var(--accent-muted)] text-[var(--accent)]'
    : isDisabled
      ? 'bg-red-500/20 text-[var(--danger)]'
      : 'bg-green-500/20 text-[var(--success)]';
  const statusLabel = isAdmin ? 'Admin' : isDisabled ? 'Disabled' : 'Active';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="animate-modal-enter max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elev-1)] shadow-xl">
        {/* Close button */}
        <div className="flex justify-end p-4 pb-0">
          <button
            onClick={onClose}
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {loading ? (
          <UserDetailSkeleton />
        ) : error ? (
          <div className="p-6">
            <AdminErrorState title="Error loading user" message={error} onRetry={fetchUserData} />
          </div>
        ) : (
          <div className="space-y-6 p-6 pt-0">
            {/* Header: Avatar + Name + Status */}
            <div className="flex items-center gap-4">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="h-20 w-20 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-600 text-2xl font-bold text-white">
                  {initial}
                </div>
              )}
              <div>
                <h2 className="text-xl font-bold text-[var(--text-primary)]">{displayName}</h2>
                {username && (
                  <p className="text-sm text-[var(--text-secondary)]">@{username}</p>
                )}
                <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${statusBadge}`}>
                  {statusLabel}
                </span>
              </div>
            </div>

            {/* Info grid */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase text-[var(--text-tertiary)]">Email</p>
                <p className="text-sm text-[var(--text-primary)]">{rtdbData?.email || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-[var(--text-tertiary)]">Phone</p>
                <p className="text-sm text-[var(--text-primary)]">{rtdbData?.phoneNumber || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-[var(--text-tertiary)]">User ID</p>
                <p
                  className="cursor-pointer truncate font-mono text-sm text-[var(--text-primary)] hover:text-[var(--accent)]"
                  title="Click to copy"
                  onClick={() => {
                    navigator.clipboard.writeText(userId);
                    toast.success('UID copied');
                  }}
                >
                  {userId}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-[var(--text-tertiary)]">Join Date</p>
                <p className="text-sm text-[var(--text-primary)]">
                  {formatJoinDate(profileData?.createdAt)}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-[var(--text-tertiary)]">Role</p>
                <p className="text-sm text-[var(--text-primary)]">
                  {rtdbData ? (isAdmin ? 'Admin' : 'User') : 'Unknown'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-[var(--text-tertiary)]">Bio</p>
                <p className="text-sm text-[var(--text-primary)]">
                  {profileData?.bio || 'No bio'}
                </p>
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-lg bg-[var(--bg-elev-2)] p-3 text-center">
                <p className="text-lg font-bold text-[var(--text-primary)]">
                  {profileData?.followersCount ?? 'N/A'}
                </p>
                <p className="text-xs text-[var(--text-secondary)]">Followers</p>
              </div>
              <div className="rounded-lg bg-[var(--bg-elev-2)] p-3 text-center">
                <p className="text-lg font-bold text-[var(--text-primary)]">
                  {profileData?.followingCount ?? 'N/A'}
                </p>
                <p className="text-xs text-[var(--text-secondary)]">Following</p>
              </div>
              <div className="rounded-lg bg-[var(--bg-elev-2)] p-3 text-center">
                <p className="text-lg font-bold text-[var(--text-primary)]">
                  {profileData?.postsCount ?? 'N/A'}
                </p>
                <p className="text-xs text-[var(--text-secondary)]">Posts</p>
              </div>
            </div>

            {/* Footer actions */}
            <div className="flex items-center justify-end gap-3 border-t border-[var(--border-subtle)] pt-4">
              {showBanConfirm ? (
                <div className="flex w-full items-center justify-between">
                  <p className="text-sm text-[var(--warning)]">
                    {isDisabled
                      ? 'Unban this user? They will regain access immediately.'
                      : 'Ban this user? Their sessions will be invalidated immediately.'}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowBanConfirm(false)}
                      disabled={actionLoading}
                      className="rounded-md border border-[var(--border-subtle)] px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-elev-2)]"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleBanUnban}
                      disabled={actionLoading}
                      className={`rounded-md px-3 py-1.5 text-sm font-semibold text-white ${
                        isDisabled
                          ? 'bg-[var(--success)] hover:opacity-90'
                          : 'bg-red-600 hover:bg-red-500'
                      } disabled:opacity-50`}
                    >
                      {actionLoading ? 'Processing...' : 'Confirm'}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <button
                    onClick={onClose}
                    className="rounded-md border border-[var(--border-subtle)] px-4 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-elev-2)]"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => setShowBanConfirm(true)}
                    className={`rounded-md px-4 py-2 text-sm font-semibold text-white ${
                      isDisabled
                        ? 'bg-[var(--success)] hover:opacity-90'
                        : 'bg-red-600 hover:bg-red-500'
                    }`}
                  >
                    {isDisabled ? 'Unban User' : 'Ban User'}
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
