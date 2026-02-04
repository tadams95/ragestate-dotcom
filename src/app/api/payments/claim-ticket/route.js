import fs from 'fs';
import { NextResponse } from 'next/server';
import path from 'path';

/**
 * Verify Firebase ID token and return decoded token
 * SECURITY FIX: Added to verify claimerUserId matches authenticated user
 * @param {Request} request
 * @returns {Promise<{uid: string, email?: string}|null>}
 */
async function verifyAuth(request) {
  const authHeader = request.headers.get('authorization') || '';
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!idToken) return null;

  try {
    const { authAdmin } = await import('../../../../../lib/server/firebaseAdmin');
    return await authAdmin.verifyIdToken(idToken);
  } catch (e) {
    console.warn('Claim-ticket auth verification failed:', e?.code || e?.message);
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

    // Validate required fields
    if (!payload.claimToken || !payload.claimerUserId) {
      return NextResponse.json(
        { error: 'Missing required fields: claimToken, claimerUserId' },
        { status: 400 },
      );
    }

    // SECURITY FIX: Verify that claimerUserId matches the authenticated user
    // This prevents users from claiming tickets on behalf of other users
    const decoded = await verifyAuth(request);
    if (!decoded) {
      return NextResponse.json(
        { error: 'Authentication required to claim tickets', code: 'UNAUTHENTICATED' },
        { status: 401 },
      );
    }

    if (decoded.uid !== payload.claimerUserId) {
      console.warn('Claim-ticket security violation: claimerUserId mismatch', {
        authenticatedUid: decoded.uid,
        claimerUserId: payload.claimerUserId,
      });
      return NextResponse.json(
        { error: 'Cannot claim ticket for another user', code: 'FORBIDDEN' },
        { status: 403 },
      );
    }

    // Ensure claimerEmail matches if provided
    if (payload.claimerEmail && decoded.email) {
      const normalizedPayloadEmail = payload.claimerEmail.toLowerCase().trim();
      const normalizedTokenEmail = decoded.email.toLowerCase().trim();
      if (normalizedPayloadEmail !== normalizedTokenEmail) {
        console.warn('Claim-ticket email mismatch (using token email)', {
          payloadEmail: normalizedPayloadEmail,
          tokenEmail: normalizedTokenEmail,
        });
        // Use the verified email from the token instead
        payload.claimerEmail = decoded.email;
      }
    } else if (decoded.email && !payload.claimerEmail) {
      // Add verified email if not provided
      payload.claimerEmail = decoded.email;
    }

    let lastError = null;
    const proxyKey = process.env.PROXY_KEY;

    for (const base of bases) {
      const endpoint = base.replace(/\/$/, '') + '/claim-ticket';
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

        // Return error from function
        return NextResponse.json(data, { status: res.status });
      } catch (fetchErr) {
        lastError = { message: fetchErr.message, target: endpoint };
      }
    }

    // All attempts failed
    return NextResponse.json(
      { error: lastError?.message || 'Failed to claim ticket' },
      { status: lastError?.status || 502 },
    );
  } catch (err) {
    console.error('claim-ticket proxy error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
