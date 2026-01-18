# Amazon SES Migration Specification

> **Goal**: Migrate email infrastructure from Resend to Amazon SES
> **Priority**: P0 — Complete before Phase 2.2a (Ticket Transfer)
> **Estimated Effort**: 1.5–2 hours (code) + 24-48 hours (AWS approval)

---

## Why Migrate?

| Issue                                     | Impact                                       | SES Solution                        |
| ----------------------------------------- | -------------------------------------------- | ----------------------------------- |
| **3K monthly limit exceeded**             | Purchase confirmation emails stopped sending | 62K free emails/month (from Lambda) |
| **No marketing capability**               | Can't send event promos, newsletters         | Full marketing support              |
| **Mailchimp separate cost**               | Extra $$ for campaigns                       | Replace entirely                    |
| **Ticket transfers will increase volume** | Phase 2.2a adds ~2-3 emails per transfer     | $0.10/1,000 emails at scale         |

### Cost Comparison

| Provider       | Free Tier      | Overage       | 10K emails/mo |
| -------------- | -------------- | ------------- | ------------- |
| **Resend**     | 3,000/month    | Service stops | $20+          |
| **Amazon SES** | 62,000/month\* | $0.10/1,000   | $0.00–$1.00   |

\*Free tier applies when sending from Lambda/EC2

---

## Current State

### File: `functions/email.js` (~170 lines)

```javascript
// Current implementation
const { Resend } = require('resend');
const RESEND_API_KEY = defineSecret('RESEND_API_KEY');

exports.sendPurchaseEmail = onDocumentWritten(
  {
    document: 'fulfillments/{piId}',
    secrets: [RESEND_API_KEY, STRIPE_SECRET],
  },
  async (event) => {
    // ... validation logic ...

    const resend = new Resend(RESEND_API_KEY.value());
    await resend.emails.send({
      from: 'RAGESTATE <orders@ragestate.com>',
      reply_to: 'support@ragestate.com',
      to: recipient,
      subject: `Your tickets — ${orderNumber}`,
      text: '...',
      html: '...',
    });
  },
);
```

### What Needs to Change

| Component    | Current                       | After Migration                              |
| ------------ | ----------------------------- | -------------------------------------------- |
| SDK          | `resend`                      | `@aws-sdk/client-ses`                        |
| Secret       | `RESEND_API_KEY`              | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` |
| From address | `orders@ragestate.com`        | Same (verified in SES)                       |
| Template     | Inline HTML string            | Same (no change needed)                      |
| Trigger      | Firestore `onDocumentWritten` | Same                                         |

---

## Migration Phases

### Phase 0: AWS Setup (30 min + 24-48hr approval)

> **Owner**: You (AWS Console)
> **Blocker**: Must complete before code testing

#### 0.1 SES Domain Verification

- [ ] Log into AWS Console → SES → Verified Identities
- [ ] Add `ragestate.com` as domain
- [ ] Add DNS records (DKIM, SPF, DMARC) to your domain registrar
- [ ] Wait for verification (usually <1 hour)

#### 0.2 Email Identity Verification

- [ ] Verify `orders@ragestate.com` (for From address)
- [ ] Verify `support@ragestate.com` (for Reply-To)
- [ ] Optional: verify `tickets@ragestate.com` for transfers

#### 0.3 Request Production Access

- [ ] SES → Account dashboard → Request production access
- [ ] Fill out use case:
  ```
  Use case: Transactional emails (purchase confirmations, ticket transfers)
  Expected volume: 1,000-10,000/month
  How you'll handle bounces: SES suppression list + SNS notifications
  ```
- [ ] Wait for approval (24-48 hours typical)

#### 0.4 Create IAM User

- [ ] IAM → Users → Create user: `ragestate-ses-sender`
- [ ] Attach policy: `AmazonSESFullAccess` (or custom policy below)
- [ ] Generate access key + secret
- [ ] Save securely for Secret Manager

**Custom policy (least privilege)**:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["ses:SendEmail", "ses:SendRawEmail"],
      "Resource": "*",
      "Condition": {
        "StringEquals": {
          "ses:FromAddress": [
            "orders@ragestate.com",
            "tickets@ragestate.com",
            "support@ragestate.com"
          ]
        }
      }
    }
  ]
}
```

---

### Phase 1: Add Secrets to Firebase (15 min)

```bash
# Add AWS credentials to Firebase Secret Manager
firebase functions:secrets:set AWS_ACCESS_KEY_ID
# Enter: AKIA...

firebase functions:secrets:set AWS_SECRET_ACCESS_KEY
# Enter: your-secret-key

firebase functions:secrets:set AWS_SES_REGION
# Enter: us-east-1
```

---

### Phase 2: Install AWS SDK (5 min)

```bash
cd functions
npm install @aws-sdk/client-ses
```

---

### Phase 3: Create SES Email Module (30 min)

**New file: `functions/sesEmail.js`**

```javascript
'use strict';

const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');
const logger = require('firebase-functions/logger');

let sesClient;

function getSESClient(region) {
  if (!sesClient) {
    sesClient = new SESClient({
      region: region || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
  }
  return sesClient;
}

/**
 * Send an email via Amazon SES
 * @param {Object} params
 * @param {string} params.to - Recipient email
 * @param {string} params.from - Sender (e.g., 'RAGESTATE <orders@ragestate.com>')
 * @param {string} params.replyTo - Reply-to address
 * @param {string} params.subject - Email subject
 * @param {string} params.text - Plain text body
 * @param {string} params.html - HTML body
 * @param {string} [params.region] - AWS region (default: us-east-1)
 * @returns {Promise<{messageId: string}>}
 */
async function sendEmail({ to, from, replyTo, subject, text, html, region }) {
  const client = getSESClient(region);

  // Parse "Name <email>" format
  const fromMatch = from.match(/^(.+?)\s*<(.+)>$/);
  const fromAddress = fromMatch ? fromMatch[2] : from;

  const command = new SendEmailCommand({
    Source: from,
    Destination: {
      ToAddresses: Array.isArray(to) ? to : [to],
    },
    ReplyToAddresses: replyTo ? [replyTo] : undefined,
    Message: {
      Subject: { Data: subject, Charset: 'UTF-8' },
      Body: {
        Text: text ? { Data: text, Charset: 'UTF-8' } : undefined,
        Html: html ? { Data: html, Charset: 'UTF-8' } : undefined,
      },
    },
  });

  const response = await client.send(command);

  logger.info('SES email sent', {
    messageId: response.MessageId,
    to,
    from: fromAddress,
    subject,
  });

  return { messageId: response.MessageId };
}

/**
 * Send a bulk email (up to 50 recipients per call)
 * For marketing campaigns
 */
async function sendBulkEmail({ recipients, from, replyTo, subject, text, html, region }) {
  // SES allows up to 50 recipients per SendEmail call
  // For larger lists, batch into chunks
  const chunks = [];
  for (let i = 0; i < recipients.length; i += 50) {
    chunks.push(recipients.slice(i, i + 50));
  }

  const results = [];
  for (const chunk of chunks) {
    const result = await sendEmail({
      to: chunk,
      from,
      replyTo,
      subject,
      text,
      html,
      region,
    });
    results.push(result);
  }

  return results;
}

module.exports = {
  sendEmail,
  sendBulkEmail,
  getSESClient,
};
```

---

### Phase 4: Update Email Function (30 min)

**Modified: `functions/email.js`**

```javascript
/* eslint-disable */
'use strict';

const { onDocumentWritten } = require('firebase-functions/v2/firestore');
const { defineSecret } = require('firebase-functions/params');
const logger = require('firebase-functions/logger');
const { sendEmail } = require('./sesEmail');

// AWS Secrets
const AWS_ACCESS_KEY_ID = defineSecret('AWS_ACCESS_KEY_ID');
const AWS_SECRET_ACCESS_KEY = defineSecret('AWS_SECRET_ACCESS_KEY');
const AWS_SES_REGION = defineSecret('AWS_SES_REGION');

// Keep Stripe for recipient lookup
const STRIPE_SECRET = defineSecret('STRIPE_SECRET');

// Feature flag: set to 'resend' to rollback
const EMAIL_PROVIDER = process.env.EMAIL_PROVIDER || 'ses';

// Legacy Resend support (for rollback)
const RESEND_API_KEY = defineSecret('RESEND_API_KEY');

let stripeClient;
function getStripe() {
  const key = STRIPE_SECRET.value() || process.env.STRIPE_SECRET;
  if (!key) return null;
  if (!stripeClient || stripeClient._apiKey !== key) {
    stripeClient = require('stripe')(key);
    stripeClient._apiKey = key;
  }
  return stripeClient;
}

exports.sendPurchaseEmail = onDocumentWritten(
  {
    region: 'us-central1',
    document: 'fulfillments/{piId}',
    secrets: [
      AWS_ACCESS_KEY_ID,
      AWS_SECRET_ACCESS_KEY,
      AWS_SES_REGION,
      STRIPE_SECRET,
      RESEND_API_KEY,
    ],
    retry: true,
  },
  async (event) => {
    const before = event.data?.before;
    const after = event.data?.after;
    if (!after?.exists) return;

    const prev = before?.data() || {};
    const curr = after.data() || {};
    const piId = event.params.piId;

    const prevStatus = (prev.status || '').toLowerCase();
    const currStatus = (curr.status || '').toLowerCase();

    if (curr.emailSentAt) {
      logger.debug('Email already sent', { piId });
      return;
    }
    if (currStatus !== 'completed' || prevStatus === 'completed') {
      logger.debug('Not a completed transition; skipping', { piId, prevStatus, currStatus });
      return;
    }

    // Resolve recipient email (existing logic unchanged)
    let recipient = curr.email || curr.userEmail || '';
    if (!recipient) {
      try {
        const stripe = getStripe();
        if (stripe) {
          const pi = await stripe.paymentIntents.retrieve(piId);
          recipient =
            pi?.receipt_email ||
            pi?.charges?.data?.[0]?.billing_details?.email ||
            pi?.metadata?.email ||
            '';
          if (!recipient && pi?.customer) {
            try {
              const customer = await stripe.customers.retrieve(pi.customer);
              recipient = customer?.email || '';
            } catch (_) {}
          }
        }
      } catch (e) {
        logger.warn('Stripe lookup for recipient failed (non-fatal)', { piId, error: String(e) });
      }
    }

    if (!recipient) {
      logger.warn('Missing recipient email on fulfillment; cannot send', { piId });
      return;
    }

    // Build items list (existing logic unchanged)
    const items = Array.isArray(curr.items)
      ? curr.items
      : Array.isArray(curr.details)
        ? curr.details
        : Array.isArray(curr.createdTickets)
          ? curr.createdTickets
          : [];

    const toTitle = (i) => i.title || i.name || i.eventId || i.productId || 'Item';
    const toQty = (i) => i.quantity || i.qty || i.selectedQuantity || i.ticketQuantity || 1;

    const itemsRowsHtml = items
      .map(
        (i) => `
          <tr>
            <td style="padding:8px 0;color:#111;font-size:14px;line-height:20px">${toTitle(i)}</td>
            <td style="padding:8px 0;color:#111;font-size:14px;line-height:20px;text-align:right">× ${toQty(i)}</td>
          </tr>`,
      )
      .join('');

    const orderNumber = curr.orderNumber || curr.details?.[0]?.orderNumber || piId;
    const amountCents = typeof curr.amount === 'number' ? curr.amount : 0;
    const currency = (curr.currency || 'usd').toUpperCase();
    const fmtTotal = amountCents
      ? new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amountCents / 100)
      : '';

    const emailContent = {
      from: 'RAGESTATE <orders@ragestate.com>',
      replyTo: 'support@ragestate.com',
      to: recipient,
      subject: `Your tickets — ${orderNumber}`,
      text: `Thanks for your purchase!\nOrder: ${orderNumber}\n${items
        .map((i) => `• ${toTitle(i)} × ${toQty(i)}`)
        .join(
          '\n',
        )}\n${fmtTotal ? `Total: ${fmtTotal}\n` : ''}View tickets: https://ragestate.com/account`,
      html: buildPurchaseEmailHtml({ orderNumber, itemsRowsHtml, fmtTotal }),
    };

    try {
      let result;
      let provider;

      if (EMAIL_PROVIDER === 'ses') {
        // === AMAZON SES ===
        process.env.AWS_ACCESS_KEY_ID = AWS_ACCESS_KEY_ID.value();
        process.env.AWS_SECRET_ACCESS_KEY = AWS_SECRET_ACCESS_KEY.value();

        result = await sendEmail({
          ...emailContent,
          region: AWS_SES_REGION.value() || 'us-east-1',
        });
        provider = 'ses';
      } else {
        // === RESEND (fallback) ===
        const { Resend } = require('resend');
        const resend = new Resend(RESEND_API_KEY.value());
        result = await resend.emails.send({
          from: emailContent.from,
          reply_to: emailContent.replyTo,
          to: emailContent.to,
          subject: emailContent.subject,
          text: emailContent.text,
          html: emailContent.html,
        });
        provider = 'resend';
      }

      await after.ref.update({
        emailSentAt: new Date(),
        emailProvider: provider,
        emailMessageId: result?.messageId || result?.data?.id || null,
        email: curr.email || recipient,
      });

      logger.info('Purchase email sent', { piId, recipient, orderNumber, provider });
    } catch (err) {
      logger.error('Purchase email failed', { piId, recipient, orderNumber, error: String(err) });
      throw err;
    }
  },
);

// Extracted HTML template for reuse
function buildPurchaseEmailHtml({ orderNumber, itemsRowsHtml, fmtTotal }) {
  return `
    <div style="background:#f6f6f6;padding:24px 0">
      <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #eee;font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif">
        <div style="display:none;max-height:0;overflow:hidden">Your tickets are ready — order ${orderNumber}</div>
        <div style="padding:16px 24px;background:#000;color:#fff;text-align:center">
          <img src="https://firebasestorage.googleapis.com/v0/b/ragestate-app.appspot.com/o/RSLogo2.png?alt=media&token=d13ebc08-9d8d-4367-99ec-ace3627132d2" alt="RAGESTATE" width="120" style="display:inline-block;border:0;outline:none;text-decoration:none;height:auto" />
        </div>
        <div style="height:3px;background:#E12D39"></div>
        <div style="padding:24px">
          <h2 style="margin:0 0 8px;font-size:18px;color:#111">Thanks for your purchase!</h2>
          <p style="margin:0 0 12px;color:#111;font-size:14px;line-height:20px">Order <b>${orderNumber}</b></p>
          ${itemsRowsHtml ? `<table style="width:100%;border-collapse:collapse;margin:8px 0 16px">${itemsRowsHtml}</table>` : ''}
          ${fmtTotal ? `<p style="margin:0 0 16px;color:#111;font-size:14px;line-height:20px"><b>Total: ${fmtTotal}</b></p>` : ''}
          <p style="margin:0 0 16px;color:#111;font-size:14px;line-height:20px">Your tickets are now in your account.</p>
          <div style="margin:0 0 8px">
            <a href="https://ragestate.com/account" style="display:inline-block;background:#E12D39;color:#fff;text-decoration:none;padding:10px 14px;border-radius:6px;font-size:14px">View my tickets</a>
          </div>
          <p style="margin:12px 0 0;color:#6b7280;font-size:12px;line-height:18px">If you didn't make this purchase, please reply to this email.</p>
        </div>
        <div style="padding:16px 24px;border-top:1px solid #eee;color:#6b7280;font-size:12px;line-height:18px;text-align:center">
          <p style="margin:0">This is a transactional email for your RAGESTATE purchase.</p>
        </div>
      </div>
    </div>
  `;
}
```

---

### Phase 5: Testing (30 min)

#### 5.1 Sandbox Testing (Before Production Access)

```bash
# Verify a test email address in SES Console
# Then test locally with emulator
cd functions
npm run serve

# Trigger a test fulfillment update
# Email will only send to verified addresses in sandbox
```

#### 5.2 Production Testing

```bash
# After production access is granted
firebase deploy --only functions:sendPurchaseEmail

# Make a test purchase or manually update a fulfillment doc
# Verify email arrives in inbox (not spam)
```

#### 5.3 Rollback Test

```bash
# Set environment variable to rollback
firebase functions:config:set email.provider="resend"
firebase deploy --only functions:sendPurchaseEmail
```

---

### Phase 6: Cleanup (Post-Migration)

- [ ] Remove `RESEND_API_KEY` from Secret Manager (after 30 days stable)
- [ ] Remove `resend` from `package.json`
- [ ] Remove Resend fallback code from `email.js`
- [ ] Update any documentation referencing Resend

---

## Email Templates (Future)

### Ticket Transfer Claim Email

```javascript
// functions/templates/ticketTransferEmail.js
function buildTicketTransferEmail({ senderName, eventName, eventDate, claimUrl }) {
  return {
    subject: `🎫 ${senderName} sent you a ticket to ${eventName}`,
    text: `${senderName} transferred a ticket to you for ${eventName} on ${eventDate}.\n\nClaim your ticket: ${claimUrl}`,
    html: `
      <div style="background:#f6f6f6;padding:24px 0">
        <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #eee;font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif">
          <div style="padding:16px 24px;background:#000;color:#fff;text-align:center">
            <img src="https://firebasestorage.googleapis.com/v0/b/ragestate-app.appspot.com/o/RSLogo2.png?alt=media&token=d13ebc08-9d8d-4367-99ec-ace3627132d2" alt="RAGESTATE" width="120" />
          </div>
          <div style="height:3px;background:#E12D39"></div>
          <div style="padding:24px">
            <h2 style="margin:0 0 8px;font-size:18px;color:#111">🎫 You received a ticket!</h2>
            <p style="margin:0 0 16px;color:#111;font-size:14px;line-height:20px">
              <b>${senderName}</b> sent you a ticket to <b>${eventName}</b> on ${eventDate}.
            </p>
            <div style="margin:0 0 16px">
              <a href="${claimUrl}" style="display:inline-block;background:#E12D39;color:#fff;text-decoration:none;padding:12px 20px;border-radius:6px;font-size:14px;font-weight:600">Claim Your Ticket</a>
            </div>
            <p style="margin:0;color:#6b7280;font-size:12px;line-height:18px">This link expires in 72 hours.</p>
          </div>
        </div>
      </div>
    `,
  };
}

module.exports = { buildTicketTransferEmail };
```

### Marketing Campaign Email

```javascript
// functions/templates/marketingEmail.js
function buildEventAnnouncementEmail({ eventName, eventDate, venue, ctaUrl, imageUrl }) {
  return {
    subject: `🔥 ${eventName} — Tickets Now Available`,
    // ... HTML template with event details, image, CTA button
  };
}

module.exports = { buildEventAnnouncementEmail };
```

---

## Monitoring & Deliverability

### SES Dashboard Metrics

- [ ] Monitor bounce rate (keep < 5%)
- [ ] Monitor complaint rate (keep < 0.1%)
- [ ] Set up CloudWatch alarms for failures

### SNS Notifications (Optional)

- [ ] Create SNS topic for bounces/complaints
- [ ] Subscribe Lambda or webhook to handle events
- [ ] Auto-suppress bounced addresses

### Suppression List

- [ ] Enable account-level suppression list in SES
- [ ] Bounced emails automatically suppressed
- [ ] Can manually add/remove addresses

---

## Dependency on Ticket Transfer

You're correct — **complete this migration before Phase 2.2a**.

### Why?

1. **Volume increase**: Each transfer sends 2-3 emails (sender confirmation, recipient claim, claimed notification)
2. **New template needed**: Claim link email doesn't exist in Resend
3. **Testing**: Better to test SES with existing purchase flow first
4. **No limit worries**: Can test transfers without hitting Resend's 3K cap

### Recommended Sequence

```
Week 1:
├── Day 1-2: AWS Setup (Phase 0) ← You
├── Day 2: Code Migration (Phase 1-4) ← Me
├── Day 3: Testing (Phase 5)
└── Day 3: Deploy to production

Week 2+:
└── Begin Phase 2.2a: Ticket Transfer MVP
    └── Uses SES for claim emails
```

---

## Checklist Summary

### AWS Setup (You)

- [ ] Create/access AWS account
- [ ] Verify `ragestate.com` domain in SES
- [ ] Verify sender email addresses
- [ ] Request production access
- [ ] Create IAM user with SES permissions
- [ ] Generate access key + secret

### Code Migration (Me)

- [ ] Add AWS secrets to Firebase
- [ ] Install `@aws-sdk/client-ses`
- [ ] Create `functions/sesEmail.js` module
- [ ] Update `functions/email.js` with SES support
- [ ] Add feature flag for rollback
- [ ] Test in sandbox mode
- [ ] Deploy to production

### Post-Migration

- [ ] Monitor for 7 days
- [ ] Remove Resend fallback code
- [ ] Delete Resend API key from secrets
- [ ] Create ticket transfer email template

---

## Questions?

1. **Which AWS region?** Recommend `us-east-1` for best deliverability
2. **Existing AWS account?** Or need to create new?
3. **DNS access?** Who manages `ragestate.com` DNS? (Needed for domain verification)

Let me know when AWS setup is complete and I'll implement the code changes!
