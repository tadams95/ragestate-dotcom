import { Suspense } from 'react';
import ShopClient from './ShopClient';

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
