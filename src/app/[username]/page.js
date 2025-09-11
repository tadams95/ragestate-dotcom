'use client';

import ProfilePage from '../profile/[userId]/page';

export default function UsernameProfilePage({ params }) {
  return <ProfilePage params={{ userId: params?.username || '' }} />;
}
