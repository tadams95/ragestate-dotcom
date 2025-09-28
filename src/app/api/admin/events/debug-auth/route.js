import { NextResponse } from 'next/server';

function err(code, message, status = 400, extra = {}) {
  return NextResponse.json({ ok: false, code, message, ...extra }, { status });
}

export async function GET(req) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!idToken) return err('UNAUTHENTICATED', 'Missing bearer token', 401);
    const { authAdmin } = await import('../../../../../../lib/server/firebaseAdmin');
    let decoded;
    try {
      decoded = await authAdmin.verifyIdToken(idToken);
    } catch (e) {
      return err('TOKEN_INVALID', e?.code || e?.message || 'Invalid token', 401, {
        rawCode: e?.code || e?.errorInfo?.code,
      });
    }
    const uid = decoded.uid;
    const { userAdminInfo } = await import('../../../../../../lib/server/isAdmin');
    const adminInfo = await userAdminInfo(uid);
    // Introspect server project/environment (helps diagnose mismatched project IDs)
    let serverProject = undefined;
    try {
      const app = (await import('firebase-admin/app')).getApps()?.[0];
      serverProject = app?.options?.projectId;
    } catch {}
    return NextResponse.json({
      ok: true,
      uid,
      // high-level admin boolean remains for backwards compatibility
      isAdmin: adminInfo.isAdmin,
      adminSources: adminInfo.sources,
      adminDoc: adminInfo.adminUsersDocData || null,
      adminErrors: adminInfo.errors,
      decoded: {
        auth_time: decoded.auth_time,
        exp: decoded.exp,
        iat: decoded.iat,
        email: decoded.email,
        aud: decoded.aud,
        iss: decoded.iss,
        sub: decoded.sub,
      },
      server: {
        projectId: serverProject,
        envProjectId: process.env.FIREBASE_PROJECT_ID || null,
        envPublicProjectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || null,
        hasServiceAccount:
          !!process.env.FIREBASE_SERVICE_ACCOUNT ||
          !!process.env.FIREBASE_SERVICE_ACCOUNT_B64 ||
          !!process.env.FIREBASE_SERVICE_ACCOUNT_FILE,
      },
    });
  } catch (e) {
    return err('INTERNAL', 'Unexpected error');
  }
}
