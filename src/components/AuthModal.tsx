import React, { useState } from 'react';
import {
  X,
  User as UserIcon,
  Shield,
  Lock,
  Eye,
  EyeOff,
  Tag,
  ChevronDown,
  CheckCircle2,
  ArrowRight,
  Globe,
  Sparkles
} from 'lucide-react';
import { User, AdminAccount, Currency } from '../types.ts';
import { cleanMobileInput } from '../utils/sanitizer.ts';
import { api } from '../services/api.ts';
import { localDb } from '../services/localDb.ts';
import { supabase, isSupabaseConfigured } from '../services/supabase.ts';

interface CountryCurrencyOption {
  code: Currency;
  flagCode: string;
  country: string;
  label: string;
  symbol: string;
}

const COUNTRY_OPTIONS: CountryCurrencyOption[] = [
  {
    code: 'USD',
    flagCode: '🇺🇸',
    country: 'United States & International',
    label: 'US Dollar (USD) ($)',
    symbol: '$'
  },
  {
    code: 'IN',
    flagCode: '🇮🇳',
    country: 'India',
    label: 'Indian Rupee (INR) (₹)',
    symbol: '₹'
  } as unknown as CountryCurrencyOption,
  {
    code: 'PK',
    flagCode: '🇵🇰',
    country: 'Pakistan',
    label: 'Pakistani Rupee (PKR) (₨)',
    symbol: '₨'
  } as unknown as CountryCurrencyOption,
  {
    code: 'BR',
    flagCode: '🇧🇷',
    country: 'Brazil',
    label: 'Brazilian Real (BRL) (R$)',
    symbol: 'R$'
  } as unknown as CountryCurrencyOption,
  {
    code: 'EG',
    flagCode: '🇪🇬',
    country: 'Egypt',
    label: 'Egyptian Pound (EGP) (E£)',
    symbol: 'E£'
  } as unknown as CountryCurrencyOption,
  {
    code: 'USDT',
    flagCode: '🟢',
    country: 'Global Web3 & Crypto',
    label: 'Tether USD (USDT) (₮)',
    symbol: '₮'
  }
];

// Helper to normalize currency codes
const resolveCurrency = (code: string): Currency => {
  if (code === 'IN') return 'INR';
  if (code === 'PK') return 'PKR';
  if (code === 'BR') return 'BRL';
  if (code === 'EG') return 'EGP';
  return (code as Currency) || 'USD';
};

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: User) => void;
  onAdminLoginSuccess?: (admin: AdminAccount) => void;
  defaultCurrency: Currency;
  initialMode?: 'login' | 'register';
  initialReferralCode?: string;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  onAdminLoginSuccess,
  defaultCurrency = 'USD',
  initialMode = 'login',
  initialReferralCode = ''
}) => {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);

  // Form Fields
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [referralCode, setReferralCode] = useState(initialReferralCode);
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>(defaultCurrency);

  React.useEffect(() => {
    if (initialMode) {
      setMode(initialMode);
    }
  }, [initialMode]);

  React.useEffect(() => {
    if (initialReferralCode) {
      setReferralCode(initialReferralCode.toUpperCase());
    }
  }, [initialReferralCode]);

  // Visibility Toggles
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Sub-modal: Select Country & Currency (Matching image_2fc4b43d.png)
  const [isCountryModalOpen, setIsCountryModalOpen] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  interface SavedAccount {
    username: string;
    password?: string;
    displayName?: string;
  }

  const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>([]);

  const loadSavedAccounts = () => {
    try {
      const raw = localStorage.getItem('flowcoin_saved_accounts');
      let list: SavedAccount[] = raw ? JSON.parse(raw) : [];
      if (!list.some(a => a.username.toLowerCase() === '123123123123')) {
        list.push({ username: '123123123123', password: '123123', displayName: 'Demo Trader' });
      }
      setSavedAccounts(list);
    } catch {
      setSavedAccounts([{ username: '123123123123', password: '123123', displayName: 'Demo Trader' }]);
    }
  };

  const saveAccountCredentials = (uname: string, pass: string, dName?: string) => {
    try {
      const raw = localStorage.getItem('flowcoin_saved_accounts');
      let list: SavedAccount[] = raw ? JSON.parse(raw) : [];
      list = list.filter(a => a.username.toLowerCase() !== uname.toLowerCase());
      list.unshift({
        username: uname,
        password: pass,
        displayName: dName || uname
      });
      if (list.length > 3) list = list.slice(0, 3);
      localStorage.setItem('flowcoin_saved_accounts', JSON.stringify(list));
      setSavedAccounts(list);
    } catch (e) {
      console.warn('Failed to save account credentials:', e);
    }
  };

  React.useEffect(() => {
    if (isOpen) {
      loadSavedAccounts();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentCountry =
    COUNTRY_OPTIONS.find(c => resolveCurrency(c.code) === selectedCurrency) ||
    COUNTRY_OPTIONS[0];

  const performLogin = async (cleanUser: string, cleanPass: string) => {
    setError('');
    setLoading(true);

    try {
      // 1. Check localDb first
      const localCheck = localDb.login(cleanUser, cleanPass);
      if (localCheck.success) {
        if (localCheck.isAdmin && localCheck.admin) {
          localStorage.setItem('flowcoin_admin_id', localCheck.admin.id);
          if (onAdminLoginSuccess) onAdminLoginSuccess(localCheck.admin);
          onClose();
          return;
        } else if (localCheck.user) {
          saveAccountCredentials(cleanUser, cleanPass, localCheck.user.displayName);
          onLoginSuccess(localCheck.user);
          onClose();
          return;
        }
      }

      // 2. Direct Supabase Client Login Query
      if (isSupabaseConfigured && supabase) {
        const { data: userRows, error: userErr } = await supabase
          .from('users')
          .select('*')
          .ilike('username', cleanUser)
          .limit(1);

        if (!userErr && userRows && userRows.length > 0) {
          const row = userRows[0];

          if (row.password_hash && row.password_hash !== cleanPass) {
            setError('Invalid password. Please check capitalization.');
            setLoading(false);
            return;
          }

          if (row.status === 'Suspended' || row.status === 'Frozen') {
            setError(`Account is ${row.status}. Contact Support Desk.`);
            setLoading(false);
            return;
          }

          // Check if admin account
          if (['SUPREME_OWNER', 'SUPER_ADMIN', 'SUB_ADMIN', 'ADMIN'].includes(row.role)) {
            const adminObj: AdminAccount = {
              id: row.id,
              username: row.username,
              displayName: row.display_name || row.username,
              role: row.role as any,
              referralCode: row.referral_code_used || 'ROOT786',
              permissions: ['manage_users', 'manage_trades', 'manage_finance', 'manage_notices', 'manage_subadmins'],
              loginHistory: [],
              createdAt: row.created_at
            };
            localStorage.setItem('flowcoin_admin_id', adminObj.id);
            if (onAdminLoginSuccess) onAdminLoginSuccess(adminObj);
            onClose();
            return;
          }

          // Fetch balances
          const { data: balRows } = await supabase
            .from('balances')
            .select('available_usd, frozen_usd')
            .eq('user_id', row.id)
            .limit(1);

          const bal = balRows && balRows.length > 0 ? balRows[0] : null;
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
          saveAccountCredentials(cleanUser, cleanPass, userObj.displayName);
          onLoginSuccess(userObj);
          onClose();
          return;
        }
      }

      // Local storage auth fallback
      const res = localDb.login(cleanUser, cleanPass);
      if (res.success) {
        if (res.isAdmin && res.admin) {
          localStorage.setItem('flowcoin_admin_id', res.admin.id);
          if (onAdminLoginSuccess) onAdminLoginSuccess(res.admin);
          onClose();
        } else if (res.user) {
          saveAccountCredentials(cleanUser, cleanPass, res.user.displayName);
          onLoginSuccess(res.user);
          onClose();
        }
      } else {
        setError(res.error || 'Login failed. Check your username and password.');
      }
    } catch (err: any) {
      console.warn('Authentication error:', err);
      setError(err?.message || 'Authentication error. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handle1ClickLogin = (acc: SavedAccount) => {
    setUsername(acc.username);
    if (acc.password) {
      setPassword(acc.password);
      performLogin(acc.username, acc.password);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanUser = cleanMobileInput(username);
    const cleanPass = cleanMobileInput(password);

    if (!cleanUser || !cleanPass) {
      setError('Please fill in all mandatory fields');
      return;
    }

    if (mode === 'register') {
      if (!fullName.trim()) {
        setError('Full Name is required');
        return;
      }
      if (cleanPass.length < 6) {
        setError('Password must be at least 6 characters');
        return;
      }
      if (cleanPass !== cleanMobileInput(confirmPassword)) {
        setError('Passwords do not match');
        return;
      }
      if (!referralCode.trim()) {
        setReferralCode('ROOT786');
      }

      setLoading(true);
      try {
        const cleanRef = cleanMobileInput(referralCode || 'ROOT786').toUpperCase();
        const res = await api.registerUser({
          username: cleanUser,
          fullName: cleanMobileInput(fullName),
          password: cleanPass,
          referralCode: cleanRef,
          nativeCurrency: selectedCurrency
        });

        if (res.success && res.user) {
          saveAccountCredentials(cleanUser, cleanPass, res.user.displayName);
          onLoginSuccess(res.user);
          onClose();
        } else {
          setError(res.error || 'Registration failed. Try a different username.');
        }
      } catch (err: any) {
        setError(err?.message || 'Registration error');
      } finally {
        setLoading(false);
      }
    } else {
      performLogin(cleanUser, cleanPass);
    }
  };

  const handleQuickDemoTrader = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.loginUser('123123123123', '123123');
      if (res.success && res.user) {
        onLoginSuccess(res.user);
        onClose();
      } else {
        setError(res.error || 'Demo login failed');
      }
    } catch (err: any) {
      setError(err.message || 'Demo login error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-4 overflow-y-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm sm:max-w-md my-auto flex flex-col items-center"
      >
        {/* Brand Header matching image_ab333b29.png */}
        <div className="flex flex-col items-center justify-center mb-3">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#0284c7] via-[#0369a1] to-[#0c4a6e] flex items-center justify-center p-1 border border-cyan-400/50 shadow-lg shadow-cyan-900/40">
              <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-cyan-300 stroke-current" strokeWidth="2.4">
                <circle cx="12" cy="12" r="9" />
                <path d="M7 12h10" />
                <path d="M12 7v10" />
                <circle cx="12" cy="12" r="4" className="stroke-white" />
              </svg>
            </div>
            <span className="text-xl font-black text-white tracking-wider">COIN BASED</span>
          </div>
          <span className="text-[10px] font-bold tracking-widest text-cyan-400 uppercase mt-0.5">
            Trade &bull; Invest &bull; Grow
          </span>
        </div>

        {/* Modal Card Container */}
        <div className="w-full rounded-3xl bg-[#0c1322] border border-slate-700/80 p-5 sm:p-6 shadow-2xl relative animate-scaleUp">
          {/* Top Close (X) button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          {/* User Icon Badge */}
          <div className="w-14 h-14 rounded-full border border-cyan-400/90 bg-[#080d17] flex items-center justify-center text-cyan-400 shadow-xl shadow-cyan-500/20 mx-auto mb-2">
            <UserIcon className="w-7 h-7 stroke-[1.8]" />
          </div>

          {/* Title & Subtitle */}
          <div className="text-center mb-4">
            <h2 className="text-2xl font-black text-white tracking-wide">
              {mode === 'register' ? 'Create Account' : 'Trader & Admin Login'}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {mode === 'register'
                ? 'Fill the 5 mandatory details to register your account'
                : 'Enter your credentials to access your account or admin portal'}
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex bg-[#080d17] p-1 rounded-2xl border border-slate-800 mb-3.5">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError('');
              }}
              className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
                mode === 'login'
                  ? 'bg-cyan-600 text-slate-950 font-black shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError('');
              }}
              className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
                mode === 'register'
                  ? 'bg-cyan-600 text-slate-950 font-black shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-3 mb-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs text-center font-bold">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            {/* REGISTER FORM (Matching image_ab333b29.png) */}
            {mode === 'register' ? (
              <>
                {/* 1. Username */}
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    1. Username *
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-cyan-400/80 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(cleanMobileInput(e.target.value))}
                      placeholder="Enter username"
                      className="w-full bg-[#080d17] text-[16px] sm:text-xs text-white rounded-2xl pl-10 pr-3.5 py-2.5 border border-slate-700/80 focus:border-cyan-400 focus:outline-none font-mono"
                      required
                    />
                  </div>
                </div>

                {/* 2. Full Name */}
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    2. Full Name *
                  </label>
                  <div className="relative">
                    <Shield className="w-4 h-4 text-cyan-400/80 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Enter your full name"
                      className="w-full bg-[#080d17] text-[16px] sm:text-xs text-white rounded-2xl pl-10 pr-3.5 py-2.5 border border-slate-700/80 focus:border-cyan-400 focus:outline-none"
                      required
                    />
                  </div>
                </div>

                {/* 3. Password */}
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    3. Password *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-cyan-400/80 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(cleanMobileInput(e.target.value))}
                      placeholder="Enter password (min 6 characters)"
                      className="w-full bg-[#080d17] text-[16px] sm:text-xs text-white rounded-2xl pl-10 pr-10 py-2.5 border border-slate-700/80 focus:border-cyan-400 focus:outline-none font-mono"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* 4. Confirm Password */}
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    4. Confirm Password *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-cyan-400/80 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(cleanMobileInput(e.target.value))}
                      placeholder="Confirm password"
                      className="w-full bg-[#080d17] text-[16px] sm:text-xs text-white rounded-2xl pl-10 pr-10 py-2.5 border border-slate-700/80 focus:border-cyan-400 focus:outline-none font-mono"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* 5. Country & Currency */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-300">
                      5. Country & Currency *
                    </label>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold text-cyan-400 bg-cyan-950/60 border border-cyan-500/40">
                      Mandatory
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsCountryModalOpen(true)}
                    className="w-full p-2.5 rounded-2xl bg-[#080d17] border border-cyan-500/40 flex items-center justify-between text-left hover:border-cyan-400 transition-all group"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-sm font-black text-white px-2 py-0.5 bg-slate-800 rounded-lg">
                        {currentCountry.flagCode}
                      </span>
                      <div>
                        <div className="text-xs font-black text-white">{currentCountry.country}</div>
                        <div className="text-[11px] font-bold text-cyan-400">{currentCountry.label}</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1 text-slate-400 group-hover:text-cyan-300 text-xs font-bold">
                      <span>Select</span>
                      <ChevronDown className="w-3.5 h-3.5" />
                    </div>
                  </button>
                </div>

                {/* 6. Referral / Agent Code */}
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    Referral / Agent Code *
                  </label>

                  <div className="relative">
                    <Tag className="w-4 h-4 text-cyan-400/80 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={referralCode}
                      onChange={(e) => setReferralCode(cleanMobileInput(e.target.value).toUpperCase())}
                      placeholder="Enter your Referral code eg ROOT786"
                      className="w-full bg-[#080d17] text-[16px] sm:text-xs text-white placeholder:text-slate-500 font-mono rounded-2xl pl-10 pr-3.5 py-2.5 border border-slate-700/80 focus:border-cyan-400 focus:outline-none uppercase"
                      required
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed mt-1">
                    Registration is by invitation only. Contact your agent or administrator for an invitation code.
                  </p>
                </div>
              </>
            ) : (
              /* LOGIN FORM */
              <>
                {savedAccounts.length > 0 && (
                  <div className="mb-3 p-3 rounded-2xl bg-[#080d17] border border-cyan-500/40 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black text-cyan-300 flex items-center space-x-1">
                        <span>⚡ Last Login (1-Click Auto Login):</span>
                      </span>
                      <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/70 px-2 py-0.5 rounded-full border border-emerald-500/30">
                        Password Saved
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {savedAccounts.map(acc => (
                        <button
                          key={acc.username}
                          type="button"
                          onClick={() => handle1ClickLogin(acc)}
                          className="w-full px-3 py-2 rounded-xl bg-[#0c1424] hover:bg-cyan-950/90 border border-slate-700 hover:border-cyan-400 flex items-center justify-between text-left transition-all group active:scale-[0.98]"
                        >
                          <div className="flex items-center space-x-2">
                            <div className="w-6 h-6 rounded-lg bg-cyan-900/40 border border-cyan-500/30 text-cyan-300 flex items-center justify-center font-bold text-[10px]">
                              👤
                            </div>
                            <div>
                              <div className="text-xs font-black text-white font-mono">@{acc.username}</div>
                              <div className="text-[10px] text-slate-400">{acc.displayName || 'Trader'}</div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-1 text-[11px] font-bold text-cyan-400 group-hover:text-white">
                            <span>Instant Login</span>
                            <span className="group-hover:translate-x-0.5 transition-transform">➔</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    Username *
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-cyan-400/80 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(cleanMobileInput(e.target.value))}
                      placeholder="Enter registered username"
                      className="w-full bg-[#080d17] text-[16px] sm:text-xs text-white rounded-2xl pl-10 pr-3.5 py-2.5 border border-slate-700/80 focus:border-cyan-400 focus:outline-none font-mono"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    Password *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-cyan-400/80 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(cleanMobileInput(e.target.value))}
                      placeholder="Enter your password"
                      className="w-full bg-[#080d17] text-[16px] sm:text-xs text-white rounded-2xl pl-10 pr-10 py-2.5 border border-slate-700/80 focus:border-cyan-400 focus:outline-none font-mono"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Gradient Submit Button matching image_ab333b29.png */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600 hover:from-cyan-300 hover:to-indigo-500 text-white font-black text-sm shadow-lg shadow-cyan-500/25 flex items-center justify-center space-x-2 transition-all active:scale-98 mt-2"
            >
              <span>
                {loading
                  ? 'Please wait...'
                  : mode === 'register'
                  ? 'Create Account'
                  : 'Sign In'}
              </span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </button>
          </form>

          {/* Bottom Switch Link */}
          <div className="text-center text-xs text-slate-400 mt-4">
            {mode === 'register' ? (
              <span>
                Already registered?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError('');
                  }}
                  className="text-cyan-400 font-bold hover:underline ml-1"
                >
                  Login
                </button>
              </span>
            ) : (
              <span>
                Don&apos;t have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setError('');
                  }}
                  className="text-cyan-400 font-bold hover:underline ml-1"
                >
                  Create Account
                </button>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* COUNTRY & CURRENCY SELECTION MODAL (Exact match to image_2fc4b43d.png) */}
      {/* ============================================================ */}
      {isCountryModalOpen && (
        <div
          onClick={() => setIsCountryModalOpen(false)}
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fadeIn"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-3xl bg-[#0c1322] border border-slate-700/90 p-5 shadow-2xl space-y-4 animate-scaleUp"
          >
            {/* Header with globe icon */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-full bg-cyan-950/70 border border-cyan-500/40 text-cyan-400 flex items-center justify-center shadow-md">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">Select Country & Currency</h3>
                  <p className="text-[10px] text-slate-400">Mandatory selection for deposits & trading</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsCountryModalOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* List of Countries */}
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {COUNTRY_OPTIONS.map((item) => {
                const isSelected = resolveCurrency(item.code) === selectedCurrency;
                return (
                  <button
                    key={item.flagCode}
                    type="button"
                    onClick={() => {
                      setSelectedCurrency(resolveCurrency(item.code));
                      setIsCountryModalOpen(false);
                    }}
                    className={`w-full p-3 rounded-2xl flex items-center justify-between text-left transition-all ${
                      isSelected
                        ? 'bg-[#0c192d] border border-cyan-400 shadow-md shadow-cyan-500/20'
                        : 'bg-[#080d17] border border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-sm font-black text-white px-2 py-0.5 bg-slate-800 rounded-lg">
                        {item.flagCode}
                      </span>
                      <div>
                        <div className="text-xs font-black text-white">{item.country}</div>
                        <div className="text-[11px] font-bold text-cyan-400">{item.label}</div>
                      </div>
                    </div>

                    {isSelected && (
                      <CheckCircle2 className="w-5 h-5 text-cyan-400 fill-cyan-400/20" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Close Window Button */}
            <button
              type="button"
              onClick={() => setIsCountryModalOpen(false)}
              className="w-full py-2.5 rounded-xl bg-[#131d2e] hover:bg-[#1a273e] text-white font-bold text-xs border border-slate-700/60 transition-all"
            >
              Close Window
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
