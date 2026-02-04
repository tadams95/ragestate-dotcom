import fs from 'fs';
import { NextResponse } from 'next/server';
import path from 'path';

/**
 * FIX 2.2: Verify Firebase ID token and return decoded token
 * @param {Request} request
 * @returns {Promise<{uid: string}|null>}
 */
async function verifyAuth(request) {
  const authHeader = request.headers.get('authorization') || '';
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!idToken) return null;

  try {
    const { authAdmin } = await import('../../../../lib/server/firebaseAdmin');
    return await authAdmin.verifyIdToken(idToken);
  } catch (e) {
    console.warn('cancel-transfer auth verification failed:', e?.code || e?.message);
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

    // FIX 2.2: Require authentication for cancel-transfer endpoint
    const decoded = await verifyAuth(request);
    if (!decoded) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHENTICATED' },
        { status: 401 },
      );
    }

    const body = await request.json();

    // FIX 2.2: Include authenticated user's UID for server-side ownership verification
    // The Cloud Function will verify the user owns the transfer
    body.authenticatedUid = decoded.uid;

    const proxyKey = process.env.PROXY_KEY;

    let lastError = null;

    for (const base of bases) {
      const fnUrl = `${base}/cancel-transfer`;
      try {
        const resp = await fetch(fnUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(proxyKey ? { 'x-proxy-key': proxyKey } : {}),
          },
          body: JSON.stringify(body),
        });

        const data = await resp.json().catch(() => ({}));

        if (resp.ok) {
          return NextResponse.json(data);
        }

        // If function responded with error, return it
        return NextResponse.json(data, { status: resp.status });
      } catch (err) {
        lastError = err;
        console.error(`cancel-transfer proxy failed for ${fnUrl}:`, err.message);
        continue;
      }
    }

    console.error('All cancel-transfer endpoints failed', lastError);
    return NextResponse.json({ error: 'Failed to cancel transfer' }, { status: 502 });
  } catch (err) {
    console.error('cancel-transfer route error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
