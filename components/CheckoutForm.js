import { PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { getAuth } from 'firebase/auth'; // Import Firebase Auth
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import SaveToFirestore from '../firebase/util/saveToFirestore';
import { clearCart, selectCartItems } from '../lib/features/cartSlice';
import { selectLocalId, selectUserEmail, selectUserName } from '../lib/features/userSlice'; // Import selectors

/**
 * CheckoutForm component with shipping address validation
 *
 * FIX: Added hasPhysicalItems prop and address validation
 * Reference: MERCH_CHECKOUT_FIXES.md - Phase 1: Enforce shipping address validation
 *
 * When physical items are in the cart, the Pay button is disabled until
 * a complete shipping address is provided.
 *
 * Guest checkout: When isGuest=true and guestEmail is provided, the form
 * processes payment without requiring Firebase authentication.
 */
export default function CheckoutForm({
  addressDetails,
  isLoading,
  appliedPromoCode,
  clientSecret,
  hasPhysicalItems, // FIX: New prop to indicate if cart contains physical/merchandise items
  idToken, // FIX: Token for API authentication
  isGuest = false, // Guest checkout mode
  guestEmail = null, // Email for guest checkout
}) {
  const stripe = useStripe();
  const elements = useElements();
  const dispatch = useDispatch();
  const router = useRouter();

  const [message, setMessage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch user and cart data from Redux
  const cartItems = useSelector(selectCartItems);
  const userName = useSelector(selectUserName);
  const userEmail = useSelector(selectUserEmail);
  const userId = useSelector(selectLocalId);

  useEffect(() => {
    if (!stripe || !clientSecret) return;
    // Do not set any success message on mount; only used for recovery flows
    stripe.retrievePaymentIntent(clientSecret).then(({ paymentIntent }) => {
      if (!paymentIntent) return;
      if (paymentIntent.status === 'requires_payment_method') {
        setMessage(null);
      }
    });
  }, [stripe, clientSecret]);

  const tryFinalizeIfSucceeded = async (pi) => {
    if (!pi || pi.status !== 'succeeded') return false;

    const auth = getAuth();
    const firebaseId = isGuest ? null : (userId || auth.currentUser?.uid);

    // For non-guest checkout, require firebaseId
    if (!isGuest && !firebaseId) {
      console.error('Firebase ID is missing. Cannot save order.');
      setMessage('Payment succeeded, but there was an issue saving your order.');
      return true; // stop further processing
    }

    // For guest checkout, require guestEmail
    if (isGuest && !guestEmail) {
      console.error('Guest email is missing. Cannot save order.');
      setMessage('Payment succeeded, but there was an issue saving your order.');
      return true;
    }

    // Use guest email or user email
    const orderEmail = isGuest ? guestEmail : userEmail;

    try {
      console.log('Finalizing order (server):', {
        paymentIntentId: pi.id,
        itemCount: cartItems?.length || 0,
        isGuest,
      });
      const resp = await fetch('/api/payments/finalize-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(idToken && !isGuest && { Authorization: `Bearer ${idToken}` }),
        },
        body: JSON.stringify({
          paymentIntentId: pi.id,
          firebaseId: isGuest ? null : firebaseId,
          userEmail: orderEmail,
          userName: isGuest ? '' : userName,
          cartItems,
          addressDetails,
          appliedPromoCode,
          isGuest,
          guestEmail: isGuest ? guestEmail : null,
        }),
      });
      const text = await resp.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (_) {
        data = { raw: text };
      }
      if (!resp.ok) {
        console.error('Finalize order failed:', { status: resp.status, data });
        // FIX: Don't silently fail for guests - show error and keep cart
        setMessage(
          'Payment succeeded but we could not save your order. Please contact support with your payment confirmation.',
        );
        // Do NOT clear cart or show success modal for failed finalize
        return true; // Stop further processing
      } else {
        console.log('Finalize order success:', data);
        // If server persisted purchases successfully, redirect to confirmation page
        if (data && data.ok && data.orderNumber) {
          // Store order data in sessionStorage for the confirmation page
          try {
            sessionStorage.setItem('lastOrder', JSON.stringify({
              orderNumber: data.orderNumber,
              items: cartItems || [],
              email: isGuest ? guestEmail : userEmail,
              isGuest,
            }));
          } catch (e) {
            console.warn('Failed to store order data in sessionStorage:', e);
          }
          // Clear cart before redirecting
          dispatch(clearCart());
          // Redirect to confirmation page
          router.push(`/order-confirmed/${data.orderNumber}`);
          return true; // handled
        }
      }
    } catch (e) {
      console.error('Finalize order error:', e);
      // FIX: Handle network/fetch errors - don't show false success
      setMessage(
        'Payment succeeded but we could not confirm your order. Please contact support.',
      );
      return true; // Stop further processing
    }

    // For guest users, skip SaveToFirestore (it requires firebaseId)
    // The server-side finalize-order should have handled it
    // FIX: Only reach here if server returned ok but no orderNumber (edge case)
    if (isGuest) {
      // If we got here without an orderNumber, something went wrong but payment succeeded
      // Store minimal data and redirect to a generic confirmation
      try {
        sessionStorage.setItem('lastOrder', JSON.stringify({
          orderNumber: 'pending',
          items: cartItems || [],
          email: guestEmail,
          isGuest: true,
        }));
      } catch (e) {
        console.warn('Failed to store order data in sessionStorage:', e);
      }
      dispatch(clearCart());
      router.push('/order-confirmed/pending');
      return true;
    }

    const saveResult = await SaveToFirestore(
      userName,
      userEmail,
      firebaseId,
      cartItems,
      pi.id,
      addressDetails,
      appliedPromoCode,
    );

    if (saveResult && saveResult.success) {
      const confirmedOrderNumber = saveResult.orderNumber || 'confirmed';
      // Store order data in sessionStorage for the confirmation page
      try {
        sessionStorage.setItem('lastOrder', JSON.stringify({
          orderNumber: confirmedOrderNumber,
          items: cartItems || [],
          email: userEmail,
          isGuest: false,
        }));
      } catch (e) {
        console.warn('Failed to store order data in sessionStorage:', e);
      }
      dispatch(clearCart());
      router.push(`/order-confirmed/${confirmedOrderNumber}`);
    } else {
      setMessage('Payment succeeded, but there was an issue saving your order.');
    }

    return true;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!stripe || !elements) {
      console.log('Stripe.js not loaded yet.');
      return;
    }

    if (isLoading) {
      console.log('Waiting for client secret update...');
      return;
    }

    setIsProcessing(true);
    setMessage(null);

    try {
      const return_url = `${window.location.origin}/account`;

      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url,
          shipping: addressDetails
            ? {
                name: addressDetails.name,
                address: {
                  line1: addressDetails.address.line1,
                  line2: addressDetails.address.line2,
                  city: addressDetails.address.city,
                  state: addressDetails.address.state,
                  postal_code: addressDetails.address.postal_code,
                  country: addressDetails.address.country,
                },
              }
            : undefined,
        },
        redirect: 'if_required',
      });

      if (paymentIntent && (await tryFinalizeIfSucceeded(paymentIntent))) return;

      if (error) {
        // Handle cases where Stripe returns unexpected_state; re-fetch PI and finalize if already succeeded
        if (error.code === 'payment_intent_unexpected_state' && clientSecret) {
          const res = await stripe.retrievePaymentIntent(clientSecret);
          if (res && res.paymentIntent && (await tryFinalizeIfSucceeded(res.paymentIntent))) return;
        }

        if (error.type === 'card_error' || error.type === 'validation_error') {
          setMessage(error.message);
        } else {
          setMessage('An unexpected error occurred.');
          console.error('Stripe confirmation error:', error);
        }
      } else {
        setMessage('Payment processing...');
      }
    } catch (error) {
      console.error('Unhandled error during payment:', error);
      setMessage(`An unexpected error occurred: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const paymentElementOptions = { layout: 'tabs' };

  // FIX: Shipping address validation for physical items
  // Reference: MERCH_CHECKOUT_FIXES.md - Phase 1: Enforce shipping address validation
  // When physical/merchandise items are in cart, require complete shipping address
  const isAddressRequired = hasPhysicalItems === true;
  const isAddressComplete =
    addressDetails &&
    addressDetails.name &&
    addressDetails.address?.line1 &&
    addressDetails.address?.city &&
    addressDetails.address?.state &&
    addressDetails.address?.postal_code;
  const addressMissing = isAddressRequired && !isAddressComplete;

  const isButtonDisabled = !stripe || !elements || isLoading || isProcessing || addressMissing;

  // Determine button text based on state
  let buttonText = 'Pay now';
  if (isProcessing) {
    buttonText = 'Processing...';
  } else if (isLoading) {
    buttonText = 'Updating...';
  } else if (addressMissing) {
    buttonText = 'Enter shipping address';
  }

  return (
    <form id="payment-form" onSubmit={handleSubmit}>
      <PaymentElement id="payment-element" options={paymentElementOptions} />

      {/* FIX: Show address validation message for physical items */}
      {addressMissing && (
        <div className="border-[var(--warning)]/50 bg-[var(--warning)]/10 mt-4 rounded-md border p-3 text-sm text-[var(--warning)]">
          <p>
            <strong>Shipping address required:</strong> Please enter your complete shipping address
            above to continue with checkout for physical items.
          </p>
        </div>
      )}

      <button
        disabled={isButtonDisabled}
        id="submit"
        className={`mt-6 w-full rounded-md border border-transparent px-4 py-2 text-base font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--bg-root)] ${
          isButtonDisabled
            ? 'cursor-not-allowed bg-[var(--text-tertiary)] text-[var(--bg-root)]'
            : 'bg-[var(--accent)] text-white hover:bg-[var(--accent-glow)] focus:ring-[var(--accent)]'
        }`}
      >
        <span id="button-text">{buttonText}</span>
      </button>
      {message && (
        <div
          id="payment-message"
          className={`mt-4 text-sm ${message.includes('success') ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}
        >
          {message}
        </div>
      )}
    </form>
  );
}
