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

// Health check endpoint for the payments proxy
export async function GET() {
  try {
    const bases = getFunctionBases();
    if (!bases.length) {
      return NextResponse.json(
        { status: 'error', message: 'No function base configured', proxy: 'not configured' },
        { status: 503 },
      );
    }
    let lastError = null;
    for (const base of bases) {
      const healthUrl = `${base.replace(/\/$/, '')}/health`;
      try {
        const response = await fetch(healthUrl, { method: 'GET', cache: 'no-store' });
        const text = await response.text();
        let data;
        try {
          data = JSON.parse(text);
        } catch (_) {
          data = { raw: text };
        }
        if (response.ok) {
          return NextResponse.json({
            status: 'ok',
            message: 'Payments proxy is working',
            proxy: 'configured',
            target: healthUrl,
            stripe: data,
          });
        }
        if (response.status === 401 || response.status === 403) {
          lastError = { status: response.status, message: 'Auth forbidden', target: healthUrl };
          continue;
        }
        return NextResponse.json(
          {
            status: 'error',
            message: `Health check failed: ${response.status}`,
            target: healthUrl,
            detail: data,
          },
          { status: response.status },
        );
      } catch (e) {
        lastError = { status: 502, message: e?.message || 'Fetch failed', target: base };
        continue;
      }
    }
    return NextResponse.json(
      { status: 'error', message: 'All candidates failed', detail: lastError },
      { status: lastError?.status || 502 },
    );
  } catch (error) {
    return NextResponse.json(
      { status: 'error', message: error.message, proxy: 'error' },
      { status: 500 },
    );
  }
}
