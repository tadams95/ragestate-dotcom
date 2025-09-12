'use client';

import ProfileView from '../profile/ProfileView';

export default function UsernameProfilePage({ params }) {
  return <ProfileView params={{ userId: params?.username || '' }} />;
}
