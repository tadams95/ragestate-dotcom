'use client';

import { onAuthStateChanged, reload, sendEmailVerification } from 'firebase/auth';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { auth } from '../../../firebase/firebase';
import Footer from '../components/Footer';
import Header from '../components/Header';

export default function VerifyEmailClient() {
  const router = useRouter();
  const params = useSearchParams();
  const [userEmail, setUserEmail] = useState('');
  const [verified, setVerified] = useState(false);
  const [sending, setSending] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setChecking(false);
      setUserEmail(u?.email || params.get('email') || '');
      setVerified(Boolean(u?.emailVerified));
    });
    return () => unsub();
  }, [params]);

  const resend = async () => {
    setError('');
    const u = auth.currentUser;
    if (!u) {
      setError('Please sign in to resend the verification email.');
      return;
    }
    try {
      setSending(true);
      await sendEmailVerification(u);
    } catch (e) {
      setError('Failed to send verification email. Try again in a bit.');
    } finally {
      setSending(false);
    }
  };

  const refreshStatus = async () => {
    setError('');
    const u = auth.currentUser;
    if (!u) {
      setError('Please sign in again to continue.');
      return;
    }
    try {
      await reload(u);
      setVerified(Boolean(auth.currentUser?.emailVerified));
      if (auth.currentUser?.emailVerified) router.push('/account');
    } catch (e) {
      setError('Could not refresh status. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <Header />
      <main className="mx-auto max-w-xl px-6 py-12">
        <h1 className="text-2xl font-bold">Verify your email</h1>
        <p className="mt-3 text-gray-300">
          We sent a verification link to{' '}
          <span className="font-semibold">{userEmail || 'your email'}</span>. Please check your
          inbox and click the link to continue.
        </p>
        {error && (
          <div className="mt-4 rounded-md border border-red-500 bg-red-500/10 p-3 text-sm text-red-400">
            {error}
          </div>
        )}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            onClick={resend}
            disabled={sending}
            className={`rounded-md border border-white/20 px-4 py-2 text-sm ${sending ? 'opacity-60' : 'hover:bg-white/10'}`}
          >
            {sending ? 'Sending…' : 'Resend email'}
          </button>
          <button
            onClick={refreshStatus}
            className="rounded-md bg-[#ff1f42] px-4 py-2 text-sm font-semibold hover:bg-[#ff415f]"
          >
            I’ve verified — Continue
          </button>
          {!checking && verified && <span className="text-green-400">Verified ✔</span>}
        </div>
        <p className="mt-6 text-sm text-gray-400">
          Tip: Check your spam folder or search for "Firebase Authentication" if you don’t see it.
        </p>
      </main>
      <Footer />
    </div>
  );
}
