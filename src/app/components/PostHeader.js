'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '../../../firebase/context/FirebaseContext';
import Followbutton from './Followbutton';

export default function PostHeader({ author, timestamp, avatarUrl, usernameLower, authorUserId }) {
  const { currentUser } = useAuth();
  return (
    <div className="mb-2 flex items-center justify-between">
      <div className="flex items-center space-x-2">
        {/* Avatar */}
        {usernameLower ? (
          <Link href={`/u/${usernameLower}`} prefetch={false} className="block active:opacity-80">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt={author || 'User'}
                width={32}
                height={32}
                sizes="32px"
                loading="lazy"
                className="h-8 w-8 rounded-md border border-white/10 object-cover"
              />
            ) : (
              <div className="h-8 w-8 rounded-md bg-gray-500" />
            )}
          </Link>
        ) : avatarUrl ? (
          <Image
            src={avatarUrl}
            alt={author || 'User'}
            width={32}
            height={32}
            sizes="32px"
            loading="lazy"
            className="h-8 w-8 rounded-md border border-white/10 object-cover"
          />
        ) : (
          <div className="h-8 w-8 rounded-md bg-gray-500" />
        )}
        <div>
          {usernameLower ? (
            <Link
              href={`/u/${usernameLower}`}
              prefetch={false}
              className="text-[15px] font-semibold leading-5 text-white hover:underline active:opacity-90"
            >
              {author || 'Username'}
            </Link>
          ) : (
            <p className="text-[15px] font-semibold leading-5 text-white">{author || 'Username'}</p>
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
