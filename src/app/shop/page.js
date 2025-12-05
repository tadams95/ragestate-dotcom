import { Suspense } from 'react';
import ShopClient from './ShopClient';

function ShopLoadingFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-black">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
    </div>
  );
}

export default function Shop() {
  return (
    <Suspense fallback={<ShopLoadingFallback />}>
      <ShopClient />
    </Suspense>
  );
}
