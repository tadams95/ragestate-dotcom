import { Suspense } from 'react';
import ShopClient from './ShopClient';

export default function Shop() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-transparent text-gray-200">
          <span>Loading shop...</span>
        </div>
      }
    >
      <ShopClient />
    </Suspense>
  );
}
