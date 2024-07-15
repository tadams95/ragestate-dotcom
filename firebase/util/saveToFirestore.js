import { doc, getFirestore, setDoc } from "firebase/firestore";

export default async function SaveToFirestore(
  userEmail,
  userName,
  firebaseId,
  cartItems,
  paymentIntentPrefix
) {
  try {
    const firestore = getFirestore();

    const purchaseDocumentRef = doc(
      firestore,
      `customers/${firebaseId}/purchases`,
      paymentIntentPrefix // Ensure paymentIntentPrefix is defined
    );

    const addressDetails = {
      address: {
        city: "null",
        country: "null",
        line1: "null",
        line2: "null",
        postalCode: "null",
        state: "null",
      },
    };

    const purchaseData = {
      email: userEmail,
      name: userName,
      addressDetails: addressDetails,
      cartItems: cartItems,
      dateTime: new Date(),
    };

    await setDoc(purchaseDocumentRef, purchaseData);
    console.log("Purchase saved to Firestore!");
  } catch (error) {
    console.error("Error saving purchase to Firestore:", error);
    throw error; // Ensure errors are propagated for further handling
  }
}
