import { initializeApp, cert } from "firebase-admin/app";
import { getDatabase } from "firebase-admin/database";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Setup logging
const logFile = path.join(process.cwd(), "migration-log.txt");
const errorLogFile = path.join(process.cwd(), "migration-errors.txt");

function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  console.log(message);
  fs.appendFileSync(logFile, logMessage);
}

function logError(message, error) {
  const timestamp = new Date().toISOString();
  const errorMessage = `[${timestamp}] ERROR: ${message}\n${
    error?.stack || error
  }\n\n`;
  console.error(errorMessage);
  fs.appendFileSync(errorLogFile, errorMessage);
}

// Initialize logging files
fs.writeFileSync(logFile, "--- MIGRATION LOG START ---\n");
fs.writeFileSync(errorLogFile, "--- ERROR LOG START ---\n");

// Load service account using dynamic import (ESM compatible)
try {
  log("Importing service account from .secrets folder...");
  const serviceAccountPath = path.join(
    __dirname,
    "../.secrets/ragestate-app-firebase-adminsdk-en4dj-67ffd1c011.json"
  );

  if (!fs.existsSync(serviceAccountPath)) {
    throw new Error(`Service account file not found at ${serviceAccountPath}`);
  }

  // Read the file synchronously
  const serviceAccountRaw = fs.readFileSync(serviceAccountPath, "utf8");
  const serviceAccount = JSON.parse(serviceAccountRaw);

  log(
    `Successfully loaded service account for project: ${serviceAccount.project_id}`
  );

  // Initialize Firebase Admin
  initializeApp({
    credential: cert(serviceAccount),
    databaseURL: "https://ragestate-app-default-rtdb.firebaseio.com",
  });

  // Get database references
  const rtdb = getDatabase();
  const firestore = getFirestore();

  // Configuration - adjusted for smaller user count
  const BATCH_SIZE = 20; // Smaller batch size for better monitoring
  const DELAY_BETWEEN_BATCHES = 500; // Shorter delay since we have fewer users

  // Change from const to let so it can be modified
  let DRY_RUN = true; // Set to true for initial testing, change to false for actual migration

  // Check for command line arguments
  const args = process.argv.slice(2);
  const isLive = args.includes("--live");
  if (isLive) {
    log(
      "LIVE MODE detected from command line arguments. Will perform actual writes."
    );
    DRY_RUN = false;
  }

  // Statistics
  const stats = {
    totalUsers: 0,
    processedUsers: 0,
    skippedUsers: 0,
    successUsers: 0,
    errorUsers: 0,
    startTime: Date.now(),
  };

  async function migrateUsers() {
    log("Starting user migration from Realtime Database to Firestore...");
    log(
      `Mode: ${
        DRY_RUN ? "DRY RUN (no writes)" : "LIVE (will write to Firestore)"
      }`
    );

    try {
      // Updated to look for users in the correct path - first check users path
      const usersRef = rtdb.ref("/users");
      const usersSnapshot = await usersRef.once("value");
      const users = usersSnapshot.val();

      if (!users) {
        log("No users found under /users path. Checking root level...");

        // Try looking at root level for specific user IDs (not containing "users" or "announcements")
        const rootSnapshot = await rtdb.ref("/").once("value");
        const rootData = rootSnapshot.val();

        if (!rootData) {
          log("No data found in Realtime Database.");
          return;
        }

        // Filter out non-user keys and extract user objects
        const userIds = Object.keys(rootData).filter(
          (key) =>
            key !== "users" &&
            key !== "announcements" &&
            typeof rootData[key] === "object" &&
            rootData[key] !== null
        );

        if (userIds.length === 0) {
          log(
            "Cannot find user records. Please verify the database structure."
          );
          log("Available root paths:", Object.keys(rootData).join(", "));
          return;
        }

        // Create users object from filtered root data
        const extractedUsers = {};
        userIds.forEach((id) => {
          extractedUsers[id] = rootData[id];
        });

        await processUsers(extractedUsers);
      } else {
        await processUsers(users);
      }
    } catch (error) {
      logError("Fatal error during migration", error);
      process.exit(1);
    }
  }

  // New function to handle users once we've found them
  async function processUsers(users) {
    const userIds = Object.keys(users);
    stats.totalUsers = userIds.length;

    log(`Found ${stats.totalUsers} users.`);

    // Process users in batches
    for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
      const batchUserIds = userIds.slice(i, i + BATCH_SIZE);
      log(
        `Processing batch ${Math.floor(i / BATCH_SIZE) + 1} of ${Math.ceil(
          userIds.length / BATCH_SIZE
        )} (${batchUserIds.length} users)...`
      );

      const promises = batchUserIds.map((userId) =>
        migrateUser(userId, users[userId])
      );
      await Promise.all(promises);

      log(
        `Batch ${
          Math.floor(i / BATCH_SIZE) + 1
        } completed. Progress: ${Math.min(i + BATCH_SIZE, userIds.length)}/${
          userIds.length
        } users.`
      );

      // Add a delay between batches to avoid rate limiting
      if (i + BATCH_SIZE < userIds.length) {
        await new Promise((resolve) =>
          setTimeout(resolve, DELAY_BETWEEN_BATCHES)
        );
      }
    }

    const duration = (Date.now() - stats.startTime) / 1000;
    log("\n--- MIGRATION SUMMARY ---");
    log(`Total users: ${stats.totalUsers}`);
    log(`Successfully migrated: ${stats.successUsers}`);
    log(`Skipped: ${stats.skippedUsers}`);
    log(`Errors: ${stats.errorUsers}`);
    log(`Duration: ${duration.toFixed(2)} seconds`);
    log(`Mode: ${DRY_RUN ? "DRY RUN (no writes)" : "LIVE"}`);
    log("--- MIGRATION COMPLETE ---");
  }

  async function migrateUser(userId, userData) {
    stats.processedUsers++;

    try {
      if (!userData) {
        log(`Skipping user ${userId}: No data.`);
        stats.skippedUsers++;
        return;
      }

      // Check if user already exists in Firestore
      const userDoc = await firestore.collection("customers").doc(userId).get();

      if (userDoc.exists) {
        const existingData = userDoc.data();
        log(
          `User ${userId} already exists in Firestore with fields: ${Object.keys(
            existingData
          ).join(", ")}`
        );

        if (existingData.migratedFromRTDB) {
          log(
            `User ${userId} was previously migrated. Will update with latest data.`
          );
        }
      }

      // Transform user data for Firestore
      const firestoreData = {
        // Standard fields
        userId: userId,
        email: userData.email || "",
        firstName: userData.firstName || "",
        lastName: userData.lastName || "",
        phoneNumber: userData.phoneNumber || "",
        profilePicture: userData.profilePicture || "",
        qrCode: userData.qrCode || userId,

        // Add other fields you want to migrate
        expoPushToken: userData.expoPushToken || "",
        stripeCustomerId: userData.stripeCustomerId || "",

        // Admin status
        isAdmin: !!userData.isAdmin,

        // Timestamps
        lastLogin: userData.lastLogin || new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        migrationDate: new Date().toISOString(),
        migratedFromRTDB: true,

        // Computed fields
        displayName: `${userData.firstName || ""} ${
          userData.lastName || ""
        }`.trim(),
      };

      // Add any other fields that exist in the RTDB data but aren't explicitly mapped above
      for (const key in userData) {
        if (
          !firestoreData.hasOwnProperty(key) &&
          typeof userData[key] !== "function" &&
          typeof userData[key] !== "object"
        ) {
          firestoreData[key] = userData[key];
        }
      }

      // Log what we're going to do
      if (DRY_RUN) {
        log(
          `[DRY RUN] Would migrate user: ${userId} (${firestoreData.email}) - ${
            firestoreData.displayName || "No Name"
          }`
        );
        log(`[DRY RUN] User data: ${JSON.stringify(firestoreData, null, 2)}`);
      } else {
        log(
          `Migrating user: ${userId} (${firestoreData.email}) - ${
            firestoreData.displayName || "No Name"
          }`
        );

        // Write to Firestore
        await firestore
          .collection("customers")
          .doc(userId)
          .set(firestoreData, { merge: true });
        log(`Successfully wrote user ${userId} to Firestore`);
      }

      stats.successUsers++;
    } catch (error) {
      logError(`Error migrating user ${userId}`, error);
      stats.errorUsers++;
    }
  }

  // Run the migration
  migrateUsers()
    .then(() => {
      log("Migration script completed.");
      process.exit(0);
    })
    .catch((error) => {
      logError("Unhandled error in migration script", error);
      process.exit(1);
    });
} catch (error) {
  console.error("Failed to initialize:", error);
  logError("Initialization error", error);
  process.exit(1);
}
