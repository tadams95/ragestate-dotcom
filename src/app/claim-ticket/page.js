import { Suspense } from 'react';
import ClaimTicketClient from './claim-ticket.client';

export const metadata = {
  title: 'Claim Your Ticket | RAGESTATE',
  description: 'Claim a ticket that was transferred to you',
};

function LoadingFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg-base)]">
      <div className="flex flex-col items-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-[var(--border-subtle)] border-t-red-500"></div>
        <p className="mt-4 text-[var(--text-secondary)]">Loading...</p>
      </div>
    </div>
  );
}

export default function ClaimTicketPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ClaimTicketClient />
    </Suspense>
  );
}
