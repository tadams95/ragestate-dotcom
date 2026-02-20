import { getDatabase } from 'firebase-admin/database';
import { NextResponse } from 'next/server';
import { authAdmin } from '../../../../../../lib/server/firebaseAdmin';
import { userIsAdmin } from '../../../../../../lib/server/isAdmin';

function err(code, message, status = 400, extra = {}) {
  return NextResponse.json({ ok: false, code, message, ...extra }, { status });
}

export async function POST(req) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!idToken) return err('UNAUTHENTICATED', 'Missing bearer token', 401);

    let decoded;
    try {
      decoded = await authAdmin.verifyIdToken(idToken);
    } catch {
      return err('UNAUTHENTICATED', 'Invalid token', 401);
    }

    if (!(await userIsAdmin(decoded.uid))) return err('FORBIDDEN', 'Not an admin', 403);

    const body = await req.json().catch(() => null);
    if (!body) return err('INVALID_JSON', 'Malformed JSON body');

    const { userId, disabled } = body;
    if (!userId || typeof userId !== 'string') return err('USER_ID_REQUIRED', 'Missing userId string');
    if (typeof disabled !== 'boolean') return err('DISABLED_REQUIRED', 'Missing disabled boolean');
    if (userId === decoded.uid) return err('SELF_DISABLE', 'Cannot disable your own account');

    try {
      await authAdmin.updateUser(userId, { disabled });
    } catch (e) {
      if (e.code === 'auth/user-not-found') {
        return err('NOT_FOUND', 'User not found', 404);
      }
      throw e;
    }

    // Sync to RTDB (non-fatal)
    try {
      const rtdb = getDatabase();
      await rtdb.ref(`users/${userId}/disabled`).set(disabled);
    } catch (e) {
      console.warn('RTDB sync failed for set-disabled (Auth state already updated):', e.message);
    }

    return NextResponse.json({ ok: true, userId, disabled });
  } catch (e) {
    console.error('SET_DISABLED_ERROR', e);
    return err('INTERNAL', 'Unexpected error', 500);
  }
}
