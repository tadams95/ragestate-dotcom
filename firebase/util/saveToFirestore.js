import { getAuth } from 'firebase/auth';
import { doc, getDoc, getFirestore, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';

export default async function SaveToFirestore(
  userName,
  userEmail,
  firebaseId,
  cartItems,
  paymentIntentPrefix,
  addressDetails,
  appliedPromoCode, // Add appliedPromoCode as a new parameter
) {
  // Improved logging for easier debugging
  console.log('--------- SaveToFirestore Start ---------');
  console.log('SaveToFirestore parameters:', {
    userName: userName || 'not provided',
    userEmail: userEmail || 'not provided',
    firebaseId: firebaseId ? `${firebaseId.substring(0, 5)}...` : 'not provided', // Only show part of ID for privacy
    cartItemsCount: cartItems?.length || 0,
    paymentIntentPrefix: paymentIntentPrefix
      ? `${paymentIntentPrefix.substring(0, 10)}...`
      : 'not provided',
    hasAddressDetails: Boolean(addressDetails),
    appliedPromoCodeId: appliedPromoCode ? appliedPromoCode.id : 'none', // Log promo code ID if present
  });

  const firestore = getFirestore();
  const MAX_RETRIES = 3;
  let retryCount = 0;

  // Input validation with better error handling
  if (!firebaseId || !paymentIntentPrefix) {
    const missingParams = [];
    if (!firebaseId) missingParams.push('firebaseId');
    if (!paymentIntentPrefix) missingParams.push('paymentIntentPrefix');

    console.error(`Required parameters missing: ${missingParams.join(', ')}`);
    return {
      success: false,
      error: `Required parameters missing: ${missingParams.join(', ')}`,
    };
  }

  // Better cart items validation
  if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
    console.error('Invalid cart items:', {
      type: typeof cartItems,
      isArray: Array.isArray(cartItems),
      length: cartItems?.length,
    });
    return { success: false, error: 'Cart items invalid or empty' };
  }

  // Verify authentication before proceeding
  const auth = getAuth();
  let authWarning = null;

  if (!auth.currentUser) {
    authWarning = 'No authenticated user found, using provided firebaseId';
    console.warn(authWarning);
  } else if (auth.currentUser.uid !== firebaseId) {
    authWarning = `Auth mismatch: current user (${auth.currentUser.uid.substring(
      0,
      5,
    )}...) doesn't match provided ID (${firebaseId.substring(0, 5)}...)`;
    console.warn(authWarning);
  }

  const saveWithRetry = async () => {
    try {
      // Generate order number and prepare purchase data
      const orderNumber = generateOrderNumber();
      console.log('Generated order number:', orderNumber);

      // Sanitize cart items to ensure all required fields
      const sanitizedCartItems = cartItems.map((item) => ({
        productId: item.productId || item.id || 'unknown-product',
        title: item.title || item.name || 'Unnamed Product',
        price: parseFloat(item.price) || 0,
        quantity: parseInt(item.quantity) || 1,
        productImageSrc: item.productImageSrc || item.imageSrc || null,
        color: item.color || item.selectedColor || null,
        size: item.size || item.selectedSize || null,
        eventDetails: item.eventDetails || null,
      }));

      const purchaseData = preparePurchaseData(
        orderNumber,
        userName || 'Guest',
        userEmail || 'no-email@provided.com',
        firebaseId,
        sanitizedCartItems,
        paymentIntentPrefix,
        addressDetails,
        appliedPromoCode, // Pass to preparePurchaseData
      );

      console.log('Purchase data prepared for', orderNumber);

      // Ticket creation and inventory updates now handled server-side by finalize-order

      // Add transaction metadata
      const metadata = {
        createdAt: serverTimestamp(),
        transactionId: `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`,
        authWarning,
        saveAttemptTime: new Date().toISOString(),
      };

      // Save to main purchases collection
      console.log('Saving to main purchases collection...');
      const purchaseRef = doc(firestore, 'purchases', orderNumber);
      await setDoc(purchaseRef, {
        ...purchaseData, // purchaseData now includes promo details if any
        ...metadata,
      });
      console.log('✓ Saved to main purchases collection:', purchaseRef.path);

      // If a promo code was applied, update its usage in Firestore
      if (appliedPromoCode && appliedPromoCode.id) {
        console.log(`Attempting to update promo code: ${appliedPromoCode.id}`);
        const promoCodeRef = doc(firestore, 'promoterCodes', appliedPromoCode.id);
        try {
          const promoCodeSnap = await getDoc(promoCodeRef);
          if (promoCodeSnap.exists()) {
            const promoData = promoCodeSnap.data();
            const newUses = (promoData.currentUses || 0) + 1;
            await updateDoc(promoCodeRef, {
              currentUses: newUses,
              lastUsed: serverTimestamp(),
              lastOrderNumber: orderNumber,
            });
            console.log(`✓ Promo code ${appliedPromoCode.id} updated successfully.`);
          } else {
            console.warn(`Promo code ${appliedPromoCode.id} not found for update.`);
          }
        } catch (promoUpdateError) {
          console.error(`× Error updating promo code ${appliedPromoCode.id}:`, promoUpdateError);
        }
      }

      // Calculate total amount properly
      const totalAmount = sanitizedCartItems
        .reduce(
          (sum, item) => sum + (parseFloat(item.price) || 0) * (parseInt(item.quantity) || 1),
          0,
        )
        .toFixed(2);

      // Try saving to user's purchases subcollection with error handling
      try {
        console.log(
          `Saving to user subcollection: customers/${firebaseId}/purchases/${orderNumber}`,
        );
        const userPurchaseRef = doc(firestore, `customers/${firebaseId}/purchases`, orderNumber);

        // Enhanced user purchase data
        const userPurchaseData = {
          orderNumber,
          purchaseRef: purchaseRef.path,
          createdAt: serverTimestamp(),
          orderDate: serverTimestamp(),
          lastUpdated: serverTimestamp(),
          status: 'pending',
          itemCount: sanitizedCartItems.length,
          totalAmount,
          transactionId: metadata.transactionId,

          // Legacy fields for compatibility
          dateTime: serverTimestamp(),
          name: userName || 'Guest',
          email: userEmail || 'no-email@provided.com',
          stripeId: paymentIntentPrefix,
          cartItems: sanitizedCartItems,
          addressDetails,
          total: totalAmount, // This should be the final total after discount
          discountAmount: appliedPromoCode ? appliedPromoCode.discountValue : 0,
          promoCodeUsed: appliedPromoCode ? appliedPromoCode.id : null,
        };

        await setDoc(userPurchaseRef, userPurchaseData);
        console.log("✓ Saved to user's purchases subcollection");

        // Try saving to users collection as a fallback (in case we're using the wrong collection)
        try {
          const usersFallbackRef = doc(firestore, `users/${firebaseId}/purchases`, orderNumber);
          await setDoc(usersFallbackRef, userPurchaseData);
          console.log('✓ (Fallback) Saved to users collection as well');
        } catch (fallbackError) {
          console.log(
            '× Fallback save to users collection failed (this is okay):',
            fallbackError.message,
          );
        }
      } catch (userSaveError) {
        console.error('× Failed to save to user subcollection:', userSaveError.message);
        // Still return success since the main purchase was saved
        return {
          success: true,
          orderNumber,
          warning: 'Saved to main purchases but not to user subcollection',
        };
      }

      console.log('--------- SaveToFirestore Complete ---------');
      return { success: true, orderNumber };
    } catch (error) {
      console.error(`Error in saveWithRetry (attempt ${retryCount + 1}/${MAX_RETRIES}):`, error);
      retryCount++;

      if (retryCount < MAX_RETRIES) {
        console.log(`Retrying... (${retryCount}/${MAX_RETRIES})`);
        return saveWithRetry();
      }

      throw error;
    }
  };

  try {
    const result = await saveWithRetry();
    console.log('Final result:', result);
    return result;
  } catch (error) {
    console.error('Fatal error in SaveToFirestore:', error);
    let errorMessage = 'Unknown error saving purchase';

    if (error.code === 'permission-denied') {
      errorMessage = 'Permission denied. Please ensure you are properly authenticated.';
    } else if (error.code === 'not-found') {
      errorMessage = 'Collection or document not found. Database path may be incorrect.';
    } else if (error.message) {
      errorMessage = error.message;
    }

    return { success: false, error: errorMessage };
  }
}

// Helper function to generate order number
function generateOrderNumber() {
  const prefix = 'ORDER';
  const timestamp = new Date();
  const datePart = timestamp.toISOString().slice(0, 10).replace(/-/g, '');
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
  addressDetails,
  appliedPromoCode, // Add appliedPromoCode here
) {
  const totalAmountBeforeDiscount = cartItems
    .reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 1), 0)
    .toFixed(2);

  const discount = appliedPromoCode ? appliedPromoCode.discountValue || 0 : 0;
  const finalTotalAmount = (parseFloat(totalAmountBeforeDiscount) - parseFloat(discount)).toFixed(
    2,
  );

  return {
    addressDetails: addressDetails || null,
    customerEmail: userEmail,
    customerId: firebaseId,
    customerName: userName || 'Anonymous',
    itemCount: cartItems.length,
    items: cartItems,
    orderDate: serverTimestamp(),
    orderNumber,
    paymentIntentId: paymentIntentPrefix,
    status: 'pending',
    totalAmount: finalTotalAmount, // Use the final amount after discount
    discountAmount: discount,
    promoCodeUsed: appliedPromoCode ? appliedPromoCode.id : null,
  };
}

// Helper function to generate searchable keywords
// generateSearchKeywords helper was unused; removed for cleanliness.
