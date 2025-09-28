import { Timestamp } from 'firebase-admin/firestore';
import { NextResponse } from 'next/server';
import { firestoreAdmin } from '../../../../../../lib/server/firebaseAdmin';
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
      decoded = await (
        await import('../../../../../../lib/server/firebaseAdmin')
      ).authAdmin.verifyIdToken(idToken);
    } catch (e) {
      return err('UNAUTHENTICATED', 'Invalid token', 401);
    }
    if (!(await userIsAdmin(decoded.uid))) return err('FORBIDDEN', 'Not an admin', 403);

    const body = await req.json().catch(() => null);
    if (!body) return err('INVALID_JSON', 'Malformed JSON body');
    const { slug, active } = body;
    if (!slug || typeof slug !== 'string') return err('SLUG_REQUIRED', 'Missing slug');
    if (typeof active !== 'boolean') return err('ACTIVE_REQUIRED', 'Missing active boolean');

    const ref = firestoreAdmin.collection('events').doc(slug);
    const snap = await ref.get();
    if (!snap.exists) return err('NOT_FOUND', 'Event not found', 404);
    const data = snap.data();
    if (data.active === active) {
      return NextResponse.json({ ok: true, event: { slug, active }, unchanged: true });
    }
    await ref.update({ active, updatedAt: Timestamp.now() });
    return NextResponse.json({ ok: true, event: { slug, active } });
  } catch (e) {
    console.error('SET_ACTIVE_ERROR', e);
    return err('INTERNAL', 'Unexpected error', 500);
  }
}
