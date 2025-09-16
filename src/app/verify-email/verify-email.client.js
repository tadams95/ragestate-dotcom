'use client';

import { applyActionCode, onAuthStateChanged, reload, sendEmailVerification } from 'firebase/auth';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { auth } from '../../../firebase/firebase';

export default function VerifyEmailClient() {
  const router = useRouter();
  const params = useSearchParams();
  const [userEmail, setUserEmail] = useState('');
  const [verified, setVerified] = useState(false);
  const [sending, setSending] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const pollRef = useRef(null);

  const siteUrl = useMemo(() => process.env.NEXT_PUBLIC_SITE_URL || window.location.origin, []);

  // Track auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setChecking(false);
      setUserEmail(u?.email || params.get('email') || '');
      setVerified(Boolean(u?.emailVerified));
    });
    return () => unsub();
  }, [params]);

  // Handle deep-link verification /verify-email?mode=verifyEmail&oobCode=...
  useEffect(() => {
    const mode = params.get('mode');
    const oobCode = params.get('oobCode');
    if (mode === 'verifyEmail' && oobCode) {
      (async () => {
        try {
          await applyActionCode(auth, oobCode);
          setVerified(true);
          if (auth.currentUser) {
            await reload(auth.currentUser);
            router.push('/account');
          }
        } catch (e) {
          setError('The verification link is invalid or expired.');
        }
      })();
    }
  }, [params, router]);

  // Auto-poll verification status
  useEffect(() => {
    if (verified) return;
    const start = Date.now();
    pollRef.current = setInterval(async () => {
      const u = auth.currentUser;
      if (!u) return;
      try {
        await reload(u);
        if (auth.currentUser?.emailVerified) {
          setVerified(true);
          clearInterval(pollRef.current);
          router.push('/account');
        }
      } catch (e) {
        // ignore
      }
      if (Date.now() - start > 180000) {
        clearInterval(pollRef.current);
      }
    }, 6000);
    return () => clearInterval(pollRef.current);
  }, [verified, router]);

  // Resend cooldown ticker
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => (c > 0 ? c - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const resend = async () => {
    setError('');
    if (cooldown > 0) return;
    const u = auth.currentUser;
    if (!u) {
      setError('Please sign in to resend the verification email.');
      return;
    }
    try {
      setSending(true);
      const actionCodeSettings = { url: `${siteUrl}/verify-email`, handleCodeInApp: true };
      await sendEmailVerification(u, actionCodeSettings);
      setCooldown(30);
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
    <div className="flex min-h-screen flex-col bg-black text-white">
      <main className="flex flex-1 items-center justify-center px-4 py-12 sm:px-6">
        <div className="w-full max-w-xl">
          <div className="relative overflow-hidden rounded-[14px] border border-white/10 bg-white/5 shadow-[0_4px_12px_-4px_rgba(0,0,0,0.6)] backdrop-blur-md">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#ff1f42] to-[#ff415f]" />
            <div className="p-6 sm:p-8">
              <h1 className="text-[20px] font-semibold tracking-tight">Verify your email</h1>
              <p className="mt-3 text-[15px] text-gray-300">
                We sent a verification link to{' '}
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[13px] font-semibold text-white/90">
                  {userEmail || 'your email'}
                </span>
                . Please check your inbox and click the link to continue.
              </p>

              {error && (
                <div
                  role="alert"
                  className="mt-4 rounded-md border border-red-500/60 bg-red-500/10 p-3 text-sm text-red-400"
                >
                  {error}
                </div>
              )}

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  onClick={resend}
                  disabled={sending || cooldown > 0}
                  className={`rounded-md border border-white/15 px-4 py-2 text-[13px] font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[#ff1f42] focus:ring-offset-2 focus:ring-offset-black ${sending || cooldown > 0 ? 'cursor-not-allowed opacity-60' : 'hover:bg-white/10'}`}
                >
                  {sending ? 'Sending…' : cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend email'}
                </button>
                <button
                  onClick={refreshStatus}
                  className="rounded-md bg-[#ff1f42] px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-[#ff415f] focus:outline-none focus:ring-2 focus:ring-[#ff1f42] focus:ring-offset-2 focus:ring-offset-black"
                >
                  I’ve verified — Continue
                </button>
                {!checking && (
                  <span
                    aria-live="polite"
                    className={`${verified ? 'text-[#3ddc85]' : 'text-yellow-300/80'} text-[13px]`}
                  >
                    {verified ? 'Verified ✔' : 'Pending verification…'}
                  </span>
                )}
              </div>

              <p className="mt-6 text-[13px] text-gray-400">
                Tip: Check your spam folder or search for "Firebase Authentication". You can keep
                this tab open — we’ll auto-detect once you’ve verified.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
