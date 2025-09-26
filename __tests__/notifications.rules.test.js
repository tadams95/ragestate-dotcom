/**
 * Firestore security rules tests for notifications.
 */
const fs = require('fs');
const path = require('path');
const {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} = require('@firebase/rules-unit-testing');

let testEnv;

beforeAll(async () => {
  const projectId = 'demo-ragestate';
  const rules = fs.readFileSync(path.join(__dirname, '..', 'firestore.rules'), 'utf8');
  testEnv = await initializeTestEnvironment({
    projectId,
    firestore: { rules },
  });
  // Seed baseline data without security rules enforcement
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await db.collection('users').doc('userA').set({ unreadNotifications: 1 });
    await db
      .collection('users')
      .doc('userA')
      .collection('notifications')
      .doc('n1')
      .set({
        type: 'post_liked',
        title: 'New like',
        body: 'Someone liked your post',
        data: { postId: 'p1' },
        link: '/post/p1',
        deepLink: 'ragestate://post/p1',
        createdAt: new Date(),
        seenAt: null,
        read: false,
        sendPush: true,
        pushStatus: 'pending',
        pushSentAt: null,
      });
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

describe('Notifications security rules', () => {
  test('user can read own notification', async () => {
    const userCtx = testEnv.authenticatedContext('userA');
    const db = userCtx.firestore();
    const notifRef = db.collection('users').doc('userA').collection('notifications').doc('n1');
    await assertSucceeds(notifRef.get());
  });

  test('user cannot modify title/body', async () => {
    const userCtx = testEnv.authenticatedContext('userA');
    const db = userCtx.firestore();
    const notifRef = db.collection('users').doc('userA').collection('notifications').doc('n1');
    await assertFails(
      notifRef.update({ title: 'Hacked', read: true, seenAt: new Date() }), // tries to change title
    );
  });

  test('user can mark read with seenAt', async () => {
    const userCtx = testEnv.authenticatedContext('userA');
    const db = userCtx.firestore();
    const notifRef = db.collection('users').doc('userA').collection('notifications').doc('n1');
    await assertSucceeds(notifRef.update({ read: true, seenAt: new Date() }));
  });

  test('user cannot add new field', async () => {
    const userCtx = testEnv.authenticatedContext('userA');
    const db = userCtx.firestore();
    const notifRef = db.collection('users').doc('userA').collection('notifications').doc('n1');
    await assertFails(notifRef.update({ read: true, seenAt: new Date(), extra: 'nope' }));
  });

  test('user cannot change pushStatus directly', async () => {
    const userCtx = testEnv.authenticatedContext('userA');
    const db = userCtx.firestore();
    const notifRef = db.collection('users').doc('userA').collection('notifications').doc('n1');
    await assertFails(notifRef.update({ read: true, seenAt: new Date(), pushStatus: 'sent' }));
  });

  test('user cannot modify data payload map', async () => {
    const userCtx = testEnv.authenticatedContext('userA');
    const db = userCtx.firestore();
    const notifRef = db.collection('users').doc('userA').collection('notifications').doc('n1');
    await assertFails(notifRef.update({ read: true, seenAt: new Date(), data: { postId: 'p2' } }));
  });

  test('user cannot re-mark already read notification', async () => {
    const userCtx = testEnv.authenticatedContext('userA');
    const db = userCtx.firestore();
    const notifRef = db.collection('users').doc('userA').collection('notifications').doc('n1');
    // First mark (should succeed via earlier test). Ensure state is read by seeding directly disabled rules.
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx
        .firestore()
        .collection('users')
        .doc('userA')
        .collection('notifications')
        .doc('n1')
        .update({ read: true, seenAt: new Date() });
    });
    // Second attempt should fail (rule requires resource.read == false)
    await assertFails(notifRef.update({ read: true, seenAt: new Date() }));
  });

  test('user cannot decrement unreadNotifications field on user doc', async () => {
    const userCtx = testEnv.authenticatedContext('userA');
    const db = userCtx.firestore();
    const userRef = db.collection('users').doc('userA');
    await assertFails(userRef.update({ unreadNotifications: 0 }));
  });
});
