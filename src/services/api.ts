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

const BASE_URL = '/api';

export const api = {
  // App Config & Notice
  async getConfig(): Promise<{ config: AppConfig; notice: SupportNotice }> {
    const res = await fetch(`${BASE_URL}/config`);
    return res.json();
  },

  async updateConfig(payload: { config?: Partial<AppConfig>; notice?: Partial<SupportNotice> }): Promise<any> {
    const res = await fetch(`${BASE_URL}/config/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.json();
  },

  // Market
  async getTickers(): Promise<CoinTicker[]> {
    const res = await fetch(`${BASE_URL}/market/tickers`);
    return res.json();
  },

  async getCandles(symbol: string, timeframe: string = '1m'): Promise<Candlestick[]> {
    const res = await fetch(`${BASE_URL}/market/candles/${encodeURIComponent(symbol)}?tf=${timeframe}`);
    return res.json();
  },

  // Client & Admin Unified Auth
  async loginUser(username: string, password: string): Promise<{
    success: boolean;
    user?: User;
    isAdmin?: boolean;
    admin?: AdminAccount;
    error?: string;
  }> {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    return res.json();
  },

  async registerUser(data: {
    username: string;
    fullName?: string;
    password?: string;
    referralCode?: string;
    nativeCurrency?: string;
  }): Promise<{ success: boolean; user?: User; error?: string }> {
    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async getUserProfile(id: string): Promise<{ success: boolean; user?: User; error?: string }> {
    const res = await fetch(`${BASE_URL}/auth/profile/${id}`);
    return res.json();
  },

  async changePassword(userId: string, oldPass: string, newPass: string): Promise<any> {
    const res = await fetch(`${BASE_URL}/auth/change-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, oldPassword: oldPass, newPassword: newPass })
    });
    return res.json();
  },

  // Admin Auth & Profile Rehydration
  async loginAdmin(username: string, password: string): Promise<{ success: boolean; admin?: AdminAccount; error?: string }> {
    const res = await fetch(`${BASE_URL}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    return res.json();
  },

  async getAdminProfile(id: string): Promise<{ success: boolean; admin?: AdminAccount; error?: string }> {
    const res = await fetch(`${BASE_URL}/admin/profile/${id}`);
    return res.json();
  },

  // Admin User Management
  async getAdminUsers(adminId: string): Promise<User[]> {
    const res = await fetch(`${BASE_URL}/admin/users?adminId=${adminId}`);
    return res.json();
  },

  async updateUserBalance(userId: string, action: 'add' | 'deduct' | 'set', amountUsd: number): Promise<any> {
    const res = await fetch(`${BASE_URL}/admin/users/${userId}/balance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, amountUsd })
    });
    return res.json();
  },

  async updateUserFreeze(userId: string, action: 'freeze' | 'unfreeze', amountUsd: number): Promise<any> {
    const res = await fetch(`${BASE_URL}/admin/users/${userId}/freeze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, amountUsd })
    });
    return res.json();
  },

  async updateUserTradeMode(userId: string, tradeMode: TradeMode): Promise<any> {
    const res = await fetch(`${BASE_URL}/admin/users/${userId}/trade-mode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tradeMode })
    });
    return res.json();
  },

  async updateUserStatus(userId: string, status: UserStatus): Promise<any> {
    const res = await fetch(`${BASE_URL}/admin/users/${userId}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    return res.json();
  },

  async updateCreditScore(userId: string, creditScore: number): Promise<any> {
    const res = await fetch(`${BASE_URL}/admin/users/${userId}/credit-score`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creditScore })
    });
    return res.json();
  },

  async resetUserPassword(userId: string, newPassword: string): Promise<any> {
    const res = await fetch(`${BASE_URL}/admin/users/${userId}/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newPassword })
    });
    return res.json();
  },

  async freezeUserAccount(userId: string, action: 'freeze' | 'reactivate', reason?: string): Promise<any> {
    const res = await fetch(`${BASE_URL}/admin/users/${userId}/freeze-account`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, reason })
    });
    return res.json();
  },

  async deleteUser(userId: string): Promise<any> {
    const res = await fetch(`${BASE_URL}/admin/users/${userId}`, {
      method: 'DELETE'
    });
    return res.json();
  },

  async createClientUser(payload: {
    username: string;
    password?: string;
    email?: string;
    balance?: number;
    referralCode?: string;
  }): Promise<any> {
    const res = await fetch(`${BASE_URL}/admin/users/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.json();
  },

  async saveSupportDesk(payload: {
    adminId: string;
    telegramSupportLink: string;
    prefilledMessage?: string;
  }): Promise<any> {
    const res = await fetch(`${BASE_URL}/admin/support-desk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.json();
  },

  // Sub-Admins Management
  async getSubAdmins(adminId: string): Promise<AdminAccount[]> {
    const res = await fetch(`${BASE_URL}/admin/subadmins?adminId=${adminId}`);
    return res.json();
  },

  async createSubAdmin(payload: {
    creatorAdminId: string;
    username: string;
    password: string;
    referralCode: string;
    permissions: string[];
  }): Promise<any> {
    const res = await fetch(`${BASE_URL}/admin/subadmins/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.json();
  },

  async customizeReferralCode(adminId: string, newReferralCode: string): Promise<any> {
    const res = await fetch(`${BASE_URL}/admin/customize-referral`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminId, newReferralCode })
    });
    return res.json();
  },

  async getSessionsAudit(adminId: string): Promise<any[]> {
    const res = await fetch(`${BASE_URL}/admin/sessions-audit?adminId=${adminId}`);
    return res.json();
  },

  // Trades
  async getTrades(userId?: string, adminId?: string): Promise<TradeOrder[]> {
    const params = new URLSearchParams();
    if (userId) params.append('userId', userId);
    if (adminId) params.append('adminId', adminId);
    const res = await fetch(`${BASE_URL}/trades?${params.toString()}`);
    return res.json();
  },

  async placeTrade(payload: {
    userId: string;
    symbol: string;
    direction: 'UP' | 'DOWN';
    durationSeconds: number;
    profitPercent: number;
    marginUsd: number;
  }): Promise<any> {
    const res = await fetch(`${BASE_URL}/trades/place`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.json();
  },

  async settleTrade(tradeId: string): Promise<any> {
    const res = await fetch(`${BASE_URL}/trades/${tradeId}/settle`, {
      method: 'POST'
    });
    return res.json();
  },

  async adminAdjustTrade(tradeId: string, outcome: 'WIN' | 'LOSS'): Promise<any> {
    const res = await fetch(`${BASE_URL}/trades/${tradeId}/admin-adjust`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ outcome })
    });
    return res.json();
  },

  // Finance
  async getWalletRequests(userId?: string, adminId?: string): Promise<WalletRequest[]> {
    const params = new URLSearchParams();
    if (userId) params.append('userId', userId);
    if (adminId) params.append('adminId', adminId);
    const res = await fetch(`${BASE_URL}/finance/requests?${params.toString()}`);
    return res.json();
  },

  async requestDeposit(payload: {
    userId: string;
    amountNative: number;
    network: string;
    addressOrAccount?: string;
    txHash?: string;
  }): Promise<any> {
    const res = await fetch(`${BASE_URL}/finance/deposit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.json();
  },

  async requestWithdrawal(payload: {
    userId: string;
    amountNative: number;
    network: string;
    addressOrAccount: string;
  }): Promise<any> {
    const res = await fetch(`${BASE_URL}/finance/withdraw`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.json();
  },

  async handleWalletRequestAction(requestId: string, action: 'APPROVE' | 'REJECT', remarks?: string): Promise<any> {
    const res = await fetch(`${BASE_URL}/finance/requests/${requestId}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, remarks })
    });
    return res.json();
  }
};
