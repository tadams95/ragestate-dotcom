import { cert, initializeApp } from 'firebase-admin/app';
import { FieldPath, getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';

// __dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const logFile = path.join(process.cwd(), 'backfill-usernames.log');
const errFile = path.join(process.cwd(), 'backfill-usernames-errors.log');
fs.writeFileSync(logFile, '--- BACKFILL START ---\n');
fs.writeFileSync(errFile, '--- ERRORS START ---\n');
const log = (m) => {
  const line = `[${new Date().toISOString()}] ${m}\n`;
  process.stdout.write(line);
  fs.appendFileSync(logFile, line);
};
const logErr = (m, e) => {
  const line = `[${new Date().toISOString()}] ERROR: ${m}\n${e?.stack || e}\n\n`;
  process.stderr.write(line);
  fs.appendFileSync(errFile, line);
};

// Flags: --live to write
const args = process.argv.slice(2);
const LIVE = args.includes('--live');

async function main() {
  try {
    // Load service account like other scripts
    const saPath = path.join(
      __dirname,
      '../.secrets/ragestate-app-firebase-adminsdk-en4dj-67ffd1c011.json',
    );
    if (!fs.existsSync(saPath)) {
      throw new Error(`Service account file not found at ${saPath}`);
    }
    const sa = JSON.parse(fs.readFileSync(saPath, 'utf8'));

    initializeApp({ credential: cert(sa) });
    const db = getFirestore();

    log(`Starting username backfill: mode=${LIVE ? 'LIVE' : 'DRY'}`);

    let scanned = 0;
    let updatedPosts = 0;
    let updatedComments = 0;
    let skipped = 0;

    // Cache uid -> usernameLower to reduce reads
    const usernameCache = new Map();

    const getUsernameLower = async (uid) => {
      if (!uid) return null;
      if (usernameCache.has(uid)) return usernameCache.get(uid);
      try {
        const prof = await db.collection('profiles').doc(uid).get();
        const uname = prof.exists ? prof.data()?.usernameLower || null : null;
        usernameCache.set(uid, uname);
        return uname;
      } catch (e) {
        logErr(`Failed to read profiles/${uid}`, e);
        usernameCache.set(uid, null);
        return null;
      }
    };

    // Helper to process a collection in pages
    async function processCollection(colName, onDoc) {
      const pageSize = 500;
      let last = null;
      while (true) {
        let q = db.collection(colName).orderBy(FieldPath.documentId()).limit(pageSize);
        if (last) q = q.startAfter(last.id);
        const snap = await q.get();
        if (snap.empty) break;
        for (const d of snap.docs) {
          await onDoc(d);
        }
        last = snap.docs[snap.docs.length - 1];
        if (snap.size < pageSize) break;
      }
    }

    // 1) Backfill posts.usernameLower
    await processCollection('posts', async (docSnap) => {
      scanned++;
      const data = docSnap.data() || {};
      if (data.usernameLower) {
        skipped++;
        return;
      }
      const uid = data.userId;
      const uname = await getUsernameLower(uid);
      if (!uname) {
        skipped++;
        return;
      }
      try {
        if (LIVE) await docSnap.ref.set({ usernameLower: uname }, { merge: true });
        updatedPosts++;
        log(`posts/${docSnap.id}: set usernameLower=${uname}`);
      } catch (e) {
        logErr(`Failed to update posts/${docSnap.id}`, e);
      }
    });

    // 2) Backfill postComments.usernameLower
    await processCollection('postComments', async (docSnap) => {
      scanned++;
      const data = docSnap.data() || {};
      if (data.usernameLower) {
        skipped++;
        return;
      }
      const uid = data.userId;
      const uname = await getUsernameLower(uid);
      if (!uname) {
        skipped++;
        return;
      }
      try {
        if (LIVE) await docSnap.ref.set({ usernameLower: uname }, { merge: true });
        updatedComments++;
        log(`postComments/${docSnap.id}: set usernameLower=${uname}`);
      } catch (e) {
        logErr(`Failed to update postComments/${docSnap.id}`, e);
      }
    });

    log(
      `Backfill complete. scanned=${scanned}, updatedPosts=${updatedPosts}, updatedComments=${updatedComments}, skipped=${skipped}`,
    );
  } catch (e) {
    logErr('Fatal error in backfill script', e);
    process.exit(1);
  }
}

main().then(() => process.exit(0));
