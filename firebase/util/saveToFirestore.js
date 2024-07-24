import {
  doc,
  getFirestore,
  setDoc,
  getDoc,
  updateDoc,
  collection,
  addDoc,
} from "firebase/firestore";

export default async function SaveToFirestore(
  userEmail,
  userName,
  firebaseId,
  cartItems,
  paymentIntentPrefix,
  addressDetails
) {
  try {
    const firestore = getFirestore();

    const purchaseDocumentRef = doc(
      firestore,
      `customers/${firebaseId}/purchases`,
      paymentIntentPrefix // Ensure paymentIntentPrefix is defined
    );

    if (!addressDetails) {
      addressDetails = {
        address: {
          city: "null",
          country: "null",
          line1: "null",
          line2: "null",
          postalCode: "null",
          state: "null",
        },
        name: userName,
        phone: "null",
      };
    }

    const purchaseData = {
      email: userEmail,
      name: userName,
      addressDetails: addressDetails,
      cartItems: cartItems,
      dateTime: new Date(),
    };

    await setDoc(purchaseDocumentRef, purchaseData);

    // Iterate through each cart item
    for (const item of cartItems) {
      // Find the event ID for the current item
      const eventId = item.eventDetails ? item.productId : null;

      // Proceed only if the event ID is valid
      if (eventId) {
        // Get the current quantity of the event
        const eventDocRef = doc(firestore, "events", eventId);
        const eventDocSnap = await getDoc(eventDocRef);
        const currentQuantity = eventDocSnap.data().quantity;

        // Update the quantity by decrementing
        await updateDoc(eventDocRef, { quantity: currentQuantity - 1 });

        // Create Firestore document for the user's ticket
        const userData = {
          active: true,
          email: userEmail,
          firebaseId: firebaseId,
          owner: userName,
        };

        const eventRef = doc(firestore, "events", eventId);
        const eventRagersRef = collection(eventRef, "ragers");

        await addDoc(eventRagersRef, userData);
      }
    }
    console.log("Purchase saved to Firestore!");
  } catch (error) {
    console.error("Error saving purchase to Firestore:", error);
    throw error; // Ensure errors are propagated for further handling
  }
}
