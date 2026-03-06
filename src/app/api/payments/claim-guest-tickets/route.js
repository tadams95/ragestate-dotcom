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
    console.warn('Claim auth verification failed:', e?.code || e?.message);
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

/**
 * POST /api/payments/claim-guest-tickets
 * Claims any guest tickets purchased with the authenticated user's email.
 * Called after account creation or login.
 */
export async function POST(request) {
  try {
    const decoded = await verifyAuth(request);
    if (!decoded) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHENTICATED' },
        { status: 401 },
      );
    }

    const payload = await request.json().catch(() => ({}));
    const { userId } = payload;

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 },
      );
    }

    // Verify the authenticated user matches the userId
    if (decoded.uid !== userId) {
      return NextResponse.json(
        { error: 'userId does not match authenticated user', code: 'FORBIDDEN' },
        { status: 403 },
      );
    }

    // Use verified email from token — never trust body-provided email
    const userEmail = decoded.email;
    if (!userEmail) {
      return NextResponse.json(
        { error: 'No email associated with this account', code: 'NO_EMAIL' },
        { status: 400 },
      );
    }

    const bases = getFunctionBases();
    if (!bases || bases.length === 0) {
      return NextResponse.json({ error: 'Stripe function URL not configured' }, { status: 503 });
    }

    const proxyKey = process.env.PROXY_KEY;
    let lastError = null;

    for (const base of bases) {
      const endpoint = base.replace(/\/$/, '') + '/claim-guest-tickets';
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(proxyKey ? { 'x-proxy-key': proxyKey } : {}),
          },
          body: JSON.stringify({ userId, userEmail }),
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
          { error: data?.error || 'Upstream error', status: res.status },
          { status: res.status },
        );
      } catch (e) {
        lastError = { status: 502, message: e?.message || 'Fetch failed', target: base };
        continue;
      }
    }

    console.error('Claim guest tickets upstream error:', lastError);
    return NextResponse.json(
      { error: 'Upstream error', status: lastError?.status || 502 },
      { status: lastError?.status || 502 },
    );
  } catch (err) {
    console.error('Claim guest tickets error:', err);
    return NextResponse.json({ error: 'Failed to claim guest tickets' }, { status: 500 });
  }
}
