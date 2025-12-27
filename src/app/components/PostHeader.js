'use client';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '../../../firebase/context/FirebaseContext';
import Followbutton from './Followbutton';

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
  onEdit,
  onTogglePrivacy,
  onDelete,
}) {
  const { currentUser } = useAuth();
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
                className="h-8 w-8 rounded-md border border-white/10 object-cover"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-md border border-white/10 bg-white/5">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="h-5 w-5 text-gray-400"
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
            className="h-8 w-8 rounded-md border border-white/10 object-cover"
          />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-md border border-white/10 bg-white/5">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="h-5 w-5 text-gray-400"
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
            <Link
              href={`/${usernameLower}`}
              prefetch={false}
              className="text-[15px] font-semibold leading-5 text-white hover:underline active:opacity-90"
            >
              {displayName || `${usernameLower}`}
            </Link>
          ) : (
            <p className="text-[15px] font-semibold leading-5 text-white">
              {displayName || (authorUserId ? `uid:${String(authorUserId).slice(0, 8)}` : '')}
            </p>
          )}
          {postId ? (
            <Link
              href={`/post/${postId}`}
              prefetch={false}
              className="text-xs text-gray-400 transition-colors hover:text-gray-200"
              title="View post"
            >
              {timestamp || 'Time ago'}
            </Link>
          ) : (
            <p className="text-xs text-gray-400">{timestamp || 'Time ago'}</p>
          )}
        </div>
      </div>
      {!hideFollow && authorUserId && currentUser?.uid !== authorUserId && (
        <Followbutton targetUserId={authorUserId} variant="compact" />
      )}
      {isAuthor && (
        <Menu as="div" className="relative inline-block text-left">
          <MenuButton
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/10 bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white"
            aria-label="Post options"
          >
            ⋯
          </MenuButton>
          <MenuItems className="absolute right-0 z-10 mt-2 w-44 origin-top-right rounded-md border border-white/10 bg-[#0d0d0f] p-1 shadow-xl focus:outline-none">
            <MenuItem>
              {({ active }) => (
                <button
                  className={`w-full rounded px-3 py-2 text-left text-sm ${active ? 'bg-white/10 text-white' : 'text-gray-300'}`}
                  onClick={() => onEdit?.()}
                >
                  Edit
                </button>
              )}
            </MenuItem>
            <MenuItem>
              {({ active }) => (
                <button
                  className={`w-full rounded px-3 py-2 text-left text-sm ${active ? 'bg-white/10 text-white' : 'text-gray-300'}`}
                  onClick={() => onTogglePrivacy?.()}
                >
                  {isPublic ? 'Make Private' : 'Make Public'}
                </button>
              )}
            </MenuItem>
            <MenuItem>
              {({ active }) => (
                <button
                  className={`w-full rounded px-3 py-2 text-left text-sm ${active ? 'bg-white/10 text-white' : 'text-red-300'}`}
                  onClick={() => onDelete?.()}
                >
                  Delete
                </button>
              )}
            </MenuItem>
          </MenuItems>
        </Menu>
      )}
    </div>
  );
}
