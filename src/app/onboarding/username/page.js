import { Suspense } from 'react';
import OnboardingUsernameClient from './onboarding-username.client';

export default function OnboardingUsernamePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[var(--bg-root)]">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--border-subtle)] border-t-[var(--accent)]" />
        </div>
      }
    >
      <OnboardingUsernameClient />
    </Suspense>
  );
}
