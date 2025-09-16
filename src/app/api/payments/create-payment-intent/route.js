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

export async function POST(request) {
  try {
    const bases = getFunctionBases();
    if (!bases || bases.length === 0) {
      return NextResponse.json({ error: 'Stripe function URL not configured' }, { status: 503 });
    }

    const payload = await request.json().catch(() => ({}));
    const idempotencyKey =
      request.headers.get('x-idempotency-key') ||
      (() => {
        try {
          const user = `${payload.firebaseId || ''}|${payload.customerEmail || ''}`;
          const amt = String(payload.amount || '');
          const cartLen = Array.isArray(payload.cartItems) ? String(payload.cartItems.length) : '0';
          // Base64-encode a simple stable key; Stripe expects a string
          return Buffer.from(`${user}|${amt}|${cartLen}`).toString('base64');
        } catch (_) {
          return undefined;
        }
      })();

    let lastError = null;
    const proxyKey = process.env.PROXY_KEY;
    for (const base of bases) {
      const endpoint = base.replace(/\/$/, '') + '/create-payment-intent';
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(idempotencyKey ? { 'x-idempotency-key': idempotencyKey } : {}),
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
    return NextResponse.json({ error: 'Failed to proxy payment intent' }, { status: 500 });
  }
}
