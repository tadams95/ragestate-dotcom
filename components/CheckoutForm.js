import { PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { getAuth } from 'firebase/auth'; // Import Firebase Auth
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import SaveToFirestore from '../firebase/util/saveToFirestore';
import { clearCart, selectCartItems } from '../lib/features/todos/cartSlice';
import { selectLocalId, selectUserEmail, selectUserName } from '../lib/features/todos/userSlice'; // Import selectors
import SuccessModal from './SuccessModal';

export default function CheckoutForm({
  addressDetails,
  isLoading,
  appliedPromoCode,
  clientSecret,
}) {
  const stripe = useStripe();
  const elements = useElements();
  const dispatch = useDispatch();

  const [message, setMessage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [orderNumber, setOrderNumber] = useState(null);

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
    const firebaseId = userId || auth.currentUser?.uid;
    if (!firebaseId) {
      console.error('Firebase ID is missing. Cannot save order.');
      setMessage('Payment succeeded, but there was an issue saving your order.');
      return true; // stop further processing
    }

    try {
      console.log('Finalizing order (server):', {
        paymentIntentId: pi.id,
        itemCount: cartItems?.length || 0,
      });
      const resp = await fetch('/api/payments/finalize-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentIntentId: pi.id,
          firebaseId,
          userEmail,
          userName,
          cartItems,
          addressDetails,
          appliedPromoCode,
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
      } else {
        console.log('Finalize order success:', data);
        // If server persisted purchases successfully, prefer its orderNumber and skip client save
        if (data && data.ok && data.orderNumber) {
          setOrderNumber(data.orderNumber);
          setMessage('Payment succeeded! Your order has been saved.');
          dispatch(clearCart());
          setShowSuccess(true);
          return true; // handled
        }
      }
    } catch (e) {
      console.error('Finalize order error:', e);
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
      setOrderNumber(saveResult.orderNumber || null);
      setMessage('Payment succeeded! Your order has been saved.');
      dispatch(clearCart());
      setShowSuccess(true);
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
  const isButtonDisabled = !stripe || !elements || isLoading || isProcessing;

  return (
    <form id="payment-form" onSubmit={handleSubmit}>
      {showSuccess && (
        <SuccessModal orderNumber={orderNumber} onClose={() => setShowSuccess(false)} />
      )}
      <PaymentElement id="payment-element" options={paymentElementOptions} />
      <button
        disabled={isButtonDisabled}
        id="submit"
        className={`mt-6 w-full rounded-md border border-transparent px-4 py-2 text-base font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 ${
          isButtonDisabled
            ? 'cursor-not-allowed bg-gray-500 text-gray-300'
            : 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500'
        }`}
      >
        <span id="button-text">
          {isProcessing ? 'Processing...' : isLoading ? 'Updating...' : 'Pay now'}
        </span>
      </button>
      {message && (
        <div
          id="payment-message"
          className={`mt-4 text-sm ${message.includes('success') ? 'text-green-500' : 'text-red-500'}`}
        >
          {message}
        </div>
      )}
    </form>
  );
}
