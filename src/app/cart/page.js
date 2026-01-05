'use client';

import { loadStripe } from '@stripe/stripe-js';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import XMarkIcon from '@heroicons/react/20/solid/XMarkIcon';

import {
  decrementQuantity,
  incrementQuantity,
  removeFromCart,
  selectCartItems,
  setCheckoutPrice,
} from '../../../lib/features/cartSlice';

import storage from '@/utils/storage';
import EmptyCart from '../../../components/EmptyCart';
import { useTheme } from '../../../lib/context/ThemeContext';

// Import new components
import CartItemDisplay from './components/CartItemDisplay';
import CrossSellSection from './components/CrossSellSection';
import OrderSummaryDisplay from './components/OrderSummaryDisplay';

// Call our Next.js API proxy to avoid CORS/redirects
const API_PROXY = '/api/payments';

export default function Cart() {
  const dispatch = useDispatch();
  const cartItems = useSelector(selectCartItems);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [addressDetails, setAddressDetails] = useState(null);

  // Promo code state
  const [promoCode, setPromoCode] = useState(null); // { code, promoId, promoCollection }
  const [promoDiscount, setPromoDiscount] = useState(0); // discount in cents
  const [promoDisplayCode, setPromoDisplayCode] = useState('');
  const [promoError, setPromoError] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);

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

  // Promo code validation
  const handleApplyPromo = useCallback(
    async (code) => {
      if (!code || promoLoading) return;

      setPromoLoading(true);
      setPromoError('');

      try {
        // Calculate cart total in cents for validation
        const cartTotalCents = Math.round(state.cartSubtotal * 100);

        const response = await fetch(`${API_PROXY}/validate-promo-code`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, cartTotal: cartTotalCents }),
        });

        const data = await response.json();

        if (data.valid) {
          setPromoCode({
            code: data.promoId,
            promoId: data.promoId,
            promoCollection: data.promoCollection,
          });
          setPromoDiscount(data.discountAmount);
          setPromoDisplayCode(data.displayCode);
          setPromoError('');
        } else {
          setPromoError(data.message || 'Invalid promo code');
          setPromoCode(null);
          setPromoDiscount(0);
          setPromoDisplayCode('');
        }
      } catch (error) {
        console.error('Promo code validation failed:', error);
        setPromoError('Failed to validate promo code. Please try again.');
        setPromoCode(null);
        setPromoDiscount(0);
        setPromoDisplayCode('');
      } finally {
        setPromoLoading(false);
      }
    },
    [state.cartSubtotal, promoLoading],
  );

  const handleRemovePromo = useCallback(() => {
    setPromoCode(null);
    setPromoDiscount(0);
    setPromoDisplayCode('');
    setPromoError('');
  }, []);

  // Re-validate promo when cart items change (not on every subtotal recalc)
  const cartItemsKey = useMemo(
    () => cartItems.map((i) => `${i.productId}-${i.quantity}`).join(','),
    [cartItems],
  );

  useEffect(() => {
    if (promoCode && promoDisplayCode && state.cartSubtotal > 0) {
      // Silently re-validate to update discount amount
      const revalidate = async () => {
        try {
          const cartTotalCents = Math.round(state.cartSubtotal * 100);
          const response = await fetch(`${API_PROXY}/validate-promo-code`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: promoCode.code, cartTotal: cartTotalCents }),
          });
          const data = await response.json();
          if (data.valid) {
            setPromoDiscount(data.discountAmount);
          } else {
            // Promo no longer valid (e.g., cart below minimum)
            handleRemovePromo();
            setPromoError(data.message || 'Promo code no longer applies');
          }
        } catch (e) {
          // Silently fail on revalidation
          console.warn('Promo revalidation failed:', e);
        }
      };
      revalidate();
    }
    // Only re-validate when cart items actually change, not on every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartItemsKey]);

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

  // Stable key for payment intent - only changes when cart items or promo code identity changes
  const paymentKey = useMemo(
    () => `${cartItemsKey}-${promoCode?.code || 'none'}`,
    [cartItemsKey, promoCode?.code],
  );

  useEffect(() => {
    const fetchClientSecret = async () => {
      // Calculate current stripe total inside effect to use latest values
      const currentStripeTotal = Math.round(
        Math.max(0, parseFloat(finalTotal) * 100 - promoDiscount),
      );

      try {
        if (!cartItems.length || currentStripeTotal <= 0) {
          setState((prevState) =>
            prevState.clientSecret ? { ...prevState, clientSecret: '' } : prevState,
          );
          storage.remove('clientSecret');
          return;
        }

        const MIN_STRIPE_AMOUNT = 50; // 50 cents, Stripe's typical minimum
        if (currentStripeTotal < MIN_STRIPE_AMOUNT) {
          console.warn(
            `Stripe total amount ${currentStripeTotal} cents is below minimum ${MIN_STRIPE_AMOUNT} cents. Payment intent not created.`,
          );
          setErrorMessage(
            `Order total ($${(currentStripeTotal / 100).toFixed(
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
          promoCode ? `with promo: ${promoCode.code}` : '',
        );

        // Build request body with optional promo code
        const requestBody = {
          amount: currentStripeTotal,
          customerEmail: state.userEmail,
          name: state.userName,
          firebaseId: state.userId,
          cartItems,
        };

        // Include promo code if applied (server will re-validate)
        if (promoCode && promoCode.code) {
          requestBody.promoCode = promoCode.code;
        }

        const response = await fetch(`${API_PROXY}/create-payment-intent`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          // Handle promo code rejection from server
          if (errorData.promoError) {
            setPromoError(errorData.promoError);
            handleRemovePromo();
          }
          throw new Error(
            errorData.message || errorData.error || `Error: HTTP status ${response.status}`,
          );
        }

        const data = await response.json();
        setState((prevState) => ({ ...prevState, clientSecret: data.client_secret }));

        // Note: Don't update promoDiscount from server response here to avoid re-render loops
        // The discount is already calculated client-side and server validates it
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
    // Use paymentKey to stabilize - only re-fetch when cart items or promo code identity changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.userName, state.userEmail, state.userId, paymentKey]);

  // Get current theme for Stripe appearance
  const { resolvedTheme } = useTheme();

  // Stripe PaymentElement appearance - synced with light/dark mode
  const appearance = useMemo(
    () => ({
      theme: resolvedTheme === 'dark' ? 'night' : 'stripe',
      variables: {
        // Colors from CSS variables (hardcoded here since Stripe doesn't read CSS vars)
        colorPrimary: '#ff1f42', // --accent
        colorBackground: resolvedTheme === 'dark' ? '#0d0d0f' : '#ffffff', // --bg-elev-1
        colorText: resolvedTheme === 'dark' ? '#f5f6f7' : '#111113', // --text-primary
        colorTextSecondary: resolvedTheme === 'dark' ? '#a1a5ab' : '#555555', // --text-secondary
        colorDanger: resolvedTheme === 'dark' ? '#ff4d4d' : '#e53935', // --danger
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        borderRadius: '8px',
        spacingUnit: '4px',
      },
      rules: {
        '.Input': {
          backgroundColor: resolvedTheme === 'dark' ? '#16171a' : '#f0f0f2', // --bg-elev-2
          borderColor: resolvedTheme === 'dark' ? '#242528' : '#e0e0e3', // --border-subtle
          color: resolvedTheme === 'dark' ? '#f5f6f7' : '#111113',
        },
        '.Input:focus': {
          borderColor: '#ff1f42', // --accent
          boxShadow: '0 0 0 1px #ff1f42',
        },
        '.Label': {
          color: resolvedTheme === 'dark' ? '#a1a5ab' : '#555555', // --text-secondary
        },
        '.Tab': {
          backgroundColor: resolvedTheme === 'dark' ? '#16171a' : '#f0f0f2',
          borderColor: resolvedTheme === 'dark' ? '#242528' : '#e0e0e3',
        },
        '.Tab:hover': {
          backgroundColor: resolvedTheme === 'dark' ? '#242528' : '#e0e0e3',
        },
        '.Tab--selected': {
          borderColor: '#ff1f42',
          backgroundColor: resolvedTheme === 'dark' ? '#0d0d0f' : '#ffffff',
        },
      },
    }),
    [resolvedTheme],
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

              {/* Cross-sell suggestions */}
              <CrossSellSection cartItems={cartItems} />
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
              // Promo code props
              promoCode={promoCode}
              promoDiscount={promoDiscount}
              promoDisplayCode={promoDisplayCode}
              promoError={promoError}
              promoLoading={promoLoading}
              onApplyPromo={handleApplyPromo}
              onRemovePromo={handleRemovePromo}
            />
          </div>
        </div>
      )}

      {/* Footer is rendered globally in RootLayout */}
    </div>
  );
}
