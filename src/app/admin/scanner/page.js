'use client';

import { collection, getDocs } from 'firebase/firestore';
import { useCallback, useEffect, useRef, useState } from 'react';
import { db } from '../../../../firebase/firebase';

export default function ScannerPage() {
  const [result, setResult] = useState(null);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  const [eventId, setEventId] = useState('');
  const [prefs, setPrefs] = useState({ sound: true, haptics: true });
  const [flash, setFlash] = useState(null); // 'success' | 'error' | null
  const [toast, setToast] = useState(null); // { type, message } | null
  const videoRef = useRef(null);
  const [scanning, setScanning] = useState(false);
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [events, setEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const scannerRef = useRef(null);
  const lastTokenRef = useRef({ token: '', ts: 0 });
  const flashTimeoutRef = useRef(null);
  const toastTimeoutRef = useRef(null);
  const [manualStartNeeded, setManualStartNeeded] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  // Feedback helpers
  const vibrate = useCallback(
    (pattern) => {
      try {
        if (typeof navigator !== 'undefined' && prefs.haptics && 'vibrate' in navigator) {
          navigator.vibrate(pattern);
        }
      } catch {}
    },
    [prefs.haptics],
  );
  const beep = useCallback(
    (kind = 'success') => {
      try {
        if (!prefs.sound || typeof window === 'undefined') return;
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        const ctx = new AC();
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sine';
        o.frequency.value = kind === 'success' ? 880 : 220;
        o.connect(g);
        g.connect(ctx.destination);
        const now = ctx.currentTime;
        g.gain.setValueAtTime(0.0001, now);
        g.gain.exponentialRampToValueAtTime(0.2, now + 0.01);
        o.start(now);
        const dur = kind === 'success' ? 0.14 : 0.28;
        g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
        o.stop(now + dur);
        setTimeout(() => ctx.close(), 350);
      } catch {}
    },
    [prefs.sound],
  );
  const showFeedback = useCallback(
    (kind, message) => {
      try {
        setFlash(kind);
        setToast({ type: kind, message });
        if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
        if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
        flashTimeoutRef.current = setTimeout(() => setFlash(null), 900);
        toastTimeoutRef.current = setTimeout(() => setToast(null), 1600);
        if (kind === 'success') {
          vibrate([30]);
          beep('success');
        } else {
          vibrate([20, 60, 20]);
          beep('error');
        }
      } catch {}
    },
    [beep, vibrate],
  );

  const submitToken = useCallback(
    async (token) => {
      try {
        setError('');
        setResult(null);
        setPreview(null);
        const cleaned = String(token || '').trim();
        if (!cleaned) {
          setError('No token provided');
          return;
        }
        const extracted = cleaned.startsWith('rtk:')
          ? cleaned.slice(4)
          : cleaned.includes('tk=')
            ? new URL(cleaned).searchParams.get('tk')
            : cleaned;

        // Heuristic: if clearly a token (rtk:/?tk=/hex-like), use token; else treat as userId
        const isHexLike = /^[a-f0-9]{32,}$/i.test(extracted);
        const hasTokenMarker = /(^rtk:)|([?&]tk=)/i.test(cleaned);
        const useUserId = !hasTokenMarker && !isHexLike;

        // Resolve eventId with a fallback to localStorage (avoids stale state during rapid scans)
        let resolvedEventId = eventId;
        if (!resolvedEventId && typeof window !== 'undefined') {
          try {
            const saved = localStorage.getItem('scannerEventId') || '';
            if (saved) resolvedEventId = saved;
          } catch {}
        }

        // Throttle duplicate scans of the same token within a short window
        const now = Date.now();
        if (lastTokenRef.current.token === extracted && now - lastTokenRef.current.ts < 2000) {
          return;
        }
        lastTokenRef.current = { token: extracted, ts: now };

        const proxyKey = process.env.NEXT_PUBLIC_PROXY_KEY;
        if (!proxyKey) {
          setError('Missing NEXT_PUBLIC_PROXY_KEY');
          return;
        }
        const baseUrl = process.env.NEXT_PUBLIC_FUNCTIONS_BASE_URL;
        if (!baseUrl) {
          setError('Missing NEXT_PUBLIC_FUNCTIONS_BASE_URL');
          return;
        }
        const url = `${baseUrl}/scan-ticket`;
        // Build body based on detection
        if (useUserId && !resolvedEventId) {
          setError('Event ID required to scan by user ID');
          return;
        }
        const reqBody = useUserId
          ? { userId: extracted, eventId: resolvedEventId || undefined, scannerId: 'admin-scanner' }
          : { token: extracted, scannerId: 'admin-scanner' };

        // For userId scans, fetch a non-mutating preview first to display aggregate info
        if (useUserId) {
          try {
            const previewResp = await fetch(`${baseUrl}/scan-ticket/preview`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-proxy-key': proxyKey,
              },
              cache: 'no-store',
              credentials: 'omit',
              body: JSON.stringify({ userId: extracted, eventId: resolvedEventId }),
            });
            if (previewResp.ok) {
              const p = await previewResp.json();
              setPreview(p);
            } else {
              setPreview(null);
            }
          } catch (_) {
            setPreview(null);
          }
        }
        const resp = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-proxy-key': proxyKey,
          },
          cache: 'no-store',
          credentials: 'omit',
          body: JSON.stringify(reqBody),
        });
        let data;
        try {
          data = await resp.json();
        } catch (_) {
          const text = await resp.text();
          if (!resp.ok) {
            setError(text || `Scan failed (HTTP ${resp.status})`);
            return;
          }
          // Non-JSON success is unexpected; treat as error
          setError('Unexpected response from server');
          return;
        }
        if (!resp.ok) {
          const msg = data?.message || data?.error || `Scan failed (HTTP ${resp.status})`;
          setError(msg);
          showFeedback('error', msg);
          return;
        }
        setResult(data);
        showFeedback(
          'success',
          `Valid — ${typeof data.remaining === 'number' ? `${data.remaining} remaining` : 'scanned'}`,
        );
      } catch (e) {
        setError('Scan error');
      }
    },
    [eventId, showFeedback],
  );

  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      const ua = navigator.userAgent || '';
      setIsIOS(/iPad|iPhone|iPod/.test(ua));
    }
  }, []);

  const attemptStart = useCallback(async () => {
    const scanner = scannerRef.current;
    if (!scanner) return;
    try {
      setScanning(true);
      await scanner.start();
      if (selectedDeviceId) {
        await scanner.setCamera(selectedDeviceId);
      } else {
        await scanner.setCamera('environment').catch(() => {});
      }
      setManualStartNeeded(false);
      setError('');
    } catch (e) {
      setError('Camera access failed. Check permissions and HTTPS, or try another camera/browser.');
    } finally {
      setScanning(false);
    }
  }, [selectedDeviceId]);

  useEffect(() => {
    // Lazy-load scanner lib on client; setup camera + device list
    let disposed = false;
    let localScanner = null;
    const init = async () => {
      try {
        setScanning(true);
        const { default: QrScanner } = await import('qr-scanner');
        // Create scanner
        const video = videoRef.current;
        if (!video) return;
        if (scannerRef.current) {
          // Already initialized (e.g., React StrictMode double-effect) — ensure it's running
          try {
            await scannerRef.current.start();
            await scannerRef.current.setCamera('environment').catch(() => {});
          } catch {}
          return;
        }
        const scanner = new QrScanner(
          video,
          async (scanResult) => {
            // Ignore empty/undefined results
            const data = scanResult?.data;
            if (!data) return;
            await submitToken(data);
          },
          { returnDetailedScanResult: true },
        );
        scannerRef.current = scanner;
        localScanner = scanner;
        // Try to start immediately; on iOS or permission errors, fall back to manual start
        try {
          await scanner.start();
          await scanner.setCamera('environment').catch(() => {});
        } catch (e) {
          // Some browsers (iOS) require a user gesture to start camera or explicit permission first
          if (!disposed) {
            setManualStartNeeded(true);
          }
        }

        // List cameras for selection (may require permission first on some browsers)
        try {
          const cams = await QrScanner.listCameras(true);
          if (!disposed) {
            setDevices(cams || []);
            if (cams?.length) {
              let saved = '';
              try {
                saved = localStorage.getItem('scannerCameraId') || '';
              } catch {}
              const preferred =
                cams.find((c) => /back|rear|environment/i.test(c.label || ''))?.id || cams[0].id;
              const initial = saved && cams.some((c) => c.id === saved) ? saved : preferred;
              setSelectedDeviceId((prev) => prev || initial);
              try {
                localStorage.setItem('scannerCameraId', initial);
              } catch {}
              // Apply the chosen camera immediately if scanner exists
              if (scannerRef.current) {
                try {
                  await scannerRef.current.setCamera(initial);
                } catch {}
              }
            }
          }
        } catch {}
      } catch (e) {
        if (!disposed)
          setError(
            'Camera access failed. Check permissions and HTTPS, or try another camera/browser.',
          );
      } finally {
        if (!disposed) setScanning(false);
      }
    };
    init();
    return () => {
      disposed = true;
      if (localScanner) localScanner.stop();
      if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, [submitToken]);

  // On tab visibility changes (iOS/Safari), restart the camera if it was stopped by the browser
  useEffect(() => {
    const onVis = async () => {
      if (typeof document === 'undefined') return;
      if (document.visibilityState !== 'visible') return;
      const scanner = scannerRef.current;
      if (!scanner) return;
      try {
        await scanner.start();
        if (selectedDeviceId) {
          await scanner.setCamera(selectedDeviceId).catch(() => {});
        }
      } catch {}
    };
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVis);
    }
    return () => {
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVis);
      }
    };
  }, [selectedDeviceId]);

  // Heartbeat: if video tracks stop (browser paused stream), try to restart
  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const video = videoRef.current;
        const stream = video && video.srcObject;
        const tracks = stream?.getVideoTracks ? stream.getVideoTracks() : [];
        const live = tracks.some((t) => t.readyState === 'live');
        if (!live) {
          const scanner = scannerRef.current;
          if (scanner) {
            await scanner.start();
            if (selectedDeviceId) {
              await scanner.setCamera(selectedDeviceId).catch(() => {});
            }
          }
        }
      } catch {}
    }, 7000);
    return () => clearInterval(id);
  }, [selectedDeviceId]);

  // Load events for dropdown
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoadingEvents(true);
        const snap = await getDocs(collection(db, 'events'));
        if (cancelled) return;
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() || {}) }));
        // Simple alphabetical by id to keep stable order
        list.sort((a, b) => String(a.id).localeCompare(String(b.id)));
        setEvents(list);
        // If no saved eventId, preselect the first available (without capturing eventId)
        if (list.length > 0) {
          const saved =
            (typeof window !== 'undefined' && localStorage.getItem('scannerEventId')) || '';
          const initial = saved && list.some((e) => e.id === saved) ? saved : list[0].id;
          setEventId((prev) => {
            if (prev) return prev;
            try {
              localStorage.setItem('scannerEventId', initial);
            } catch {}
            return initial;
          });
        }
      } catch (e) {
        if (!cancelled) setError('Failed to load events');
      } finally {
        if (!cancelled) setLoadingEvents(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Warn if not in a secure context when not on localhost
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const host = window.location.hostname;
      const isLocalhost = host === 'localhost' || host === '127.0.0.1' || host.endsWith('.local');
      if (!window.isSecureContext && !isLocalhost) {
        setError(
          'Camera requires HTTPS or localhost. Use https://localhost via proxy/tunnel or a Vercel preview.',
        );
      }
      // Restore last used eventId
      try {
        const saved = localStorage.getItem('scannerEventId');
        if (saved) setEventId(saved);
        const p = localStorage.getItem('scannerPrefs');
        if (p) {
          const parsed = JSON.parse(p);
          setPrefs((prev) => ({ ...prev, ...parsed }));
        }
      } catch {}
    }
  }, []);

  // Persist prefs when changed
  useEffect(() => {
    try {
      localStorage.setItem('scannerPrefs', JSON.stringify(prefs));
    } catch {}
  }, [prefs]);

  const onChangeCamera = async (deviceId) => {
    setSelectedDeviceId(deviceId);
    try {
      localStorage.setItem('scannerCameraId', deviceId || '');
    } catch {}
    const scanner = scannerRef.current;
    if (scanner) {
      try {
        await scanner.setCamera(deviceId);
      } catch {}
    }
  };

  const statusStyling = (r) => {
    const s = (r?.status || '').toLowerCase();
    if (s.includes('exhaust') || s.includes('invalid') || s.includes('not')) {
      return {
        border: 'border-red-700',
        bg: 'bg-red-500/10',
        pill: 'bg-red-600 text-white',
        label: 'Error',
      };
    }
    if (s.includes('ok') || s.includes('success') || s.includes('scan')) {
      return {
        border: 'border-emerald-700',
        bg: 'bg-emerald-500/10',
        pill: 'bg-emerald-600 text-white',
        label: 'Valid',
      };
    }
    return {
      border: 'border-gray-700',
      bg: 'bg-gray-700/20',
      pill: 'bg-gray-600 text-white',
      label: 'Info',
    };
  };

  return (
    <div className="mx-auto max-w-2xl px-4 pb-10 pt-20 text-white sm:px-6 sm:pt-24 lg:px-8">
      <header className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Ticket Scanner</h1>
          <p className="mt-1 text-sm text-gray-400">Scan account QR (user ID)</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-[#ff1f42] px-2.5 py-1 text-xs font-semibold text-white">
            Admin
          </span>
        </div>
      </header>

      <section className="relative mb-4 rounded-2xl border border-[#242528] bg-[#0d0d0f] p-3">
        {toast && (
          <div
            className={`pointer-events-none absolute left-1/2 top-2 z-10 -translate-x-1/2 rounded-md px-3 py-1 text-sm shadow ${
              toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
            }`}
          >
            {toast.message}
          </div>
        )}
        <div className="aspect-video relative w-full overflow-hidden rounded-xl border border-[#34363a] bg-black">
          <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(transparent,transparent,rgba(0,0,0,0.4))]" />
          <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-2">
            <span className="rounded-full bg-[#ff1f42] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide">
              {scanning ? 'Live' : 'Idle'}
            </span>
          </div>
          <div className="pointer-events-none absolute bottom-3 left-3 right-3 flex items-center justify-between text-[11px] text-gray-300">
            <span>Align the QR within the frame</span>
            <span className="opacity-80">Auto-detect • 150–220ms</span>
          </div>
          {flash && (
            <div
              className={`pointer-events-none absolute inset-0 ${
                flash === 'success' ? 'bg-emerald-500/30' : 'bg-red-500/30'
              } animate-pulse`}
            />
          )}
          {manualStartNeeded && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/50">
              <div className="text-center">
                <p className="mb-3 text-sm text-gray-200">
                  {isIOS
                    ? 'Tap Enable Camera and allow access in the prompt.'
                    : 'Tap to enable camera and grant permission.'}
                </p>
                <button
                  className="rounded-md border border-[#ff1f42] bg-[#1a1b1e] px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-[#241b1e] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff1f42]"
                  onClick={attemptStart}
                >
                  Enable Camera
                </button>
                {isIOS && (
                  <p className="mt-2 text-[11px] text-gray-400">
                    iOS Chrome: Settings → Chrome → Camera → Allow
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-[#34363a] bg-[#16171a] p-3">
            <label className="mb-1 block text-xs font-medium text-gray-400">Event</label>
            <select
              value={eventId}
              onChange={(e) => {
                setEventId(e.target.value);
                try {
                  localStorage.setItem('scannerEventId', e.target.value || '');
                } catch {}
              }}
              className="w-full rounded-md border border-[#34363a] bg-[#0d0d0f] p-2 text-sm focus:border-[#ff1f42] focus:outline-none focus:ring-1 focus:ring-[#ff1f42]"
            >
              {!eventId && (
                <option value="">{loadingEvents ? 'Loading events…' : 'Select event'}</option>
              )}
              {events.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.title || e.name || e.id}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-gray-500">Required for UID scans</p>
          </div>
          <div className="rounded-lg border border-[#34363a] bg-[#16171a] p-3">
            <label className="mb-1 block text-xs font-medium text-gray-400">Camera</label>
            <select
              value={selectedDeviceId}
              onChange={(e) => onChangeCamera(e.target.value)}
              className="w-full rounded-md border border-[#34363a] bg-[#0d0d0f] p-2 text-sm focus:border-[#ff1f42] focus:outline-none focus:ring-1 focus:ring-[#ff1f42]"
            >
              {devices.length === 0 && <option value="">Default</option>}
              {devices.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label || d.id}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-gray-500">Switch if needed</p>
          </div>
          <div className="rounded-lg border border-[#34363a] bg-[#16171a] p-3">
            <label className="mb-1 block text-xs font-medium text-gray-400">Feedback</label>
            <div className="flex items-center justify-between gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={prefs.sound}
                  onChange={(e) => setPrefs((p) => ({ ...p, sound: e.target.checked }))}
                />
                <span className="text-sm text-gray-300">Sound</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={prefs.haptics}
                  onChange={(e) => setPrefs((p) => ({ ...p, haptics: e.target.checked }))}
                />
                <span className="text-sm text-gray-300">Haptics</span>
              </label>
            </div>
            <p className="mt-1 text-[11px] text-gray-500">Operator prefs</p>
          </div>
        </div>
        {scanning && <p className="mt-2 text-xs text-gray-400">Starting camera…</p>}
        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
      </section>

      {result && (
        <section
          className={`rounded-2xl border ${statusStyling(result).border} ${statusStyling(result).bg} p-4`}
        >
          <div className="mb-2 flex items-center justify-between">
            <div className="text-sm text-gray-300">Scan Result</div>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusStyling(result).pill}`}
            >
              {statusStyling(result).label}
            </span>
          </div>
          <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
            <div className="rounded-lg border border-[#34363a] bg-[#0d0d0f] p-2">
              <div className="text-xs text-gray-400">Event</div>
              <div className="truncate text-gray-100">{result.eventId}</div>
            </div>
            <div className="rounded-lg border border-[#34363a] bg-[#0d0d0f] p-2">
              <div className="text-xs text-gray-400">Rager</div>
              <div className="truncate text-gray-100">{result.ragerId}</div>
            </div>
            <div className="rounded-lg border border-[#34363a] bg-[#0d0d0f] p-2">
              <div className="text-xs text-gray-400">Status</div>
              <div className="text-gray-100">{result.status}</div>
            </div>
            <div className="rounded-lg border border-[#34363a] bg-[#0d0d0f] p-2">
              <div className="text-xs text-gray-400">Remaining</div>
              <div className="text-gray-100">{result.remaining}</div>
            </div>
          </div>
          {preview && (
            <div className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
              <div className="rounded-lg border border-[#34363a] bg-[#0d0d0f] p-2">
                <div className="text-xs text-gray-400">Aggregate Remaining (pre-scan)</div>
                <div className="text-gray-100">{preview.remainingTotal}</div>
              </div>
              <div className="rounded-lg border border-[#34363a] bg-[#0d0d0f] p-2">
                <div className="text-xs text-gray-400">Next Candidate</div>
                <div className="truncate text-gray-100">
                  {preview.nextCandidate?.ragerId || '—'}
                  {typeof preview.nextCandidate?.remaining === 'number'
                    ? ` · remaining ${preview.nextCandidate.remaining}`
                    : ''}
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {!process.env.NEXT_PUBLIC_PROXY_KEY && (
        <p className="mt-4 text-xs text-amber-400">
          Warning: NEXT_PUBLIC_PROXY_KEY not set for this environment.
        </p>
      )}
    </div>
  );
}
