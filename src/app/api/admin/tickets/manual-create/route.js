import fs from 'fs';
import { NextResponse } from 'next/server';
import path from 'path';
import { authAdmin } from '../../../../../../lib/server/firebaseAdmin';
import { userIsAdmin } from '../../../../../../lib/server/isAdmin';

export const dynamic = 'force-dynamic';

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

export async function POST(req) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!idToken) {
      return NextResponse.json({ error: 'Missing bearer token' }, { status: 401 });
    }

    let decoded;
    try {
      decoded = await authAdmin.verifyIdToken(idToken);
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    if (!(await userIsAdmin(decoded.uid))) {
      return NextResponse.json({ error: 'Not an admin' }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Malformed JSON body' }, { status: 400 });
    }

    const bases = getFunctionBases();
    if (!bases || bases.length === 0) {
      return NextResponse.json({ error: 'Function URL not configured' }, { status: 503 });
    }

    const proxyKey = process.env.PROXY_KEY;
    const { uid, eventId, qty, priceCents } = body;

    if (!uid || typeof uid !== 'string') {
      return NextResponse.json({ error: 'uid is required' }, { status: 400 });
    }
    if (!eventId || typeof eventId !== 'string') {
      return NextResponse.json({ error: 'eventId is required' }, { status: 400 });
    }

    let lastError = null;
    for (const base of bases) {
      const endpoint = base.replace(/\/$/, '') + '/manual-create-ticket';
      try {
        const resp = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(proxyKey ? { 'x-proxy-key': proxyKey } : {}),
          },
          body: JSON.stringify({ uid, eventId, qty, priceCents }),
        });
        const data = await resp.json().catch(() => ({}));
        return NextResponse.json(data, { status: resp.status });
      } catch (e) {
        lastError = e;
      }
    }

    console.error('manual-create-ticket proxy: all bases failed', lastError?.message);
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  } catch (e) {
    console.error('manual-create-ticket proxy error:', e);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}
