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
  UserStatus,
  Currency
} from '../types.ts';
import { cleanMobileInput, isPasswordEquivalent } from '../utils/sanitizer.ts';
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

  // Sync all admins across Firestore, Backend, and localDb
  async syncAllAdmins(): Promise<void> {
    if (firestoreDb) {
      try {
        const snap = await getDocs(collection(firestoreDb, 'admins'));
        snap.forEach(d => {
          const adm = d.data() as AdminAccount;
          if (adm && adm.id && adm.username) {
            localDb.addAdmin(adm);
          }
        });
      } catch (err) {
        console.warn('Firestore admins sync warning:', err);
      }
    }
    try {
      const resp = await fetch('/api/admin/subadmins?adminId=admin_main_002');
      if (resp.ok) {
        const list = await resp.json();
        if (Array.isArray(list)) {
          list.forEach((adm: AdminAccount) => {
            if (adm && adm.id && adm.username) {
              localDb.addAdmin(adm);
            }
          });
        }
      }
    } catch {}
  },

  // Client & Admin Unified Auth (Cross-Device: localDb -> Backend Server -> Firestore -> Supabase)
  async loginUser(username: string, password: string): Promise<{
    success: boolean;
    user?: User;
    isAdmin?: boolean;
    admin?: AdminAccount;
    error?: string;
  }> {
    const cleanUser = cleanMobileInput(username || '');
    const cleanPass = cleanMobileInput(password || '');

    // 1. Check localDb first
    const localRes = localDb.login(cleanUser, cleanPass);
    if (localRes.success) {
      return localRes;
    }

    // 2. Try Backend Server API (/api/auth/login)
    try {
      const resp = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: cleanUser, password: cleanPass })
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data.isAdmin && data.admin) {
          localDb.addAdmin(data.admin);
          return { success: true, isAdmin: true, admin: data.admin };
        }
        if (data.user) {
          localDb.addUser(data.user);
          return { success: true, isAdmin: false, user: data.user };
        }
      }
    } catch {}

    // 3. Try Firestore admins and users (Cross-Device mobile to PC sync)
    if (firestoreDb) {
      try {
        const admSnap = await getDocs(collection(firestoreDb, 'admins'));
        let matchedAdm: AdminAccount | null = null;
        admSnap.forEach(d => {
          const a = d.data() as AdminAccount;
          if (a && cleanMobileInput(a.username).toLowerCase() === cleanUser.toLowerCase()) {
            if (isPasswordEquivalent(cleanPass, a.password || '')) {
              matchedAdm = a;
            }
          }
        });
        if (matchedAdm) {
          localDb.addAdmin(matchedAdm);
          return { success: true, isAdmin: true, admin: matchedAdm };
        }

        const usrSnap = await getDocs(collection(firestoreDb, 'users'));
        let matchedUsr: User | null = null;
        usrSnap.forEach(d => {
          const u = d.data() as User;
          if (u && cleanMobileInput(u.username).toLowerCase() === cleanUser.toLowerCase()) {
            if (isPasswordEquivalent(cleanPass, (u as any).password || '')) {
              matchedUsr = u;
            }
          }
        });
        if (matchedUsr) {
          localDb.addUser(matchedUsr);
          return { success: true, isAdmin: false, user: matchedUsr };
        }
      } catch (e) {
        console.warn('Firestore login check warning:', e);
      }
    }

    // 4. Supabase Client Query
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: userRows, error } = await supabase
          .from('users')
          .select('*')
          .ilike('username', cleanUser)
          .limit(1);

        if (!error && userRows && userRows.length > 0) {
          const row = userRows[0];
          if (row.password_hash && row.password_hash !== cleanPass) {
            return { success: false, error: 'Invalid password. Please check capitalization.' };
          }
          if (row.status === 'Suspended' || row.status === 'Frozen') {
            return { success: false, error: `Account is ${row.status}. Contact Support Desk.` };
          }
          if (['SUPREME_OWNER', 'SUPER_ADMIN', 'SUB_ADMIN', 'ADMIN'].includes(row.role)) {
            const adminObj: AdminAccount = {
              id: row.id,
              username: row.username,
              displayName: row.display_name || row.username,
              role: row.role as any,
              referralCode: row.referral_code_used || 'SUPER786',
              permissions: ['manage_users', 'manage_trades', 'manage_finance', 'manage_notices', 'manage_subadmins'],
              loginHistory: [],
              createdAt: row.created_at
            };
            localDb.addAdmin(adminObj);
            return { success: true, isAdmin: true, admin: adminObj };
          }

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
            balance: bal ? Number(bal.available_usd) : 1000.0,
            freezeBalance: bal ? Number(bal.frozen_usd) : 0.0,
            creditScore: row.credit_score || 95,
            status: row.status || 'Active',
            tradeMode: row.trade_mode || 'AUTO',
            referralCodeUsed: row.referral_code_used,
            referredByAdminId: row.referred_by_admin_id,
            registeredTime: row.registered_time || new Date().toLocaleString(),
            createdAt: row.created_at
          };

          localDb.addUser(userObj);
          return { success: true, isAdmin: false, user: userObj };
        }
      } catch (err) {
        console.warn('Supabase login check warning:', err);
      }
    }

    return { success: false, error: localRes.error || 'Account not found. Please verify your username.' };
  },

  async registerUser(data: {
    username: string;
    fullName?: string;
    password?: string;
    referralCode?: string;
    nativeCurrency?: string;
  }): Promise<{ success: boolean; user?: User; error?: string }> {
    const cleanUser = cleanMobileInput(data.username || '');
    const cleanPass = cleanMobileInput(data.password || '');
    const cleanFullName = cleanMobileInput(data.fullName || cleanUser);
    const cleanRef = cleanMobileInput(data.referralCode || '').toUpperCase();
    const currency = data.nativeCurrency || 'USD';

    if (!cleanUser || cleanUser.length < 3) {
      return { success: false, error: 'Username must be at least 3 characters.' };
    }
    if (cleanPass.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters.' };
    }
    if (!cleanRef) {
      return {
        success: false,
        error: 'Invitation code is required! Registration is strictly by administrator referral code only.'
      };
    }

    // Sync all admins across backend and Firestore before validating
    try {
      await this.syncAllAdmins();
    } catch {}

    // 1. Primary Registration in localDb (Strict matching against adminAccounts)
    const localRes = localDb.register({
      username: cleanUser,
      fullName: cleanFullName,
      password: cleanPass,
      referralCode: cleanRef,
      nativeCurrency: currency
    });

    if (!localRes.success || !localRes.user) {
      return { success: false, error: localRes.error || 'Registration failed.' };
    }

    const newUser = localRes.user;

    // 2. Persistent Sync to Supabase
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('users').upsert({
          id: newUser.id,
          username: newUser.username,
          display_name: newUser.displayName,
          password_hash: cleanPass,
          email: newUser.email,
          role: 'USER',
          native_currency: newUser.nativeCurrency,
          credit_score: newUser.creditScore,
          status: newUser.status,
          trade_mode: newUser.tradeMode,
          referred_by_admin_id: newUser.referredByAdminId,
          referral_code_used: newUser.referralCodeUsed,
          registered_time: newUser.registeredTime,
          created_at: newUser.createdAt
        });

        await supabase.from('balances').upsert({
          user_id: newUser.id,
          available_usd: 0.0,
          frozen_usd: 0.0,
          native_currency: newUser.nativeCurrency,
          exchange_rate: 1.0
        });
      } catch (err) {
        console.warn('Supabase register sync warning:', err);
      }
    }

    // 3. Persistent Sync to Firestore
    if (firestoreDb) {
      try {
        await setDoc(doc(firestoreDb, 'users', newUser.id), newUser);
      } catch (err) {
        console.warn('Firestore register sync warning:', err);
      }
    }

    // 4. Sync to Express Backend Server (database.json)
    try {
      fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: cleanUser,
          fullName: cleanFullName,
          password: cleanPass,
          referralCode: cleanRef,
          nativeCurrency: currency
        })
      }).catch(console.warn);
    } catch {}

    // 5. Real-time Audio Chime & Storage Event Broadcast
    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(new CustomEvent('flowcoin_new_user_registered', { detail: newUser }));
        localStorage.setItem('flowcoin_last_registered_time', Date.now().toString());
      } catch (e) {
        console.warn('Registration event broadcast warning:', e);
      }
    }

    return { success: true, user: newUser };
  },

  async getUserProfile(id: string): Promise<{ success: boolean; user?: User; error?: string }> {
    const localRes = localDb.getUserProfile(id);
    const localUser = localRes.success ? localRes.user : null;

    let cloudUser: User | null = null;
    let backendUser: User | null = null;

    // 1. Check Firestore for real-time document
    if (firestoreDb) {
      try {
        const snap = await getDoc(doc(firestoreDb, 'users', id));
        if (snap.exists()) {
          cloudUser = snap.data() as User;
        }
      } catch {
        // Handled
      }
    }

    // 2. Check Express Backend (/api/auth/profile/:id)
    try {
      const resp = await fetch(`/api/auth/profile/${encodeURIComponent(id)}`);
      if (resp.ok) {
        const data = await resp.json();
        if (data.success && data.user) {
          backendUser = data.user;
        }
      }
    } catch {}

    const authoritativeSource = cloudUser || backendUser;

    if (authoritativeSource) {
      const finalBalance = authoritativeSource.balance !== undefined
        ? Number(authoritativeSource.balance)
        : (localUser ? localUser.balance : 0);

      const finalFreeze = authoritativeSource.freezeBalance !== undefined
        ? Number(authoritativeSource.freezeBalance)
        : (localUser ? localUser.freezeBalance : 0);

      const resolvedUser: User = {
        ...(localUser || authoritativeSource),
        ...authoritativeSource,
        balance: finalBalance,
        freezeBalance: finalFreeze,
        status: authoritativeSource.status || localUser?.status || 'Active',
        tradeMode: authoritativeSource.tradeMode || localUser?.tradeMode || 'AUTO',
        creditScore: authoritativeSource.creditScore !== undefined ? Number(authoritativeSource.creditScore) : (localUser?.creditScore ?? 100),
        freezeReason: authoritativeSource.freezeReason !== undefined ? authoritativeSource.freezeReason : localUser?.freezeReason
      };

      localDb.syncUserFromCloud(resolvedUser);
      try {
        localStorage.setItem('flowcoin_current_user', JSON.stringify(resolvedUser));
      } catch {}
      return { success: true, user: resolvedUser };
    }

    if (localUser) {
      return { success: true, user: localUser };
    }

    return { success: false, error: 'User account not found.' };
  },

  async changePassword(userId: string, _oldPass: string, newPass: string): Promise<any> {
    return localDb.resetPassword(userId, newPass);
  },

  // Admin Auth & Profile with Multi-device Backend & Firestore sync
  async loginAdmin(username: string, password: string): Promise<{ success: boolean; admin?: AdminAccount; error?: string }> {
    const cleanUser = cleanMobileInput(username || '').toLowerCase();
    const cleanPass = cleanMobileInput(password || '');

    // 1. Check localDb first
    const res = localDb.login(cleanUser, cleanPass);
    if (res.isAdmin && res.admin) {
      return { success: true, admin: res.admin };
    }

    // 2. Try Backend Server API (/api/admin/login)
    try {
      const resp = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: cleanUser, password: cleanPass })
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data.success && data.admin) {
          localDb.addAdmin(data.admin);
          return { success: true, admin: data.admin };
        }
      }
    } catch (e) {
      // Backend request fallback
    }

    // 3. Try Firestore `admins` collection (Cross-device persistence)
    if (firestoreDb) {
      try {
        const snap = await getDocs(collection(firestoreDb, 'admins'));
        let matchedAdmin: AdminAccount | null = null;
        snap.forEach(d => {
          const adm = d.data() as AdminAccount;
          if (adm && adm.username && cleanMobileInput(adm.username).toLowerCase() === cleanUser) {
            if (isPasswordEquivalent(cleanPass, adm.password || '')) {
              matchedAdmin = adm;
            }
          }
        });
        if (matchedAdmin) {
          localDb.addAdmin(matchedAdmin);
          return { success: true, admin: matchedAdmin };
        }
      } catch (e) {
        // Handled
      }
    }

    return { success: false, error: res.error || 'Invalid administrator credentials' };
  },

  async getAdminProfile(id: string): Promise<{ success: boolean; admin?: AdminAccount; error?: string }> {
    // 1. Check localDb
    const localRes = localDb.getAdminProfile(id);
    if (localRes.success && localRes.admin) {
      return localRes;
    }

    // 2. Check Backend Server API
    try {
      const resp = await fetch(`/api/admin/profile/${id}`);
      if (resp.ok) {
        const data = await resp.json();
        if (data.success && data.admin) {
          localDb.addAdmin(data.admin);
          return { success: true, admin: data.admin };
        }
      }
    } catch (e) {}

    // 3. Check Firestore
    if (firestoreDb) {
      try {
        const snap = await getDoc(doc(firestoreDb, 'admins', id));
        if (snap.exists()) {
          const adm = snap.data() as AdminAccount;
          localDb.addAdmin(adm);
          return { success: true, admin: adm };
        }
      } catch (e) {}
    }

    return { success: false, error: 'Admin account not found' };
  },

  // Admin User Management with Multi-Cloud Unified Sync
  async getAdminUsers(adminId: string): Promise<User[]> {
    const userMap = new Map<string, User>();

    // 1. Load from localDb
    const localUsers = localDb.getUsers(adminId);
    localUsers.forEach(u => userMap.set(u.id, u));

    // 2. Load from Express Backend Server
    try {
      const resp = await fetch(`/api/admin/users?adminId=${encodeURIComponent(adminId)}`);
      if (resp.ok) {
        const serverUsers = await resp.json();
        if (Array.isArray(serverUsers)) {
          serverUsers.forEach((u: User) => {
            const existing = userMap.get(u.id);
            const merged: User = existing ? {
              ...existing,
              ...u,
              balance: u.balance !== undefined ? Number(u.balance) : existing.balance,
              freezeBalance: u.freezeBalance !== undefined ? Number(u.freezeBalance) : existing.freezeBalance
            } : u;
            userMap.set(u.id, merged);
            localDb.syncUserFromCloud(merged);
          });
        }
      }
    } catch {}

    // 3. Load from Firestore if connected
    if (firestoreDb) {
      try {
        const snap = await getDocs(collection(firestoreDb, 'users'));
        snap.forEach(docSnap => {
          const u = docSnap.data() as User;
          if (u && u.id) {
            const existing = userMap.get(u.id);
            const merged: User = existing ? {
              ...existing,
              ...u,
              balance: u.balance !== undefined ? Number(u.balance) : existing.balance,
              freezeBalance: u.freezeBalance !== undefined ? Number(u.freezeBalance) : existing.freezeBalance
            } : u;
            userMap.set(u.id, merged);
            localDb.syncUserFromCloud(merged);
          }
        });
      } catch (err) {
        console.warn('Firestore fetch users warning:', err);
      }
    }

    const merged = Array.from(userMap.values());
    const adminRes = localDb.getAdminProfile(adminId);
    const admin = adminRes.admin;

    if (admin && admin.role === 'SUB_ADMIN') {
      return merged.filter(
        u => u.referredByAdminId === admin.id ||
             (admin.referralCode && cleanMobileInput(u.referralCodeUsed || '').toUpperCase() === cleanMobileInput(admin.referralCode).toUpperCase()) ||
             (admin.username && cleanMobileInput(u.referralCodeUsed || '').toUpperCase() === cleanMobileInput(admin.username).toUpperCase())
      );
    }

    return merged;
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
        } catch (err) {
          console.warn('Supabase balance update sync error:', err);
        }
      }
      // Sync to Firestore
      if (firestoreDb) {
        try {
          await setDoc(doc(firestoreDb, 'users', userId), {
            balance: res.user.balance,
            freezeBalance: res.user.freezeBalance
          }, { merge: true });
        } catch (err) {
          console.warn('Firestore balance update sync error:', err);
        }
      }

      // Sync to Express Backend Server with explicit balances
      try {
        fetch(`/api/admin/users/${userId}/balance`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action,
            amountUsd,
            balance: res.user.balance,
            freezeBalance: res.user.freezeBalance
          })
        }).catch(console.warn);
      } catch {}

      // Broadcast real-time balance update event
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('flowcoin_user_balance_updated', { detail: res.user }));
        localStorage.setItem('flowcoin_last_balance_update', Date.now().toString());
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
        await setDoc(doc(firestoreDb, 'users', userId), { tradeMode }, { merge: true });
      } catch {}
    }
    try {
      fetch(`/api/admin/users/${userId}/trade-mode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tradeMode })
      }).catch(console.warn);
    } catch {}
    return res;
  },

  async updateUserStatus(userId: string, status: UserStatus): Promise<any> {
    return this.freezeUserAccount(userId, status === 'Active' ? 'reactivate' : 'freeze');
  },

  async updateCreditScore(userId: string, creditScore: number): Promise<any> {
    const res = localDb.updateCreditScore(userId, creditScore);
    if (res.success && firestoreDb) {
      try {
        await setDoc(doc(firestoreDb, 'users', userId), { creditScore }, { merge: true });
      } catch (err) {
        console.warn('Firestore updateCreditScore sync warning:', err);
      }
    }
    try {
      fetch(`/api/admin/users/${userId}/credit-score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creditScore })
      }).catch(console.warn);
    } catch {}
    if (typeof window !== 'undefined' && res.user) {
      window.dispatchEvent(new CustomEvent('flowcoin_user_balance_updated', { detail: res.user }));
    }
    return res;
  },

  async resetUserPassword(userId: string, newPassword: string): Promise<any> {
    const res = localDb.resetPassword(userId, newPassword);
    try {
      fetch(`/api/admin/users/${userId}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword })
      }).catch(console.warn);
    } catch {}
    return res;
  },

  async freezeUserAccount(userId: string, action: 'freeze' | 'reactivate', reason?: string): Promise<any> {
    const res = localDb.freezeUser(userId, action, reason);
    if (res.success && firestoreDb && res.user) {
      try {
        await setDoc(doc(firestoreDb, 'users', userId), {
          status: res.user.status,
          freezeReason: res.user.freezeReason || ''
        }, { merge: true });
      } catch (err) {
        console.warn('Firestore freezeUserAccount sync warning:', err);
      }
    }
    try {
      fetch(`/api/admin/users/${userId}/freeze-account`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason })
      }).catch(console.warn);
    } catch {}
    if (typeof window !== 'undefined' && res.user) {
      window.dispatchEvent(new CustomEvent('flowcoin_user_balance_updated', { detail: res.user }));
      localStorage.setItem('flowcoin_last_freeze_update', Date.now().toString());
    }
    return res;
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
    nativeCurrency?: Currency;
  }): Promise<any> {
    const res = localDb.register({
      username: payload.username,
      password: payload.password || '123123',
      referralCode: payload.referralCode || 'MASTER321',
      nativeCurrency: payload.nativeCurrency || 'INR'
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

  // Sub-Admins Management with Cross-Device Persistence
  async getSubAdmins(adminId?: string): Promise<AdminAccount[]> {
    const adminMap = new Map<string, AdminAccount>();
    // 1. Load localDb
    localDb.getAllAdmins(adminId).forEach(a => adminMap.set(a.id, a));

    // 2. Load from Backend Server
    try {
      const resp = await fetch(`/api/admin/subadmins${adminId ? `?adminId=${adminId}` : ''}`);
      if (resp.ok) {
        const list = await resp.json();
        if (Array.isArray(list)) {
          list.forEach((a: AdminAccount) => {
            if (!adminMap.has(a.id)) {
              adminMap.set(a.id, a);
              localDb.addAdmin(a);
            }
          });
        }
      }
    } catch {}

    // 3. Load from Firestore
    if (firestoreDb) {
      try {
        const snap = await getDocs(collection(firestoreDb, 'admins'));
        snap.forEach(d => {
          const a = d.data() as AdminAccount;
          if (a && a.id) {
            if (!adminMap.has(a.id)) {
              adminMap.set(a.id, a);
              localDb.addAdmin(a);
            }
          }
        });
      } catch {}
    }

    return Array.from(adminMap.values());
  },

  async createSubAdmin(payload: {
    creatorAdminId: string;
    username: string;
    password: string;
    referralCode: string;
    permissions: string[];
    displayName?: string;
  }): Promise<any> {
    const res = localDb.createSubAdmin(payload);
    if (!res.success || !res.admin) {
      return res;
    }

    const createdAdmin = res.admin;

    // 1. Sync to backend server
    try {
      fetch('/api/admin/subadmins/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).catch(console.warn);
    } catch {}

    // 2. Sync to Firestore
    if (firestoreDb) {
      try {
        setDoc(doc(firestoreDb, 'admins', createdAdmin.id), createdAdmin).catch(console.warn);
      } catch {}
    }

    return res;
  },

  async updateSubAdmin(adminId: string, updates: Partial<AdminAccount>): Promise<any> {
    const res = localDb.updateSubAdmin(adminId, updates);
    if (firestoreDb && res.admin) {
      setDoc(doc(firestoreDb, 'admins', adminId), updates, { merge: true }).catch(console.warn);
    }
    return res;
  },

  async deleteSubAdmin(adminId: string): Promise<any> {
    const res = localDb.deleteSubAdmin(adminId);
    if (firestoreDb) {
      deleteDoc(doc(firestoreDb, 'admins', adminId)).catch(console.warn);
    }
    return res;
  },

  async customizeReferralCode(adminId: string, newReferralCode: string): Promise<any> {
    const res = localDb.customizeReferral(adminId, newReferralCode);
    if (firestoreDb) {
      setDoc(doc(firestoreDb, 'admins', adminId), { referralCode: newReferralCode }, { merge: true }).catch(console.warn);
    }
    return res;
  },

  async getSessionsAudit(_adminId: string): Promise<any[]> {
    const admins = await this.getSubAdmins(_adminId);
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
    
    // Execute trade in database immediately (0ms delay)
    const res = localDb.createTrade(fullPayload);

    if (res.success && res.trade) {
      // Background non-blocking sync to Supabase
      if (isSupabaseConfigured && supabase) {
        (async () => {
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
          } catch (e) {
            console.warn('Supabase trade sync warning:', e);
          }
        })();
      }

      // Immediate Firestore balance and trade sync
      if (firestoreDb) {
        setDoc(doc(firestoreDb, 'trades', res.trade.id), res.trade).catch(console.warn);
        if (res.balance !== undefined) {
          setDoc(doc(firestoreDb, 'users', res.trade.userId), {
            balance: res.balance,
            freezeBalance: res.freezeBalance
          }, { merge: true }).catch(console.warn);
        }
      }

      // Immediate real-time window event broadcasts
      if (typeof window !== 'undefined') {
        try {
          window.dispatchEvent(new CustomEvent('flowcoin_new_trade_placed', { detail: res.trade }));
          window.dispatchEvent(new CustomEvent('flowcoin_user_balance_updated', {
            detail: { id: res.trade.userId, balance: res.balance, freezeBalance: res.freezeBalance }
          }));
          localStorage.setItem('flowcoin_last_trade_time', Date.now().toString());
        } catch (e) {
          console.warn('Trade event dispatch warning:', e);
        }
      }

      // Sync balance to Express server backend
      try {
        fetch(`/api/admin/users/${res.trade.userId}/balance`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            balance: res.balance,
            freezeBalance: res.freezeBalance
          })
        }).catch(console.warn);
      } catch {}
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
        await setDoc(doc(firestoreDb, 'trades', tradeId), {
          outcome: chosenOutcome,
          status: 'SETTLED',
          exitPrice: chosenPrice,
          payoutUsd: res.trade.payoutUsd,
          settledAt: new Date().toISOString()
        }, { merge: true });

        await setDoc(doc(firestoreDb, 'users', res.trade.userId), {
          balance: res.balance,
          freezeBalance: res.freezeBalance
        }, { merge: true });
      } catch {
        // Handled
      }
    }

    // Sync balance to Express server backend
    if (res.success && res.trade) {
      try {
        fetch(`/api/admin/users/${res.trade.userId}/balance`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            balance: res.balance,
            freezeBalance: res.freezeBalance
          })
        }).catch(console.warn);
      } catch {}
    }

    if (res.success && res.trade && typeof window !== 'undefined') {
      try {
        window.dispatchEvent(new CustomEvent('flowcoin_user_balance_updated', {
          detail: { id: res.trade.userId, balance: res.balance, freezeBalance: res.freezeBalance }
        }));
      } catch {
        // Handled
      }
    }

    return res;
  },

  async adminAdjustTrade(tradeId: string, forceOutcome: 'WIN' | 'LOSS'): Promise<any> {
    return this.settleTrade(tradeId, forceOutcome, 81500);
  },

  async adminUpdateActiveTrade(tradeId: string, updates: { marginUsd?: number; profitPercent?: number; direction?: 'UP' | 'DOWN'; durationSeconds?: number }): Promise<any> {
    const res = localDb.updateActiveTrade(tradeId, updates);
    if (!res.success) return res;

    if (firestoreDb && res.trade) {
      try {
        await setDoc(doc(firestoreDb, 'trades', tradeId), res.trade, { merge: true });
        await setDoc(doc(firestoreDb, 'users', res.trade.userId), {
          balance: res.balance,
          freezeBalance: res.freezeBalance
        }, { merge: true });
      } catch (e) {
        console.warn("Firestore updateActiveTrade sync error:", e);
      }
    }

    if (isSupabaseConfigured && supabase && res.trade) {
      try {
        await supabase.from('trades').update({
          margin_usd: res.trade.marginUsd,
          profit_percent: res.trade.profitPercent,
          direction: res.trade.direction
        }).eq('id', tradeId);
      } catch {}
    }

    try {
      fetch(`/api/admin/trades/${tradeId}/update-active`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      }).catch(console.warn);
    } catch {}

    if (typeof window !== 'undefined' && res.trade) {
      try {
        window.dispatchEvent(new CustomEvent('flowcoin_trade_updated', { detail: res.trade }));
        window.dispatchEvent(new CustomEvent('flowcoin_user_balance_updated', {
          detail: { id: res.trade.userId, balance: res.balance, freezeBalance: res.freezeBalance }
        }));
        localStorage.setItem('flowcoin_last_trade_time', Date.now().toString());
      } catch {}
    }

    return res;
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

    if (res.success && res.request && firestoreDb) {
      try {
        await setDoc(doc(firestoreDb, 'walletRequests', res.request.id), res.request);
      } catch (err) {
        console.warn('Firestore deposit sync warning:', err);
      }
    }

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

    if (res.success && res.request && typeof window !== 'undefined') {
      try {
        window.dispatchEvent(new CustomEvent('flowcoin_new_wallet_request', { detail: res.request }));
        localStorage.setItem('flowcoin_last_request_time', Date.now().toString());
      } catch (e) {
        console.warn('Wallet event dispatch warning:', e);
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

    if (res.success && res.request && firestoreDb) {
      try {
        await setDoc(doc(firestoreDb, 'walletRequests', res.request.id), res.request);
      } catch (err) {
        console.warn('Firestore withdrawal sync warning:', err);
      }
    }

    if (res.success && res.user) {
      // 1. Sync updated balance to Firestore
      if (firestoreDb) {
        try {
          setDoc(doc(firestoreDb, 'users', payload.userId), {
            balance: res.user.balance
          }, { merge: true }).catch(console.warn);
        } catch {}
      }

      // 2. Sync updated balance to Express backend server
      try {
        fetch(`/api/admin/users/${payload.userId}/balance`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ balance: res.user.balance })
        }).catch(console.warn);
      } catch {}

      // 3. Dispatch real-time balance update
      if (typeof window !== 'undefined') {
        try {
          window.dispatchEvent(new CustomEvent('flowcoin_user_balance_updated', { detail: res.user }));
          localStorage.setItem('flowcoin_current_user', JSON.stringify(res.user));
          localStorage.setItem('flowcoin_last_balance_update', Date.now().toString());
        } catch {}
      }
    }

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

    if (res.success && res.request && typeof window !== 'undefined') {
      try {
        window.dispatchEvent(new CustomEvent('flowcoin_new_wallet_request', { detail: res.request }));
        localStorage.setItem('flowcoin_last_request_time', Date.now().toString());
      } catch (e) {
        console.warn('Wallet event dispatch warning:', e);
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

    if (res.success && res.user) {
      if (firestoreDb) {
        try {
          setDoc(doc(firestoreDb, 'users', res.user.id), {
            balance: res.user.balance
          }, { merge: true }).catch(console.warn);
        } catch {}
      }

      try {
        fetch(`/api/admin/users/${res.user.id}/balance`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ balance: res.user.balance })
        }).catch(console.warn);
      } catch {}

      if (typeof window !== 'undefined') {
        try {
          window.dispatchEvent(new CustomEvent('flowcoin_user_balance_updated', { detail: res.user }));
          localStorage.setItem('flowcoin_current_user', JSON.stringify(res.user));
        } catch {}
      }
    }

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
