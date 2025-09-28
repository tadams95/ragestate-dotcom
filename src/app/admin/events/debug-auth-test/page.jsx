'use client';
import { useEffect, useState } from 'react';
// Use jsconfig path alias (@fb/*) instead of brittle deep relative path
import { auth } from '@fb/firebase';

export default function DebugAuthTestPage() {
  const [state, setState] = useState({ loading: true, error: null, data: null, tokenLen: null });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const user =
          auth.currentUser ||
          (await new Promise((resolve, reject) => {
            const unsub = auth.onAuthStateChanged((u) => {
              if (u) {
                unsub();
                resolve(u);
              }
            }, reject);
            setTimeout(() => {
              unsub();
              reject(new Error('Auth state timeout (5s)'));
            }, 5000);
          }));
        const token = await user.getIdToken(true); // force refresh
        const res = await fetch('/api/admin/events/debug-auth', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (cancelled) return;
        setState({ loading: false, error: null, data: json, tokenLen: token.length });
      } catch (e) {
        if (cancelled) return;
        setState({ loading: false, error: e?.message || String(e), data: null, tokenLen: null });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div style={{ maxWidth: 780, margin: '2rem auto', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Debug Auth Environment</h1>
      <p style={{ color: '#666' }}>
        This temporary page requests a fresh ID token and calls the debug-auth API route. Remove
        after diagnosing 401 issues.
      </p>
      {state.loading && <p>Loading… (waiting for auth + fetch)</p>}
      {state.error && <p style={{ color: 'crimson' }}>Error: {state.error}</p>}
      {state.tokenLen && (
        <p style={{ fontSize: 12, color: '#555' }}>Token length: {state.tokenLen}</p>
      )}
      {state.data && (
        <pre
          style={{
            background: '#111',
            color: '#0f0',
            padding: '1rem',
            fontSize: 12,
            overflowX: 'auto',
            borderRadius: 6,
          }}
        >
          {JSON.stringify(state.data, null, 2)}
        </pre>
      )}
      <details style={{ marginTop: '1.5rem' }}>
        <summary style={{ cursor: 'pointer' }}>What to look for</summary>
        <ul style={{ fontSize: 14, lineHeight: 1.5 }}>
          <li>
            <code>server.hasServiceAccount</code> must be true for token verification using Admin
            SDK credentials.
          </li>
          <li>
            <code>server.projectId</code> should match <code>decoded.aud</code>.
          </li>
          <li>
            If <code>code</code> is <code>TOKEN_INVALID</code>, check project mismatch or missing
            service account.
          </li>
          <li>
            Remove this page after resolving the issue to avoid exposing internal diagnostics.
          </li>
        </ul>
      </details>
    </div>
  );
}
