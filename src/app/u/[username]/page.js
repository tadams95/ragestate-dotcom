'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function UsernameResolverPage({ params }) {
  const router = useRouter();
  const usernameParam = params?.username || '';
  const [status] = useState('Redirecting…');

  useEffect(() => {
    async function go() {
      const usernameLower = String(usernameParam || '')
        .trim()
        .toLowerCase();
      if (!usernameLower) {
        return;
      }
      // Compatibility: redirect to root-level username route
      router.replace(`/${usernameLower}`);
    }
    go();
    return () => {};
  }, [router, usernameParam]);

  return (
    <div className="mx-auto max-w-xl py-10 text-center text-white">
      <p className="text-gray-300">{status}</p>
    </div>
  );
}
