'use client';

import { loadStripe } from '@stripe/stripe-js';
import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import XMarkIcon from '@heroicons/react/20/solid/XMarkIcon';

import {
  decrementQuantity,
  incrementQuantity,
  removeFromCart,
  selectCartItems,
  setCheckoutPrice,
} from '../../../lib/features/todos/cartSlice';

import storage from '@/utils/storage';
import EmptyCart from '../../../components/EmptyCart';

// Import new components
import CartItemDisplay from './components/CartItemDisplay';
import OrderSummaryDisplay from './components/OrderSummaryDisplay';
// Promo code functionality removed

// Call our Next.js API proxy to avoid CORS/redirects
const API_PROXY = '/api/payments';

export default function Cart() {
  const dispatch = useDispatch();
  const cartItems = useSelector(selectCartItems);
  // Promo code functionality removed
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [addressDetails, setAddressDetails] = useState(null);
  // Discount and promo-related state removed

  const [state, setState] = useState({
    cartSubtotal: 0,
    totalPrice: 0,
    stripePromise: null,
    clientSecret: '',
    userName: '',
    userEmail: '',
    userId: '',
    idToken: null,
    refreshToken: null,
  });

  // Promo code validation removed

  const handleRemoveFromCart = (productId, selectedColor, selectedSize) => {
    dispatch(removeFromCart({ productId, selectedColor, selectedSize }));
  };

  const handleIncrement = (productId, selectedColor, selectedSize) => {
    dispatch(incrementQuantity({ productId, selectedColor, selectedSize }));
  };

  const handleDecrement = (productId, selectedColor, selectedSize) => {
    dispatch(decrementQuantity({ productId, selectedColor, selectedSize }));
  };

  const handleAddressChange = (address) => {
    setAddressDetails(address);
    setState((prevState) => ({
      ...prevState,
      addressDetails: address,
    }));
  };
  // Promo code application removed

  useEffect(() => {
    const newCartSubtotal = cartItems.reduce((accumulator, item) => {
      const quantity = typeof item.quantity === 'number' && item.quantity > 0 ? item.quantity : 1;
      return accumulator + parseFloat(item.price) * quantity;
    }, 0);

    const taxRate = 0.075;
    const taxTotal = newCartSubtotal * taxRate;
    const shipping = cartItems.some((item) => !item.isDigital) ? 0.0 : 0.0;
    const newTotalPrice = newCartSubtotal + taxTotal + shipping;

    setState((prevState) => ({
      ...prevState,
      cartSubtotal: newCartSubtotal,
      totalPrice: Math.max(0, newTotalPrice),
    }));

    dispatch(setCheckoutPrice(Math.max(0, newTotalPrice * 100)));
  }, [cartItems, dispatch]);

  useEffect(() => {
    const publishableKey =
      'pk_live_51NFhuOHnXmOBmfaDu16tJEuppfYKPUivMapB9XLXaBpiOLqiPRz2uoPAiifxqiLT49dyPCHOSKs74wjBspzJ8zo600yGYluqUe';
    setState((prevState) => ({
      ...prevState,
      stripePromise: loadStripe(publishableKey),
    }));
  }, []);

  useEffect(() => {
    const { idToken, refreshToken, name, email, userId } = storage.readKeys([
      'idToken',
      'refreshToken',
      'name',
      'email',
      'userId',
    ]);
    setState((prevState) => ({
      ...prevState,
      idToken,
      refreshToken,
      userName: name || '',
      userEmail: email || '',
      userId: userId || '',
    }));
  }, []);

  const taxRate = 0.075;
  const taxTotal = (state.cartSubtotal * taxRate).toFixed(2);
  const shipping = cartItems.some((item) => !item.isDigital) ? 0.0 : 0.0;
  const total = (parseFloat(state.cartSubtotal) + parseFloat(taxTotal) + shipping).toFixed(2);
  const finalTotal = Math.max(0, parseFloat(total)).toFixed(2);
  const stripeTotal = Math.round(Math.max(0, parseFloat(finalTotal) * 100));

  useEffect(() => {
    const fetchClientSecret = async () => {
      try {
        if (!cartItems.length || stripeTotal <= 0) {
          setState((prevState) =>
            prevState.clientSecret ? { ...prevState, clientSecret: '' } : prevState,
          );
          storage.remove('clientSecret');
          return;
        }

        const MIN_STRIPE_AMOUNT = 50; // 50 cents, Stripe's typical minimum
        if (stripeTotal < MIN_STRIPE_AMOUNT) {
          console.warn(
            `Stripe total amount ${stripeTotal} cents is below minimum ${MIN_STRIPE_AMOUNT} cents. Payment intent not created.`,
          );
          setErrorMessage(
            `Order total ($${(stripeTotal / 100).toFixed(
              2,
            )}) is below the minimum processing amount of $${(MIN_STRIPE_AMOUNT / 100).toFixed(
              2,
            )}. Please adjust your cart.`,
          );
          setState((prevState) =>
            prevState.clientSecret ? { ...prevState, clientSecret: '' } : prevState,
          );
          storage.remove('clientSecret');
          setIsLoading(false);
          return;
        }

        setIsLoading(true);
        setErrorMessage('');

        console.log(
          '[Cart] Creating payment intent via proxy:',
          `${API_PROXY}/create-payment-intent`,
        );
        const response = await fetch(`${API_PROXY}/create-payment-intent`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: stripeTotal,
            customerEmail: state.userEmail,
            name: state.userName,
            firebaseId: state.userId,
            cartItems,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `Error: HTTP status ${response.status}`);
        }

        const { client_secret } = await response.json();
        setState((prevState) => ({ ...prevState, clientSecret: client_secret }));
        // Do not persist clientSecret; avoid accidentally reusing a succeeded intent
      } catch (error) {
        console.error('Error fetching payment intent:', error.message);
        setErrorMessage(
          `Payment setup failed: ${error.message}. Please refresh the page or try again later.`,
        );
        setState((prevState) => ({ ...prevState, clientSecret: '' }));
        storage.remove('clientSecret');
      } finally {
        setIsLoading(false);
      }
    };

    if (state.userName && state.userEmail && state.userId) {
      fetchClientSecret();
    } else {
      setIsLoading(false);
      setState((prevState) =>
        prevState.clientSecret ? { ...prevState, clientSecret: '' } : prevState,
      );
    }
  }, [state.userName, state.userEmail, state.userId, cartItems, stripeTotal]);

  const appearance = useMemo(
    () => ({
      theme: 'stripe',
      variables: {
        colorText: '#ffffff',
        colorBackground: '#000000',
      },
    }),
    [],
  );

  const options = useMemo(
    () => ({ clientSecret: state.clientSecret, appearance }),
    [state.clientSecret, appearance],
  );

  const hasPhysicalItems = cartItems.some((item) => !item.isDigital);

  return (
    <div className="isolate bg-[var(--bg-root)] transition-colors duration-200">
      {/* Header is rendered by layout.js */}
      {errorMessage && (
        <div
          className="relative mx-auto mt-16 max-w-7xl rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700"
          role="alert"
        >
          <span className="block sm:inline">{errorMessage}</span>
          <button
            className="absolute bottom-0 right-0 top-0 px-4 py-3"
            onClick={() => setErrorMessage('')}
          >
            <XMarkIcon className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      )}
      {cartItems.length === 0 ? (
        <EmptyCart />
      ) : (
        <div className="mx-auto max-w-2xl px-4 pb-24 pt-32 sm:px-6 lg:max-w-7xl lg:px-8">
          <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)] sm:text-4xl">
            Shopping Cart
          </h1>
          <div className="mt-12 lg:grid lg:grid-cols-12 lg:items-start lg:gap-x-12 xl:gap-x-16">
            <section aria-labelledby="cart-heading" className="lg:col-span-7">
              <h2 id="cart-heading" className="sr-only">
                Items in your shopping cart
              </h2>

              <ul
                role="list"
                className="divide-y divide-[var(--border-subtle)] border-b border-t border-[var(--border-subtle)]"
              >
                {cartItems.map((item, index) => (
                  <CartItemDisplay
                    key={`${item.productId}-${item.selectedColor}-${item.selectedSize}-${index}`}
                    item={item}
                    handleIncrement={handleIncrement}
                    handleDecrement={handleDecrement}
                    handleRemoveFromCart={handleRemoveFromCart}
                  />
                ))}
              </ul>
            </section>

            <OrderSummaryDisplay
              cartSubtotal={state.cartSubtotal}
              shipping={shipping}
              taxTotal={taxTotal}
              finalTotal={finalTotal}
              idToken={state.idToken}
              refreshToken={state.refreshToken}
              clientSecret={state.clientSecret}
              stripePromise={state.stripePromise}
              options={options}
              hasPhysicalItems={hasPhysicalItems}
              handleAddressChange={handleAddressChange}
              addressDetails={addressDetails}
              isLoading={isLoading}
              userId={state.userId}
              userName={state.userName}
              userEmail={state.userEmail}
            />
          </div>
        </div>
      )}

      {/* Footer is rendered globally in RootLayout */}
    </div>
  );
}
