import {
  doc,
  setDoc,
  collection,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";

export const savePurchaseToFirebase = async (
  firestore,
  paymentIntent,
  userId,
  userName,
  userEmail,
  cartItems,
  addressDetails
) => {
  if (!paymentIntent || !cartItems || cartItems.length === 0) {
    console.error("Missing data for saving purchase.");
    return;
  }

  const purchaseData = {
    userId: userId || null,
    userEmail: userEmail || paymentIntent.receipt_email || null,
    userName: userName || null,
    items: cartItems.map((item) => ({
      productId: item.productId,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      selectedColor: item.selectedColor,
      selectedSize: item.selectedSize,
      imageSrc: item.imageSrc || null,
      isDigital: item.isDigital || false,
    })),
    totalAmount: paymentIntent.amount / 100,
    currency: paymentIntent.currency,
    shippingAddress: addressDetails || null,
    paymentIntentId: paymentIntent.id,
    status: paymentIntent.status,
    purchaseDate: serverTimestamp(),
  };

  try {
    // 1. Save to main purchases collection
    const purchaseRef = await addDoc(
      collection(firestore, "purchases"),
      purchaseData
    );

    // 2. Save to user's purchases subcollection
    if (userId) {
      const userPurchaseRef = doc(
        firestore,
        "users",
        userId,
        "purchases",
        purchaseRef.id
      );
      await setDoc(userPurchaseRef, purchaseData);
    }
  } catch (error) {
    console.error("Error saving purchase to Firebase:", error);
    // Optionally, set an error message for the user or implement retry logic
  }
};
