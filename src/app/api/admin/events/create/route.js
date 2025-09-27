import { Timestamp } from 'firebase-admin/firestore';
import { NextResponse } from 'next/server';
import { coerceAndValidate } from '../../../../../../lib/admin/events/schema';
import { generateUniqueSlug } from '../../../../../../lib/admin/events/slug';
import { firestoreAdmin } from '../../../../../../lib/server/firebaseAdmin';
import { userIsAdmin } from '../../../../../../lib/server/isAdmin';

function error(code, message, status = 400, extra = {}) {
  return NextResponse.json({ ok: false, code, message, ...extra }, { status });
}

export async function POST(req) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!idToken) return error('UNAUTHENTICATED', 'Missing bearer token', 401);
    let decoded;
    try {
      decoded = await (
        await import('../../../../../../lib/server/firebaseAdmin')
      ).authAdmin.verifyIdToken(idToken);
    } catch (e) {
      return error('UNAUTHENTICATED', 'Invalid token', 401);
    }
    const uid = decoded.uid;
    if (!(await userIsAdmin(uid))) return error('FORBIDDEN', 'Not an admin', 403);

    const body = await req.json().catch(() => null);
    if (!body) return error('INVALID_JSON', 'Malformed JSON body', 400);
    const { ok, value, code: validationCode, issue } = coerceAndValidate(body);
    if (!ok) return error(validationCode, issue?.message || 'Validation failed');

    // Additional semantic checks
    const now = Date.now();
    const dt = Date.parse(value.dateTime);
    if (isNaN(dt)) return error('DATETIME_INVALID', 'Invalid date format');
    if (dt < now - 5 * 60 * 1000) return error('DATETIME_INVALID', 'Date/time in past');

    if (value.capacity && value.capacity < value.quantity) {
      return error('CAPACITY_INVALID', 'Capacity cannot be less than quantity');
    }

    // Enforce active name uniqueness (case-insensitive) among active events
    const nameLower = value.name.toLowerCase().trim();
    if (value.active) {
      const conflictSnap = await firestoreAdmin
        .collection('events')
        .where('nameLower', '==', nameLower)
        .where('active', '==', true)
        .limit(1)
        .get();
      if (!conflictSnap.empty)
        return error('NAME_CONFLICT', 'An active event with that name already exists');
    }

    // Generate slug (may retry)
    const slug = await generateUniqueSlug(value.name);

    const eventRef = firestoreAdmin.collection('events').doc(slug);

    const writeResult = await firestoreAdmin.runTransaction(async (tx) => {
      const existing = await tx.get(eventRef);
      if (existing.exists) throw new Error('SLUG_RACE');
      const nowTs = Timestamp.now();
      tx.set(eventRef, {
        name: value.name.trim(),
        description: value.description,
        imgURL: value.imgURL,
        price: Number(value.price),
        age: value.age ?? null,
        dateTime: Timestamp.fromMillis(dt),
        location: value.location,
        quantity: value.quantity,
        capacity: value.capacity ?? null,
        isDigital: !!value.isDigital,
        category: value.category || null,
        guests: value.guests || [],
        active: !!value.active,
        createdAt: nowTs,
        updatedAt: nowTs,
        slug,
        nameLower,
      });
      return { slug, id: slug };
    });

    return NextResponse.json({ ok: true, event: { slug: writeResult.slug } }, { status: 201 });
  } catch (e) {
    if (e.message === 'SLUG_RACE') return error('RETRY', 'Slug collision – retry', 409);
    if (e.message === 'SLUG_GENERATION_FAILED')
      return error('SLUG_GENERATION_FAILED', 'Unable to allocate unique slug', 500);
    console.error('EVENT_CREATE_ERROR', e);
    return error('INTERNAL', 'Unexpected error', 500);
  }
}
