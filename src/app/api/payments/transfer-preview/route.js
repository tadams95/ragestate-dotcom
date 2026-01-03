import fs from 'fs';
import { NextResponse } from 'next/server';
import path from 'path';

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

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('t');

    if (!token) {
      return NextResponse.json({ error: 'Missing token parameter' }, { status: 400 });
    }

    const bases = getFunctionBases();
    if (!bases || bases.length === 0) {
      return NextResponse.json({ error: 'Stripe function URL not configured' }, { status: 503 });
    }

    let lastError = null;
    const proxyKey = process.env.PROXY_KEY;

    for (const base of bases) {
      const endpoint = base.replace(/\/$/, '') + '/transfer-preview';
      try {
        const res = await fetch(`${endpoint}?t=${encodeURIComponent(token)}`, {
          method: 'GET',
          headers: {
            ...(proxyKey ? { 'x-proxy-key': proxyKey } : {}),
          },
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

        // Return specific error codes
        return NextResponse.json(data, { status: res.status });
      } catch (fetchErr) {
        lastError = { message: fetchErr.message, target: endpoint };
      }
    }

    return NextResponse.json(
      { error: lastError?.message || 'Failed to get transfer preview' },
      { status: 502 },
    );
  } catch (err) {
    console.error('transfer-preview proxy error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
