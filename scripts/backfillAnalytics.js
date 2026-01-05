/**
 * Backfill Analytics Script
 *
 * Populates historical analytics/{YYYY-MM-DD} documents by iterating
 * from the earliest purchase date to yesterday.
 *
 * Usage:
 *   npm run backfill:analytics:dry   # Preview what will be aggregated
 *   npm run backfill:analytics:live  # Actually write to Firestore
 *
 * Options:
 *   --live          Write to Firestore (default: dry run)
 *   --from=DATE     Start from specific date (YYYY-MM-DD)
 *   --to=DATE       End at specific date (YYYY-MM-DD, default: yesterday)
 *   --skip-existing Skip dates that already have analytics docs
 */

import { cert, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore, Timestamp } from 'firebase-admin/firestore';
import fs from 'fs';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';

// __dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const logFile = path.join(process.cwd(), 'backfill-analytics.log');
const errFile = path.join(process.cwd(), 'backfill-analytics-errors.log');
fs.writeFileSync(logFile, '--- BACKFILL ANALYTICS START ---\n');
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

// Parse CLI args
const args = process.argv.slice(2);
const LIVE = args.includes('--live');
const SKIP_EXISTING = args.includes('--skip-existing');

const getArgValue = (prefix) => {
  const arg = args.find((a) => a.startsWith(prefix));
  return arg ? arg.split('=')[1] : null;
};

const FROM_DATE = getArgValue('--from=');
const TO_DATE = getArgValue('--to=');

// Date helpers
function formatDateKey(date) {
  return date.toISOString().split('T')[0];
}

function getDateRange(dateStr) {
  const start = new Date(`${dateStr}T00:00:00.000Z`);
  const end = new Date(`${dateStr}T23:59:59.999Z`);
  return { start, end };
}

function getYesterdayDateStr() {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  return formatDateKey(yesterday);
}

function addDays(dateStr, days) {
  const d = new Date(`${dateStr}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return formatDateKey(d);
}

function daysBetween(startStr, endStr) {
  const start = new Date(`${startStr}T00:00:00.000Z`);
  const end = new Date(`${endStr}T00:00:00.000Z`);
  return Math.floor((end - start) / (24 * 60 * 60 * 1000)) + 1;
}

// Aggregation functions (mirror analytics.js logic)
async function aggregateRevenue(db, startTimestamp, endTimestamp) {
  try {
    const purchasesSnapshot = await db
      .collection('purchases')
      .where('orderDate', '>=', startTimestamp)
      .where('orderDate', '<=', endTimestamp)
      .get();

    let total = 0;
    let ticketRevenue = 0;
    let merchRevenue = 0;
    let orderCount = 0;

    purchasesSnapshot.forEach((doc) => {
      const data = doc.data();
      const amountStr = data.totalAmount || '0';
      const amountCents = Math.round(parseFloat(amountStr) * 100) || 0;

      total += amountCents;
      orderCount += 1;

      if (data.hasEventItems && !data.hasMerchandiseItems) {
        ticketRevenue += amountCents;
      } else if (data.hasMerchandiseItems && !data.hasEventItems) {
        merchRevenue += amountCents;
      } else if (data.hasEventItems && data.hasMerchandiseItems) {
        const eventRatio = (data.eventItemCount || 0) / (data.itemCount || 1);
        ticketRevenue += Math.round(amountCents * eventRatio);
        merchRevenue += Math.round(amountCents * (1 - eventRatio));
      } else {
        ticketRevenue += amountCents;
      }
    });

    return { total, ticketRevenue, merchRevenue, orderCount };
  } catch (err) {
    logErr('Error aggregating revenue', err);
    return { total: 0, ticketRevenue: 0, merchRevenue: 0, orderCount: 0 };
  }
}

async function aggregateUsers(db, startTimestamp, endTimestamp) {
  try {
    const customersSnapshot = await db
      .collection('customers')
      .where('createdAt', '>=', startTimestamp)
      .where('createdAt', '<=', endTimestamp)
      .get();

    const newSignups = customersSnapshot.size;

    const totalSnapshot = await db.collection('customers').count().get();
    const cumulative = totalSnapshot.data().count;

    return { newSignups, cumulative };
  } catch (err) {
    logErr('Error aggregating users', err);
    return { newSignups: 0, cumulative: 0 };
  }
}

async function aggregateFeed(db, startTimestamp, endTimestamp) {
  try {
    const postsSnapshot = await db
      .collection('posts')
      .where('createdAt', '>=', startTimestamp)
      .where('createdAt', '<=', endTimestamp)
      .get();

    let newPosts = 0;
    let newLikes = 0;
    let newComments = 0;
    const activePosterIds = new Set();

    postsSnapshot.forEach((doc) => {
      const data = doc.data();
      newPosts += 1;
      newLikes += data.likeCount || 0;
      newComments += data.commentCount || 0;
      if (data.authorId) {
        activePosterIds.add(data.authorId);
      }
    });

    const activePosters = activePosterIds.size;

    const totalPostsSnapshot = await db.collection('posts').count().get();
    const totalPosts = totalPostsSnapshot.data().count;

    return { newPosts, newLikes, newComments, activePosters, totalPosts };
  } catch (err) {
    logErr('Error aggregating feed', err);
    return { newPosts: 0, newLikes: 0, newComments: 0, activePosters: 0, totalPosts: 0 };
  }
}

async function aggregateMetricsForDate(db, dateStr) {
  const { start, end } = getDateRange(dateStr);
  const startTimestamp = Timestamp.fromDate(start);
  const endTimestamp = Timestamp.fromDate(end);

  const [revenueData, userData, feedData] = await Promise.all([
    aggregateRevenue(db, startTimestamp, endTimestamp),
    aggregateUsers(db, startTimestamp, endTimestamp),
    aggregateFeed(db, startTimestamp, endTimestamp),
  ]);

  return {
    date: dateStr,
    revenue: revenueData,
    users: userData,
    feed: feedData,
    computedAt: FieldValue.serverTimestamp(),
    version: 1,
  };
}

async function findEarliestPurchaseDate(db) {
  const snap = await db.collection('purchases').orderBy('orderDate', 'asc').limit(1).get();

  if (snap.empty) {
    return null;
  }

  const firstPurchase = snap.docs[0].data();
  const orderDate = firstPurchase.orderDate;

  if (orderDate && orderDate.toDate) {
    return formatDateKey(orderDate.toDate());
  }

  return null;
}

async function main() {
  try {
    // Load service account
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

    log(`Starting analytics backfill: mode=${LIVE ? 'LIVE' : 'DRY'}`);
    log(
      `Options: skipExisting=${SKIP_EXISTING}, from=${FROM_DATE || 'auto'}, to=${TO_DATE || 'yesterday'}`,
    );

    // Determine date range
    let startDate = FROM_DATE;
    if (!startDate) {
      log('Finding earliest purchase date...');
      startDate = await findEarliestPurchaseDate(db);
      if (!startDate) {
        log('No purchases found. Checking customers...');
        // Fallback: find earliest customer
        const custSnap = await db
          .collection('customers')
          .orderBy('createdAt', 'asc')
          .limit(1)
          .get();
        if (!custSnap.empty) {
          const firstCust = custSnap.docs[0].data();
          if (firstCust.createdAt?.toDate) {
            startDate = formatDateKey(firstCust.createdAt.toDate());
          }
        }
      }
      if (!startDate) {
        log('No historical data found. Nothing to backfill.');
        return;
      }
    }

    const endDate = TO_DATE || getYesterdayDateStr();

    // Validate dates
    if (startDate > endDate) {
      log(`Start date (${startDate}) is after end date (${endDate}). Nothing to do.`);
      return;
    }

    const totalDays = daysBetween(startDate, endDate);
    log(`Backfilling from ${startDate} to ${endDate} (${totalDays} days)`);

    let processed = 0;
    let skipped = 0;
    let written = 0;
    let runningTotals = {
      totalRevenue: 0,
      totalOrders: 0,
      totalLikes: 0,
      totalComments: 0,
    };

    // Iterate through each day
    let currentDate = startDate;
    while (currentDate <= endDate) {
      processed += 1;

      // Check if already exists
      if (SKIP_EXISTING) {
        const existingDoc = await db.collection('analytics').doc(currentDate).get();
        if (existingDoc.exists) {
          log(`[${processed}/${totalDays}] ${currentDate} - SKIPPED (exists)`);
          // Add to running totals from existing doc
          const existing = existingDoc.data();
          runningTotals.totalRevenue += existing.revenue?.total || 0;
          runningTotals.totalOrders += existing.revenue?.orderCount || 0;
          runningTotals.totalLikes += existing.feed?.newLikes || 0;
          runningTotals.totalComments += existing.feed?.newComments || 0;
          skipped += 1;
          currentDate = addDays(currentDate, 1);
          continue;
        }
      }

      // Aggregate metrics for this day
      const metrics = await aggregateMetricsForDate(db, currentDate);

      // Update running totals
      runningTotals.totalRevenue += metrics.revenue.total;
      runningTotals.totalOrders += metrics.revenue.orderCount;
      runningTotals.totalLikes += metrics.feed.newLikes;
      runningTotals.totalComments += metrics.feed.newComments;

      const summary = `rev=$${(metrics.revenue.total / 100).toFixed(2)}, orders=${metrics.revenue.orderCount}, signups=${metrics.users.newSignups}, posts=${metrics.feed.newPosts}`;

      if (LIVE) {
        await db.collection('analytics').doc(currentDate).set(metrics);
        log(`[${processed}/${totalDays}] ${currentDate} - WRITTEN (${summary})`);
        written += 1;
      } else {
        log(`[${processed}/${totalDays}] ${currentDate} - DRY RUN (${summary})`);
      }

      // Small delay to avoid overwhelming Firestore
      if (processed % 10 === 0) {
        await new Promise((r) => setTimeout(r, 100));
      }

      currentDate = addDays(currentDate, 1);
    }

    // Write final totals
    const finalTotals = {
      totalRevenue: runningTotals.totalRevenue,
      totalOrders: runningTotals.totalOrders,
      totalUsers: (await aggregateUsers(db, Timestamp.fromDate(new Date(0)), Timestamp.now()))
        .cumulative,
      totalPosts: (await aggregateFeed(db, Timestamp.fromDate(new Date(0)), Timestamp.now()))
        .totalPosts,
      totalLikes: runningTotals.totalLikes,
      totalComments: runningTotals.totalComments,
      lastUpdated: FieldValue.serverTimestamp(),
      lastDate: endDate,
    };

    if (LIVE) {
      await db.collection('analytics').doc('totals').set(finalTotals);
      log(
        `Wrote analytics/totals: revenue=$${(finalTotals.totalRevenue / 100).toFixed(2)}, orders=${finalTotals.totalOrders}, users=${finalTotals.totalUsers}, posts=${finalTotals.totalPosts}`,
      );
    } else {
      log(
        `DRY RUN totals: revenue=$${(finalTotals.totalRevenue / 100).toFixed(2)}, orders=${finalTotals.totalOrders}, users=${finalTotals.totalUsers}, posts=${finalTotals.totalPosts}`,
      );
    }

    log('');
    log('=== SUMMARY ===');
    log(`Mode: ${LIVE ? 'LIVE' : 'DRY RUN'}`);
    log(`Days processed: ${processed}`);
    log(`Days written: ${written}`);
    log(`Days skipped: ${skipped}`);
    log(`Total revenue: $${(runningTotals.totalRevenue / 100).toFixed(2)}`);
    log(`Total orders: ${runningTotals.totalOrders}`);
    log('');
    log(LIVE ? 'Backfill complete!' : 'DRY RUN complete. Use --live to write to Firestore.');
  } catch (err) {
    logErr('Backfill failed', err);
    process.exit(1);
  }
}

main();
