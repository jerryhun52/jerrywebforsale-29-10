export type Currency = 'USD' | 'USDT' | 'PKR' | 'INR' | 'BRL' | 'EGP';

export interface CurrencyMeta {
  code: Currency;
  symbol: string;
  name: string;
  rate: number; // Against USD
  flag: string;
}

export const CURRENCIES: Record<Currency, CurrencyMeta> = {
  USD: { code: 'USD', symbol: '$', name: 'US Dollar', rate: 1.0, flag: '🇺🇸' },
  USDT: { code: 'USDT', symbol: '₮', name: 'Tether USD', rate: 1.0, flag: '🟢' },
  PKR: { code: 'PKR', symbol: '₨', name: 'Pakistani Rupee', rate: 278.5, flag: '🇵🇰' },
  INR: { code: 'INR', symbol: '₹', name: 'Indian Rupee', rate: 87.2, flag: '🇮🇳' },
  BRL: { code: 'BRL', symbol: 'R$', name: 'Brazilian Real', rate: 5.8, flag: '🇧🇷' },
  EGP: { code: 'EGP', symbol: 'E£', name: 'Egyptian Pound', rate: 50.5, flag: '🇪🇬' },
};

export type TradeMode = 'AUTO' | 'FORCE_WIN' | 'FORCE_LOSS';
export type UserStatus = 'Active' | 'Suspended' | 'Frozen';

export interface User {
  id: string;
  username: string;
  displayName?: string;
  password?: string;
  email: string;
  nativeCurrency: Currency;
  balance: number; // Stored in USD
  freezeBalance: number; // Stored in USD
  creditScore: number;
  status: UserStatus;
  freezeReason?: string;
  tradeMode: TradeMode;
  referredByAdminId?: string;
  referralCodeUsed?: string;
  isNew?: boolean;
  registeredTime?: string;
  createdAt: string;
}

export type AdminRole = 'SUPREME_OWNER' | 'SUPER_ADMIN' | 'SUB_ADMIN';

export interface AdminLoginSession {
  id: string;
  timestamp: string;
  ip: string;
  deviceType: 'iPhone' | 'Android' | 'Windows PC' | 'Mac Desktop' | 'Linux' | 'Tablet';
  userAgent: string;
}

export interface AdminAccount {
  id: string;
  username: string;
  displayName?: string;
  password?: string;
  role: AdminRole;
  referralCode: string;
  permissions: string[];
  telegramSupportLink?: string;
  prefilledMessage?: string;
  createdBy?: string | null;
  createdAt: string;
  loginHistory: AdminLoginSession[];
}

export type TradeOutcome = 'WIN' | 'LOSS' | 'PENDING';

export interface TradeOrder {
  id: string;
  userId: string;
  username: string;
  symbol: string;
  coinName?: string;
  direction: 'UP' | 'DOWN';
  durationSeconds: number; // 30, 60, 120, 180, 300
  profitPercent: number; // 20, 20, 40, 60, 80
  marginUsd: number;
  marginNative?: number;
  nativeCurrency?: Currency;
  entryPrice: number;
  currentPrice?: number;
  exitPrice?: number;
  finalPrice?: number;
  targetPrice?: number;
  startTime?: number; // ms
  endTime?: number; // ms
  outcome: TradeOutcome;
  payoutUsd: number;
  status: 'RUNNING' | 'SETTLED';
  adminOverride?: TradeMode;
  settledAt?: string;
  closedAt?: string;
  createdAt?: string;
  expiresAt?: string;
}

export interface WalletRequest {
  id: string;
  userId: string;
  username: string;
  type: 'DEPOSIT' | 'WITHDRAWAL';
  amountUsd: number;
  amountNative: number;
  currency: Currency;
  network: string; // e.g. TRC20, Bank, UPI/PIX
  addressOrAccount: string;
  txHash?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  remarks?: string;
  createdAt: string;
  processedAt?: string;
}

export interface SupportNotice {
  title: string;
  date: string;
  content: string;
  isActive: boolean;
}

export interface AppConfig {
  telegramSupportUsername: string;
  telegramLink: string;
  exchangeRates: Record<Currency, number>;
  minDepositUsd: number;
  minWithdrawalUsd: number;
  platformNotice: string;
}

export interface CoinTicker {
  symbol: string;
  name: string;
  rank: number;
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume24h: string;
  iconBg: string;
  iconSymbol: string;
}

export interface Candlestick {
  time: number; // Unix timestamp
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}
