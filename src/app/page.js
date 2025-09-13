'use client';

import dynamic from 'next/dynamic';
import Header from './components/Header';

const Home3DAnimation = dynamic(() => import('./components/animations/home-3d-animation'), {
  ssr: false,
  loading: () => null,
});

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-white">
      <div className="fixed inset-0 z-0">
        <Home3DAnimation intensity={1} color="#EF4E4E" />
      </div>
      <Header />
      <main className="relative z-10 flex min-h-screen items-center justify-center pt-20">
        <h3 className="text-xl font-extrabold tracking-wide md:text-2xl">stay tuned</h3>
      </main>
    </div>
  );
}
