/**
 * Purchase Service - Firestore operations for purchases and orders
 * Abstracts purchase, order, and fulfillment operations
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../firebase/firebase';

const PURCHASES_COLLECTION = 'purchases';
const CUSTOMERS_COLLECTION = 'customers';
const PAGE_SIZE = 20;

// ============================================
// PURCHASE READ OPERATIONS
// ============================================

/**
 * Get a single purchase by ID
 * @param {string} purchaseId
 * @returns {Promise<import('../types/purchase').Purchase | null>}
 */
export async function getPurchase(purchaseId) {
  if (!purchaseId) return null;

  const purchaseDoc = await getDoc(doc(db, PURCHASES_COLLECTION, purchaseId));
  if (!purchaseDoc.exists()) return null;

  const data = purchaseDoc.data();
  return {
    id: purchaseDoc.id,
    ...data,
    orderDate: data.orderDate?.toDate?.() || data.dateTime?.toDate?.() || new Date(),
  };
}

/**
 * Get purchases for a user with pagination
 * @param {import('../types/common').UserId} userId
 * @param {import('../types/common').DocumentSnapshot} [lastDoc]
 * @param {number} [pageSize]
 * @returns {Promise<{purchases: import('../types/purchase').Purchase[], lastDoc: import('../types/common').DocumentSnapshot | null}>}
 */
export async function getUserPurchases(userId, lastDoc = null, pageSize = PAGE_SIZE) {
  if (!userId) return { purchases: [], lastDoc: null };

  // Try user's purchases subcollection first
  const userPurchasesRef = collection(db, CUSTOMERS_COLLECTION, userId, 'purchases');
  const constraints = [
    orderBy('orderDate', 'desc'),
    limit(pageSize),
  ];

  if (lastDoc) {
    constraints.push(startAfter(lastDoc));
  }

  const q = query(userPurchasesRef, ...constraints);
  const snapshot = await getDocs(q);

  const purchases = snapshot.docs.map((docSnap) => {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      ...data,
      orderDate: data.orderDate?.toDate?.() || data.dateTime?.toDate?.() || new Date(),
    };
  });

  const newLastDoc = snapshot.docs[snapshot.docs.length - 1] || null;

  return { purchases, lastDoc: newLastDoc };
}

/**
 * Get all purchases with pagination (for admin)
 * @param {import('../types/common').DocumentSnapshot} [lastDoc]
 * @param {number} [pageSize]
 * @returns {Promise<{purchases: import('../types/purchase').Purchase[], lastDoc: import('../types/common').DocumentSnapshot | null}>}
 */
export async function getAllPurchases(lastDoc = null, pageSize = PAGE_SIZE) {
  const constraints = [
    orderBy('orderDate', 'desc'),
    limit(pageSize),
  ];

  if (lastDoc) {
    constraints.push(startAfter(lastDoc));
  }

  const q = query(collection(db, PURCHASES_COLLECTION), ...constraints);
  const snapshot = await getDocs(q);

  const purchases = snapshot.docs.map((docSnap) => {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      ...data,
      orderDate: data.orderDate?.toDate?.() || data.dateTime?.toDate?.() || new Date(),
      customerName: data.customerName || data.name || 'Anonymous',
      customerEmail: data.customerEmail || data.email || 'Unknown',
      totalAmount: data.totalAmount ||
        data.cartItems?.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0) ||
        0,
    };
  });

  const newLastDoc = snapshot.docs[snapshot.docs.length - 1] || null;

  return { purchases, lastDoc: newLastDoc };
}

// ============================================
// PURCHASE DETAILS (with subcollections)
// ============================================

/**
 * Get purchase with all related items (tickets, physical, digital)
 * @param {string} purchaseId
 * @returns {Promise<import('../types/purchase').PurchaseDetails | null>}
 */
export async function getPurchaseDetails(purchaseId) {
  if (!purchaseId) return null;

  const purchaseDocRef = doc(db, PURCHASES_COLLECTION, purchaseId);
  const purchaseDoc = await getDoc(purchaseDocRef);

  if (!purchaseDoc.exists()) return null;

  const purchaseData = purchaseDoc.data();

  // Fetch subcollections in parallel
  const [ticketsSnapshot, physicalItemsSnapshot, digitalItemsSnapshot] = await Promise.all([
    getDocs(collection(purchaseDocRef, 'tickets')),
    getDocs(collection(purchaseDocRef, 'physicalItems')),
    getDocs(collection(purchaseDocRef, 'digitalItems')),
  ]);

  const tickets = ticketsSnapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  }));

  const physicalItems = physicalItemsSnapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  }));

  const digitalItems = digitalItemsSnapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  }));

  return {
    id: purchaseId,
    ...purchaseData,
    orderDate: purchaseData.orderDate?.toDate?.() || purchaseData.dateTime?.toDate?.() || new Date(),
    tickets,
    physicalItems,
    digitalItems,
    raw: purchaseData,
  };
}

// ============================================
// PURCHASE CREATE OPERATIONS
// ============================================

/**
 * Save a new purchase
 * @param {Object} purchaseData
 * @param {import('../types/common').UserId} purchaseData.customerId
 * @param {import('../types/purchase').CartItem[]} purchaseData.cartItems
 * @param {import('../types/common').AmountCents} purchaseData.amount
 * @param {string} [purchaseData.stripePaymentIntentId]
 * @returns {Promise<{success: boolean, id: string}>}
 */
export async function savePurchase(purchaseData) {
  if (!purchaseData?.customerId) {
    throw new Error('customerId is required');
  }

  const purchaseRef = doc(collection(db, PURCHASES_COLLECTION));

  await setDoc(purchaseRef, {
    ...purchaseData,
    orderDate: serverTimestamp(),
    createdAt: serverTimestamp(),
    status: purchaseData.status || 'pending',
  });

  return { success: true, id: purchaseRef.id };
}

// ============================================
// PURCHASE SEARCH OPERATIONS
// ============================================

/**
 * Search purchases by customer email
 * @param {string} email
 * @param {number} [limitCount]
 * @returns {Promise<import('../types/purchase').Purchase[]>}
 */
export async function searchPurchasesByEmail(email, limitCount = 10) {
  if (!email) return [];

  const q = query(
    collection(db, PURCHASES_COLLECTION),
    where('customerEmail', '==', email),
    orderBy('orderDate', 'desc'),
    limit(limitCount),
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((docSnap) => {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      ...data,
      orderDate: data.orderDate?.toDate?.() || new Date(),
    };
  });
}
