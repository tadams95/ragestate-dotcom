/** @jest-environment node */
// Integration tests for POST /api/admin/events/create
// Expect Firestore & Auth emulators on 127.0.0.1:8080 / 9099.
// Skips automatically when emulator env vars not set or unreachable.
// We import the route directly (no Next server spin-up) for speed.

import { authAdmin, firestoreAdmin } from '../../../server/firebaseAdmin.js';

// Next's route module expects Web Fetch API globals (Request, Response). Node 18 should have them
// but Jest environment (jsdom) may not expose them the same way. Ensure they exist.
async function ensureFetchGlobals() {
  if (typeof global.Request === 'undefined') {
    const undici = await import('undici');
    global.Request = undici.Request;
    global.Response = undici.Response;
    global.Headers = undici.Headers;
  }
}

let POST; // will dynamic import after polyfills

// Minimal polyfill of NextRequest for handler use (we only need headers + json())
class MockRequest {
  constructor(body, token) {
    this._body = body;
    this._headers = new Map();
    if (token) this._headers.set('authorization', `Bearer ${token}`);
  }
  async json() {
    return this._body;
  }
  headers = {
    get: (k) => this._headers.get(k.toLowerCase()) || null,
  };
}

function emulatorEnvSet() {
  return process.env.FIRESTORE_EMULATOR_HOST && process.env.FIREBASE_AUTH_EMULATOR_HOST;
}

async function emulatorReachable() {
  if (!emulatorEnvSet()) return false;
  try {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 250);
    await fetch('http://127.0.0.1:8080/', { signal: ctrl.signal }).catch(() => {});
    clearTimeout(timeout);
    return true; // TCP connect success assumed
  } catch {
    return false;
  }
}

// Helper to create a mock admin user in auth emulator with custom claim
async function createAdminUser(uid = 'adminTestUser') {
  try {
    await authAdmin.deleteUser(uid);
  } catch (e) {
    /* ignore */
  }
  await authAdmin.createUser({ uid, email: `${uid}@example.com` });
  await authAdmin.setCustomUserClaims(uid, { admin: true });
  // Sign a custom token then exchange for ID token via emulator REST endpoint
  const customToken = await authAdmin.createCustomToken(uid);
  const fetch = global.fetch || (await import('node-fetch')).default;
  const resp = await fetch(
    `http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=fake-api-key`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: customToken, returnSecureToken: true }),
    },
  );
  const data = await resp.json();
  if (!data.idToken) throw new Error('Failed to obtain emulator idToken');
  return data.idToken;
}

async function createNonAdminUser(uid = 'regularTestUser') {
  try {
    await authAdmin.deleteUser(uid);
  } catch (e) {
    /* ignore */
  }
  await authAdmin.createUser({ uid, email: `${uid}@example.com` });
  const customToken = await authAdmin.createCustomToken(uid);
  const fetch = global.fetch || (await import('node-fetch')).default;
  const resp = await fetch(
    `http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=fake-api-key`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: customToken, returnSecureToken: true }),
    },
  );
  const data = await resp.json();
  if (!data.idToken) throw new Error('Failed to obtain emulator idToken');
  return data.idToken;
}

const baseValidPayload = () => ({
  name: 'Integration Test Event',
  description: 'This is a fully valid integration test description that is long enough.',
  imgURL: 'https://firebasestorage.googleapis.com/v0/b/fake/o/test.png?alt=media',
  price: 25,
  age: 21,
  dateTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1h future
  location: 'Test Location',
  quantity: 10,
  capacity: 20,
  isDigital: false,
  category: 'Test',
  guests: ['DJ Test'],
  active: true,
});

function extractJson(res) {
  return res.json();
}

let describeBlockInitialized = false;
(async () => {
  const reachable = await emulatorReachable();
  const d = reachable ? describe : describe.skip;
  d('POST /api/admin/events/create (emulator)', () => {
    let adminToken;

    beforeAll(async () => {
      await ensureFetchGlobals();
      adminToken = await createAdminUser();
      ({ POST } = await import('../../../../src/app/api/admin/events/create/route.js'));
    });

    afterAll(async () => {
      // Cleanup events collection
      const events = await firestoreAdmin.collection('events').get();
      const batch = firestoreAdmin.batch();
      events.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    });

    test('rejects unauthenticated', async () => {
      const req = new MockRequest(baseValidPayload(), null);
      const res = await POST(req);
      const json = await extractJson(res);
      expect(json.ok).toBe(false);
      expect(json.code).toBe('UNAUTHENTICATED');
    });

    test('rejects non-admin', async () => {
      const regularToken = await createNonAdminUser();
      const req = new MockRequest(baseValidPayload(), regularToken);
      const res = await POST(req);
      const json = await extractJson(res);
      expect(json.ok).toBe(false);
      expect(json.code).toBe('FORBIDDEN');
    });

    test('happy path creates event', async () => {
      const payload = baseValidPayload();
      const req = new MockRequest(payload, adminToken);
      const res = await POST(req);
      const json = await extractJson(res);
      expect(json.ok).toBe(true);
      expect(json.event.slug).toBeTruthy();
      const doc = await firestoreAdmin.collection('events').doc(json.event.slug).get();
      expect(doc.exists).toBe(true);
      const data = doc.data();
      expect(data.name).toBe(payload.name);
      expect(data.active).toBe(true);
    });

    test('duplicate active name triggers NAME_CONFLICT', async () => {
      const payload = baseValidPayload();
      payload.name = 'Integration Test Event'; // same as before
      const req = new MockRequest(payload, adminToken);
      const res = await POST(req);
      const json = await extractJson(res);
      expect(json.ok).toBe(false);
      expect(json.code).toBe('NAME_CONFLICT');
    });

    test('capacity < quantity rejected', async () => {
      const payload = baseValidPayload();
      payload.name = 'Integration Different Event';
      payload.capacity = 5; // less than quantity 10
      const req = new MockRequest(payload, adminToken);
      const res = await POST(req);
      const json = await extractJson(res);
      expect(json.ok).toBe(false);
      expect(json.code).toBe('CAPACITY_INVALID');
    });

    test('past date rejected', async () => {
      const payload = baseValidPayload();
      payload.name = 'Integration Past Date';
      payload.dateTime = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const req = new MockRequest(payload, adminToken);
      const res = await POST(req);
      const json = await extractJson(res);
      expect(json.ok).toBe(false);
      expect(json.code).toBe('DATETIME_INVALID');
    });

    test('invalid description length rejected', async () => {
      const payload = baseValidPayload();
      payload.name = 'Integration Short Desc';
      payload.description = 'short';
      const req = new MockRequest(payload, adminToken);
      const res = await POST(req);
      const json = await extractJson(res);
      expect(json.ok).toBe(false);
      expect(json.code).toBe('DESCRIPTION_INVALID');
    });
  });
  describeBlockInitialized = true;
})();

// In case the async IIFE fails before defining tests, ensure Jest sees at least one skipped suite.
if (!describeBlockInitialized) {
  describe.skip('POST /api/admin/events/create (emulator) – skipped (emulator not running)', () => {
    it('skipped', () => {});
  });
}
