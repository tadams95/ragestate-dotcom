import fs from 'fs';
import { NextResponse } from 'next/server';
import path from 'path';

/**
 * FIX 2.1: Verify Firebase ID token and return decoded token
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
    console.warn('create-customer auth verification failed:', e?.code || e?.message);
    return null;
  }
}

function getFunctionBaseUrl() {
  const explicit = process.env.STRIPE_FN_URL || process.env.NEXT_PUBLIC_STRIPE_FN_URL;
  if (explicit) return explicit;
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
  if (!projectId) return '';
  const region = process.env.STRIPE_FN_REGION || 'us-central1';
  return `https://${region}-${projectId}.cloudfunctions.net/stripePayment`;
}

const FN_BASE = getFunctionBaseUrl();
const FN_ENDPOINT = FN_BASE ? FN_BASE.replace(/\/$/, '') + '/create-customer' : '';

export async function POST(request) {
  try {
    if (!FN_BASE) {
      return NextResponse.json({ error: 'Stripe function URL not configured' }, { status: 503 });
    }

    // FIX 2.1: Require authentication for create-customer endpoint
    const decoded = await verifyAuth(request);
    if (!decoded) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHENTICATED' },
        { status: 401 },
      );
    }

    const payload = await request.json().catch(() => ({}));

    // FIX 2.1: Verify authenticated user matches the uid being created
    if (payload.uid && payload.uid !== decoded.uid) {
      return NextResponse.json(
        { error: 'Cannot create customer for another user', code: 'FORBIDDEN' },
        { status: 403 },
      );
    }

    // Ensure uid is set to the authenticated user's uid
    payload.uid = decoded.uid;

    const headers = {
      'Content-Type': 'application/json',
    };
    const proxyKey = process.env.PROXY_KEY;
    if (proxyKey) headers['x-proxy-key'] = proxyKey;

    const res = await fetch(FN_ENDPOINT, {
      method: 'POST',
      headers,
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
    if (!res.ok) {
      return NextResponse.json(
        { error: data?.error || data?.message || 'Upstream error', status: res.status },
        { status: res.status },
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to proxy create customer' }, { status: 500 });
  }
}
