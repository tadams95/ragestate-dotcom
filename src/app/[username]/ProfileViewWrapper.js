'use client';

import ProfileView from '../profile/ProfileView';

/**
 * Client component wrapper for ProfileView.
 * Used by the server component page after username validation.
 */
export default function ProfileViewWrapper({ username }) {
  return <ProfileView params={{ userId: username }} />;
}
