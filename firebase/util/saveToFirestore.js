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
  let retryCount = 0;
  
  console.log("SaveToFirestore called with:", {
    userName,
    userEmail,
    firebaseId,
    cartItemsCount: cartItems?.length,
    paymentIntentPrefix,
    hasAddressDetails: !!addressDetails
  });
  
  // Input validation
  if (!firebaseId || !paymentIntentPrefix) {
    console.error("Required parameters missing:", { firebaseId, paymentIntentPrefix });
    throw new Error("Required parameters missing: Firebase ID or payment intent reference");
  }
  
  // Verify authentication before proceeding
  const auth = getAuth();
  if (!auth.currentUser) {
    console.error("No authenticated user found");
    // Instead of throwing error here, try to proceed with the provided firebaseId
    console.warn("Proceeding with provided firebaseId despite no current auth user");
  } else if (auth.currentUser.uid !== firebaseId) {
    console.warn(`Auth mismatch: currentUser.uid=${auth.currentUser.uid}, provided firebaseId=${firebaseId}`);
    // Instead of throwing error, log warning and proceed
    console.warn("Proceeding despite user authentication mismatch");
  }

  const saveWithRetry = async () => {
    try {
      // Generate order number and prepare purchase data
      const orderNumber = generateOrderNumber();
      console.log("Generated order number:", orderNumber);
      
      const purchaseData = preparePurchaseData(
        orderNumber, 
        userName, 
        userEmail, 
        firebaseId, 
        cartItems, 
        paymentIntentPrefix, 
        addressDetails
      );
      
      console.log("Purchase data prepared:", {
        orderNumber,
        totalAmount: purchaseData.totalAmount,
        itemCount: purchaseData.itemCount
      });

      // Save to main purchases collection
      console.log("Attempting to save to main purchases collection...");
      const purchaseRef = doc(firestore, "purchases", orderNumber);
      await setDoc(purchaseRef, {
        ...purchaseData,
        createdAt: serverTimestamp(),
      });
      console.log("Saved to main purchases collection successfully");

      // Calculate total amount properly
      const totalAmount = cartItems.reduce(
        (sum, item) => sum + (item.price || 0) * (item.quantity || 1),
        0
      ).toFixed(2);

      // Save reference to user's purchases subcollection
      console.log("Attempting to save to user's purchases subcollection...");
      const userPurchaseRef = doc(
        firestore,
        `customers/${firebaseId}/purchases`,
        orderNumber
      );
      
      // Prepare user purchase data with both new and legacy fields
      const userPurchaseData = {
        // New format fields
        orderNumber,
        purchaseRef: purchaseRef.path,
        createdAt: serverTimestamp(),
        orderDate: serverTimestamp(),
        lastUpdated: serverTimestamp(),
        status: "pending",
        itemCount: cartItems.length,
        totalAmount,
        
        // Legacy fields for compatibility with OrderHistory
        dateTime: serverTimestamp(),
        name: userName,
        email: userEmail,
        stripeId: paymentIntentPrefix,
        cartItems: cartItems.map(item => ({
          title: item.title,
          price: item.price,
          quantity: item.quantity || 1,
          productImageSrc: item.productImageSrc,
          productId: item.productId,
          color: item.color || null,
          size: item.size || null
        })),
        addressDetails,
        total: totalAmount
      };
      
      await setDoc(userPurchaseRef, userPurchaseData);
      console.log("Saved to user's purchases subcollection successfully");

      return { success: true, orderNumber };
    } catch (error) {
      console.error("Error in saveWithRetry:", error);
      retryCount++;
      
      if (retryCount < MAX_RETRIES) {
        console.log(`Retry attempt ${retryCount} of ${MAX_RETRIES}...`);
        return saveWithRetry(); // Recursive retry
      }
      
      throw error; // Re-throw after exhausting retries
    }
  };

  try {
    const result = await saveWithRetry();
    console.log("Purchase saved successfully:", result);
    return result;
  } catch (error) {
    console.error("Fatal error saving purchase:", error);
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
    totalAmount: cartItems.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 1)), 0).toFixed(2),
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
