# Purchase Email Trigger (Firestore + Functions v2)

Goal: Send a reliable purchase confirmation email when an order is actually fulfilled (tickets created, inventory decremented) — not merely when Stripe charges succeed.

## Overview

- Trigger: Firestore `fulfillments/{paymentIntentId}` when `status` transitions to `completed`.
- Idempotency: Only send once — guard with `emailSentAt` on the fulfillment doc.
- Provider: Resend (simple HTTP API). Swap for SendGrid/Postmark if preferred.
- Ownership: Lives in our Functions v2 code (versioned, testable, debuggable), not a Console extension.

## Data Contract (fulfillment doc)

Fulfillment document (created by `finalize-order`) should include:

- `status`: string — expected `completed` when fulfillment is done.
- `email` or `userEmail`: recipient address.
- `orderNumber` (optional): human-readable order id; fallback to paymentIntent id.
- `items` (optional): array of `{ title, productId, quantity }` to render in the email.
- `createdTickets` (optional): array of created ticket refs/metadata (best-effort inclusion).
- `emailSentAt` (optional): timestamp set by the trigger after successful send.

If any fields are missing, the trigger handles fallbacks and will skip sending if no recipient email is available.

## Trigger Strategy

Use `onDocumentWritten` (not `onDocumentCreated`) so we can react when `status` changes from any state to `completed` and still send exactly once.

Conditions to send:

1. `after.exists` is true.
2. `after.status === 'completed'`.
3. `before.status !== 'completed'` (transition just happened) AND `!after.emailSentAt`.

## Implementation (Functions v2)

Create a new file `functions/email.js` (or add to an existing functions entry) and install the provider SDK.

```js
// functions/email.js
'use strict';

const { onDocumentWritten } = require('firebase-functions/v2/firestore');
const { defineSecret } = require('firebase-functions/params');
const logger = require('firebase-functions/logger');
const { Resend } = require('resend');

const RESEND_API_KEY = defineSecret('RESEND_API_KEY');

exports.sendPurchaseEmail = onDocumentWritten(
  {
    region: 'us-central1',
    document: 'fulfillments/{piId}',
    secrets: [RESEND_API_KEY],
    retry: true, // retry on transient failures
  },
  async (event) => {
    const before = event.data?.before;
    const after = event.data?.after;

    if (!after?.exists) return; // deleted
    const prev = before?.data() || {};
    const curr = after.data() || {};
    const piId = event.params.piId;

    const prevStatus = (prev.status || '').toLowerCase();
    const currStatus = (curr.status || '').toLowerCase();

    // send only when status just became completed, and we haven't sent yet
    if (curr.emailSentAt) {
      logger.debug('Email already sent', { piId });
      return;
    }
    if (currStatus !== 'completed' || prevStatus === 'completed') {
      logger.debug('Not a completed transition; skipping', { piId, prevStatus, currStatus });
      return;
    }

    const recipient = curr.email || curr.userEmail;
    const orderNumber = curr.orderNumber || piId;
    const amountCents = typeof curr.amount === 'number' ? curr.amount : 0;
    const currency = (curr.currency || 'usd').toUpperCase();
    const fmtTotal = amountCents
      ? new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amountCents / 100)
      : '';
    if (!recipient) {
      logger.warn('Missing recipient email on fulfillment; cannot send', { piId });
      return;
    }

    // Prefer explicit items; fall back to createdTickets/details
    const items = Array.isArray(curr.items)
      ? curr.items
      : Array.isArray(curr.createdTickets)
        ? curr.createdTickets
        : Array.isArray(curr.details)
          ? curr.details
          : [];

    const itemsHtml = items
      .map((i) => {
        const title = i.title || i.name || i.productId || 'Item';
        const qty = i.quantity || i.qty || i.selectedQuantity || 1;
        return `<li>${title} × ${qty}</li>`;
      })
      .join('');

    const resend = new Resend(RESEND_API_KEY.value());

    try {
      const result = await resend.emails.send({
        from: 'RAGESTATE <orders@ragestate.com>', // domain must be verified in Resend
        to: recipient,
        subject: `Your tickets — ${orderNumber}`,
        html: `
          <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial">
            <h2 style="margin:0 0 12px">Thanks for your purchase!</h2>
            <p style="margin:0 0 8px">Order: <b>${orderNumber}</b></p>
                    ${itemsHtml ? `<ul style="margin:8px 0 12px">${itemsHtml}</ul>` : ''}
                    ${fmtTotal ? `<p style="margin:0 0 8px"><b>Total: ${fmtTotal}</b></p>` : ''}
            <p style="margin:0 0 8px">Your tickets are now in your account.</p>
            <p style="margin:0"><a href="https://www.ragestate.com/account">View my tickets</a></p>
          </div>
        `,
      });

      await after.ref.update({
        emailSentAt: new Date(),
        emailProvider: 'resend',
        emailMessageId: result?.data?.id || null,
      });

      logger.info('Purchase email sent', { piId, recipient, orderNumber });
    } catch (err) {
      logger.error('Purchase email failed', { piId, recipient, orderNumber, error: String(err) });
      throw err; // let platform retry
    }
  },
);
```

### Wire-up steps

1. Provider dependency
   - Add to `functions/package.json`:

   ```json
   {
     "dependencies": {
       "resend": "^3.0.0"
     }
   }
   ```

2. Secret
   - Set Resend API key (once per project):

   ```bash
   cd functions
   firebase functions:secrets:set RESEND_API_KEY
   ```

3. Export
   - If using a central `functions/index.js`, export the trigger:

   ```js
   // functions/index.js
   exports.sendPurchaseEmail = require('./email').sendPurchaseEmail;
   ```

4. Deploy

   ```bash
   npm --prefix functions install
   firebase deploy --only functions
   ```

## Ensuring Required Fields

If `finalize-order` does not already write the email/summary fields, add a merge before returning success, for example:

```js
// Inside finalize-order, after transactional success
await db.doc(`fulfillments/${pi.id}`).set(
  {
    status: 'completed',
    email: body.userEmail || pi?.receipt_email || customer?.email || null,
    orderNumber: body.orderNumber || null,
    items: (body.cartItems || []).map((i) => ({
      title: i.title || i.productId,
      productId: i.productId,
      quantity: i.selectedQuantity || 1,
    })),
    lastUpdated: new Date(),
  },
  { merge: true },
);
```

## Testing

- Local (emulators):
  - Start emulators, create/update `fulfillments/{pi}` with `status: 'completed'`, `email: 'you@domain.com'`.
  - Verify a single email is sent and the doc is updated with `emailSentAt`.
- Staging prod test:
  - Use a test card; complete checkout; confirm email received and `emailSentAt` set.

## Monitoring & Retry

- Logs: Cloud Logging → query by `resource.type="cloud_function" AND text:sendPurchaseEmail`.
- Retries: Enabled with `retry: true`; transient failures will be retried by the platform.
- Duplicate sends: prevented via `emailSentAt` + status transition check.

## Alternatives

- Firebase Trigger Email (SendGrid) Extension: quick start, but less flexible (provider lock-in, template management in Console, harder to align with our idempotency logic).
- Stripe Receipts: free and instant, but fire at payment-time, not fulfillment-time.

## Next Steps

- Confirm `fulfillments` doc contains `email` and `items` at completion.
- Implement `functions/email.js`, add dependency and secret.
- Deploy and run a live test. Document results in `notifications-spec.md`.
