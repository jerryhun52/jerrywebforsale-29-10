import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Retrieve credentials from environment or fallback placeholder
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl !== 'https://your-project.supabase.co'
);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Database Types for TypeScript autocomplete
export interface DbUser {
  id: string;
  username: string;
  display_name?: string;
  email?: string;
  role: string;
  native_currency: string;
  credit_score: number;
  status: string;
  freeze_reason?: string;
  trade_mode: string;
  referred_by_admin_id?: string;
  referral_code_used?: string;
  registered_time?: string;
  created_at: string;
}

export interface DbBalance {
  id: string;
  user_id: string;
  available_usd: number;
  frozen_usd: number;
  native_currency: string;
  exchange_rate: number;
  updated_at: string;
}

export interface DbWithdrawalRequest {
  id: string;
  user_id: string;
  username: string;
  type: 'DEPOSIT' | 'WITHDRAWAL';
  amount_usd: number;
  amount_native: number;
  currency: string;
  network: string;
  address_or_account: string;
  tx_hash?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  remarks?: string;
  processed_at?: string;
  created_at: string;
}
