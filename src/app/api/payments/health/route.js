import { NextResponse } from 'next/server';

// Health check endpoint for the payments proxy
export async function GET() {
  try {
    const stripeUrl = process.env.STRIPE_FN_URL;
    
    if (!stripeUrl) {
      return NextResponse.json({ 
        status: 'error', 
        message: 'STRIPE_FN_URL not configured',
        proxy: 'not configured'
      }, { status: 503 });
    }

    // Test the health endpoint of the Stripe function
    const healthUrl = `${stripeUrl.replace(/\/$/, '')}/health`;
    const response = await fetch(healthUrl, { 
      method: 'GET',
      cache: 'no-store'
    });
    
    if (!response.ok) {
      return NextResponse.json({
        status: 'error',
        message: `Stripe function health check failed: ${response.status}`,
        proxy: 'configured',
        target: healthUrl
      }, { status: response.status });
    }

    const healthData = await response.json().catch(() => ({}));
    
    return NextResponse.json({
      status: 'ok',
      message: 'Payments proxy is working',
      proxy: 'configured',
      target: healthUrl,
      stripe: healthData
    });
    
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      message: error.message,
      proxy: 'error'
    }, { status: 500 });
  }
}