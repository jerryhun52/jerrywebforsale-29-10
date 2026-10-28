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

const BASE_URL = '/api';

// Safe JSON fetcher that never crashes with Unexpected token 'T' on HTML/404 responses
async function safeFetch<T>(
  url: string,
  options?: RequestInit,
  fallbackFn?: () => T
): Promise<T> {
  try {
    const res = await fetch(url, options);
    const contentType = res.headers.get('content-type') || '';

    // If server returned valid JSON
    if (contentType.includes('application/json')) {
      const data = await res.json();
      return data as T;
    }

    // If server returned HTML (e.g. Vercel 404 "The page could not be found" or SPA index.html)
    console.warn(`[API] Endpoint ${url} returned non-JSON (${res.status}). Using local fallback.`);
    if (fallbackFn) {
      return fallbackFn();
    }
    throw new Error('API returned non-JSON response');
  } catch (err) {
    console.warn(`[API] Network or parsing error on ${url}:`, err);
    if (fallbackFn) {
      return fallbackFn();
    }
    throw err;
  }
}

// Client-side fallback ticker prices generator with full CoinTicker properties
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

export const api = {
  // App Config & Notice
  async getConfig(): Promise<{ config: AppConfig; notice: SupportNotice }> {
    return safeFetch(
      `${BASE_URL}/config`,
      undefined,
      () => localDb.getConfig()
    );
  },

  async updateConfig(payload: { config?: Partial<AppConfig>; notice?: Partial<SupportNotice> }): Promise<any> {
    return safeFetch(
      `${BASE_URL}/config/update`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      },
      () => localDb.updateConfig(payload.config, payload.notice)
    );
  },

  // Market
  async getTickers(): Promise<CoinTicker[]> {
    return safeFetch(
      `${BASE_URL}/market/tickers`,
      undefined,
      () => {
        return Object.entries(FALLBACK_COINS).map(([symbol, c]) => {
          const drift = (Math.random() - 0.49) * 0.005;
          const price = +(c.base * (1 + drift)).toFixed(c.base < 1 ? 4 : 2);
          return {
            symbol,
            name: c.name,
            rank: c.rank,
            price,
            change24h: +(Math.random() * 3 + 0.8).toFixed(2),
            high24h: +(price * 1.02).toFixed(c.base < 1 ? 4 : 2),
            low24h: +(price * 0.98).toFixed(c.base < 1 ? 4 : 2),
            volume24h: `${(Math.random() * 2 + 1.2).toFixed(2)}B USDT`,
            iconBg: c.iconBg,
            iconSymbol: c.iconSymbol
          };
        });
      }
    );
  },

  async getCandles(symbol: string, timeframe: string = '1m'): Promise<Candlestick[]> {
    return safeFetch(
      `${BASE_URL}/market/candles/${encodeURIComponent(symbol)}?tf=${timeframe}`,
      undefined,
      () => {
        const coin = FALLBACK_COINS[symbol] || { base: 81400 };
        const count = 45;
        const now = Math.floor(Date.now() / 1000);
        const candles: Candlestick[] = [];
        let currentClose = coin.base;

        for (let i = count - 1; i >= 0; i--) {
          const time = now - i * 60;
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
      }
    );
  },

  // Client & Admin Unified Auth
  async loginUser(username: string, password: string): Promise<{
    success: boolean;
    user?: User;
    isAdmin?: boolean;
    admin?: AdminAccount;
    error?: string;
  }> {
    return safeFetch(
      `${BASE_URL}/auth/login`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      },
      () => localDb.login(username, password)
    );
  },

  async registerUser(data: {
    username: string;
    fullName?: string;
    password?: string;
    referralCode?: string;
    nativeCurrency?: string;
  }): Promise<{ success: boolean; user?: User; error?: string }> {
    return safeFetch(
      `${BASE_URL}/auth/register`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      },
      () => localDb.register(data)
    );
  },

  async getUserProfile(id: string): Promise<{ success: boolean; user?: User; error?: string }> {
    return safeFetch(
      `${BASE_URL}/auth/profile/${id}`,
      undefined,
      () => localDb.getUserProfile(id)
    );
  },

  async changePassword(userId: string, oldPass: string, newPass: string): Promise<any> {
    return safeFetch(
      `${BASE_URL}/auth/change-password`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, oldPassword: oldPass, newPassword: newPass })
      },
      () => localDb.resetPassword(userId, newPass)
    );
  },

  // Admin Auth & Profile Rehydration
  async loginAdmin(username: string, password: string): Promise<{ success: boolean; admin?: AdminAccount; error?: string }> {
    return safeFetch(
      `${BASE_URL}/admin/login`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      },
      () => {
        const res = localDb.login(username, password);
        if (res.isAdmin && res.admin) {
          return { success: true, admin: res.admin };
        }
        return { success: false, error: res.error || 'Invalid administrator credentials' };
      }
    );
  },

  async getAdminProfile(id: string): Promise<{ success: boolean; admin?: AdminAccount; error?: string }> {
    return safeFetch(
      `${BASE_URL}/admin/profile/${id}`,
      undefined,
      () => localDb.getAdminProfile(id)
    );
  },

  // Admin User Management
  async getAdminUsers(adminId: string): Promise<User[]> {
    return safeFetch(
      `${BASE_URL}/admin/users?adminId=${adminId}`,
      undefined,
      () => localDb.getUsers(adminId)
    );
  },

  async updateUserBalance(userId: string, action: 'add' | 'deduct' | 'set', amountUsd: number): Promise<any> {
    return safeFetch(
      `${BASE_URL}/admin/users/${userId}/balance`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, amountUsd })
      },
      () => localDb.updateUserBalance(userId, action, amountUsd)
    );
  },

  async updateUserFreeze(userId: string, action: 'freeze' | 'unfreeze', amountUsd: number): Promise<any> {
    return safeFetch(
      `${BASE_URL}/admin/users/${userId}/freeze`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, amountUsd })
      },
      () => localDb.updateUserBalance(userId, action === 'freeze' ? 'deduct' : 'add', amountUsd)
    );
  },

  async updateUserTradeMode(userId: string, tradeMode: TradeMode): Promise<any> {
    return safeFetch(
      `${BASE_URL}/admin/users/${userId}/trade-mode`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tradeMode })
      },
      () => localDb.updateTradeMode(userId, tradeMode)
    );
  },

  async updateUserStatus(userId: string, status: UserStatus): Promise<any> {
    return safeFetch(
      `${BASE_URL}/admin/users/${userId}/status`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      },
      () => localDb.freezeUser(userId, status === 'Active' ? 'reactivate' : 'freeze')
    );
  },

  async updateCreditScore(userId: string, creditScore: number): Promise<any> {
    return safeFetch(
      `${BASE_URL}/admin/users/${userId}/credit-score`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creditScore })
      },
      () => localDb.updateCreditScore(userId, creditScore)
    );
  },

  async resetUserPassword(userId: string, newPassword: string): Promise<any> {
    return safeFetch(
      `${BASE_URL}/admin/users/${userId}/reset-password`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword })
      },
      () => localDb.resetPassword(userId, newPassword)
    );
  },

  async freezeUserAccount(userId: string, action: 'freeze' | 'reactivate', reason?: string): Promise<any> {
    return safeFetch(
      `${BASE_URL}/admin/users/${userId}/freeze-account`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason })
      },
      () => localDb.freezeUser(userId, action, reason)
    );
  },

  async deleteUser(userId: string): Promise<any> {
    return safeFetch(
      `${BASE_URL}/admin/users/${userId}`,
      {
        method: 'DELETE'
      },
      () => localDb.deleteUser(userId)
    );
  },

  async createClientUser(payload: {
    username: string;
    password?: string;
    email?: string;
    balance?: number;
    referralCode?: string;
  }): Promise<any> {
    return safeFetch(
      `${BASE_URL}/admin/users/create`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      },
      () => localDb.register({
        username: payload.username,
        password: payload.password || '123123',
        referralCode: payload.referralCode || 'MASTER321'
      })
    );
  },

  async saveSupportDesk(payload: {
    adminId: string;
    telegramSupportLink: string;
    prefilledMessage?: string;
  }): Promise<any> {
    return safeFetch(
      `${BASE_URL}/admin/support-desk`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      },
      () => localDb.saveSupportDesk(payload.adminId, payload.telegramSupportLink, payload.prefilledMessage)
    );
  },

  // Sub-Admins Management
  async getSubAdmins(adminId: string): Promise<AdminAccount[]> {
    return safeFetch(
      `${BASE_URL}/admin/subadmins?adminId=${adminId}`,
      undefined,
      () => localDb.getAllAdmins()
    );
  },

  async createSubAdmin(payload: {
    creatorAdminId: string;
    username: string;
    password: string;
    referralCode: string;
    permissions: string[];
    displayName?: string;
  }): Promise<any> {
    return safeFetch(
      `${BASE_URL}/admin/subadmins/create`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      },
      () => localDb.createSubAdmin(payload)
    );
  },

  async customizeReferralCode(adminId: string, newReferralCode: string): Promise<any> {
    return safeFetch(
      `${BASE_URL}/admin/customize-referral`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId, newReferralCode })
      },
      () => localDb.customizeReferral(adminId, newReferralCode)
    );
  },

  async getSessionsAudit(adminId: string): Promise<any[]> {
    return safeFetch(
      `${BASE_URL}/admin/sessions-audit?adminId=${adminId}`,
      undefined,
      () => {
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
      }
    );
  },

  // Trades
  async getTrades(userId?: string, _adminId?: string): Promise<TradeOrder[]> {
    return safeFetch(
      `${BASE_URL}/trades?${userId ? `userId=${userId}` : ''}`,
      undefined,
      () => localDb.getTrades(userId)
    );
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
    const entryPrice = payload.entryPrice || (FALLBACK_COINS[payload.symbol]?.base || 81400);
    const fullPayload = { ...payload, entryPrice };
    return safeFetch(
      `${BASE_URL}/trades/place`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fullPayload)
      },
      () => localDb.createTrade(fullPayload)
    );
  },

  async settleTrade(tradeId: string, outcome?: 'WIN' | 'LOSS', finalPrice?: number): Promise<any> {
    const chosenOutcome = outcome || 'WIN';
    const chosenPrice = finalPrice || 81500;
    return safeFetch(
      `${BASE_URL}/trades/settle`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tradeId, outcome: chosenOutcome, finalPrice: chosenPrice })
      },
      () => localDb.settleTrade(tradeId, chosenOutcome, chosenPrice)
    );
  },

  async adminAdjustTrade(tradeId: string, forceOutcome: 'WIN' | 'LOSS'): Promise<any> {
    return safeFetch(
      `${BASE_URL}/trades/adjust`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tradeId, forceOutcome })
      },
      () => localDb.settleTrade(tradeId, forceOutcome, 81500)
    );
  },

  // Finance / Wallets
  async getWalletRequests(userId?: string, _adminId?: string): Promise<WalletRequest[]> {
    return safeFetch(
      `${BASE_URL}/finance/requests${userId ? `?userId=${userId}` : ''}`,
      undefined,
      () => {
        const reqs = localDb.getWalletRequests();
        if (userId) return reqs.filter(r => r.userId === userId);
        return reqs;
      }
    );
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
    const currency = payload.currency || 'USD';
    const address = payload.addressOrAccount || payload.txHash || payload.txHashOrProof || '';
    return safeFetch(
      `${BASE_URL}/finance/deposit`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, amountUsd, currency, addressOrAccount: address })
      },
      () => localDb.createWalletRequest({
        userId: payload.userId,
        type: 'DEPOSIT',
        amountUsd,
        amountNative: payload.amountNative,
        network: payload.network,
        addressOrAccount: address
      })
    );
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
    const currency = payload.currency || 'USD';
    return safeFetch(
      `${BASE_URL}/finance/withdraw`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, amountUsd, currency })
      },
      () => localDb.createWalletRequest({
        userId: payload.userId,
        type: 'WITHDRAWAL',
        amountUsd,
        amountNative: payload.amountNative,
        network: payload.network,
        addressOrAccount: payload.addressOrAccount
      })
    );
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
    return safeFetch(
      `${BASE_URL}/finance/requests/${requestId}/action`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, remarks })
      },
      () => localDb.handleWalletAction(requestId, action, remarks)
    );
  }
};
