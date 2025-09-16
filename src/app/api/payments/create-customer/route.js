import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

function getFunctionBaseUrl() {
  const explicit = process.env.STRIPE_FN_URL || process.env.NEXT_PUBLIC_STRIPE_FN_URL;
  if (explicit) return explicit;
  const projectId = process.env.STRIPE_FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || (() => {
    try {
      if (process.env.FIREBASE_CONFIG) {
        const cfg = JSON.parse(process.env.FIREBASE_CONFIG);
        return cfg.projectId || cfg.project || undefined;
      }
    } catch (_) {}
    return undefined;
  })() || (() => {
    try {
      const rcPath = path.join(process.cwd(), '.firebaserc');
      if (fs.existsSync(rcPath)) {
        const raw = fs.readFileSync(rcPath, 'utf8');
        const json = JSON.parse(raw);
        const projects = json && json.projects ? Object.values(json.projects) : [];
        if (projects && projects.length > 0 && typeof projects[0] === 'string') return projects[0];
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

    const payload = await request.json().catch(() => ({}));

    const res = await fetch(FN_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });

    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch (_) { data = { raw: text }; }
    if (!res.ok) {
      return NextResponse.json({ error: data?.error || data?.message || 'Upstream error', status: res.status }, { status: res.status });
    }

    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to proxy create customer' }, { status: 500 });
  }
}
