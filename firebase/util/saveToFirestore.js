import {
  doc,
  getFirestore,
  setDoc,
  getDoc,
  updateDoc,
  collection,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";

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
  
  if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
    throw new Error("Cart items are required and must be a non-empty array");
  }

  // Normalize address details to prevent null values in Firestore
  const normalizedAddressDetails = addressDetails || {
    address: {
      city: "",
      country: "",
      line1: "",
      line2: "",
      postalCode: "",
      state: "",
    },
    name: userName || "",
    phone: "",
  };

  async function tryOperation(operation, retries = 0) {
    try {
      return await operation();
    } catch (error) {
      if (retries < MAX_RETRIES) {
        console.log(`Retry attempt ${retries + 1} for operation after error: ${error.message}`);
        // Exponential backoff: wait longer between each retry
        const delay = Math.pow(2, retries) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        return tryOperation(operation, retries + 1);
      }
      throw error;
    }
  }

  try {
    // Step 1: Save the purchase details
    const purchaseDocumentRef = doc(
      firestore,
      `customers/${firebaseId}/purchases`,
      paymentIntentPrefix
    );

    const purchaseData = {
      email: userEmail,
      name: userName,
      addressDetails: normalizedAddressDetails,
      cartItems: cartItems,
      dateTime: serverTimestamp(),
      status: "pending", // Track the purchase status
      paymentIntentId: paymentIntentPrefix,
      lastUpdated: serverTimestamp(),
    };

    await tryOperation(() => setDoc(purchaseDocumentRef, purchaseData));
    console.log("Purchase details saved to Firestore");

    // Step 2: Process each cart item
    const itemsProcessed = [];
    const errors = [];

    for (const item of cartItems) {
      try {
        // Find the event ID for the current item
        const eventId = item.eventDetails ? item.productId : null;

        // Process event items (tickets)
        if (eventId) {
          // Get the current quantity of the event
          const eventDocRef = doc(firestore, "events", eventId);
          
          // Verify the event exists before updating
          const eventDocSnap = await tryOperation(() => getDoc(eventDocRef));
          
          if (!eventDocSnap.exists()) {
            throw new Error(`Event ${eventId} not found`);
          }
          
          const eventData = eventDocSnap.data();
          const currentQuantity = eventData.quantity;
          
          if (currentQuantity <= 0) {
            throw new Error(`Event ${eventId} is sold out`);
          }

          // Update the quantity by decrementing
          await tryOperation(() => 
            updateDoc(eventDocRef, { 
              quantity: currentQuantity - 1,
              lastUpdated: serverTimestamp()
            })
          );

          // Create Firestore document for the user's ticket
          const userData = {
            active: true,
            email: userEmail,
            firebaseId: firebaseId,
            owner: userName,
            createdAt: serverTimestamp(),
            ticketType: item.title || "General Admission",
            purchaseId: paymentIntentPrefix,
          };

          const eventRef = doc(firestore, "events", eventId);
          const eventRagersRef = collection(eventRef, "ragers");

          const ragerDocRef = await tryOperation(() => addDoc(eventRagersRef, userData));
          
          // Add reference to the successful operation
          itemsProcessed.push({
            id: item.productId,
            type: "event",
            status: "success",
            ragerId: ragerDocRef.id
          });
        } 
        // Handle physical products (non-event items)
        else if (!item.isDigital) {
          // Add logic here for physical product inventory if needed
          itemsProcessed.push({
            id: item.productId,
            type: "physical",
            status: "success"
          });
        }
        // Handle digital products
        else {
          itemsProcessed.push({
            id: item.productId,
            type: "digital",
            status: "success"
          });
        }
      } catch (itemError) {
        console.error(`Error processing item ${item.productId}:`, itemError);
        errors.push({
          itemId: item.productId,
          error: itemError.message
        });
      }
    }

    // Update the purchase document with processing results
    await tryOperation(() => 
      updateDoc(purchaseDocumentRef, {
        status: errors.length === 0 ? "completed" : "partial",
        processingDetails: {
          itemsProcessed,
          errors,
          completedAt: serverTimestamp()
        }
      })
    );

    // If there were errors processing some items, still allow the purchase 
    // but include details about what failed
    if (errors.length > 0) {
      console.warn(`Purchase saved with ${errors.length} item processing errors`);
      return {
        success: true,
        partial: true,
        errors
      };
    }

    console.log("Purchase completely processed in Firestore!");
    return { success: true };
  } catch (error) {
    console.error("Critical error saving purchase to Firestore:", error);
    
    // Try to log the error to Firestore for debugging
    try {
      const errorLogRef = collection(firestore, "errorLogs");
      await addDoc(errorLogRef, {
        type: "purchase_error",
        userId: firebaseId,
        paymentIntent: paymentIntentPrefix,
        error: error.message,
        stack: error.stack,
        timestamp: serverTimestamp()
      });
    } catch (logError) {
      console.error("Failed to log error to Firestore:", logError);
    }
    
    throw error;
  }
}
