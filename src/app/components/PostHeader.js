'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '../../../firebase/context/FirebaseContext';
import Followbutton from './Followbutton';

export default function PostHeader({ author, timestamp, avatarUrl, usernameLower, authorUserId }) {
  const { currentUser } = useAuth();
  const displayName = author || (usernameLower ? `@${usernameLower}` : authorUserId ? `uid:${String(authorUserId).slice(0, 8)}` : '');
  const altText = `${(usernameLower ? `@${usernameLower}` : author || 'user')} avatar`;
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
              <div className="h-8 w-8 rounded-md bg-white/10 animate-pulse" />
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
          <div className="h-8 w-8 rounded-md bg-white/10 animate-pulse" />
        )}
        <div>
          {usernameLower ? (
            <Link
              href={`/${usernameLower}`}
              prefetch={false}
              className="text-[15px] font-semibold leading-5 text-white hover:underline active:opacity-90"
            >
              {displayName || `@${usernameLower}`}
            </Link>
          ) : (
            <p className="text-[15px] font-semibold leading-5 text-white">
              {displayName || (authorUserId ? `uid:${String(authorUserId).slice(0, 8)}` : '')}
            </p>
          )}
          <p className="text-xs text-gray-400">{timestamp || 'Time ago'}</p>
        </div>
      </div>
      {authorUserId && currentUser?.uid !== authorUserId && (
        <Followbutton targetUserId={authorUserId} variant="compact" />
      )}
    </div>
  );
}
