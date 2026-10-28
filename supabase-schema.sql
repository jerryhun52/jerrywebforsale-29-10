-- =========================================================================
-- FLOW COIN - Supabase / PostgreSQL Database Schema
-- Run this in your Supabase SQL Editor: Dashboard -> SQL Editor -> New Query
-- =========================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  username VARCHAR(64) UNIQUE NOT NULL,
  display_name VARCHAR(128),
  password_hash TEXT,
  email VARCHAR(255),
  role VARCHAR(32) DEFAULT 'USER' CHECK (role IN ('USER', 'ADMIN', 'SUB_ADMIN', 'SUPER_ADMIN', 'SUPREME_OWNER')),
  native_currency VARCHAR(10) DEFAULT 'USD',
  credit_score INT DEFAULT 95 CHECK (credit_score >= 0 AND credit_score <= 100),
  status VARCHAR(20) DEFAULT 'Active' CHECK (status IN ('Active', 'Suspended', 'Frozen')),
  freeze_reason TEXT,
  trade_mode VARCHAR(20) DEFAULT 'AUTO' CHECK (trade_mode IN ('AUTO', 'FORCE_WIN', 'FORCE_LOSS')),
  referred_by_admin_id TEXT,
  referral_code_used VARCHAR(32),
  registered_time VARCHAR(64),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. BALANCES TABLE (Real-time Available & Escrow Frozen Balances)
CREATE TABLE IF NOT EXISTS public.balances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  available_usd NUMERIC(14, 2) DEFAULT 1000.00 NOT NULL CHECK (available_usd >= 0),
  frozen_usd NUMERIC(14, 2) DEFAULT 0.00 NOT NULL CHECK (frozen_usd >= 0),
  native_currency VARCHAR(10) DEFAULT 'USD',
  exchange_rate NUMERIC(10, 4) DEFAULT 1.0000,
  last_updated_by TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookup by user_id
CREATE INDEX IF NOT EXISTS idx_balances_user_id ON public.balances(user_id);

-- 3. WITHDRAWAL & DEPOSIT REQUESTS TABLE
CREATE TABLE IF NOT EXISTS public.withdrawal_requests (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  username VARCHAR(64) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('DEPOSIT', 'WITHDRAWAL')),
  amount_usd NUMERIC(14, 2) NOT NULL CHECK (amount_usd > 0),
  amount_native NUMERIC(14, 2) NOT NULL CHECK (amount_native > 0),
  currency VARCHAR(10) DEFAULT 'USD',
  network VARCHAR(64) NOT NULL,
  address_or_account TEXT NOT NULL,
  tx_hash TEXT,
  status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  remarks TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for requests by user and status
CREATE INDEX IF NOT EXISTS idx_withdrawal_user ON public.withdrawal_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_status ON public.withdrawal_requests(status);

-- 4. TRADES TABLE (Real-time 60s Option Contracts)
CREATE TABLE IF NOT EXISTS public.trades (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  username VARCHAR(64) NOT NULL,
  symbol VARCHAR(32) NOT NULL,
  direction VARCHAR(10) NOT NULL CHECK (direction IN ('UP', 'DOWN')),
  duration_seconds INT DEFAULT 60 NOT NULL,
  profit_percent NUMERIC(6, 2) DEFAULT 20.00 NOT NULL,
  margin_usd NUMERIC(14, 2) NOT NULL CHECK (margin_usd > 0),
  entry_price NUMERIC(16, 4) NOT NULL,
  exit_price NUMERIC(16, 4),
  outcome VARCHAR(10) DEFAULT 'PENDING' CHECK (outcome IN ('PENDING', 'WIN', 'LOSS')),
  payout_usd NUMERIC(14, 2) DEFAULT 0.00,
  status VARCHAR(20) DEFAULT 'RUNNING' CHECK (status IN ('RUNNING', 'SETTLED')),
  admin_override VARCHAR(20) DEFAULT 'AUTO',
  start_time BIGINT,
  end_time BIGINT,
  settled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trades_user ON public.trades(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_status ON public.trades(status);

-- 5. INITIAL SEED DATA (Default Trader & Admins)
INSERT INTO public.users (id, username, display_name, password_hash, email, role, balance_init, credit_score, status, trade_mode, referral_code_used)
VALUES
  ('usr_123123123123', '123123123123', '123123123123', '123123', '123123123123@flowcoin.com', 'USER', 1000.00, 95, 'Active', 'AUTO', 'MASTER321'),
  ('admin_supreme_001', 'jerry@786', 'Supreme Root Owner', 'tesla@123', 'jerry786@flowcoin.com', 'SUPREME_OWNER', 0.00, 100, 'Active', 'AUTO', 'ROOT786'),
  ('admin_master_002', 'jerry@321', 'Master Admin', 'jerry@321', 'jerry321@flowcoin.com', 'SUPER_ADMIN', 0.00, 100, 'Active', 'AUTO', 'MASTER321')
ON CONFLICT (id) DO NOTHING;

-- Initial Balance for Demo Trader
INSERT INTO public.balances (user_id, available_usd, frozen_usd, native_currency)
VALUES ('usr_123123123123', 1000.00, 0.00, 'USD')
ON CONFLICT DO NOTHING;

-- Enable Supabase Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;

-- Allow public read & write policies for app API
CREATE POLICY "Public Users Access" ON public.users FOR ALL USING (true);
CREATE POLICY "Public Balances Access" ON public.balances FOR ALL USING (true);
CREATE POLICY "Public Withdrawal Requests Access" ON public.withdrawal_requests FOR ALL USING (true);
CREATE POLICY "Public Trades Access" ON public.trades FOR ALL USING (true);

-- Enable Supabase Realtime for instant balance and trade updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.users;
ALTER PUBLICATION supabase_realtime ADD TABLE public.balances;
ALTER PUBLICATION supabase_realtime ADD TABLE public.withdrawal_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.trades;
