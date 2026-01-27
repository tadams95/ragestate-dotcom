'use client';

import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import Image from 'next/image';
import Link from 'next/link';
import { memo, useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../../firebase/context/FirebaseContext';
import { useAppDispatch, useAppSelector } from '../../../lib/hooks';
import { getBlockedUsers, unblockUser } from '../../../lib/firebase/relationshipService';
import { getCachedProfile } from '../../../lib/firebase/cachedServices';
import {
  removeBlockedUserId,
  addBlockedUserId,
  selectBlockedUserIds,
} from '../../../lib/features/relationshipSlice';

/**
 * @typedef {Object} BlockedUsersModalProps
 * @property {boolean} open - Whether the modal is open
 * @property {() => void} onClose - Callback to close the modal
 */

/**
 * Modal for viewing and managing blocked users
 * @param {BlockedUsersModalProps} props
 */
function BlockedUsersModal({ open, onClose }) {
  const { currentUser } = useAuth();
  const dispatch = useAppDispatch();
  const blockedUserIds = useAppSelector(selectBlockedUserIds);
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [unblockingId, setUnblockingId] = useState(null);

  // Load blocked users with profile info
  useEffect(() => {
    if (!open || !currentUser?.uid) return;

    let cancelled = false;

    async function loadBlockedUsers() {
      setIsLoading(true);
      try {
        const { blocks } = await getBlockedUsers(currentUser.uid);

        // Fetch profile info for each blocked user
        const usersWithProfiles = await Promise.all(
          blocks.map(async (block) => {
            try {
              const profile = await getCachedProfile(block.blockedId);
              return {
                id: block.blockedId,
                createdAt: block.createdAt,
                displayName: profile?.displayName || 'Unknown',
                username: profile?.usernameLower || null,
                photoURL: profile?.photoURL || profile?.profilePicture || null,
              };
            } catch {
              return {
                id: block.blockedId,
                createdAt: block.createdAt,
                displayName: 'Unknown',
                username: null,
                photoURL: null,
              };
            }
          })
        );

        if (!cancelled) {
          setBlockedUsers(usersWithProfiles);
        }
      } catch (error) {
        console.error('Failed to load blocked users:', error);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadBlockedUsers();

    return () => {
      cancelled = true;
    };
  }, [open, currentUser?.uid]);

  const handleUnblock = useCallback(
    async (userId) => {
      if (!currentUser?.uid || unblockingId) return;

      setUnblockingId(userId);

      try {
        // Optimistic update
        dispatch(removeBlockedUserId(userId));
        setBlockedUsers((prev) => prev.filter((u) => u.id !== userId));

        await unblockUser(currentUser.uid, userId);
      } catch (error) {
        console.error('Failed to unblock user:', error);
        // Revert optimistic updates
        dispatch(addBlockedUserId(userId));
        // Reload the list
        const { blocks } = await getBlockedUsers(currentUser.uid);
        const usersWithProfiles = await Promise.all(
          blocks.map(async (block) => {
            try {
              const profile = await getCachedProfile(block.blockedId);
              return {
                id: block.blockedId,
                createdAt: block.createdAt,
                displayName: profile?.displayName || 'Unknown',
                username: profile?.usernameLower || null,
                photoURL: profile?.photoURL || profile?.profilePicture || null,
              };
            } catch {
              return {
                id: block.blockedId,
                createdAt: block.createdAt,
                displayName: 'Unknown',
                username: null,
                photoURL: null,
              };
            }
          })
        );
        setBlockedUsers(usersWithProfiles);
        alert('Failed to unblock user. Please try again.');
      } finally {
        setUnblockingId(null);
      }
    },
    [currentUser?.uid, unblockingId, dispatch]
  );

  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <DialogBackdrop className="fixed inset-0 bg-black/60" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="w-full max-w-md rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elev-1)] p-6 shadow-xl">
          <div className="mb-4 flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold text-[var(--text-primary)]">
              Blocked Users
            </DialogTitle>
            <button
              onClick={onClose}
              className="rounded-md p-1 text-[var(--text-secondary)] hover:bg-[var(--bg-elev-2)] hover:text-[var(--text-primary)]"
              aria-label="Close"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="h-5 w-5"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--text-tertiary)] border-t-transparent" />
              </div>
            ) : blockedUsers.length === 0 ? (
              <p className="py-8 text-center text-sm text-[var(--text-tertiary)]">
                You haven&apos;t blocked anyone yet.
              </p>
            ) : (
              <ul className="space-y-2">
                {blockedUsers.map((user) => (
                  <li
                    key={user.id}
                    className="flex items-center justify-between rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elev-2)] p-3"
                  >
                    <div className="flex items-center gap-3">
                      {user.photoURL ? (
                        <Image
                          src={user.photoURL}
                          alt={user.displayName}
                          width={40}
                          height={40}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--bg-elev-1)]">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            className="h-5 w-5 text-[var(--text-tertiary)]"
                          >
                            <path
                              fillRule="evenodd"
                              d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                      )}
                      <div>
                        {user.username ? (
                          <Link
                            href={`/${user.username}`}
                            className="font-medium text-[var(--text-primary)] hover:underline"
                            onClick={onClose}
                          >
                            @{user.username}
                          </Link>
                        ) : (
                          <span className="font-medium text-[var(--text-primary)]">
                            {user.displayName}
                          </span>
                        )}
                        <p className="text-xs text-[var(--text-tertiary)]">
                          Blocked {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : ''}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleUnblock(user.id)}
                      disabled={unblockingId === user.id}
                      className="rounded-lg border border-[var(--border-subtle)] px-3 py-1.5 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-elev-1)] hover:text-[var(--text-primary)] disabled:opacity-50"
                    >
                      {unblockingId === user.id ? 'Unblocking...' : 'Unblock'}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <p className="mt-4 text-xs text-[var(--text-tertiary)]">
            Blocked users can&apos;t see your posts or interact with you.
          </p>
        </DialogPanel>
      </div>
    </Dialog>
  );
}

export default memo(BlockedUsersModal);
