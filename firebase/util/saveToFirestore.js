import {
  doc,
  getFirestore,
  setDoc,
  getDoc,
  updateDoc,
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";

export default async function SaveToFirestore(
  userName,
  userEmail,
  firebaseId,
  cartItems,
  paymentIntentPrefix,
  addressDetails
) {
  const firestore = getFirestore();
  const MAX_RETRIES = 3;
  
  // Input validation
  if (!firebaseId || !paymentIntentPrefix) {
    throw new Error("Required parameters missing: Firebase ID or payment intent reference");
  }
  
  // Verify authentication before proceeding
  const auth = getAuth();
  if (!auth.currentUser) {
    throw new Error("User must be authenticated to save purchase data");
  }

  // Check if the current user matches the firebaseId
  if (auth.currentUser.uid !== firebaseId) {
    throw new Error("User authentication mismatch");
  }

  try {
    // Generate order number and prepare purchase data
    const orderNumber = generateOrderNumber();
    const purchaseData = preparePurchaseData(
      orderNumber, 
      userName, 
      userEmail, 
      firebaseId, 
      cartItems, 
      paymentIntentPrefix, 
      addressDetails
    );

    // Save to main purchases collection
    const purchaseRef = doc(firestore, "purchases", orderNumber);
    await setDoc(purchaseRef, {
      ...purchaseData,
      createdAt: serverTimestamp(),
    });

    // Save reference to user's purchases subcollection
    const userPurchaseRef = doc(
      firestore,
      `customers/${firebaseId}/purchases`,
      orderNumber
    );
    await setDoc(userPurchaseRef, {
      orderNumber,
      purchaseRef: purchaseRef.path,
      createdAt: serverTimestamp(),
    });

    console.log(`Purchase ${orderNumber} saved successfully`);
    return { success: true, orderNumber };

  } catch (error) {
    console.error("Error saving purchase:", error);
    // Add more detailed error information
    if (error.code === 'permission-denied') {
      throw new Error('Permission denied. Please ensure you are properly authenticated.');
    }
    throw error;
  }
}

// Helper function to generate order number
function generateOrderNumber() {
  const prefix = "ORDER";
  const timestamp = new Date();
  const datePart = timestamp.toISOString().slice(0, 10).replace(/-/g, "");
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${datePart}-${randomSuffix}`;
}

// Helper function to prepare purchase data
function preparePurchaseData(
  orderNumber,
  userName,
  userEmail,
  firebaseId,
  cartItems,
  paymentIntentPrefix,
  addressDetails
) {
  return {
    orderNumber,
    customerName: userName || "Anonymous",
    customerEmail: userEmail,
    customerId: firebaseId,
    paymentIntentId: paymentIntentPrefix,
    orderDate: serverTimestamp(),
    status: "pending",
    addressDetails: addressDetails || null,
    items: cartItems,
    totalAmount: cartItems.reduce((sum, item) => sum + (item.price || 0), 0),
    itemCount: cartItems.length,
  };
}

// Helper function to generate searchable keywords
function generateSearchKeywords(name, email, orderNumber) {
  const keywords = [];
  
  // Add name parts
  if (name) {
    const nameParts = name.toLowerCase().split(' ');
    keywords.push(...nameParts);
  }
  
  // Add email parts
  if (email) {
    const emailLower = email.toLowerCase();
    keywords.push(emailLower);
    
    // Add username part of email
    const atIndex = emailLower.indexOf('@');
    if (atIndex > 0) {
      keywords.push(emailLower.substring(0, atIndex));
    }
  }
  
  // Add order number and its parts
  if (orderNumber) {
    keywords.push(orderNumber.toLowerCase());
    const orderParts = orderNumber.split('-');
    keywords.push(...orderParts);
  }
  
  // Remove duplicates and empty strings
  return [...new Set(keywords)].filter(keyword => keyword.trim() !== '');
}
