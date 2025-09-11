import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldPath } from "firebase-admin/firestore";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

// __dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Simple logs
const logFile = path.join(process.cwd(), "sync-profile-pictures.log");
const errFile = path.join(process.cwd(), "sync-profile-pictures-errors.log");
fs.writeFileSync(logFile, "--- SYNC START ---\n");
fs.writeFileSync(errFile, "--- ERRORS START ---\n");
const log = (m) => {
  const line = `[${new Date().toISOString()}] ${m}\n`;
  process.stdout.write(line);
  fs.appendFileSync(logFile, line);
};
const logErr = (m, e) => {
  const line = `[${new Date().toISOString()}] ERROR: ${m}\n${
    e?.stack || e
  }\n\n`;
  process.stderr.write(line);
  fs.appendFileSync(errFile, line);
};

// Flags: --live to write, --overwrite to replace existing photoURL
const args = process.argv.slice(2);
const LIVE = args.includes("--live");
const OVERWRITE = args.includes("--overwrite");

async function main() {
  try {
    // Load service account from same .secrets path as other scripts
    const saPath = path.join(
      __dirname,
      "../.secrets/ragestate-app-firebase-adminsdk-en4dj-67ffd1c011.json"
    );
    if (!fs.existsSync(saPath)) {
      throw new Error(`Service account file not found at ${saPath}`);
    }
    const sa = JSON.parse(fs.readFileSync(saPath, "utf8"));

    initializeApp({ credential: cert(sa) });
    const db = getFirestore();

    log(
      `Starting profile photo sync: mode=${LIVE ? "LIVE" : "DRY"}, overwrite=${
        OVERWRITE ? "yes" : "no"
      }`
    );

    const pageSize = 500;
    let lastDoc = null;
    let scanned = 0;
    let updated = 0;
    let skipped = 0;
    let overwritten = 0;

    while (true) {
      let q = db
        .collection("customers")
        .orderBy(FieldPath.documentId())
        .limit(pageSize);
      if (lastDoc) q = q.startAfter(lastDoc.id);
      const snap = await q.get();
      if (snap.empty) break;

      for (const docSnap of snap.docs) {
        scanned++;
        const uid = docSnap.id;
        const data = docSnap.data() || {};
        const pic = data.profilePicture || "";
        if (!pic) {
          skipped++;
          continue;
        }
        try {
          const profileRef = db.collection("profiles").doc(uid);
          const profileSnap = await profileRef.get();
          const p = profileSnap.exists ? profileSnap.data() || {} : {};
          const existing = p.photoURL || p.profilePicture || "";

          if (!existing) {
            if (LIVE) await profileRef.set({ photoURL: pic }, { merge: true });
            updated++;
            log(`Set photoURL for ${uid}`);
          } else if (OVERWRITE && existing !== pic) {
            if (LIVE) await profileRef.set({ photoURL: pic }, { merge: true });
            overwritten++;
            log(`Overwrote photoURL for ${uid}`);
          } else {
            skipped++;
          }
        } catch (e) {
          logErr(`Failed to sync ${uid}`, e);
        }
      }

      lastDoc = snap.docs[snap.docs.length - 1];
      if (snap.size < pageSize) break;
    }

    log(
      `Sync complete. scanned=${scanned}, updated=${updated}, overwritten=${overwritten}, skipped=${skipped}.`
    );
  } catch (e) {
    logErr("Fatal error in sync script", e);
    process.exit(1);
  }
}

main().then(() => process.exit(0));
