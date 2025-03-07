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

  // Generate a human-readable order ID
  const orderPrefix = "ORDER";
  const timestamp = new Date();
  const formattedDate = timestamp.toISOString().slice(0, 10).replace(/-/g, "");
  const randomSuffix = Math.floor(1000 + Math.random() * 9000); // 4-digit random number
  const orderNumber = `${orderPrefix}-${formattedDate}-${randomSuffix}`;

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

  // Calculate order totals
  const orderTotal = cartItems.reduce((total, item) => total + (item.price || 0), 0);
  const itemCount = cartItems.length;
  
  try {
    // STEP 1: Save to centralized purchases collection with human-readable fields
    const purchasesCollectionRef = collection(firestore, "purchases");
    
    // Create purchaseData with human-readable and queryable fields
    const purchaseData = {
      orderNumber: orderNumber,
      customerName: userName || "Anonymous",
      customerEmail: userEmail || "Unknown",
      customerId: firebaseId,
      paymentIntentId: paymentIntentPrefix,
      orderDate: serverTimestamp(),
      lastUpdated: serverTimestamp(),
      status: "pending",
      addressDetails: normalizedAddressDetails,
      totalAmount: orderTotal,
      itemCount: itemCount,
      searchKeywords: generateSearchKeywords(userName, userEmail, orderNumber),
      // The full cart items data is still included
      items: cartItems.map(item => ({
        ...item,
        itemType: item.eventDetails ? "event" : (item.isDigital ? "digital" : "physical")
      })),
    };

    // Save the purchase document with the order number as the ID for easy retrieval
    const purchaseDocRef = doc(purchasesCollectionRef, orderNumber);
    await tryOperation(() => setDoc(purchaseDocRef, purchaseData));
    
    // STEP 2: ALSO save to user's purchases subcollection for individual user lookup
    const userPurchaseDocRef = doc(
      firestore,
      `customers/${firebaseId}/purchases`,
      orderNumber
    );
    
    // Just store the reference to the main purchase in the user's subcollection
    await tryOperation(() => setDoc(userPurchaseDocRef, {
      purchaseRef: purchaseDocRef.path,
      orderNumber: orderNumber,
      orderDate: serverTimestamp(),
      status: "pending",
      totalAmount: orderTotal,
      itemCount: itemCount,
    }));

    // STEP 3: Process each cart item
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
            purchaseId: orderNumber, // Using our human-readable order number
            eventName: eventData.name || "Event",
            eventDate: eventData.date,
          };

          const eventRef = doc(firestore, "events", eventId);
          const eventRagersRef = collection(eventRef, "ragers");

          const ragerDocRef = await tryOperation(() => addDoc(eventRagersRef, userData));
          
          // STEP 4: Also add the ticket to a subcollection of the purchase for easy lookup
          const purchaseTicketsRef = collection(purchaseDocRef, "tickets");
          await tryOperation(() => setDoc(doc(purchaseTicketsRef, ragerDocRef.id), {
            ...userData,
            eventId: eventId,
            ragerDocId: ragerDocRef.id,
          }));
          
          // Add reference to the successful operation
          itemsProcessed.push({
            id: item.productId,
            eventName: eventData.name || "Event",
            type: "event",
            status: "success",
            ragerId: ragerDocRef.id
          });
        } 
        // Handle physical products (non-event items)
        else if (!item.isDigital) {
          // Add to a physical products subcollection for the purchase
          const physicalItemsRef = collection(purchaseDocRef, "physicalItems");
          await tryOperation(() => addDoc(physicalItemsRef, {
            ...item,
            status: "pending_shipment",
            createdAt: serverTimestamp(),
          }));
          
          itemsProcessed.push({
            id: item.productId,
            name: item.title || "Product",
            type: "physical",
            status: "success"
          });
        }
        // Handle digital products
        else {
          // Add to a digital products subcollection for the purchase
          const digitalItemsRef = collection(purchaseDocRef, "digitalItems");
          await tryOperation(() => addDoc(digitalItemsRef, {
            ...item,
            deliveryStatus: "ready",
            createdAt: serverTimestamp(),
          }));
          
          itemsProcessed.push({
            id: item.productId,
            name: item.title || "Digital Item",
            type: "digital",
            status: "success"
          });
        }
      } catch (itemError) {
        console.error(`Error processing item ${item.productId}:`, itemError);
        errors.push({
          itemId: item.productId,
          itemName: item.title || "Unknown Item",
          error: itemError.message
        });
      }
    }

    // Update the purchase document with processing results
    await tryOperation(() => 
      updateDoc(purchaseDocRef, {
        status: errors.length === 0 ? "completed" : "partial",
        processingDetails: {
          itemsProcessed,
          errors,
          completedAt: serverTimestamp()
        }
      })
    );

    // Update the user's purchase record as well
    await tryOperation(() => 
      updateDoc(userPurchaseDocRef, {
        status: errors.length === 0 ? "completed" : "partial",
        lastUpdated: serverTimestamp()
      })
    );

    // If there were errors processing some items, still allow the purchase 
    // but include details about what failed
    if (errors.length > 0) {
      console.warn(`Purchase saved with ${errors.length} item processing errors`);
      return {
        success: true,
        partial: true,
        orderNumber: orderNumber,
        errors
      };
    }

    console.log(`Purchase ${orderNumber} completely processed in Firestore!`);
    return { 
      success: true,
      orderNumber: orderNumber
    };
  } catch (error) {
    console.error("Critical error saving purchase to Firestore:", error);
    
    // Try to log the error to Firestore for debugging
    try {
      const errorLogRef = collection(firestore, "errorLogs");
      await addDoc(errorLogRef, {
        type: "purchase_error",
        userId: firebaseId,
        userName: userName,
        userEmail: userEmail,
        orderNumber: orderNumber,
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
