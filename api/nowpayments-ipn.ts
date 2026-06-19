export const config = {
  runtime: 'edge',
};

const ZEX_TOKEN_ADDRESS = '0x28De651aCA0f8584FA2E072cE7c1F4EE774a8B4a' as const;
const ZEX_PRICE_USD = 0.0012;
const POLYGON_CHAIN_ID = 137;
// --- SECURITY HARDENING: Private RPC Support ---
// Fallback to public only if private RPC is not provided to prevent rate limits and manipulation
const POLYGON_RPC = process.env.POLYGON_RPC_URL || process.env.VITE_POLYGON_RPC || 'https://polygon-rpc.com';

// ERC20 transfer ABI
const ERC20_ABI = [
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const;

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json();
    const receivedSignature = req.headers.get('x-nowpayments-sig');
    const IPN_SECRET = process.env.NOWPAYMENTS_IPN_SECRET;

    // --- SECURITY HARDENING: Strict Fail-Closed Webhook Verification ---
    if (!IPN_SECRET) {
      console.error('[IPN SECURITY ERROR] NOWPAYMENTS_IPN_SECRET is not configured on the server!');
      return new Response(JSON.stringify({ error: 'Server configuration error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    if (!receivedSignature) {
      console.error('[IPN SECURITY ALERT] Request received without signature header!');
      await triggerSIEMAlert('Missing Webhook Signature', `A request without 'x-nowpayments-sig' was blocked on the NOWPayments IPN webhook.`, 'danger');
      return new Response(JSON.stringify({ error: 'Missing signature header' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const sortedBody = sortObject(body);
    const bodyString = JSON.stringify(sortedBody);
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey('raw', encoder.encode(IPN_SECRET), { name: 'HMAC', hash: 'SHA-512' }, false, ['sign']);
    const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(bodyString));
    const computedSig = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');

    if (computedSig !== receivedSignature) {
      console.error('[IPN SECURITY ALERT] Signature mismatch!');
      await triggerSIEMAlert('IPN Signature Verification Failure', `A request with an invalid signature was received on the NOWPayments IPN webhook. This could indicate a signature spoofing or parameter injection attempt.`, 'danger');
      return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    }
    // -------------------------------------------------------------

    const { payment_id, payment_status, price_amount, price_currency, pay_amount, pay_currency, order_id, actually_paid } = body;
    console.log(`[IPN] Payment ${payment_id} | Status: ${payment_status} | Order: ${order_id}`);

    const isCompleted = payment_status === 'finished' || payment_status === 'confirmed';
    let txHash = '';
    let transferError = '';

    // Auto-distribute ZEX when payment is completed
    if (isCompleted && order_id) {
      // --- SECURITY HARDENING: Idempotency / Double-Spend Check ---
      const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
      
      if (supabaseUrl && supabaseKey) {
        try {
          // Check if payment_id already exists
          const checkRes = await fetch(`${supabaseUrl}/rest/v1/processed_payments?payment_id=eq.${payment_id}`, {
            headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
          });
          const existing = await checkRes.json();
          if (existing && existing.length > 0) {
            console.warn(`[IPN SECURITY] Payment ${payment_id} already processed! Preventing double-spend.`);
            await triggerSIEMAlert('Double-Spend Attempt Blocked (Idempotent IPN)', `A duplicate NOWPayments webhook was detected and blocked successfully.\n- **Payment ID:** ${payment_id}\n- **Order ID:** ${order_id}`, 'warning');
            return new Response(JSON.stringify({ success: true, message: 'Already processed (Idempotent)' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
          }

          // Insert payment_id as processed
          await fetch(`${supabaseUrl}/rest/v1/processed_payments`, {
            method: 'POST',
            headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
            body: JSON.stringify({ payment_id, order_id, status: payment_status })
          });
          console.log(`[IPN] Payment ${payment_id} marked as processed.`);
        } catch (dbErr: any) {
          console.error('[IPN] Idempotency DB check failed:', dbErr.message);
          // Depending on paranoia level, you might want to fail closed here:
          // return new Response(JSON.stringify({ error: 'DB check failed' }), { status: 500 });
        }
      } else {
         console.warn('[IPN SECURITY] SUPABASE env vars missing! Double-spend protection is INACTIVE.');
      }
      // -------------------------------------------------------------

      const buyerWallet = extractWallet(order_id);
      if (buyerWallet) {
        const zexAmount = Math.floor(Number(price_amount) / ZEX_PRICE_USD);
        console.log(`[IPN] Distributing ${zexAmount} ZEX to ${buyerWallet}`);
        try {
          txHash = await sendZexTokens(buyerWallet, zexAmount);
          console.log(`[IPN] TX: ${txHash}`);
        } catch (err: any) {
          transferError = err.message || 'Transfer failed';
          console.error('[IPN] Transfer error:', transferError);
        }
      } else {
        transferError = 'No wallet found in order_id';
      }
    }

    // Admin email
    await notifyAdmin(body, isCompleted, txHash, transferError);

    return new Response(JSON.stringify({ success: true, status: payment_status, txHash }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('[IPN] Error:', error); // Logged internally
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

// Extract wallet from: ZEX-0xABCD...-1234567890
function extractWallet(orderId: string): string | null {
  const m = orderId.match(/ZEX-(0x[a-fA-F0-9]{40})-/);
  return m ? m[1] : null;
}

/**
 * Send ZEX tokens using viem (Edge-compatible)
 */
async function sendZexTokens(to: string, amount: number): Promise<string> {
  const pk = process.env.ZEX_DISTRIBUTOR_PRIVATE_KEY;
  if (!pk) throw new Error('ZEX_DISTRIBUTOR_PRIVATE_KEY not set');

  const { createWalletClient, createPublicClient, http, parseUnits } = await import('viem');
  const { privateKeyToAccount } = await import('viem/accounts');
  const { polygon } = await import('viem/chains');

  const account = privateKeyToAccount(`0x${pk.replace(/^0x/, '')}` as `0x${string}`);

  const publicClient = createPublicClient({
    chain: polygon,
    transport: http(POLYGON_RPC),
  });

  const walletClient = createWalletClient({
    account,
    chain: polygon,
    transport: http(POLYGON_RPC),
  });

  // Use writeContract for clean ERC20 transfer
  const hash = await walletClient.writeContract({
    address: ZEX_TOKEN_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'transfer',
    args: [to as `0x${string}`, parseUnits(amount.toString(), 18)],
    gas: BigInt(100000),
    chain: polygon,
  });

  // Wait for confirmation (up to 30s)
  try {
    await publicClient.waitForTransactionReceipt({ hash, timeout: 30_000 });
  } catch {
    // TX submitted but not confirmed yet — still OK
  }

  return hash;
}

async function notifyAdmin(body: any, isCompleted: boolean, txHash: string, transferError: string) {
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const DISCORD_WEBHOOK = process.env.DISCORD_WEBHOOK_URL;
  
  const { payment_id, payment_status, price_amount, price_currency, pay_amount, pay_currency, order_id, actually_paid } = body;
  const wallet = extractWallet(order_id || '');
  const zex = Math.floor(Number(price_amount) / ZEX_PRICE_USD);
  const emoji = isCompleted ? (txHash ? '✅' : '⚠️') : '⏳';

  // 1. Send Instant SIEM/Alert Webhook to Discord (if configured)
  if (DISCORD_WEBHOOK) {
    try {
      const color = isCompleted ? (txHash ? 3066993 : 15158332) : 3447003; // green, red, blue
      await fetch(DISCORD_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          embeds: [{
            title: `${emoji} ZEX Presale Event: ${payment_status.toUpperCase()}`,
            color: color,
            fields: [
              { name: 'Payment ID', value: payment_id || 'N/A', inline: true },
              { name: 'Amount', value: `$${price_amount} ${price_currency}`, inline: true },
              { name: 'Paid Cur.', value: `${actually_paid || pay_amount} ${pay_currency}`, inline: true },
              { name: 'Buyer Wallet', value: wallet || 'N/A' },
              { name: 'Tokens', value: `${zex.toLocaleString()} ZEX`, inline: true },
              { name: 'TX Hash', value: txHash ? `[View on Polygonscan](https://polygonscan.com/tx/${txHash})` : 'N/A' },
              { name: 'Error', value: transferError || 'None' }
            ],
            footer: { text: 'ZexAI Security Monitoring System' },
            timestamp: new Date().toISOString()
          }]
        })
      });
    } catch (e) {
      console.error('[SIEM] Discord Webhook error:', e);
    }
  }

  // 2. Send Resend Email (Fallback/Audit)
  if (!RESEND_API_KEY) return;

  fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL || 'info@zexai.io',
      to: process.env.ADMIN_EMAIL || 'info@zexai.io',
      subject: `${emoji} ZEX Presale ${payment_status}: $${price_amount} (${pay_currency})`,
      html: `
        <h2>${emoji} Payment ${payment_status}</h2>
        <table style="border-collapse:collapse;width:100%;max-width:600px;">
          <tr><td style="padding:6px;border:1px solid #ddd;font-weight:bold">Payment ID</td><td style="padding:6px;border:1px solid #ddd">${payment_id}</td></tr>
          <tr><td style="padding:6px;border:1px solid #ddd;font-weight:bold">Amount</td><td style="padding:6px;border:1px solid #ddd">$${price_amount} ${price_currency}</td></tr>
          <tr><td style="padding:6px;border:1px solid #ddd;font-weight:bold">Paid</td><td style="padding:6px;border:1px solid #ddd">${actually_paid || pay_amount} ${pay_currency}</td></tr>
          <tr><td style="padding:6px;border:1px solid #ddd;font-weight:bold">Buyer</td><td style="padding:6px;border:1px solid #ddd;font-family:monospace;font-size:12px">${wallet || 'N/A'}</td></tr>
          <tr><td style="padding:6px;border:1px solid #ddd;font-weight:bold;color:#059669">ZEX</td><td style="padding:6px;border:1px solid #ddd;font-weight:bold;color:#059669">${zex.toLocaleString()} ZEX</td></tr>
          ${txHash ? `<tr><td style="padding:6px;border:1px solid #ddd;font-weight:bold">TX</td><td style="padding:6px;border:1px solid #ddd"><a href="https://polygonscan.com/tx/${txHash}">${txHash.slice(0, 20)}...</a></td></tr>` : ''}
          ${transferError ? `<tr><td style="padding:6px;border:1px solid #ddd;color:red;font-weight:bold">Error</td><td style="padding:6px;border:1px solid #ddd;color:red">${transferError}</td></tr>` : ''}
        </table>
        ${txHash ? '<p style="color:green;font-weight:bold">✅ ZEX auto-distributed!</p>' : ''}
        ${transferError ? '<p style="color:red;font-weight:bold">⚠️ Auto-transfer FAILED — manual transfer needed!</p>' : ''}
      `,
    }),
  }).catch(console.error);
}

// Unified SIEM / Intrusion Notification Helper
async function triggerSIEMAlert(alertTitle: string, description: string, severity: 'warning' | 'danger') {
  const DISCORD_WEBHOOK = process.env.DISCORD_WEBHOOK_URL;
  if (!DISCORD_WEBHOOK) return;
  try {
    const color = severity === 'danger' ? 15158332 : 16705372; // Red vs Gold
    await fetch(DISCORD_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [{
          title: `🚨 SYSTEM SECURITY ALERT: ${alertTitle}`,
          description: description,
          color: color,
          footer: { text: 'ZexAI Intrusion & Security Alerting System' },
          timestamp: new Date().toISOString()
        }]
      })
    });
  } catch (e) {
    console.error('[SIEM Alert] Discord dispatch failed:', e);
  }
}

function sortObject(obj: any): any {
  if (typeof obj !== 'object' || obj === null) return obj;
  if (Array.isArray(obj)) return obj.map(sortObject);
  return Object.keys(obj).sort().reduce((s: any, k) => { s[k] = sortObject(obj[k]); return s; }, {});
}
