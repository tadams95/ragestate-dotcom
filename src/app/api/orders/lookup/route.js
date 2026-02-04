import { createHash } from 'crypto';
import { NextResponse } from 'next/server';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Get client IP from Next.js request
 * @param {Request} request
 * @returns {string}
 */
function getClientIp(request) {
  // Check common headers in order of preference
  const xForwardedFor = request.headers.get('x-forwarded-for');
  if (xForwardedFor) {
    // Take the first IP in the chain (original client)
    return xForwardedFor.split(',')[0].trim();
  }

  const xRealIp = request.headers.get('x-real-ip');
  if (xRealIp) {
    return xRealIp;
  }

  // Fallback
  return 'unknown';
}

/**
 * POST /api/orders/lookup
 * Look up a guest order by email and order number
 *
 * SECURITY FIX: Uses Firestore-based rate limiting instead of in-memory Map()
 * The in-memory approach was lost on serverless function cold start,
 * allowing brute-force enumeration of guest orders.
 */
export async function POST(request) {
  try {
    // Get client IP for rate limiting
    const clientIp = getClientIp(request);

    // SECURITY FIX: Use Firestore-based rate limiting (persists across cold starts)
    // Import dynamically to avoid loading Firebase Admin on every cold start unless needed
    const { checkRateLimit } = await import('../../../../../lib/server/rateLimit');
    const rateLimitResult = await checkRateLimit('ORDER_LOOKUP', clientIp);

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: 'rate_limited',
          message: rateLimitResult.message,
          resetAt: rateLimitResult.resetAt?.toISOString(),
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((rateLimitResult.resetAt.getTime() - Date.now()) / 1000)),
          },
        },
      );
    }

    // Parse request body
    const body = await request.json().catch(() => ({}));
    const { email, orderNumber } = body;

    // Validate email
    if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim().toLowerCase())) {
      return NextResponse.json(
        { error: 'Invalid email address', code: 'INVALID_EMAIL' },
        { status: 400 },
      );
    }

    // Validate order number
    if (!orderNumber || typeof orderNumber !== 'string' || !orderNumber.trim()) {
      return NextResponse.json(
        { error: 'Order number is required', code: 'INVALID_ORDER_NUMBER' },
        { status: 400 },
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedOrderNumber = orderNumber.trim();

    // Hash email for lookup (must match the hashing in stripe.js)
    const emailHash = createHash('sha256').update(normalizedEmail).digest('hex');

    // Query Firestore for the order
    const { firestoreAdmin } = await import('../../../../../lib/server/firebaseAdmin');

    const guestOrderRef = firestoreAdmin
      .collection('guestOrders')
      .doc(emailHash)
      .collection('orders')
      .doc(normalizedOrderNumber);

    const orderDoc = await guestOrderRef.get();

    if (!orderDoc.exists) {
      // Return not found but don't reveal whether the email exists
      return NextResponse.json(
        {
          found: false,
          message: 'No order found matching that email and order number.',
        },
        { status: 200 },
      );
    }

    const orderData = orderDoc.data();

    // Also try to get more details from merchandiseOrders if available
    let enrichedItems = [];
    let shippingStatus = null;
    let trackingNumber = null;
    let trackingUrl = null;

    // Try to get merchandise order details for shipping info
    try {
      const merchOrdersQuery = await firestoreAdmin
        .collection('merchandiseOrders')
        .where('orderNumber', '==', normalizedOrderNumber)
        .where('isGuestOrder', '==', true)
        .limit(10)
        .get();

      if (!merchOrdersQuery.empty) {
        for (const merchDoc of merchOrdersQuery.docs) {
          const merchData = merchDoc.data();
          enrichedItems.push({
            title: merchData.title || merchData.productTitle || 'Item',
            quantity: merchData.quantity || 1,
            image: merchData.image || merchData.productImage || null,
          });

          // Get shipping info from the first order with tracking
          if (!shippingStatus && merchData.fulfillmentStatus) {
            shippingStatus = merchData.fulfillmentStatus;
          }
          if (!trackingNumber && merchData.trackingNumber) {
            trackingNumber = merchData.trackingNumber;
            trackingUrl = merchData.trackingUrl || null;
          }
        }
      }
    } catch (merchErr) {
      console.warn('Failed to fetch merchandise order details:', merchErr);
    }

    // Sanitize order data for response (no sensitive fields)
    const sanitizedOrder = {
      orderNumber: orderData.orderNumber,
      status: orderData.status || 'completed',
      createdAt: orderData.createdAt?.toDate?.()?.toISOString() ||
        orderData.createdAt?._seconds
          ? new Date(orderData.createdAt._seconds * 1000).toISOString()
          : null,
      items: enrichedItems.length > 0 ? enrichedItems : undefined,
      totalAmount: orderData.totalAmount || null,
      itemCount: orderData.itemCount || enrichedItems.length || 0,
      shippingStatus: shippingStatus || undefined,
      trackingNumber: trackingNumber || undefined,
      trackingUrl: trackingUrl || undefined,
    };

    return NextResponse.json(
      {
        found: true,
        order: sanitizedOrder,
      },
      {
        status: 200,
        headers: {
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
        },
      },
    );
  } catch (err) {
    console.error('Order lookup error:', err);
    return NextResponse.json(
      { error: 'Failed to look up order', code: 'INTERNAL_ERROR' },
      { status: 500 },
    );
  }
}
