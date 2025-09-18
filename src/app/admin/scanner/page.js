'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export default function ScannerPage() {
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [manualToken, setManualToken] = useState('');
  const videoRef = useRef(null);
  const [scanning, setScanning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const scannerRef = useRef(null);
  const lastTokenRef = useRef({ token: '', ts: 0 });

  const submitToken = useCallback(
    async (token) => {
      try {
        setError('');
        setResult(null);
        const cleaned = String(token || manualToken || '').trim();
        if (!cleaned) {
          setError('No token provided');
          return;
        }
        const extracted = cleaned.startsWith('rtk:')
          ? cleaned.slice(4)
          : cleaned.includes('tk=')
            ? new URL(cleaned).searchParams.get('tk')
            : cleaned;

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
        setIsSubmitting(true);
        const resp = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-proxy-key': proxyKey,
          },
          cache: 'no-store',
          credentials: 'omit',
          body: JSON.stringify({ token: extracted, scannerId: 'admin-scanner' }),
        });
        let data;
        try {
          data = await resp.json();
        } catch (_) {
          const text = await resp.text();
          if (!resp.ok) {
            setError(text || `Scan failed (HTTP ${resp.status})`);
            setIsSubmitting(false);
            return;
          }
          // Non-JSON success is unexpected; treat as error
          setError('Unexpected response from server');
          setIsSubmitting(false);
          return;
        }
        if (!resp.ok) {
          setError(data?.error || `Scan failed (HTTP ${resp.status})`);
          setIsSubmitting(false);
          return;
        }
        setResult(data);
        setIsSubmitting(false);
      } catch (e) {
        setError('Scan error');
        setIsSubmitting(false);
      }
    },
    [manualToken],
  );

  useEffect(() => {
    // Lazy-load scanner lib on client; setup camera + device list
    let disposed = false;
    let localScanner = null;
    const init = async () => {
      try {
        setScanning(true);
        const { default: QrScanner } = await import('qr-scanner');

        // List cameras for selection
        try {
          const cams = await QrScanner.listCameras(true);
          if (!disposed) {
            setDevices(cams || []);
            if (cams?.length && !selectedDeviceId) {
              // Prefer a back/environ camera on mobile if available
              const preferred =
                cams.find((c) => /back|rear|environment/i.test(c.label || ''))?.id || cams[0].id;
              setSelectedDeviceId(preferred);
            }
          }
        } catch {}

        const video = videoRef.current;
        if (!video) return;
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
        await scanner.start();
        if (selectedDeviceId) {
          await scanner.setCamera(selectedDeviceId);
        }
      } catch (e) {
        if (!disposed) setError('Camera scanner unavailable. Use manual input.');
      } finally {
        if (!disposed) setScanning(false);
      }
    };
    init();
    return () => {
      disposed = true;
      if (localScanner) localScanner.stop();
    };
  }, [submitToken, selectedDeviceId]);

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
    }
  }, []);

  const onChangeCamera = async (deviceId) => {
    setSelectedDeviceId(deviceId);
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
          <p className="mt-1 text-sm text-gray-400">Point camera at QR or paste a token below</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-[#ff1f42] px-2.5 py-1 text-xs font-semibold text-white">
            Admin
          </span>
        </div>
      </header>

      <section className="mb-4 rounded-2xl border border-[#242528] bg-[#0d0d0f] p-3">
        <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-[#34363a] bg-black">
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
        </div>

        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-gray-400">Manual token</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={manualToken}
                onChange={(e) => setManualToken(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submitToken();
                }}
                placeholder="Paste token or URL (rtk:... or ?tk=...)"
                className="w-full rounded-lg border border-[#34363a] bg-[#16171a] p-2 text-sm placeholder:text-gray-500 focus:border-[#ff1f42] focus:outline-none focus:ring-1 focus:ring-[#ff1f42]"
              />
              <button
                onClick={() => submitToken()}
                disabled={isSubmitting}
                className="rounded-lg bg-[#ff1f42] px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#ff415f] disabled:opacity-60"
              >
                {isSubmitting ? 'Scanning…' : 'Submit'}
              </button>
            </div>
          </div>
          <div className="sm:w-56">
            <label className="mb-1 block text-xs font-medium text-gray-400">Camera</label>
            <select
              value={selectedDeviceId}
              onChange={(e) => onChangeCamera(e.target.value)}
              className="w-full rounded-lg border border-[#34363a] bg-[#16171a] p-2 text-sm focus:border-[#ff1f42] focus:outline-none focus:ring-1 focus:ring-[#ff1f42]"
            >
              {devices.length === 0 && <option value="">Default</option>}
              {devices.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label || d.id}
                </option>
              ))}
            </select>
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
