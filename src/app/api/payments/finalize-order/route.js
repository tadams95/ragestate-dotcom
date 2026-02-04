import fs from 'fs';
import { NextResponse } from 'next/server';
import path from 'path';

/**
 * Verify Firebase ID token and return decoded token
 * @param {Request} request
 * @returns {Promise<{uid: string}|null>}
 */
async function verifyAuth(request) {
  const authHeader = request.headers.get('authorization') || '';
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!idToken) return null;

  try {
    const { authAdmin } = await import('../../../../../lib/server/firebaseAdmin');
    return await authAdmin.verifyIdToken(idToken);
  } catch (e) {
    console.warn('Payment auth verification failed:', e?.code || e?.message);
    return null;
  }
}

function getFunctionBases() {
  const explicit = process.env.STRIPE_FN_URL || process.env.NEXT_PUBLIC_STRIPE_FN_URL;
  const bases = [];
  if (explicit) bases.push(explicit);

  const projectId =
    process.env.STRIPE_FIREBASE_PROJECT_ID ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    process.env.GCLOUD_PROJECT ||
    (() => {
      try {
        if (process.env.FIREBASE_CONFIG) {
          const cfg = JSON.parse(process.env.FIREBASE_CONFIG);
          return cfg.projectId || cfg.project || undefined;
        }
      } catch (_) {}
      return undefined;
    })() ||
    (() => {
      try {
        const rcPath = path.join(process.cwd(), '.firebaserc');
        if (fs.existsSync(rcPath)) {
          const raw = fs.readFileSync(rcPath, 'utf8');
          const json = JSON.parse(raw);
          const projects = json && json.projects ? Object.values(json.projects) : [];
          if (projects && projects.length > 0 && typeof projects[0] === 'string')
            return projects[0];
        }
      } catch (_) {}
      return undefined;
    })();

  if (projectId) {
    const region = process.env.STRIPE_FN_REGION || 'us-central1';
    bases.push(`https://${region}-${projectId}.cloudfunctions.net/stripePayment`);
  }

  return bases;
}

export async function POST(request) {
  try {
    const bases = getFunctionBases();
    if (!bases || bases.length === 0) {
      return NextResponse.json({ error: 'Stripe function URL not configured' }, { status: 503 });
    }

    const payload = await request.json().catch(() => ({}));

    // Guest checkout: Allow without authentication if isGuest flag is set
    const isGuestCheckout = payload.isGuest === true;

    if (isGuestCheckout) {
      // Guest checkout requires a valid email
      // FIX: Use proper email regex instead of just checking for '@'
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!payload.guestEmail || typeof payload.guestEmail !== 'string' || !emailRegex.test(payload.guestEmail)) {
        return NextResponse.json(
          { error: 'Valid email required for guest checkout', code: 'INVALID_EMAIL' },
          { status: 400 },
        );
      }
      // Guest checkout should not have firebaseId
      if (payload.firebaseId) {
        return NextResponse.json(
          { error: 'Cannot provide firebaseId for guest checkout', code: 'INVALID_REQUEST' },
          { status: 400 },
        );
      }
    } else if (payload.firebaseId) {
      // Security: Verify authenticated user matches firebaseId in payload
      // This prevents users from finalizing orders for other users
      const decoded = await verifyAuth(request);
      if (!decoded) {
        return NextResponse.json(
          { error: 'Authentication required', code: 'UNAUTHENTICATED' },
          { status: 401 },
        );
      }
      if (decoded.uid !== payload.firebaseId) {
        return NextResponse.json(
          { error: 'firebaseId does not match authenticated user', code: 'FORBIDDEN' },
          { status: 403 },
        );
      }
    }

    let lastError = null;
    const proxyKey = process.env.PROXY_KEY;
    for (const base of bases) {
      const endpoint = base.replace(/\/$/, '') + '/finalize-order';
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(proxyKey ? { 'x-proxy-key': proxyKey } : {}),
          },
          body: JSON.stringify(payload),
          cache: 'no-store',
        });
        const text = await res.text();
        let data;
        try {
          data = JSON.parse(text);
        } catch (_) {
          data = { raw: text };
        }
        if (res.ok) {
          return NextResponse.json(data, { status: 200 });
        }
        if (res.status === 401 || res.status === 403) {
          lastError = { status: res.status, message: 'Auth forbidden', target: endpoint };
          continue;
        }
        return NextResponse.json(
          {
            error: data?.error || data?.message || 'Upstream error',
            status: res.status,
            target: endpoint,
          },
          { status: res.status },
        );
      } catch (e) {
        lastError = { status: 502, message: e?.message || 'Fetch failed', target: base };
        continue;
      }
    }

    return NextResponse.json(
      { error: 'Upstream error', status: lastError?.status || 502, detail: lastError },
      { status: lastError?.status || 502 },
    );
  } catch (err) {
    return NextResponse.json({ error: 'Failed to finalize order' }, { status: 500 });
  }
}
