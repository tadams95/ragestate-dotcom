import { Suspense } from 'react';
import ShopClient from './ShopClient';

export default function Shop() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <ShopClient />
    </Suspense>
  );
}
