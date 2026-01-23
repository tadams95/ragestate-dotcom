'use client';

import storage from '@/utils/storage';
import Image from 'next/image';
// Avoid useSearchParams/usePathname to prevent Suspense requirements in some pages
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useDispatch } from 'react-redux';
import { addToCart } from '../lib/features/cartSlice';
import AuthGateModal from './AuthGateModal';

export default function EventDetails({ event }) {
  const dispatch = useDispatch();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showAuthGate, setShowAuthGate] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);
  const [addedSuccess, setAddedSuccess] = useState(false);
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
  const getSearchParam = (key) => {
    if (typeof window === 'undefined') return null;
    return new URLSearchParams(window.location.search).get(key);
  };

  const selectedEvent = typeof window !== 'undefined' ? storage.getJSON('selectedEvent') : null;

  const canonicalEvent = useMemo(() => selectedEvent || event || null, [selectedEvent, event]);

  const formatSlug = (value) =>
    (value || '')
      .toLowerCase()
      .trim()
      .replace(/['`”"“]/g, '')
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/--+/g, '-')
      .replace(/^-|-$/g, '');

  const eventIdentifier = useMemo(() => {
    if (!canonicalEvent) return '';
    return (
      canonicalEvent.slug ||
      canonicalEvent.id ||
      (canonicalEvent.name ? formatSlug(canonicalEvent.name) : '')
    );
  }, [canonicalEvent]);

  const ts = canonicalEvent?.dateTime;
  const date = (() => {
    try {
      if (typeof ts?.toDate === 'function') return ts.toDate();
      if (typeof ts?.seconds === 'number')
        return new Date(ts.seconds * 1000 + (ts.nanoseconds || 0) / 1e6);
    } catch (_) {}
    return null;
  })();

  // Format date nicely
  const formattedDate =
    date?.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }) || 'TBA';

  const formattedTime =
    date?.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }) || 'TBA';

  const location = canonicalEvent?.location || 'Location TBA';

  // Check auth presence in local storage for gentle reminders
  useEffect(() => {
    try {
      const { idToken, userId } = storage.readKeys
        ? storage.readKeys(['idToken', 'userId'])
        : { idToken: null, userId: null };
      setIsLoggedIn(Boolean(idToken && userId));
    } catch (_) {}
  }, []);

  // Auto-add support after returning from auth with ?autoAdd=true
  useEffect(() => {
    try {
      if (!canonicalEvent) return;
      const autoAdd = getSearchParam('autoAdd') === 'true';
      const addedKey = `autoAdded:${eventIdentifier || canonicalEvent.name || 'event'}`;
      if (isLoggedIn && autoAdd && !sessionStorage.getItem(addedKey)) {
        // Create cart item and add once
        if (canonicalEvent && canonicalEvent.quantity > 0) {
          const cartItem = {
            productId: eventIdentifier || canonicalEvent.name,
            title: canonicalEvent.name,
            productImageSrc: canonicalEvent.imgURL,
            selectedQuantity: 1,
            price: canonicalEvent.price,
            eventDetails: { location: canonicalEvent.location },
            isDigital: canonicalEvent.isDigital,
          };
          dispatch(addToCart(cartItem));
          sessionStorage.setItem(addedKey, '1');
          toast.success('Event added to cart!', {
            duration: 3000,
            position: 'bottom-center',
            style: { background: '#333', color: '#fff', border: '1px solid #444' },
          });
        }
      }
    } catch (_) {}
  }, [isLoggedIn, canonicalEvent, dispatch, eventIdentifier]);

  // Function to generate Google Maps link
  const generateGoogleMapsLink = (location) => {
    const encodedLocation = encodeURIComponent(location);
    return `https://www.google.com/maps/search/?api=1&query=${encodedLocation}`;
  };

  // Function to generate Apple Maps link (for iOS users)
  const generateAppleMapsLink = (location) => {
    const encodedLocation = encodeURIComponent(location);
    return `https://maps.apple.com/?q=${encodedLocation}`;
  };

  const handleAddToCart = () => {
    if (canonicalEvent && canonicalEvent.quantity > 0) {
      if (!isLoggedIn) {
        setShowAuthGate(true);
        return;
      }

      setAddingToCart(true);
      const cartItem = {
        productId: eventIdentifier || canonicalEvent.name,
        title: canonicalEvent.name,
        productImageSrc: canonicalEvent.imgURL,
        selectedQuantity: 1,
        price: canonicalEvent.price,
        eventDetails: {
          location: canonicalEvent.location,
        },
        isDigital: canonicalEvent.isDigital,
      };

      // Dispatch the addToCart action with the cart item
      dispatch(addToCart(cartItem));

      // Brief loading state then success animation
      setTimeout(() => {
        setAddingToCart(false);
        setAddedSuccess(true);
        toast.success('Event added to cart!', {
          duration: 3000,
          position: 'bottom-center',
          style: {
            background: '#333',
            color: '#fff',
            border: '1px solid #444',
          },
        });
        // Reset success state after animation
        setTimeout(() => setAddedSuccess(false), 1500);
      }, 300);
    } else {
      toast.error('Sold Out!', {
        duration: 3000,
        position: 'bottom-center',
        style: {
          background: '#333',
          color: '#fff',
          border: '1px solid #444',
        },
      });
    }
  };

  // Consistent button styling with account page
  const buttonStyling =
    'flex w-full justify-center rounded-md bg-[var(--accent)] px-8 py-3 text-base font-medium text-white hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] transition-all duration-200 active:scale-95';

  // Common card styling with hover effects matching about page
  const cardStyling =
    'bg-[var(--bg-elev-2)] p-5 rounded-lg border border-[var(--border-subtle)] shadow-[var(--shadow-card)] hover:border-red-500/30 transition-all duration-300';

  const nextParam = encodeURIComponent(`${pathname}?autoAdd=true`);

  return (
    <>
      <div className="isolate">
        {/* Product - using a similar grid to account page sections */}
        <div className="grid grid-cols-1 items-start gap-8 md:grid-cols-5">
          {/* Product image - takes up more space on larger screens */}
          <div className="md:col-span-3">
            <div className="overflow-hidden rounded-xl border border-[var(--border-subtle)] shadow-[var(--shadow-modal)] transition-all duration-300 hover:border-red-500/30">
              <Image
                priority
                src={canonicalEvent?.imgURL || '/assets/EventHero.png'}
                alt={canonicalEvent?.name || 'Event image'}
                className="object-cover object-center"
                height={800}
                width={1200}
                style={{ width: '100%', height: 'auto' }}
              />
            </div>

            {/* Event description section - add border consistent with account page */}
            <div className={`mt-8 ${cardStyling}`}>
              <h3 className="mb-4 text-xl font-medium text-[var(--text-primary)]">About This Event</h3>
              <p className="whitespace-pre-line text-[var(--text-secondary)]">{canonicalEvent?.description}</p>
            </div>
          </div>

          {/* Product details */}
          <div className="space-y-6 md:col-span-2">
            {/* Event header in card - matches account page card styling */}
            <div className={cardStyling}>
              {canonicalEvent?.category && (
                <div className="mb-4">
                  <span className="inline-flex items-center rounded-full bg-[var(--accent-muted)] px-3 py-1 text-xs font-medium text-[var(--accent)] ring-1 ring-inset ring-[var(--accent)]/20">
                    {canonicalEvent.category}
                  </span>
                </div>
              )}
              <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)] sm:text-3xl">
                {canonicalEvent?.name}
              </h1>

              <div className="mt-4 flex items-center">
                <svg className="h-5 w-5 text-[var(--accent)]" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="ml-2 text-sm text-[var(--text-secondary)]">
                  {formattedDate} • {formattedTime}
                </span>
              </div>

              <div className="mt-6 flex items-center">
                <p className="text-2xl font-bold text-[var(--text-primary)]">${canonicalEvent?.price}</p>
                {canonicalEvent?.capacity && (
                  <div className="ml-4 text-sm text-[var(--text-tertiary)]">
                    <span className="font-medium">{canonicalEvent.attendees?.length || 0}</span>
                    <span className="mx-1">/</span>
                    <span>{canonicalEvent.capacity}</span>
                    <span className="ml-1">spots remaining</span>
                  </div>
                )}
              </div>

              <div className="mt-6">
                <button
                  type="button"
                  disabled={addingToCart}
                  className={`${buttonStyling} ${addingToCart ? 'animate-btn-loading' : ''} ${addedSuccess ? 'animate-btn-success !bg-green-600' : ''}`}
                  onClick={handleAddToCart}
                >
                  {addingToCart ? (
                    'Adding...'
                  ) : addedSuccess ? (
                    <span className="inline-flex items-center gap-2">
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      Added!
                    </span>
                  ) : isLoggedIn ? (
                    'Add to Cart'
                  ) : (
                    'Log in to add'
                  )}
                </button>
              </div>
            </div>

            {/* Location information - separate card like in account page */}
            <div className={cardStyling}>
              <h3 className="mb-3 text-lg font-medium text-[var(--text-primary)]">Location</h3>
              <p className="text-[var(--text-secondary)]">{location}</p>
              <div className="mt-4 flex flex-wrap gap-3">
                <a
                  href={generateGoogleMapsLink(location)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center rounded-md bg-[var(--bg-elev-1)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                >
                  <svg className="mr-2 h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                  </svg>
                  Open in Google Maps
                </a>
                <a
                  href={generateAppleMapsLink(location)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center rounded-md bg-[var(--bg-elev-1)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                >
                  <svg className="mr-2 h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                  </svg>
                  Open in Apple Maps
                </a>
              </div>
            </div>

            {/* Age restriction - separate card like in account page */}
            {canonicalEvent?.age && (
              <div className={cardStyling}>
                <h3 className="mb-3 text-lg font-medium text-[var(--text-primary)]">Age Restriction</h3>
                <p className="text-[var(--text-secondary)]">{canonicalEvent.age}+ </p>
              </div>
            )}
          </div>
        </div>
      </div>
      <AuthGateModal
        open={showAuthGate}
        onClose={() => setShowAuthGate(false)}
        title="Log in to add this event"
        message="Create an account or log in to add to your cart and checkout."
        loginHref={`/login?next=${nextParam}`}
        createHref={`/create-account?next=${nextParam}`}
      />
    </>
  );
}
