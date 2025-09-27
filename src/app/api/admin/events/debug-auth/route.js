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
    const { userIsAdmin } = await import('../../../../../../lib/server/isAdmin');
    const isAdmin = await userIsAdmin(uid);
    return NextResponse.json({
      ok: true,
      uid,
      isAdmin,
      decoded: {
        auth_time: decoded.auth_time,
        exp: decoded.exp,
        iat: decoded.iat,
        email: decoded.email,
      },
    });
  } catch (e) {
    return err('INTERNAL', 'Unexpected error');
  }
}
