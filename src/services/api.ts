import {
  User,
  AdminAccount,
  TradeOrder,
  WalletRequest,
  SupportNotice,
  AppConfig,
  CoinTicker,
  Candlestick,
  TradeMode,
  UserStatus
} from '../types.ts';
import { localDb } from './localDb.ts';
import { supabase, isSupabaseConfigured } from './supabase.ts';
import { db as firestoreDb } from './firebase.ts';
import { doc, setDoc, getDoc, collection, getDocs, updateDoc, deleteDoc } from 'firebase/firestore';

// 100% Client-Side Mock Market Data (Zero Broken Fetch Calls)
const FALLBACK_COINS: Record<
  string,
  { name: string; rank: number; base: number; iconBg: string; iconSymbol: string }
> = {
  'BTC/USDT': { name: 'Bitcoin', rank: 1, base: 81450.0, iconBg: '#f7931a', iconSymbol: '₿' },
  'ETH/USDT': { name: 'Ethereum', rank: 2, base: 3820.0, iconBg: '#627eea', iconSymbol: '◆' },
  'BNB/USDT': { name: 'BNB', rank: 3, base: 645.0, iconBg: '#f3ba2f', iconSymbol: 'BNB' },
  'SOL/USDT': { name: 'Solana', rank: 4, base: 102.65, iconBg: '#9945ff', iconSymbol: '◎' },
  'XRP/USDT': { name: 'Ripple', rank: 5, base: 4.12, iconBg: '#23292f', iconSymbol: '✕' },
  'DOGE/USDT': { name: 'Dogecoin', rank: 6, base: 0.482, iconBg: '#c2a633', iconSymbol: 'Ð' },
  'ADA/USDT': { name: 'Cardano', rank: 7, base: 0.2071, iconBg: '#0033ad', iconSymbol: 'ADA' },
  'AVAX/USDT': { name: 'Avalanche', rank: 8, base: 9.02, iconBg: '#e84142', iconSymbol: 'AVA' },
  'DOT/USDT': { name: 'Polkadot', rank: 9, base: 1.02, iconBg: '#e6007a', iconSymbol: 'DOT' },
  'TRX/USDT': { name: 'TRON', rank: 10, base: 0.3322, iconBg: '#eb0029', iconSymbol: 'TRX' },
  'LINK/USDT': { name: 'Chainlink', rank: 11, base: 11.82, iconBg: '#375bd2', iconSymbol: 'LIN' },
  'LTC/USDT': { name: 'Litecoin', rank: 12, base: 57.81, iconBg: '#345d9d', iconSymbol: 'LTC' },
  'NEAR/USDT': { name: 'NEAR Protocol', rank: 13, base: 4.73, iconBg: '#000000', iconSymbol: 'NEA' },
  'SHIB/USDT': { name: 'Shiba Inu', rank: 14, base: 0.0000185, iconBg: '#f2994a', iconSymbol: 'SHIB' },
  'BTS/USDT': { name: 'BitShares', rank: 15, base: 0.0894, iconBg: '#3595f6', iconSymbol: 'BTS' }
};

// Real-time market heartbeat simulation
const dynamicPrices: Record<string, number> = {};
Object.entries(FALLBACK_COINS).forEach(([sym, c]) => {
  dynamicPrices[sym] = c.base;
});

if (typeof window !== 'undefined') {
  setInterval(() => {
    Object.keys(dynamicPrices).forEach(sym => {
      const base = FALLBACK_COINS[sym]?.base || dynamicPrices[sym];
      const drift = (Math.random() - 0.49) * 0.003;
      dynamicPrices[sym] = +(dynamicPrices[sym] * (1 + drift)).toFixed(base < 1 ? 4 : 2);
    });
  }, 2000);
}

export const api = {
  // App Config & Notice
  async getConfig(): Promise<{ config: AppConfig; notice: SupportNotice }> {
    try {
      if (firestoreDb) {
        const snap = await getDoc(doc(firestoreDb, 'config', 'global'));
        if (snap.exists()) {
          const data = snap.data();
          return {
            config: data.config || localDb.getConfig().config,
            notice: data.notice || localDb.getConfig().notice
          };
        }
      }
    } catch {
      // Fallback to localDb
    }
    return localDb.getConfig();
  },

  async updateConfig(payload: { config?: Partial<AppConfig>; notice?: Partial<SupportNotice> }): Promise<any> {
    const updated = localDb.updateConfig(payload.config, payload.notice);
    try {
      if (firestoreDb) {
        await setDoc(doc(firestoreDb, 'config', 'global'), updated, { merge: true });
      }
    } catch {
      // Ignore cloud sync error, localDb is master
    }
    return updated;
  },

  // Market Tickers & Candlesticks
  async getTickers(): Promise<CoinTicker[]> {
    return Object.entries(FALLBACK_COINS).map(([symbol, c]) => {
      const price = dynamicPrices[symbol] || c.base;
      const change24h = +((Math.sin(c.rank * 1.5) * 2.8) + 1.2).toFixed(2);
      return {
        symbol,
        name: c.name,
        rank: c.rank,
        price,
        change24h,
        high24h: +(price * 1.025).toFixed(c.base < 1 ? 4 : 2),
        low24h: +(price * 0.975).toFixed(c.base < 1 ? 4 : 2),
        volume24h: `${(Math.random() * 2 + 1.2).toFixed(2)}B USDT`,
        iconBg: c.iconBg,
        iconSymbol: c.iconSymbol
      };
    });
  },

  async getCandles(symbol: string, timeframe: string = '1m'): Promise<Candlestick[]> {
    const coin = FALLBACK_COINS[symbol] || { base: 81400 };
    const count = 45;
    const now = Math.floor(Date.now() / 1000);
    const intervalMap: Record<string, number> = { '1m': 60, '5m': 300, '15m': 900, '1h': 3600 };
    const step = intervalMap[timeframe] || 60;
    const candles: Candlestick[] = [];
    let currentClose = dynamicPrices[symbol] || coin.base;

    for (let i = count - 1; i >= 0; i--) {
      const time = now - i * step;
      const volatility = currentClose * 0.0025;
      const isGreen = Math.sin(i * 0.7) + (Math.random() - 0.48) > 0;
      const change = Math.random() * volatility;
      const open = isGreen ? currentClose - change : currentClose + change;
      const close = currentClose;
      const high = Math.max(open, close) + Math.random() * volatility * 0.7;
      const low = Math.min(open, close) - Math.random() * volatility * 0.7;

      candles.push({
        time,
        open: +open.toFixed(currentClose < 1 ? 4 : 2),
        high: +high.toFixed(currentClose < 1 ? 4 : 2),
        low: +low.toFixed(currentClose < 1 ? 4 : 2),
        close: +close.toFixed(currentClose < 1 ? 4 : 2),
        volume: Math.floor(Math.random() * 85 + 20)
      });
      currentClose = open;
    }
    return candles;
  },

  // Client & Admin Unified Auth
  async loginUser(username: string, password: string): Promise<{
    success: boolean;
    user?: User;
    isAdmin?: boolean;
    admin?: AdminAccount;
    error?: string;
  }> {
    // 1. Check Supabase if configured
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: userRows } = await supabase
          .from('users')
          .select('*')
          .ilike('username', username.trim())
          .limit(1);

        if (userRows && userRows.length > 0) {
          const row = userRows[0];
          // Check balances table
          const { data: balanceRows } = await supabase
            .from('balances')
            .select('*')
            .eq('user_id', row.id)
            .limit(1);

          const bal = balanceRows && balanceRows.length > 0 ? balanceRows[0] : null;
          const userObj: User = {
            id: row.id,
            username: row.username,
            displayName: row.display_name || row.username,
            email: row.email,
            nativeCurrency: row.native_currency || 'USD',
            balance: bal ? Number(bal.available_usd) : 1000,
            freezeBalance: bal ? Number(bal.frozen_usd) : 0,
            creditScore: row.credit_score || 95,
            status: row.status || 'Active',
            tradeMode: row.trade_mode || 'AUTO',
            referralCodeUsed: row.referral_code_used,
            referredByAdminId: row.referred_by_admin_id,
            registeredTime: row.registered_time || new Date().toLocaleString(),
            createdAt: row.created_at
          };

          return { success: true, isAdmin: false, user: userObj };
        }
      } catch (err) {
        console.warn('Supabase query failed, falling back to localDb:', err);
      }
    }

    // 2. Default to reliable localDb
    return localDb.login(username, password);
  },

  async registerUser(data: {
    username: string;
    fullName?: string;
    password?: string;
    referralCode?: string;
    nativeCurrency?: string;
  }): Promise<{ success: boolean; user?: User; error?: string }> {
    const res = localDb.register(data);

    // Sync to Supabase if configured
    if (res.success && res.user && isSupabaseConfigured && supabase) {
      try {
        await supabase.from('users').upsert({
          id: res.user.id,
          username: res.user.username,
          display_name: res.user.displayName,
          email: res.user.email,
          native_currency: res.user.nativeCurrency,
          credit_score: res.user.creditScore,
          status: res.user.status,
          trade_mode: res.user.tradeMode,
          referral_code_used: res.user.referralCodeUsed,
          referred_by_admin_id: res.user.referredByAdminId,
          registered_time: res.user.registeredTime,
          created_at: res.user.createdAt
        });

        await supabase.from('balances').upsert({
          user_id: res.user.id,
          available_usd: res.user.balance,
          frozen_usd: res.user.freezeBalance,
          native_currency: res.user.nativeCurrency
        });
      } catch (err) {
        console.warn('Supabase sync skipped:', err);
      }
    }

    // Sync to Firestore
    if (res.success && res.user && firestoreDb) {
      try {
        await setDoc(doc(firestoreDb, 'users', res.user.id), res.user);
      } catch {
        // Handled locally
      }
    }

    return res;
  },

  async getUserProfile(id: string): Promise<{ success: boolean; user?: User; error?: string }> {
    // Check Firestore
    if (firestoreDb) {
      try {
        const snap = await getDoc(doc(firestoreDb, 'users', id));
        if (snap.exists()) {
          return { success: true, user: snap.data() as User };
        }
      } catch {
        // Fallback
      }
    }

    // Check Supabase
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: userRows } = await supabase.from('users').select('*').eq('id', id).limit(1);
        if (userRows && userRows.length > 0) {
          const row = userRows[0];
          const { data: balanceRows } = await supabase.from('balances').select('*').eq('user_id', id).limit(1);
          const bal = balanceRows && balanceRows.length > 0 ? balanceRows[0] : null;
          return {
            success: true,
            user: {
              id: row.id,
              username: row.username,
              displayName: row.display_name || row.username,
              email: row.email,
              nativeCurrency: row.native_currency || 'USD',
              balance: bal ? Number(bal.available_usd) : 1000,
              freezeBalance: bal ? Number(bal.frozen_usd) : 0,
              creditScore: row.credit_score || 95,
              status: row.status || 'Active',
              tradeMode: row.trade_mode || 'AUTO',
              referralCodeUsed: row.referral_code_used,
              referredByAdminId: row.referred_by_admin_id,
              registeredTime: row.registered_time || new Date().toLocaleString(),
              createdAt: row.created_at
            }
          };
        }
      } catch {
        // Fallback
      }
    }

    return localDb.getUserProfile(id);
  },

  async changePassword(userId: string, _oldPass: string, newPass: string): Promise<any> {
    return localDb.resetPassword(userId, newPass);
  },

  // Admin Auth & Profile
  async loginAdmin(username: string, password: string): Promise<{ success: boolean; admin?: AdminAccount; error?: string }> {
    const res = localDb.login(username, password);
    if (res.isAdmin && res.admin) {
      return { success: true, admin: res.admin };
    }
    return { success: false, error: res.error || 'Invalid administrator credentials' };
  },

  async getAdminProfile(id: string): Promise<{ success: boolean; admin?: AdminAccount; error?: string }> {
    return localDb.getAdminProfile(id);
  },

  // Admin User Management
  async getAdminUsers(adminId: string): Promise<User[]> {
    return localDb.getUsers(adminId);
  },

  async updateUserBalance(userId: string, action: 'add' | 'deduct' | 'set', amountUsd: number): Promise<any> {
    const res = localDb.updateUserBalance(userId, action, amountUsd);
    if (res.success && res.user) {
      // Sync to Supabase
      if (isSupabaseConfigured && supabase) {
        try {
          await supabase
            .from('balances')
            .upsert({
              user_id: userId,
              available_usd: res.user.balance,
              frozen_usd: res.user.freezeBalance,
              updated_at: new Date().toISOString()
            });
        } catch {
          // Handled
        }
      }
      // Sync to Firestore
      if (firestoreDb) {
        try {
          await updateDoc(doc(firestoreDb, 'users', userId), {
            balance: res.user.balance,
            freezeBalance: res.user.freezeBalance
          });
        } catch {
          // Handled
        }
      }
    }
    return res;
  },

  async updateUserFreeze(userId: string, action: 'freeze' | 'unfreeze', amountUsd: number): Promise<any> {
    return this.updateUserBalance(userId, action === 'freeze' ? 'deduct' : 'add', amountUsd);
  },

  async updateUserTradeMode(userId: string, tradeMode: TradeMode): Promise<any> {
    const res = localDb.updateTradeMode(userId, tradeMode);
    if (res.success && firestoreDb) {
      try {
        await updateDoc(doc(firestoreDb, 'users', userId), { tradeMode });
      } catch {
        // Handled
      }
    }
    return res;
  },

  async updateUserStatus(userId: string, status: UserStatus): Promise<any> {
    return localDb.freezeUser(userId, status === 'Active' ? 'reactivate' : 'freeze');
  },

  async updateCreditScore(userId: string, creditScore: number): Promise<any> {
    return localDb.updateCreditScore(userId, creditScore);
  },

  async resetUserPassword(userId: string, newPassword: string): Promise<any> {
    return localDb.resetPassword(userId, newPassword);
  },

  async freezeUserAccount(userId: string, action: 'freeze' | 'reactivate', reason?: string): Promise<any> {
    return localDb.freezeUser(userId, action, reason);
  },

  async deleteUser(userId: string): Promise<any> {
    const res = localDb.deleteUser(userId);
    if (firestoreDb) {
      try {
        await deleteDoc(doc(firestoreDb, 'users', userId));
      } catch {
        // Handled
      }
    }
    return res;
  },

  async createClientUser(payload: {
    username: string;
    password?: string;
    email?: string;
    balance?: number;
    referralCode?: string;
  }): Promise<any> {
    const res = localDb.register({
      username: payload.username,
      password: payload.password || '123123',
      referralCode: payload.referralCode || 'MASTER321'
    });
    if (res.user && payload.balance !== undefined) {
      localDb.updateUserBalance(res.user.id, 'set', payload.balance);
    }
    return res;
  },

  async saveSupportDesk(payload: {
    adminId: string;
    telegramSupportLink: string;
    prefilledMessage?: string;
  }): Promise<any> {
    return localDb.saveSupportDesk(payload.adminId, payload.telegramSupportLink, payload.prefilledMessage);
  },

  // Sub-Admins Management
  async getSubAdmins(_adminId: string): Promise<AdminAccount[]> {
    return localDb.getAllAdmins();
  },

  async createSubAdmin(payload: {
    creatorAdminId: string;
    username: string;
    password: string;
    referralCode: string;
    permissions: string[];
    displayName?: string;
  }): Promise<any> {
    return localDb.createSubAdmin(payload);
  },

  async customizeReferralCode(adminId: string, newReferralCode: string): Promise<any> {
    return localDb.customizeReferral(adminId, newReferralCode);
  },

  async getSessionsAudit(_adminId: string): Promise<any[]> {
    const admins = localDb.getAllAdmins();
    const logs: any[] = [];
    admins.forEach(adm => {
      (adm.loginHistory || []).forEach(sess => {
        logs.push({
          adminId: adm.id,
          username: adm.username,
          displayName: adm.displayName,
          referralCode: adm.referralCode,
          session: sess
        });
      });
    });
    return logs;
  },

  // Trades
  async getTrades(userId?: string, _adminId?: string): Promise<TradeOrder[]> {
    return localDb.getTrades(userId);
  },

  async placeTrade(payload: {
    userId: string;
    symbol: string;
    direction: 'UP' | 'DOWN';
    durationSeconds: number;
    profitPercent: number;
    marginUsd: number;
    entryPrice?: number;
  }): Promise<any> {
    const entryPrice = payload.entryPrice || (dynamicPrices[payload.symbol] || FALLBACK_COINS[payload.symbol]?.base || 81400);
    const fullPayload = { ...payload, entryPrice };
    const res = localDb.createTrade(fullPayload);

    // Sync to Supabase if enabled
    if (res.success && res.trade && isSupabaseConfigured && supabase) {
      try {
        await supabase.from('trades').insert({
          id: res.trade.id,
          user_id: res.trade.userId,
          username: res.trade.username,
          symbol: res.trade.symbol,
          direction: res.trade.direction,
          duration_seconds: res.trade.durationSeconds,
          profit_percent: res.trade.profitPercent,
          margin_usd: res.trade.marginUsd,
          entry_price: res.trade.entryPrice,
          outcome: 'PENDING',
          status: 'RUNNING',
          created_at: res.trade.createdAt
        });
      } catch {
        // Handled
      }
    }

    // Sync to Firestore
    if (res.success && res.trade && firestoreDb) {
      try {
        await setDoc(doc(firestoreDb, 'trades', res.trade.id), res.trade);
      } catch {
        // Handled
      }
    }

    return res;
  },

  async settleTrade(tradeId: string, outcome?: 'WIN' | 'LOSS', finalPrice?: number): Promise<any> {
    const chosenOutcome = outcome || 'WIN';
    const chosenPrice = finalPrice || 81500;
    const res = localDb.settleTrade(tradeId, chosenOutcome, chosenPrice);

    // Sync to Supabase
    if (res.success && res.trade && isSupabaseConfigured && supabase) {
      try {
        await supabase
          .from('trades')
          .update({
            outcome: chosenOutcome,
            status: 'SETTLED',
            exit_price: chosenPrice,
            payout_usd: res.trade.payoutUsd,
            settled_at: new Date().toISOString()
          })
          .eq('id', tradeId);
      } catch {
        // Handled
      }
    }

    // Sync to Firestore
    if (res.success && res.trade && firestoreDb) {
      try {
        await updateDoc(doc(firestoreDb, 'trades', tradeId), {
          outcome: chosenOutcome,
          status: 'SETTLED',
          exitPrice: chosenPrice,
          payoutUsd: res.trade.payoutUsd,
          settledAt: new Date().toISOString()
        });
      } catch {
        // Handled
      }
    }

    return res;
  },

  async adminAdjustTrade(tradeId: string, forceOutcome: 'WIN' | 'LOSS'): Promise<any> {
    return this.settleTrade(tradeId, forceOutcome, 81500);
  },

  // Finance / Wallets
  async getWalletRequests(userId?: string, _adminId?: string): Promise<WalletRequest[]> {
    const reqs = localDb.getWalletRequests();
    if (userId) return reqs.filter(r => r.userId === userId);
    return reqs;
  },

  async createDepositRequest(payload: {
    userId: string;
    amountNative: number;
    amountUsd?: number;
    currency?: string;
    network: string;
    addressOrAccount?: string;
    txHash?: string;
    txHashOrProof?: string;
  }): Promise<any> {
    const amountUsd = payload.amountUsd || payload.amountNative;
    const address = payload.addressOrAccount || payload.txHash || payload.txHashOrProof || '';
    const res = localDb.createWalletRequest({
      userId: payload.userId,
      type: 'DEPOSIT',
      amountUsd,
      amountNative: payload.amountNative,
      network: payload.network,
      addressOrAccount: address
    });

    if (res.success && res.request && isSupabaseConfigured && supabase) {
      try {
        await supabase.from('withdrawal_requests').insert({
          id: res.request.id,
          user_id: res.request.userId,
          username: res.request.username,
          type: 'DEPOSIT',
          amount_usd: res.request.amountUsd,
          amount_native: res.request.amountNative,
          currency: res.request.currency,
          network: res.request.network,
          address_or_account: res.request.addressOrAccount,
          status: 'PENDING',
          remarks: res.request.remarks,
          created_at: res.request.createdAt
        });
      } catch {
        // Handled
      }
    }

    return res;
  },

  async requestDeposit(payload: {
    userId: string;
    amountNative: number;
    amountUsd?: number;
    currency?: string;
    network: string;
    addressOrAccount?: string;
    txHash?: string;
    txHashOrProof?: string;
  }): Promise<any> {
    return this.createDepositRequest(payload);
  },

  async createWithdrawalRequest(payload: {
    userId: string;
    amountNative: number;
    amountUsd?: number;
    currency?: string;
    network: string;
    addressOrAccount: string;
  }): Promise<any> {
    const amountUsd = payload.amountUsd || payload.amountNative;
    const res = localDb.createWalletRequest({
      userId: payload.userId,
      type: 'WITHDRAWAL',
      amountUsd,
      amountNative: payload.amountNative,
      network: payload.network,
      addressOrAccount: payload.addressOrAccount
    });

    if (res.success && res.request && isSupabaseConfigured && supabase) {
      try {
        await supabase.from('withdrawal_requests').insert({
          id: res.request.id,
          user_id: res.request.userId,
          username: res.request.username,
          type: 'WITHDRAWAL',
          amount_usd: res.request.amountUsd,
          amount_native: res.request.amountNative,
          currency: res.request.currency,
          network: res.request.network,
          address_or_account: res.request.addressOrAccount,
          status: 'PENDING',
          remarks: res.request.remarks,
          created_at: res.request.createdAt
        });
      } catch {
        // Handled
      }
    }

    return res;
  },

  async requestWithdrawal(payload: {
    userId: string;
    amountNative: number;
    amountUsd?: number;
    currency?: string;
    network: string;
    addressOrAccount: string;
  }): Promise<any> {
    return this.createWithdrawalRequest(payload);
  },

  async handleWalletRequestAction(requestId: string, action: 'APPROVE' | 'REJECT', remarks?: string): Promise<any> {
    const res = localDb.handleWalletAction(requestId, action, remarks);

    if (res.success && isSupabaseConfigured && supabase) {
      try {
        await supabase
          .from('withdrawal_requests')
          .update({
            status: action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
            remarks: remarks || `${action} by Administrator`,
            processed_at: new Date().toISOString()
          })
          .eq('id', requestId);
      } catch {
        // Handled
      }
    }

    return res;
  }
};
