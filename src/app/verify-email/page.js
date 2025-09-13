import { Suspense } from 'react';
import VerifyEmailClient from './verify-email.client';

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black p-6 text-white">Loading…</div>}>
      <VerifyEmailClient />
    </Suspense>
  );
}
