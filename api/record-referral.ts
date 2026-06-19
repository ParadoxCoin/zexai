export const config = {
  runtime: 'edge',
};

const PRESALE_ADDRESS = "0x3B1029B045D635447EFF6973e95156d9a1285480" as const;
const POLYGON_RPC = process.env.POLYGON_RPC_URL || process.env.VITE_POLYGON_RPC || 'https://polygon-rpc.com';

function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    const body = await req.json();
    const { referrer_wallet, referred_wallet, event_type, zex_amount, tx_hash } = body;

    // Validate basic input types & formats
    if (!referrer_wallet || !referred_wallet || !event_type || !zex_amount) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    if (!isValidAddress(referrer_wallet) || !isValidAddress(referred_wallet)) {
      return new Response(JSON.stringify({ error: 'Invalid wallet address format' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    if (referrer_wallet.toLowerCase() === referred_wallet.toLowerCase()) {
      return new Response(JSON.stringify({ error: 'Referrer and referred wallet cannot be the same' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    if (typeof zex_amount !== 'number' || zex_amount <= 0) {
      return new Response(JSON.stringify({ error: 'Invalid ZEX amount' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      console.warn("Supabase credentials missing for record-referral");
      return new Response(JSON.stringify({ error: 'Server misconfiguration' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    let finalZexAmount = Number(zex_amount);
    let finalEventType = String(event_type);

    if (event_type === 'welcome_bounty') {
      // 1. Enforce hardcoded welcome bounty amount
      finalZexAmount = 50; 

      // 2. Prevent duplicate welcome bounties (one per referred wallet)
      const checkRes = await fetch(`${SUPABASE_URL}/rest/v1/presale_referrals?referred_wallet=eq.${referred_wallet.toLowerCase()}&event_type=eq.welcome_bounty`, {
        headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}` }
      });
      if (checkRes.ok) {
        const existing = await checkRes.json();
        if (existing && existing.length > 0) {
          return new Response(JSON.stringify({ error: 'Welcome bounty already claimed for this wallet' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }
      }
    } else if (event_type === 'purchase_commission') {
      // 1. Require transaction hash
      if (!tx_hash || !/^0x[a-fA-F0-9]{66}$/.test(tx_hash)) {
        return new Response(JSON.stringify({ error: 'Valid transaction hash is required for purchase commission' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }

      // 2. Prevent double-claiming for the same transaction hash
      // We append the tx_hash to the event_type field in the DB to check and enforce uniqueness.
      finalEventType = `purchase_commission:${tx_hash.toLowerCase()}`;
      const checkRes = await fetch(`${SUPABASE_URL}/rest/v1/presale_referrals?event_type=eq.${finalEventType}`, {
        headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}` }
      });
      if (checkRes.ok) {
        const existing = await checkRes.json();
        if (existing && existing.length > 0) {
          return new Response(JSON.stringify({ error: 'Commission already claimed for this transaction hash' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }
      }

      // 3. Verify Polygon Transaction Details & Receipt via JSON-RPC
      try {
        const txDetailsRes = await fetch(POLYGON_RPC, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: "2.0",
            method: "eth_getTransactionByHash",
            params: [tx_hash],
            id: 1
          })
        });

        if (!txDetailsRes.ok) {
          throw new Error('Failed to contact Polygon RPC');
        }

        const txDetailsData = await txDetailsRes.json();
        const tx = txDetailsData.result;

        if (!tx) {
          return new Response(JSON.stringify({ error: 'Transaction hash not found on Polygon chain' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }

        // Verify transaction fields
        const isToPresale = tx.to && tx.to.toLowerCase() === PRESALE_ADDRESS.toLowerCase();
        const isFromReferred = tx.from && tx.from.toLowerCase() === referred_wallet.toLowerCase();

        if (!isToPresale) {
          return new Response(JSON.stringify({ error: 'Transaction target address is not the presale contract' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }

        if (!isFromReferred) {
          return new Response(JSON.stringify({ error: 'Transaction sender does not match the referred user wallet' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }

        // Verify transaction receipt status (success check)
        const txReceiptRes = await fetch(POLYGON_RPC, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: "2.0",
            method: "eth_getTransactionReceipt",
            params: [tx_hash],
            id: 2
          })
        });

        if (!txReceiptRes.ok) {
          throw new Error('Failed to contact Polygon RPC for receipt');
        }

        const txReceiptData = await txReceiptRes.json();
        const receipt = txReceiptData.result;

        if (!receipt || receipt.status !== '0x1') {
          return new Response(JSON.stringify({ error: 'Transaction was not successful or is not yet confirmed' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }

        // Calculate maximum allowed commission: 5% of purchased ZEX value.
        // Formula: POL Value * 333 (ZEX rate) * 0.05 (5% commission)
        const txValueHex = tx.value || '0x0';
        const txValueWei = BigInt(txValueHex);
        const polValue = Number(txValueWei) / 1e18;
        const expectedCommission = polValue * 333 * 0.05;

        // Force amount to expected commission to prevent client-side spoofing / inflation
        finalZexAmount = Math.min(expectedCommission, Number(zex_amount));
        if (finalZexAmount <= 0) {
          return new Response(JSON.stringify({ error: 'Calculated commission is zero' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }
      } catch (rpcErr: any) {
        console.error('[RPC ERROR] Verification failed:', rpcErr.message);
        return new Response(JSON.stringify({ error: 'Blockchain verification service failed' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
      }
    } else {
      return new Response(JSON.stringify({ error: 'Invalid event type' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    // Insert into Supabase presale_referrals using REST API
    const response = await fetch(`${SUPABASE_URL}/rest/v1/presale_referrals`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        referrer_wallet: referrer_wallet.toLowerCase(),
        referred_wallet: referred_wallet.toLowerCase(),
        event_type: finalEventType,
        zex_amount: finalZexAmount
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Supabase insert error:", errorText);
      return new Response(JSON.stringify({ error: 'Failed to record referral record' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ success: true, amount: finalZexAmount }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (error: any) {
    console.error('[Record Referral] Error:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
