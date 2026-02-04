import fs from 'fs';
import { NextResponse } from 'next/server';
import path from 'path';
import { checkRateLimit, getClientIp } from '../../../../lib/server/rateLimit';

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
 * Proxy for promo code validation
 * POST /api/payments/validate-promo-code
 * Body: { code, cartTotal }
 * Returns: { valid, discountAmount, displayCode, message, ... }
 */
export async function POST(request) {
  try {
    const bases = getFunctionBases();
    if (!bases || bases.length === 0) {
      return NextResponse.json({ error: 'Stripe function URL not configured' }, { status: 503 });
    }

    // FIX 2.3: Rate limit promo code validation to prevent enumeration attacks
    const clientIp = getClientIp(request);
    const rateLimitResult = await checkRateLimit('PROMO_VALIDATION', clientIp);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          valid: false,
          error: 'rate_limited',
          message: rateLimitResult.message,
          resetAt: rateLimitResult.resetAt ? rateLimitResult.resetAt.toISOString() : null,
        },
        { status: 429 },
      );
    }

    const payload = await request.json().catch(() => ({}));

    let lastError = null;
    // Note: validate-promo-code doesn't require proxy key (public endpoint)
    for (const base of bases) {
      const endpoint = base.replace(/\/$/, '') + '/validate-promo-code';
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
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
        // Non-2xx but valid response (e.g., 400 for invalid input)
        return NextResponse.json(data, { status: res.status });
      } catch (e) {
        lastError = e;
        console.error(`[validate-promo-code] Failed to reach ${endpoint}:`, e.message);
      }
    }

    console.error('[validate-promo-code] All endpoints failed:', lastError?.message);
    return NextResponse.json(
      { error: 'Failed to validate promo code', details: lastError?.message },
      { status: 502 },
    );
  } catch (error) {
    console.error('[validate-promo-code] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
