export const config = {
  runtime: 'edge',
};

/**
 * Vercel Edge Function — NOWPayments Invoice Proxy
 * Creates a NOWPayments invoice and returns the checkout URL.
 * API Key is kept server-side for security.
 * 
 * POST /api/nowpayments
 * Body: { price_amount, pay_currency, order_id?, buyer_email? }
 */
export default async function handler(req: Request) {
  // CORS headers for frontend
  const origin = req.headers.get('origin') || '';
  const allowedOrigins = ['https://zexai.io', 'https://app.zexai.io', 'http://localhost:5173', 'http://localhost:3000'];
  const safeOrigin = allowedOrigins.includes(origin) ? origin : 'https://zexai.io';

  const corsHeaders = {
    'Access-Control-Allow-Origin': safeOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: corsHeaders,
    });
  }

  try {
    const NOWPAYMENTS_API_KEY = process.env.NOWPAYMENTS_API_KEY;
    if (!NOWPAYMENTS_API_KEY) {
      return new Response(JSON.stringify({ error: 'NOWPayments API key is not configured' }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    const data = await req.json();
    const { price_amount, pay_currency, order_id, buyer_email, buyer_wallet } = data;

    // Validate buyer wallet if provided
    if (buyer_wallet && !/^0x[a-fA-F0-9]{40}$/.test(buyer_wallet)) {
      return new Response(JSON.stringify({ error: 'Invalid wallet address' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    // Validation
    if (!price_amount || price_amount <= 0) {
      return new Response(JSON.stringify({ error: 'Invalid price_amount' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    if (price_amount < 1) {
      return new Response(JSON.stringify({ error: 'Minimum payment amount is $1 USD' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    if (price_amount > 50000) {
      return new Response(JSON.stringify({ error: 'Maximum payment amount is $50,000 USD' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    // Determine the base URL from the request for callbacks
    const requestUrl = new URL(req.url);
    const baseUrl = `${requestUrl.protocol}//${requestUrl.host}`;

    // Build the invoice payload
    const invoicePayload: Record<string, any> = {
      price_amount: Number(price_amount),
      price_currency: 'usd',
      order_id: buyer_wallet
        ? `ZEX-${buyer_wallet}-${Date.now()}`
        : (order_id || `ZEX-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`),
      order_description: `ZEX Token Presale Purchase - $${price_amount} USD`,
      ipn_callback_url: `${baseUrl}/api/nowpayments-ipn`,
      success_url: `${baseUrl}/?payment=success`,
      cancel_url: `${baseUrl}/?payment=cancel`,
      is_fee_paid_by_user: false,
      // Payout configuration — receive converted funds as MATIC on Polygon
      payout_currency: 'matic',
    };

    // If a specific pay_currency is provided, include it
    if (pay_currency) {
      invoicePayload.pay_currency = pay_currency;
    }

    // Create invoice via NOWPayments API
    const npResponse = await fetch('https://api.nowpayments.io/v1/invoice', {
      method: 'POST',
      headers: {
        'x-api-key': NOWPAYMENTS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(invoicePayload),
    });

    if (!npResponse.ok) {
      const errorText = await npResponse.text();
      console.error('[NOWPayments] Invoice creation failed:', errorText);
      return new Response(JSON.stringify({ error: 'Failed to create payment invoice', details: errorText }), {
        status: npResponse.status,
        headers: corsHeaders,
      });
    }

    const invoiceData = await npResponse.json();

    // Send admin notification email if Resend is configured
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (RESEND_API_KEY) {
      const fromEmail = process.env.RESEND_FROM_EMAIL || 'info@zexai.io';
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromEmail,
          to: process.env.ADMIN_EMAIL || 'info@zexai.io',
          subject: `🔔 New Crypto Payment Started: $${price_amount} USD via ${pay_currency || 'multi-crypto'}`,
          html: `
            <h2>New NOWPayments Invoice Created</h2>
            <p><strong>Invoice ID:</strong> ${invoiceData.id}</p>
            <p><strong>Amount:</strong> $${price_amount} USD</p>
            <p><strong>Pay Currency:</strong> ${pay_currency || 'User will select'}</p>
            <p><strong>Order ID:</strong> ${invoicePayload.order_id}</p>
            ${buyer_email ? `<p><strong>Buyer Email:</strong> ${buyer_email}</p>` : ''}
            <p><strong>Status:</strong> Awaiting payment</p>
            <hr/>
            <p><small>ZexAI NOWPayments System</small></p>
          `,
        }),
      }).catch((err: any) => console.error('[NOWPayments] Admin notification failed:', err));
    }

    return new Response(JSON.stringify({
      success: true,
      invoice_id: invoiceData.id,
      invoice_url: invoiceData.invoice_url,
      order_id: invoicePayload.order_id,
    }), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (error: any) {
    console.error('[NOWPayments] Edge function error:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: corsHeaders,
    });
  }
}
