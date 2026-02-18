import { Suspense } from 'react';
import EventsClient from './EventsClient';

export const metadata = {
  title: 'Events | RAGESTATE',
  description:
    'Discover upcoming electronic music events, festivals, and raves. Get tickets to the hottest shows.',
  alternates: { canonical: '/events' },
  openGraph: {
    title: 'Events | RAGESTATE',
    description: 'Discover upcoming electronic music events, festivals, and raves.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Events | RAGESTATE',
    description: 'Discover upcoming electronic music events, festivals, and raves.',
  },
};

export default function Events() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[var(--bg-root)] text-[var(--text-secondary)] transition-colors duration-200">
          <span>Loading events...</span>
        </div>
      }
    >
      <EventsClient />
    </Suspense>
  );
}
