import { notFound } from 'next/navigation';
import { getUserByUsername } from '../../../lib/server-only/getUserByUsername';
import ProfileViewWrapper from './ProfileViewWrapper';

/**
 * Server component that validates username existence before rendering profile.
 * If username doesn't exist in usernames collection, triggers 404.
 */
export default async function UsernameProfilePage({ params }) {
  const { username } = await params;
  const usernameLower = String(username || '')
    .trim()
    .toLowerCase();

  if (!usernameLower) {
    notFound();
  }

  // Check if username exists in Firestore via server-only function
  const user = await getUserByUsername(usernameLower);

  if (!user) {
    // Username not found - trigger 404
    notFound();
  }

  // Username exists, render the profile
  return <ProfileViewWrapper username={usernameLower} />;
}
