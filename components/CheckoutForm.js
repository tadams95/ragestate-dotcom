import { PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { getAuth } from 'firebase/auth'; // Import Firebase Auth
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import SaveToFirestore from '../firebase/util/saveToFirestore';
import { clearCart, selectCartItems } from '../lib/features/todos/cartSlice';
import { selectLocalId, selectUserEmail, selectUserName } from '../lib/features/todos/userSlice'; // Import selectors

export default function CheckoutForm({ addressDetails, isLoading, appliedPromoCode }) {
  const stripe = useStripe();
  const elements = useElements();
  const dispatch = useDispatch();

  const [message, setMessage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  // removed unused orderSaved state

  // Fetch user and cart data from Redux
  const cartItems = useSelector(selectCartItems);
  const userName = useSelector(selectUserName);
  const userEmail = useSelector(selectUserEmail);
  const userId = useSelector(selectLocalId);

  useEffect(() => {
    if (!stripe) {
      return;
    }

    const clientSecret = new URLSearchParams(window.location.search).get(
      'payment_intent_client_secret',
    );

    if (!clientSecret) {
      return;
    }

    stripe.retrievePaymentIntent(clientSecret).then(({ paymentIntent }) => {
      switch (paymentIntent.status) {
        case 'succeeded':
          setMessage('Payment succeeded!');
          break;
        case 'processing':
          setMessage('Your payment is processing.');
          break;
        case 'requires_payment_method':
          setMessage('Your payment was not successful, please try again.');
          break;
        default:
          setMessage('Something went wrong.');
          break;
      }
    });
  }, [stripe]);

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
          return_url: return_url,
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

      if (error) {
        if (error.type === 'card_error' || error.type === 'validation_error') {
          setMessage(error.message);
        } else {
          setMessage('An unexpected error occurred.');
          console.error('Stripe confirmation error:', error);
        }
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        console.log('Payment succeeded:', paymentIntent.id);

        const auth = getAuth();
        const firebaseId = userId || auth.currentUser?.uid;

        if (!firebaseId) {
          console.error('Firebase ID is missing. Cannot save order.');
          setMessage('Payment succeeded, but there was an issue saving your order.');
          return;
        }

        // 1) Finalize order on server: create tickets and decrement inventory
        try {
          const resp = await fetch('/api/payments/finalize-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              paymentIntentId: paymentIntent.id,
              firebaseId,
              userEmail,
              userName,
              cartItems,
            }),
          });
          if (!resp.ok) {
            const text = await resp.text();
            console.error('Finalize order failed:', text);
          }
        } catch (e) {
          console.error('Finalize order error:', e);
        }

        // 2) Save purchase records (client-side convenience copy)
        const saveResult = await SaveToFirestore(
          userName,
          userEmail,
          firebaseId,
          cartItems,
          paymentIntent.id,
          addressDetails,
          appliedPromoCode,
        );

        if (saveResult && saveResult.success) {
          setMessage('Payment succeeded! Your order has been saved.');
          // Clear cart now that everything is processed
          dispatch(clearCart());
        } else {
          setMessage('Payment succeeded, but there was an issue saving your order.');
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

  const paymentElementOptions = {
    layout: 'tabs',
  };

  const isButtonDisabled = !stripe || !elements || isLoading || isProcessing;

  return (
    <form id="payment-form" onSubmit={handleSubmit}>
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
          className={`mt-4 text-sm ${
            message.includes('success') ? 'text-green-500' : 'text-red-500'
          }`}
        >
          {message}
        </div>
      )}
    </form>
  );
}
