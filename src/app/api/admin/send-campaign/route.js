import { NextResponse } from 'next/server';
import { authAdmin, firestoreAdmin } from '../../../../../lib/server/firebaseAdmin';
import { userIsAdmin } from '../../../../../lib/server/isAdmin';

function err(code, message, status = 400, extra = {}) {
  return NextResponse.json({ ok: false, code, message, ...extra }, { status });
}

// HTML escape to prevent injection
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * POST /api/admin/send-campaign
 * Send a marketing email campaign to captured emails via SES Cloud Function
 */
export async function POST(req) {
  try {
    // Verify auth
    const authHeader = req.headers.get('authorization') || '';
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!idToken) return err('UNAUTHENTICATED', 'Missing bearer token', 401);

    let decoded;
    try {
      decoded = await authAdmin.verifyIdToken(idToken);
    } catch (e) {
      return err('UNAUTHENTICATED', 'Invalid token', 401);
    }

    if (!(await userIsAdmin(decoded.uid))) {
      return err('FORBIDDEN', 'Not an admin', 403);
    }

    const body = await req.json().catch(() => null);
    if (!body) return err('INVALID_JSON', 'Malformed JSON body');

    const { subject, message, recipients, filterSource, filterEventId, idempotencyKey } = body;

    // Validate required fields
    if (!subject || typeof subject !== 'string' || !subject.trim()) {
      return err('SUBJECT_REQUIRED', 'Subject is required');
    }
    if (!message || typeof message !== 'string' || !message.trim()) {
      return err('MESSAGE_REQUIRED', 'Message is required');
    }
    if (!Array.isArray(recipients) || recipients.length === 0) {
      return err('RECIPIENTS_REQUIRED', 'At least one recipient is required');
    }

    // Validate email format for all recipients
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const validRecipients = recipients.filter((r) => emailRegex.test(r));
    if (validRecipients.length === 0) {
      return err('INVALID_RECIPIENTS', 'No valid email addresses provided');
    }

    // Duplicate send prevention: check if same campaign was sent in last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const recentCampaigns = await firestoreAdmin
      .collection('campaignLogs')
      .where('sentBy', '==', decoded.uid)
      .where('subject', '==', subject.trim())
      .where('sentAt', '>', fiveMinutesAgo)
      .limit(1)
      .get();

    if (!recentCampaigns.empty) {
      return err(
        'DUPLICATE_CAMPAIGN',
        'A campaign with this subject was sent in the last 5 minutes. Please wait before resending.',
        429,
      );
    }

    // Escape HTML in message content
    const escapedSubject = escapeHtml(subject.trim());
    const escapedMessage = escapeHtml(message.trim());

    // Build the email content with escaped values
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapedSubject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0a0a0a;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #111; border-radius: 8px; border: 1px solid #222;">
          <tr>
            <td style="padding: 32px 24px; text-align: center; border-bottom: 1px solid #222;">
              <img src="https://ragestate.com/assets/RSLogo2.png" alt="RAGESTATE" width="150" style="display: block; margin: 0 auto;">
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 24px; color: #f5f5f5; font-size: 16px; line-height: 1.6;">
              ${escapedMessage
                .split('\n')
                .map((line) => `<p style="margin: 0 0 16px 0;">${line || '&nbsp;'}</p>`)
                .join('')}
            </td>
          </tr>
          <tr>
            <td style="padding: 24px; text-align: center; border-top: 1px solid #222;">
              <a href="https://ragestate.com/events" style="display: inline-block; background-color: #dc2626; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600;">View Events</a>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px; text-align: center; color: #666; font-size: 12px; border-top: 1px solid #222;">
              <p style="margin: 0 0 8px 0;">— RAGESTATE Team</p>
              <p style="margin: 0;">
                To unsubscribe, reply to this email or contact <a href="mailto:support@ragestate.com" style="color: #888;">support@ragestate.com</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();

    const textContent = `${message}\n\n— RAGESTATE Team\nhttps://ragestate.com/events\n\nTo unsubscribe, reply to this email or contact support@ragestate.com`;

    // Call the Cloud Function to send the campaign
    const fnUrl =
      process.env.STRIPE_FN_URL ||
      `https://us-central1-ragestate-app.cloudfunctions.net/stripePayment`;
    const proxyKey = process.env.PROXY_KEY;

    const res = await fetch(`${fnUrl}/send-campaign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(proxyKey && { 'x-proxy-key': proxyKey }),
      },
      body: JSON.stringify({
        subject: subject.trim(),
        text: textContent,
        html: htmlContent,
        recipients: validRecipients,
      }),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.ok) {
      console.error('Campaign send failed:', json);
      return err('SEND_FAILED', json.error || 'Failed to send campaign', 500);
    }

    // Log the campaign in Firestore for audit
    try {
      await firestoreAdmin.collection('campaignLogs').add({
        subject: subject.trim(),
        recipientCount: validRecipients.length,
        filterSource: filterSource || null,
        filterEventId: filterEventId || null,
        sentBy: decoded.uid,
        sentByEmail: decoded.email || null,
        sentAt: new Date(),
        messageIds: json.messageIds || [],
      });
    } catch (logErr) {
      console.warn('Failed to log campaign (non-fatal):', logErr);
    }

    return NextResponse.json({
      ok: true,
      sent: validRecipients.length,
      messageIds: json.messageIds || [],
    });
  } catch (e) {
    console.error('SEND_CAMPAIGN_ERROR', e);
    return err('INTERNAL', 'Unexpected error', 500);
  }
}
