'use client';

import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { memo, useCallback, useState } from 'react';
import { useAuth } from '../../../firebase/context/FirebaseContext';
import { useAppDispatch, useAppSelector } from '../../../lib/hooks';
import {
  blockUser,
  unblockUser,
  muteUser,
  unmuteUser,
} from '../../../lib/firebase/relationshipService';
import {
  addBlockedUserId,
  removeBlockedUserId,
  addMutedUserId,
  removeMutedUserId,
  selectIsUserBlocked,
  selectIsUserMuted,
} from '../../../lib/features/relationshipSlice';

/**
 * @typedef {Object} BlockMuteMenuProps
 * @property {string} targetUserId - The user ID to block/mute
 * @property {string} [targetUsername] - The username for display purposes
 * @property {() => void} [onReport] - Callback to open report modal
 */

/**
 * Dropdown menu for block/mute actions on a post or profile
 * @param {BlockMuteMenuProps} props
 */
function BlockMuteMenu({ targetUserId, targetUsername, onReport }) {
  const { currentUser } = useAuth();
  const dispatch = useAppDispatch();
  const isBlocked = useAppSelector(selectIsUserBlocked(targetUserId));
  const isMuted = useAppSelector(selectIsUserMuted(targetUserId));
  const [isProcessing, setIsProcessing] = useState(false);

  const handleBlock = useCallback(async () => {
    if (!currentUser?.uid || !targetUserId || isProcessing) return;

    setIsProcessing(true);
    const wasBlocked = isBlocked;

    try {
      if (wasBlocked) {
        // Optimistic update
        dispatch(removeBlockedUserId(targetUserId));
        await unblockUser(currentUser.uid, targetUserId);
      } else {
        // Optimistic update
        dispatch(addBlockedUserId(targetUserId));
        await blockUser(currentUser.uid, targetUserId);
      }
    } catch (error) {
      console.error('Failed to toggle block:', error);
      // Revert optimistic update
      if (wasBlocked) {
        dispatch(addBlockedUserId(targetUserId));
      } else {
        dispatch(removeBlockedUserId(targetUserId));
      }
      alert('Failed to update block status. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  }, [currentUser?.uid, targetUserId, isBlocked, isProcessing, dispatch]);

  const handleMute = useCallback(async () => {
    if (!currentUser?.uid || !targetUserId || isProcessing) return;

    setIsProcessing(true);
    const wasMuted = isMuted;

    try {
      if (wasMuted) {
        // Optimistic update
        dispatch(removeMutedUserId(targetUserId));
        await unmuteUser(currentUser.uid, targetUserId);
      } else {
        // Optimistic update
        dispatch(addMutedUserId(targetUserId));
        await muteUser(currentUser.uid, targetUserId);
      }
    } catch (error) {
      console.error('Failed to toggle mute:', error);
      // Revert optimistic update
      if (wasMuted) {
        dispatch(addMutedUserId(targetUserId));
      } else {
        dispatch(removeMutedUserId(targetUserId));
      }
      alert('Failed to update mute status. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  }, [currentUser?.uid, targetUserId, isMuted, isProcessing, dispatch]);

  // Don't render if no current user or targeting self
  if (!currentUser?.uid || currentUser.uid === targetUserId) {
    return null;
  }

  const displayName = targetUsername || 'this user';

  return (
    <Menu as="div" className="relative inline-block text-left">
      <MenuButton
        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[var(--border-subtle)] bg-[var(--bg-elev-2)] text-[var(--text-secondary)] transition-colors duration-200 hover:bg-[var(--bg-elev-2)] hover:text-[var(--text-primary)]"
        aria-label="More options"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="h-5 w-5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM12.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM18.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"
          />
        </svg>
      </MenuButton>
      <MenuItems className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md border border-[var(--border-subtle)] bg-[var(--bg-elev-1)] p-1 shadow-xl transition-colors duration-200 focus:outline-none">
        {/* Mute option */}
        <MenuItem>
          {({ active }) => (
            <button
              className={`flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm ${
                active
                  ? 'bg-[var(--bg-elev-2)] text-[var(--text-primary)]'
                  : 'text-[var(--text-secondary)]'
              }`}
              onClick={handleMute}
              disabled={isProcessing}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="h-4 w-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17.25 9.75L19.5 12m0 0l2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6l4.72-4.72a.75.75 0 011.28.531V19.94a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.506-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.395C2.806 8.757 3.63 8.25 4.51 8.25H6.75z"
                />
              </svg>
              {isMuted ? `Unmute @${displayName}` : `Mute @${displayName}`}
            </button>
          )}
        </MenuItem>

        {/* Block option */}
        <MenuItem>
          {({ active }) => (
            <button
              className={`flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm ${
                active
                  ? 'bg-[var(--bg-elev-2)] text-[var(--text-primary)]'
                  : isBlocked
                    ? 'text-[var(--text-secondary)]'
                    : 'text-red-400'
              }`}
              onClick={handleBlock}
              disabled={isProcessing}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="h-4 w-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                />
              </svg>
              {isBlocked ? `Unblock @${displayName}` : `Block @${displayName}`}
            </button>
          )}
        </MenuItem>

        {/* Report option (if callback provided) */}
        {onReport && (
          <MenuItem>
            {({ active }) => (
              <button
                className={`flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm ${
                  active
                    ? 'bg-[var(--bg-elev-2)] text-[var(--text-primary)]'
                    : 'text-red-400'
                }`}
                onClick={onReport}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="h-4 w-4"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 3v1.5M3 21v-6m0 0l2.77-.693a9 9 0 016.208.682l.108.054a9 9 0 006.086.71l3.114-.732a48.524 48.524 0 01-.005-10.499l-3.11.732a9 9 0 01-6.085-.711l-.108-.054a9 9 0 00-6.208-.682L3 4.5M3 15V4.5"
                  />
                </svg>
                Report
              </button>
            )}
          </MenuItem>
        )}
      </MenuItems>
    </Menu>
  );
}

export default memo(BlockMuteMenu);
