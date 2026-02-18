import { Suspense } from 'react';
import ShopClient from './ShopClient';

export const metadata = {
  title: 'Shop | RAGESTATE',
  description:
    'Shop official RAGESTATE merchandise, apparel, and gear for the electronic music community.',
  alternates: { canonical: '/shop' },
  openGraph: {
    title: 'Shop | RAGESTATE',
    description: 'Shop official RAGESTATE merchandise, apparel, and gear.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Shop | RAGESTATE',
    description: 'Shop official RAGESTATE merchandise, apparel, and gear.',
  },
};

export default function Shop() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[var(--bg-root)] text-[var(--text-secondary)] transition-colors duration-200">
          <span>Loading shop...</span>
        </div>
      }
    >
      <ShopClient />
    </Suspense>
  );
}
