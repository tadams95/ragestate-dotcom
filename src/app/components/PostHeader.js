'use client';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useState } from 'react';
import { useAuth } from '../../../firebase/context/FirebaseContext';
import Followbutton from './Followbutton';
import BlockMuteMenu from './BlockMuteMenu';
import ReportModal from './ReportModal';

// Red checkmark badge for verified users (RAGESTATE brand)
function VerifiedBadge() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="ml-0.5 inline-block h-4 w-4 text-[#ff1f42]"
      aria-label="Verified"
      title="Verified"
    >
      <path
        fillRule="evenodd"
        d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.49 4.49 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export { VerifiedBadge };

export default function PostHeader({
  author,
  timestamp,
  avatarUrl,
  usernameLower,
  authorUserId,
  postId,
  hideFollow = false,
  isAuthor = false,
  isPublic = true,
  isVerified = false,
  onEdit,
  onTogglePrivacy,
  onDelete,
}) {
  const { currentUser } = useAuth();
  const [reportModalOpen, setReportModalOpen] = useState(false);

  const handleOpenReport = useCallback(() => {
    setReportModalOpen(true);
  }, []);
  const displayName =
    author ||
    (usernameLower
      ? `${usernameLower}`
      : authorUserId
        ? `uid:${String(authorUserId).slice(0, 8)}`
        : '');
  const altText = `${usernameLower ? `${usernameLower}` : author || 'user'} avatar`;
  return (
    <div className="mb-2 flex items-center justify-between">
      <div className="flex items-center space-x-2">
        {/* Avatar */}
        {usernameLower ? (
          <Link href={`/${usernameLower}`} prefetch={false} className="block active:opacity-80">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt={altText}
                width={32}
                height={32}
                sizes="32px"
                loading="lazy"
                className="h-8 w-8 rounded-md border border-[var(--border-subtle)] object-cover"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-md border border-[var(--border-subtle)] bg-[var(--bg-elev-2)]">
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
          </Link>
        ) : avatarUrl ? (
          <Image
            src={avatarUrl}
            alt={altText}
            width={32}
            height={32}
            sizes="32px"
            loading="lazy"
            className="h-8 w-8 rounded-md border border-[var(--border-subtle)] object-cover"
          />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-md border border-[var(--border-subtle)] bg-[var(--bg-elev-2)]">
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
        <div className="flex flex-col items-start gap-0.5">
          {usernameLower ? (
            <span className="flex items-center">
              <Link
                href={`/${usernameLower}`}
                prefetch={false}
                className="text-[15px] font-semibold leading-5 text-[var(--text-primary)] hover:underline active:opacity-90"
              >
                {displayName || `${usernameLower}`}
              </Link>
              {isVerified && <VerifiedBadge />}
            </span>
          ) : (
            <span className="flex items-center">
              <p className="text-[15px] font-semibold leading-5 text-[var(--text-primary)]">
                {displayName || (authorUserId ? `uid:${String(authorUserId).slice(0, 8)}` : '')}
              </p>
              {isVerified && <VerifiedBadge />}
            </span>
          )}
          {postId ? (
            <Link
              href={`/post/${postId}`}
              prefetch={false}
              className="text-xs font-medium text-[var(--text-tertiary)] transition-colors hover:text-[var(--text-secondary)]"
              title="View post"
            >
              {timestamp || 'Time ago'}
            </Link>
          ) : (
            <p className="text-xs font-medium text-[var(--text-tertiary)]">
              {timestamp || 'Time ago'}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {!hideFollow && authorUserId && currentUser?.uid !== authorUserId && (
          <Followbutton targetUserId={authorUserId} variant="compact" />
        )}
        {/* Block/Mute menu for non-author posts */}
        {currentUser?.uid && authorUserId && currentUser.uid !== authorUserId && (
          <BlockMuteMenu
            targetUserId={authorUserId}
            targetUsername={usernameLower}
            onReport={handleOpenReport}
          />
        )}
      </div>
      {isAuthor && (
        <Menu as="div" className="relative inline-block text-left">
          <MenuButton
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[var(--border-subtle)] bg-[var(--bg-elev-2)] text-[var(--text-secondary)] transition-colors duration-200 hover:bg-[var(--bg-elev-2)] hover:text-[var(--text-primary)]"
            aria-label="Post options"
          >
            ⋯
          </MenuButton>
          <MenuItems className="absolute right-0 z-10 mt-2 w-44 origin-top-right rounded-md border border-[var(--border-subtle)] bg-[var(--bg-elev-1)] p-1 shadow-xl transition-colors duration-200 focus:outline-none">
            <MenuItem>
              {({ active }) => (
                <button
                  className={`w-full rounded px-3 py-2 text-left text-sm ${active ? 'bg-[var(--bg-elev-2)] text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}
                  onClick={() => onEdit?.()}
                >
                  Edit
                </button>
              )}
            </MenuItem>
            <MenuItem>
              {({ active }) => (
                <button
                  className={`w-full rounded px-3 py-2 text-left text-sm ${active ? 'bg-[var(--bg-elev-2)] text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}
                  onClick={() => onTogglePrivacy?.()}
                >
                  {isPublic ? 'Make Private' : 'Make Public'}
                </button>
              )}
            </MenuItem>
            <MenuItem>
              {({ active }) => (
                <button
                  className={`w-full rounded px-3 py-2 text-left text-sm ${active ? 'bg-[var(--bg-elev-2)] text-[var(--text-primary)]' : 'text-red-400'}`}
                  onClick={() => onDelete?.()}
                >
                  Delete
                </button>
              )}
            </MenuItem>
          </MenuItems>
        </Menu>
      )}

      {/* Report Modal */}
      {postId && authorUserId && (
        <ReportModal
          isOpen={reportModalOpen}
          onClose={() => setReportModalOpen(false)}
          contentType="post"
          contentId={postId}
          reportedUserId={authorUserId}
        />
      )}
    </div>
  );
}
