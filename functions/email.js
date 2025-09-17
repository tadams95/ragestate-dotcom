/* eslint-disable */
'use strict';

const { onDocumentWritten } = require('firebase-functions/v2/firestore');
const { defineSecret } = require('firebase-functions/params');
const logger = require('firebase-functions/logger');
const { Resend } = require('resend');

const RESEND_API_KEY = defineSecret('RESEND_API_KEY');
const STRIPE_SECRET = defineSecret('STRIPE_SECRET');

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
    secrets: [RESEND_API_KEY, STRIPE_SECRET],
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

    // Resolve recipient email
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

    // Build items list from available fields
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

    const resend = new Resend(RESEND_API_KEY.value());

    try {
      const result = await resend.emails.send({
        from: 'RAGESTATE <orders@ragestate.com>',
        reply_to: 'support@ragestate.com',
        to: recipient,
        subject: `Your tickets — ${orderNumber}`,
        text: `Thanks for your purchase!\nOrder: ${orderNumber}\n${items
          .map((i) => `• ${toTitle(i)} × ${toQty(i)}`)
          .join(
            '\n',
          )}\n${fmtTotal ? `Total: ${fmtTotal}\n` : ''}View tickets: https://ragestate.com/account`,
        html: `
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
                ${
                  itemsRowsHtml
                    ? `<table style="width:100%;border-collapse:collapse;margin:8px 0 16px">${itemsRowsHtml}</table>`
                    : ''
                }
                ${fmtTotal ? `<p style="margin:0 0 16px;color:#111;font-size:14px;line-height:20px"><b>Total: ${fmtTotal}</b></p>` : ''}
                <p style="margin:0 0 16px;color:#111;font-size:14px;line-height:20px">Your tickets are now in your account.</p>
                <div style="margin:0 0 8px">
                  <a href="https://ragestate.com/account" style="display:inline-block;background:#E12D39;color:#fff;text-decoration:none;padding:10px 14px;border-radius:6px;font-size:14px">View my tickets</a>
                </div>
                <p style="margin:12px 0 0;color:#6b7280;font-size:12px;line-height:18px">If you didn’t make this purchase, please reply to this email.</p>
              </div>
              <div style="padding:16px 24px;border-top:1px solid #eee;color:#6b7280;font-size:12px;line-height:18px;text-align:center">
                <p style="margin:0">This is a transactional email for your RAGESTATE purchase.</p>
              </div>
            </div>
          </div>
        `,
      });

      await after.ref.update({
        emailSentAt: new Date(),
        emailProvider: 'resend',
        emailMessageId: result?.data?.id || null,
        email: curr.email || recipient, // backfill for future triggers
      });

      logger.info('Purchase email sent', { piId, recipient, orderNumber });
    } catch (err) {
      logger.error('Purchase email failed', { piId, recipient, orderNumber, error: String(err) });
      throw err;
    }
  },
);
