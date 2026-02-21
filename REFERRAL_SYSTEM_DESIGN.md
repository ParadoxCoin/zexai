# 🔗 Referral System Design (Supabase Edition)

## 1. Overview
The referral system allows users to invite others and earn a **Lifetime Commission (1-2%)** on their spending.
- **Standard User:** 1% Commission
- **Token Staker (>10k $MANUS):** 2% Commission

## 2. Database Schema (PostgreSQL / Supabase)

We will create the following tables in Supabase.

### 2.1. `referral_codes`
Stores the unique referral codes for each user.

```sql
CREATE TABLE referral_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) NOT NULL UNIQUE,
    code VARCHAR(20) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    total_referrals INTEGER DEFAULT 0,
    total_earnings DECIMAL(10, 2) DEFAULT 0.00
);

-- Index for fast lookup by code
CREATE INDEX idx_referral_code ON referral_codes(code);
```

### 2.2. `referrals`
Tracks who invited whom.

```sql
CREATE TABLE referrals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    referrer_id UUID REFERENCES auth.users(id) NOT NULL, -- Who invited
    referred_id UUID REFERENCES auth.users(id) NOT NULL UNIQUE, -- Who was invited
    status VARCHAR(20) DEFAULT 'active', -- active, suspended
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2.3. `referral_earnings`
Tracks every commission earned from a transaction.

```sql
CREATE TABLE referral_earnings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    referrer_id UUID REFERENCES auth.users(id) NOT NULL,
    source_user_id UUID REFERENCES auth.users(id) NOT NULL, -- The user who made the purchase
    amount DECIMAL(10, 2) NOT NULL, -- The commission amount (e.g., $0.50)
    purchase_amount DECIMAL(10, 2) NOT NULL, -- The original purchase amount (e.g., $50.00)
    commission_rate DECIMAL(4, 2) NOT NULL, -- 0.01 or 0.02
    currency VARCHAR(10) DEFAULT 'USD',
    status VARCHAR(20) DEFAULT 'pending', -- pending, paid
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2.4. `payouts`
Tracks withdrawals by referrers.

```sql
CREATE TABLE payouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    method VARCHAR(20) NOT NULL, -- crypto, bank, credits
    status VARCHAR(20) DEFAULT 'processing', -- processing, completed, failed
    tx_hash VARCHAR(100), -- Blockchain transaction hash if crypto
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 3. Backend Logic (FastAPI)

### 3.1. Generating Referral Codes
- When a user signs up or visits the referral page, check if they have a code.
- If not, generate a random 8-char alphanumeric code (e.g., `MANUS-X9Y2`).
- Save to `referral_codes`.

### 3.2. Tracking Signups
- During Registration (`POST /auth/signup`), accept an optional `referral_code`.
- If provided, look up the `referrer_id` from `referral_codes`.
- Insert into `referrals` table: `referrer_id` = owner of code, `referred_id` = new user.

### 3.3. Calculating Commission (The Hook)
- We need a hook whenever a **Payment** is successful.
- In `services/payment_service.py` (or equivalent):
    1. Check if the paying user has a `referrer_id` in `referrals` table.
    2. If yes, calculate commission:
        - Check if referrer is a Staker (Mock for now, or check `user_tokens` table).
        - Rate = 2% if Staker, else 1%.
        - Commission = Payment Amount * Rate.
    3. Insert into `referral_earnings`.
    4. Update `referral_codes.total_earnings` for the referrer.

## 4. API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/referral/code` | Get my referral code and stats |
| POST | `/api/v1/referral/create` | Generate my referral code |
| GET | `/api/v1/referral/stats` | Get detailed earnings history |
| POST | `/api/v1/referral/payout` | Request a payout |

## 5. Security & Fraud Prevention
- **Self-Referral Check:** Prevent user from referring themselves (handled by unique constraints and logic).
- **Minimum Payout:** Set a minimum threshold (e.g., $10).
- **Cool-down Period:** Earnings might be "pending" for 14 days (refund period).

