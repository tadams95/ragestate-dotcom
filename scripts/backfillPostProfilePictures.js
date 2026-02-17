import { cert, initializeApp } from 'firebase-admin/app';
import { FieldPath, getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';

// __dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const logFile = path.join(process.cwd(), 'backfill-post-profile-pictures.log');
const errFile = path.join(process.cwd(), 'backfill-post-profile-pictures-errors.log');
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

// Flags: --live to write, --overwrite to replace existing values
const args = process.argv.slice(2);
const LIVE = args.includes('--live');
const OVERWRITE = args.includes('--overwrite');

async function main() {
  try {
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

    log(
      `Starting post profile picture backfill: mode=${LIVE ? 'LIVE' : 'DRY'}, overwrite=${OVERWRITE ? 'yes' : 'no'}`,
    );

    let scanned = 0;
    let updated = 0;
    let skipped = 0;
    let noProfile = 0;

    // Cache userId -> photoURL to avoid redundant profile reads
    const photoCache = new Map();

    const getPhotoURL = async (uid) => {
      if (!uid) return null;
      if (photoCache.has(uid)) return photoCache.get(uid);
      try {
        const prof = await db.collection('profiles').doc(uid).get();
        const url = prof.exists ? prof.data()?.photoURL || null : null;
        photoCache.set(uid, url);
        return url;
      } catch (e) {
        logErr(`Failed to read profiles/${uid}`, e);
        photoCache.set(uid, null);
        return null;
      }
    };

    // Paginate through posts collection
    const pageSize = 500;
    let lastDoc = null;

    while (true) {
      let q = db.collection('posts').orderBy(FieldPath.documentId()).limit(pageSize);
      if (lastDoc) q = q.startAfter(lastDoc.id);
      const snap = await q.get();
      if (snap.empty) break;

      for (const docSnap of snap.docs) {
        scanned++;
        const data = docSnap.data() || {};
        const existing = data.userProfilePicture || '';

        if (existing && !OVERWRITE) {
          skipped++;
          continue;
        }

        const uid = data.userId;
        const photoURL = await getPhotoURL(uid);

        if (!photoURL) {
          noProfile++;
          log(`posts/${docSnap.id}: no photoURL found for userId=${uid}, skipping`);
          continue;
        }

        if (existing === photoURL) {
          skipped++;
          continue;
        }

        try {
          if (LIVE) {
            await docSnap.ref.set({ userProfilePicture: photoURL }, { merge: true });
          }
          updated++;
          log(
            `posts/${docSnap.id}: ${existing ? 'overwrote' : 'set'} userProfilePicture for userId=${uid}`,
          );
        } catch (e) {
          logErr(`Failed to update posts/${docSnap.id}`, e);
        }
      }

      lastDoc = snap.docs[snap.docs.length - 1];
      if (snap.size < pageSize) break;
    }

    log(
      `Backfill complete. scanned=${scanned}, updated=${updated}, skipped=${skipped}, noProfile=${noProfile}, cachedProfiles=${photoCache.size}`,
    );
  } catch (e) {
    logErr('Fatal error in backfill script', e);
    process.exit(1);
  }
}

main().then(() => process.exit(0));
