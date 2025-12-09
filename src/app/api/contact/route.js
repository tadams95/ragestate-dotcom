import { NextResponse } from 'next/server';
import { Resend } from 'resend';

// Rate limiting store (in production, use Redis or similar)
const rateLimitStore = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS = 3; // 3 requests per minute

function checkRateLimit(ip) {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW;

  if (!rateLimitStore.has(ip)) {
    rateLimitStore.set(ip, []);
  }

  const requests = rateLimitStore.get(ip).filter((timestamp) => timestamp > windowStart);
  rateLimitStore.set(ip, requests);

  if (requests.length >= MAX_REQUESTS) {
    return false;
  }

  requests.push(now);
  rateLimitStore.set(ip, requests);
  return true;
}

export async function POST(request) {
  try {
    // Get IP for rate limiting
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0] ||
      request.headers.get('x-real-ip') ||
      'unknown';

    // Check rate limit
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again in a minute.' },
        { status: 429 },
      );
    }

    const body = await request.json();
    const { name, email, subject, message } = body;

    // Validate required fields
    if (!name?.trim() || !email?.trim() || !message?.trim()) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    // Validate message length
    if (message.length > 5000) {
      return NextResponse.json(
        { error: 'Message too long (max 5000 characters)' },
        { status: 400 },
      );
    }

    // Map subject to readable format
    const subjectMap = {
      general: 'General Inquiry',
      support: 'Customer Support',
      business: 'Business / Partnerships',
      events: 'Events & Bookings',
      press: 'Press & Media',
    };
    const subjectLine = subjectMap[subject] || 'General Inquiry';

    // Log the contact submission
    console.log('[Contact Form Submission]', {
      timestamp: new Date().toISOString(),
      name: name.trim(),
      email: email.trim(),
      subject: subjectLine,
      messagePreview: message.slice(0, 100) + (message.length > 100 ? '...' : ''),
    });

    // Send email via Resend
    if (process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);

      await resend.emails.send({
        from: 'RAGESTATE Contact <noreply@ragestate.com>',
        to: ['contact@ragestate.com'],
        replyTo: email.trim(),
        subject: `[${subjectLine}] New message from ${name.trim()}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #b91c1c;">New Contact Form Submission</h2>
            <hr style="border: 1px solid #333;" />
            <p><strong>Name:</strong> ${name.trim()}</p>
            <p><strong>Email:</strong> <a href="mailto:${email.trim()}">${email.trim()}</a></p>
            <p><strong>Inquiry Type:</strong> ${subjectLine}</p>
            <hr style="border: 1px solid #333;" />
            <h3>Message:</h3>
            <p style="white-space: pre-wrap; background: #f5f5f5; padding: 16px; border-radius: 8px;">${message.trim()}</p>
            <hr style="border: 1px solid #333;" />
            <p style="color: #666; font-size: 12px;">
              Submitted at ${new Date().toISOString()}<br/>
              Reply directly to this email to respond to the sender.
            </p>
          </div>
        `,
        text: `
New Contact Form Submission
===========================

Name: ${name.trim()}
Email: ${email.trim()}
Inquiry Type: ${subjectLine}

Message:
${message.trim()}

---
Submitted at ${new Date().toISOString()}
Reply directly to this email to respond to the sender.
        `,
      });

      console.log('[Contact Form] Email sent successfully');
    } else {
      console.warn('[Contact Form] RESEND_API_KEY not configured - email not sent');
    }

    return NextResponse.json({ success: true, message: 'Message received successfully' });
  } catch (error) {
    console.error('[Contact API Error]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Only allow POST method
export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
