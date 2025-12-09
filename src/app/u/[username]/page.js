import { notFound, redirect } from 'next/navigation';
import { getUserByUsername } from '../../../../lib/server-only/getUserByUsername';

/**
 * Server component that validates username and redirects to root-level profile.
 * If username doesn't exist, triggers 404 instead of redirecting to invalid path.
 */
export default async function UsernameResolverPage({ params }) {
  const { username } = await params;
  const usernameLower = String(username || '')
    .trim()
    .toLowerCase();

  if (!usernameLower) {
    notFound();
  }

  // Check if username exists before redirecting via server-only function
  const user = await getUserByUsername(usernameLower);

  if (!user) {
    notFound();
  }

  // Username exists, redirect to root-level profile route
  redirect(`/${usernameLower}`);
}
