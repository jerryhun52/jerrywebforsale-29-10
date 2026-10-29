import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Users,
  TrendingUp,
  CreditCard,
  BellRing,
  Key,
  Smartphone,
  Laptop,
  Monitor,
  CheckCircle,
  XCircle,
  Edit3,
  Plus,
  RefreshCw,
  LogOut,
  ArrowUpRight,
  ArrowDownLeft,
  Search,
  Lock,
  Unlock,
  Sliders,
  Send,
  Copy,
  Check,
  X,
  Trash2,
  AlertTriangle,
  Clock,
  Shield
} from 'lucide-react';
import {
  AdminAccount,
  User,
  TradeOrder,
  WalletRequest,
  SupportNotice,
  AppConfig,
  TradeMode,
  UserStatus,
  Currency,
  CURRENCIES
} from '../types.ts';
import { onSnapshot, collection } from 'firebase/firestore';
import { db as firestoreDb } from '../services/firebase.ts';
import { cleanMobileInput } from '../utils/sanitizer.ts';
import { api } from '../services/api.ts';

interface AdminPortalProps {
  onBackToClient: () => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({ onBackToClient }) => {
  // Admin Auth State
  const [currentAdmin, setCurrentAdmin] = useState<AdminAccount | null>(null);
  const [adminUsername, setAdminUsername] = useState('ad9318930@gmail.com');
  const [adminPassword, setAdminPassword] = useState('Tesla@123');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Tab State matching Screenshot 1:
  // 1. telegram (My Support Desk)
  // 2. users (User Management & Balances)
  // 3. trades (All User Trades)
  // 4. withdrawals (Withdrawals)
  // 5. deposits (Deposits)
  // 6. notice (Support Team Notice)
  // 7. subadmins (Admin Settings & Accounts)
  const [adminTab, setAdminTab] = useState<
    'users' | 'trades' | 'withdrawals' | 'deposits' | 'telegram' | 'notice' | 'subadmins'
  >('users');

  // Data State
  const [users, setUsers] = useState<User[]>([]);
  const [trades, setTrades] = useState<TradeOrder[]>([]);
  const [requests, setRequests] = useState<WalletRequest[]>([]);
  const [subadmins, setSubadmins] = useState<AdminAccount[]>([]);
  const [sessionsAudit, setSessionsAudit] = useState<any[]>([]);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [notice, setNotice] = useState<SupportNotice | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(false);

  // Copied State
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Support Desk Form State
  const [telegramLinkInput, setTelegramLinkInput] = useState('');
  const [prefilledMsgInput, setPrefilledMsgInput] = useState(
    'Hello Support, I am trader {username} (ID: {id}). Please assist me.'
  );

  // Manage Account Drawer / Modal (Screenshots 2 & 3)
  const [manageUser, setManageUser] = useState<User | null>(null);
  const [balanceActionType, setBalanceActionType] = useState<'add' | 'deduct' | 'set'>('add');
  const [balanceAmount, setBalanceAmount] = useState<string>('500');
  const [creditScoreInput, setCreditScoreInput] = useState<number>(95);
  const [newPasswordInput, setNewPasswordInput] = useState<string>('');
  const [freezeReasonInput, setFreezeReasonInput] = useState<string>('Identity verification pending');

  // Referral Customization Modal
  const [referralModalOpen, setReferralModalOpen] = useState(false);
  const [customReferralCode, setCustomReferralCode] = useState('');

  // Active Running Trade Control Modal
  const [editingTrade, setEditingTrade] = useState<TradeOrder | null>(null);
  const [editTradeMarginInput, setEditTradeMarginInput] = useState<string>('');
  const [editTradeProfitInput, setEditTradeProfitInput] = useState<number>(20);
  const [editTradeDirectionInput, setEditTradeDirectionInput] = useState<'UP' | 'DOWN'>('UP');

  // Add Client Modal
  const [addClientModalOpen, setAddClientModalOpen] = useState(false);
  const [newClientUsername, setNewClientUsername] = useState('');
  const [newClientPassword, setNewClientPassword] = useState('123123');
  const [newClientBalance, setNewClientBalance] = useState('1000');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientCurrency, setNewClientCurrency] = useState<Currency>('INR');

  // Create Sub-Admin Form (Screenshot 5)
  const [newSubUser, setNewSubUser] = useState('');
  const [newSubDisplayName, setNewSubDisplayName] = useState('');
  const [newSubPass, setNewSubPass] = useState('');
  const [newSubAuthority, setNewSubAuthority] = useState<'SUB_ADMIN' | 'SUPER_ADMIN'>('SUB_ADMIN');
  const [newSubRef, setNewSubRef] = useState('');
  const [newSubTelegram, setNewSubTelegram] = useState('');
  const [newSubPermissions, setNewSubPermissions] = useState<string[]>([
    'manage_users',
    'manage_trades',
    'manage_finance'
  ]);

  // Search
  const [userSearch, setUserSearch] = useState('');

  // Edit Admin Access Modal
  const [editingAdminAccount, setEditingAdminAccount] = useState<AdminAccount | null>(null);
  const [editAdminPass, setEditAdminPass] = useState('');
  const [editAdminRef, setEditAdminRef] = useState('');
  const [editAdminSupportLink, setEditAdminSupportLink] = useState('');
  const [editAdminPermissions, setEditAdminPermissions] = useState<string[]>([]);

  const handleOpenEditAdmin = (adm: AdminAccount) => {
    setEditingAdminAccount(adm);
    setEditAdminPass('');
    setEditAdminRef(adm.referralCode || '');
    setEditAdminSupportLink(adm.telegramSupportLink || '');
    setEditAdminPermissions(adm.permissions || ['manage_users', 'manage_trades', 'manage_finance']);
  };

  const handleSaveAdminEdits = async () => {
    if (!editingAdminAccount) return;
    try {
      const payload: Partial<AdminAccount> = {
        permissions: editAdminPermissions,
        referralCode: editAdminRef,
        telegramSupportLink: editAdminSupportLink
      };
      if (editAdminPass.trim()) {
        payload.password = editAdminPass.trim();
      }
      const res = await api.updateSubAdmin(editingAdminAccount.id, payload);
      if (res.success) {
        alert(`Admin settings for @${editingAdminAccount.username} saved successfully!`);
        setEditingAdminAccount(null);
        fetchAllAdminData();
      } else {
        alert(res.error || 'Failed to update admin');
      }
    } catch (err: any) {
      alert(err.message || 'Error updating admin');
    }
  };

  const handleDeleteAdminAccount = async () => {
    if (!editingAdminAccount) return;
    if (!confirm(`Are you sure you want to permanently delete admin account @${editingAdminAccount.username}?`)) {
      return;
    }
    try {
      const res = await api.deleteSubAdmin(editingAdminAccount.id);
      if (res.success) {
        alert(`Admin account @${editingAdminAccount.username} deleted.`);
        setEditingAdminAccount(null);
        fetchAllAdminData();
      }
    } catch (err: any) {
      alert(err.message || 'Error deleting admin');
    }
  };

  // Handle Admin Login (Accepts jerry@786 / tesla@123 directly)
  const handleAdminLogin = async (e?: React.FormEvent, customUser?: string, customPass?: string) => {
    if (e) e.preventDefault();
    setLoginError('');
    setLoginLoading(true);

    const userToTry = customUser !== undefined ? customUser : adminUsername;
    const passToTry = customPass !== undefined ? customPass : adminPassword;

    try {
      const res = await api.loginAdmin(cleanMobileInput(userToTry), cleanMobileInput(passToTry));
      if (res.success && res.admin) {
        setCurrentAdmin(res.admin);
        localStorage.setItem('flowcoin_admin_id', res.admin.id);
        if (res.admin.telegramSupportLink) {
          setTelegramLinkInput(res.admin.telegramSupportLink);
        }
        if (res.admin.prefilledMessage) {
          setPrefilledMsgInput(res.admin.prefilledMessage);
        }
      } else {
        setLoginError(res.error || 'Invalid administrator credentials. Verify username and password.');
      }
    } catch (err: any) {
      setLoginError(err.message || 'Login connection failed');
    } finally {
      setLoginLoading(false);
    }
  };

  // Auto-rehydrate session on load
  useEffect(() => {
    const savedAdminId = localStorage.getItem('flowcoin_admin_id');
    if (savedAdminId) {
      api.getAdminProfile(savedAdminId).then(res => {
        if (res.success && res.admin) {
          setCurrentAdmin(res.admin);
          if (res.admin.telegramSupportLink) setTelegramLinkInput(res.admin.telegramSupportLink);
          if (res.admin.prefilledMessage) setPrefilledMsgInput(res.admin.prefilledMessage);
        }
      }).catch(console.error);
    }
  }, []);

  // Keyboard shortcut: Escape closes active modals & control room
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setManageUser(null);
        setAddClientModalOpen(false);
        setReferralModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Fetch admin data
  const fetchAllAdminData = async () => {
    if (!currentAdmin) return;
    setIsLoadingData(true);
    try {
      const profileRes = await api.getAdminProfile(currentAdmin.id);
      if (profileRes.success && profileRes.admin) {
        setCurrentAdmin(profileRes.admin);
      }

      const [usersData, tradesData, requestsData, subadminsData, auditData, cfgData] = await Promise.all([
        api.getAdminUsers(currentAdmin.id),
        api.getTrades(undefined, currentAdmin.id),
        api.getWalletRequests(undefined, currentAdmin.id),
        api.getSubAdmins(currentAdmin.id),
        api.getSessionsAudit(currentAdmin.id),
        api.getConfig()
      ]);

      setUsers(usersData || []);
      setTrades(tradesData || []);
      setRequests(requestsData || []);
      setSubadmins(subadminsData || []);
      setSessionsAudit(auditData || []);
      if (cfgData) {
        setConfig(cfgData.config);
        setNotice(cfgData.notice);
      }

      // If currently managing user, refresh that user's latest state
      if (manageUser) {
        const updatedUser = (usersData || []).find(u => u.id === manageUser.id);
        if (updatedUser) setManageUser(updatedUser);
      }
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    if (currentAdmin) {
      fetchAllAdminData();
    }
  }, [currentAdmin?.id, adminTab]);

  // Web Audio API Chime Synthesizer: Rich 1.5s Crystal Bell Notification Tone
  const playRegistrationChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      // 4-Note Melodic Crystal Bell (C5 -> E5 -> G5 -> C6) lasting ~1.5 seconds
      const notes = [
        { freq: 523.25, time: 0, duration: 0.45 },     // C5
        { freq: 659.25, time: 0.18, duration: 0.55 },  // E5
        { freq: 783.99, time: 0.36, duration: 0.65 },  // G5
        { freq: 1046.50, time: 0.54, duration: 0.95 }  // C6 (High crystal bell)
      ];

      notes.forEach(n => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(n.freq, ctx.currentTime + n.time);

        gain.gain.setValueAtTime(0.001, ctx.currentTime + n.time);
        gain.gain.linearRampToValueAtTime(0.28, ctx.currentTime + n.time + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + n.time + n.duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime + n.time);
        osc.stop(ctx.currentTime + n.time + n.duration);
      });
    } catch (e) {
      console.warn('Audio chime playback encountered an issue:', e);
    }
  };

  const [adminNotificationToast, setAdminNotificationToast] = useState<string | null>(null);

  // Sub-Second Real-time Sound & Notification Listener via Firestore onSnapshot & Window Events
  useEffect(() => {
    if (!currentAdmin) return;

    let unsubTrades: (() => void) | null = null;
    let unsubRequests: (() => void) | null = null;

    // Helper to verify if a client belongs to the current sub-admin (or if admin is Super/Supreme)
    const isClientScoped = (userId: string, username?: string) => {
      if (currentAdmin.role === 'SUPREME_OWNER' || currentAdmin.role === 'SUPER_ADMIN') {
        return true;
      }
      return users.some(
        u => u.id === userId || (username && u.username.toLowerCase() === username.toLowerCase())
      );
    };

    // 1. Direct Firestore Sub-second Live Subscription (<1s without refresh)
    if (firestoreDb) {
      let isInitialTrades = true;
      let isInitialRequests = true;

      try {
        unsubTrades = onSnapshot(collection(firestoreDb, 'trades'), (snapshot) => {
          const updatedTrades: TradeOrder[] = [];
          snapshot.forEach(docSnap => {
            const t = docSnap.data() as TradeOrder;
            if (isClientScoped(t.userId, t.username)) {
              updatedTrades.push(t);
            }
          });

          updatedTrades.sort((a, b) => {
            const timeA = a.createdAt ? new Date(a.createdAt).getTime() : (a.startTime || 0);
            const timeB = b.createdAt ? new Date(b.createdAt).getTime() : (b.startTime || 0);
            return timeB - timeA;
          });

          if (!isInitialTrades) {
            snapshot.docChanges().forEach((change) => {
              if (change.type === 'added') {
                const newTrade = change.doc.data() as TradeOrder;
                if (isClientScoped(newTrade.userId, newTrade.username)) {
                  playRegistrationChime();
                  const u = users.find(usr => usr.id === newTrade.userId);
                  const meta = CURRENCIES[newTrade.nativeCurrency || u?.nativeCurrency || 'INR'] || CURRENCIES.INR;
                  const nativeAmt = newTrade.marginNative || (newTrade.marginUsd * meta.rate);
                  const formattedNative = `${meta.flag} ${meta.symbol}${Number(nativeAmt).toLocaleString()} ${meta.code}`;
                  setAdminNotificationToast(
                    `📈 LIVE TRADE PLACED: @${newTrade.username} bought ${newTrade.symbol} (${newTrade.direction === 'UP' ? '↑ UP' : '↓ DOWN'}) - Amount: ${formattedNative} ($${newTrade.marginUsd} USD)`
                  );
                  setTimeout(() => setAdminNotificationToast(null), 6000);
                }
              }
            });
          }
          isInitialTrades = false;
          setTrades(updatedTrades);
        }, (err) => console.warn('Firestore trades subscription warning:', err));

        unsubRequests = onSnapshot(collection(firestoreDb, 'walletRequests'), (snapshot) => {
          const updatedReqs: WalletRequest[] = [];
          snapshot.forEach(docSnap => {
            const r = docSnap.data() as WalletRequest;
            if (isClientScoped(r.userId, r.username)) {
              updatedReqs.push(r);
            }
          });

          updatedReqs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

          if (!isInitialRequests) {
            snapshot.docChanges().forEach((change) => {
              if (change.type === 'added') {
                const newReq = change.doc.data() as WalletRequest;
                if (isClientScoped(newReq.userId, newReq.username)) {
                  playRegistrationChime();
                  const meta = CURRENCIES[newReq.currency || 'INR'] || CURRENCIES.INR;
                  const nativeAmt = newReq.amountNative !== undefined && newReq.amountNative > 0 ? newReq.amountNative : (newReq.amountUsd || 0);
                  const formattedNative = `${meta.flag} ${meta.symbol}${Number(nativeAmt).toLocaleString()} ${meta.code}`;

                  if (newReq.type === 'WITHDRAWAL') {
                    setAdminNotificationToast(
                      `💸 NEW WITHDRAWAL REQUEST: ${formattedNative} (${newReq.amountUsd ? `$${newReq.amountUsd} USD` : ''}) applied by @${newReq.username}`
                    );
                  } else {
                    setAdminNotificationToast(
                      `💰 NEW DEPOSIT PROOF SUBMITTED: ${formattedNative} by @${newReq.username}`
                    );
                  }
                  setTimeout(() => setAdminNotificationToast(null), 6000);
                }
              }
            });
          }
          isInitialRequests = false;
          setRequests(updatedReqs);
        }, (err) => console.warn('Firestore walletRequests subscription warning:', err));
      } catch (e) {
        console.warn('Firestore subscription error:', e);
      }
    }

    // 2. Custom Window Event Handlers (Same-Window / Local Tab)
    const handleNewUserRegistration = (e: any) => {
      if (e.detail && !isClientScoped(e.detail.id, e.detail.username)) return;
      fetchAllAdminData();
      playRegistrationChime();
      setAdminNotificationToast(`👤 New Trader Registered: @${e.detail?.username || 'Client'}`);
      setTimeout(() => setAdminNotificationToast(null), 5000);
    };

    const handleNewTrade = (e: any) => {
      if (e.detail && !isClientScoped(e.detail.userId, e.detail.username)) return;
      fetchAllAdminData();
      playRegistrationChime();
      const meta = CURRENCIES[(e.detail?.nativeCurrency as Currency) || 'INR'] || CURRENCIES.INR;
      const nativeAmt = e.detail?.marginNative || ((e.detail?.marginUsd || 0) * meta.rate);
      const formattedNative = `${meta.flag} ${meta.symbol}${Number(nativeAmt).toLocaleString()} ${meta.code}`;
      setAdminNotificationToast(`📈 LIVE TRADE PLACED: @${e.detail?.username || 'Trader'} placed ${formattedNative} ($${e.detail?.marginUsd || ''} USD) on ${e.detail?.symbol} (${e.detail?.direction})`);
      setTimeout(() => setAdminNotificationToast(null), 5000);
    };

    const handleNewWalletReq = (e: any) => {
      if (e.detail && !isClientScoped(e.detail.userId, e.detail.username)) return;
      fetchAllAdminData();
      playRegistrationChime();
      const meta = CURRENCIES[(e.detail?.currency as Currency) || 'INR'] || CURRENCIES.INR;
      const nativeAmt = e.detail?.amountNative !== undefined && e.detail?.amountNative > 0 ? e.detail?.amountNative : (e.detail?.amountUsd || 0);
      const formattedNative = `${meta.flag} ${meta.symbol}${Number(nativeAmt).toLocaleString()} ${meta.code}`;
      setAdminNotificationToast(`💸 NEW WITHDRAWAL APPLIED: ${formattedNative} by @${e.detail?.username || 'Trader'}`);
      setTimeout(() => setAdminNotificationToast(null), 5000);
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (
        e.key === 'flowcoin_last_registered_time' ||
        e.key === 'flowcoin_last_trade_time' ||
        e.key === 'flowcoin_last_request_time' ||
        e.key === 'flowcoin_persistent_db_v2'
      ) {
        fetchAllAdminData();
        playRegistrationChime();
        if (e.key === 'flowcoin_last_trade_time') {
          setAdminNotificationToast('📈 New Trade Order Placed by Client!');
        } else if (e.key === 'flowcoin_last_request_time') {
          setAdminNotificationToast('💸 New Withdrawal/Deposit Request Pending!');
        }
        setTimeout(() => setAdminNotificationToast(null), 5000);
      }
    };

    window.addEventListener('flowcoin_new_user_registered', handleNewUserRegistration);
    window.addEventListener('flowcoin_new_trade_placed', handleNewTrade);
    window.addEventListener('flowcoin_new_wallet_request', handleNewWalletReq);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      if (unsubTrades) unsubTrades();
      if (unsubRequests) unsubRequests();
      window.removeEventListener('flowcoin_new_user_registered', handleNewUserRegistration);
      window.removeEventListener('flowcoin_new_trade_placed', handleNewTrade);
      window.removeEventListener('flowcoin_new_wallet_request', handleNewWalletReq);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [currentAdmin?.id, users]);

  const handleAdminLogout = () => {
    setCurrentAdmin(null);
    localStorage.removeItem('flowcoin_admin_id');
  };

  // Referral Code Customization Handler
  const handleSaveCustomReferral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAdmin) return;
    const clean = cleanMobileInput(customReferralCode).toUpperCase();
    if (!clean) return;

    try {
      const res = await api.customizeReferralCode(currentAdmin.id, clean);
      if (res.success && res.admin) {
        setCurrentAdmin(res.admin);
        setReferralModalOpen(false);
        fetchAllAdminData();
        alert(res.message || `Referral code successfully updated to [${clean}]!`);
      } else {
        alert(res.error || 'Failed to update referral code');
      }
    } catch (err: any) {
      alert(err.message || 'Error updating referral code');
    }
  };

  // Copy Referral Code / Link
  const handleCopyRefCode = () => {
    if (!currentAdmin) return;
    navigator.clipboard.writeText(currentAdmin.referralCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyInviteLink = () => {
    if (!currentAdmin) return;
    const link = `${window.location.origin}/#ref=${currentAdmin.referralCode}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Save Support Desk Link
  const handleSaveSupportDesk = async () => {
    if (!currentAdmin) return;
    try {
      const res = await api.saveSupportDesk({
        adminId: currentAdmin.id,
        telegramSupportLink: telegramLinkInput,
        prefilledMessage: prefilledMsgInput
      });
      if (res.success) {
        alert('Personal Telegram Customer Support Desk saved successfully!');
        fetchAllAdminData();
      }
    } catch (err: any) {
      alert(err.message || 'Error saving support desk');
    }
  };

  // Create Sub-Admin Form Handler
  const handleCreateSubAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAdmin) return;

    try {
      const res = await api.createSubAdmin({
        creatorAdminId: currentAdmin.id,
        username: newSubUser,
        password: newSubPass,
        referralCode: newSubRef || `AGENT_${Math.floor(Math.random() * 899 + 100)}`,
        permissions: newSubPermissions
      });

      if (res.success) {
        alert('New Administrator account created successfully!');
        setNewSubUser('');
        setNewSubDisplayName('');
        setNewSubPass('');
        setNewSubRef('');
        setNewSubTelegram('');
        fetchAllAdminData();
      } else {
        alert(res.error || 'Failed to create admin');
      }
    } catch (err: any) {
      alert(err.message || 'Error creating admin');
    }
  };

  // Add Client User Directly
  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAdmin) return;

    try {
      const res = await api.createClientUser({
        username: newClientUsername,
        password: newClientPassword,
        email: newClientEmail || `${newClientUsername}@flowcoin.com`,
        balance: parseFloat(newClientBalance) || 0,
        referralCode: currentAdmin.referralCode,
        nativeCurrency: newClientCurrency
      });

      if (res.success) {
        setAddClientModalOpen(false);
        setNewClientUsername('');
        setNewClientEmail('');
        fetchAllAdminData();
        alert(`New trader account added to portal in ${newClientCurrency}!`);
      } else {
        alert(res.error || 'Failed to add client');
      }
    } catch (err: any) {
      alert(err.message || 'Error adding client');
    }
  };

  // Manage Account Actions:
  // 1. Balance Control
  const handleApplyBalance = async () => {
    if (!manageUser) return;
    const num = parseFloat(balanceAmount);
    if (isNaN(num)) return;
    const userMeta = CURRENCIES[manageUser.nativeCurrency || 'USD'] || CURRENCIES.USD;
    try {
      const res = await api.updateUserBalance(manageUser.id, balanceActionType, num);
      if (res.success) {
        const finalBal = res.user?.balance ?? res.balance ?? manageUser.balance;
        alert(`Success! Balance for @${manageUser.username} successfully updated to ${userMeta.symbol}${Number(finalBal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${userMeta.code}`);
        fetchAllAdminData();
      } else {
        alert(res.error || 'Failed to update balance');
      }
    } catch (err: any) {
      alert(err.message || 'Balance update error');
    }
  };

  // 2. Credit Score
  const handleSaveCreditScore = async () => {
    if (!manageUser) return;
    try {
      const res = await api.updateCreditScore(manageUser.id, creditScoreInput);
      if (res.success) {
        alert(`Credit score updated to ${res.creditScore}/100!`);
        fetchAllAdminData();
      }
    } catch (err: any) {
      alert(err.message || 'Credit score update error');
    }
  };

  // 3. Trade Mode
  const handleSetTradeMode = async (mode: TradeMode) => {
    if (!manageUser) return;
    try {
      const res = await api.updateUserTradeMode(manageUser.id, mode);
      if (res.success) {
        alert(`Trade Outcome Engine set to [${mode}] for @${manageUser.username}!`);
        fetchAllAdminData();
      }
    } catch (err: any) {
      alert(err.message || 'Trade mode update error');
    }
  };

  // 4. Password Reset
  const handleResetPassword = async () => {
    if (!manageUser || !newPasswordInput.trim()) {
      alert('Please enter a new password');
      return;
    }
    try {
      const res = await api.resetUserPassword(manageUser.id, newPasswordInput);
      if (res.success) {
        alert(`Password for @${manageUser.username} successfully updated!`);
        setNewPasswordInput('');
        fetchAllAdminData();
      }
    } catch (err: any) {
      alert(err.message || 'Password reset error');
    }
  };

  // 5. Freeze Account with Reason
  const handleFreezeToggle = async (action: 'freeze' | 'reactivate') => {
    if (!manageUser) return;
    try {
      const res = await api.freezeUserAccount(manageUser.id, action, freezeReasonInput);
      if (res.success) {
        alert(
          action === 'freeze'
            ? `Account @${manageUser.username} frozen with reason: "${res.freezeReason}"`
            : `Account @${manageUser.username} reactivated!`
        );
        fetchAllAdminData();
      }
    } catch (err: any) {
      alert(err.message || 'Freeze action error');
    }
  };

  // 6. Delete Account
  const handleDeleteAccount = async () => {
    if (!manageUser) return;
    if (!confirm(`Are you sure you want to permanently delete trader @${manageUser.username} and their trade records?`)) {
      return;
    }
    try {
      const res = await api.deleteUser(manageUser.id);
      if (res.success) {
        alert(`Trader @${manageUser.username} deleted.`);
        setManageUser(null);
        fetchAllAdminData();
      }
    } catch (err: any) {
      alert(err.message || 'Delete error');
    }
  };

  // Financial Stats Calculation matching Screenshot 1:
  const totalActiveBalances = useMemo(() => {
    return users.reduce((acc, u) => acc + (u.balance || 0), 0);
  }, [users]);

  const totalFrozenEscrow = useMemo(() => {
    return users.reduce((acc, u) => acc + (u.freezeBalance || 0), 0);
  }, [users]);

  const totalTradesCount = trades.length;
  const liveTradesCount = trades.filter(t => t.status === 'RUNNING').length;

  const pendingWithdrawals = useMemo(() => {
    return requests.filter(r => r.type === 'WITHDRAWAL' && r.status === 'PENDING');
  }, [requests]);

  const pendingDeposits = useMemo(() => {
    return requests.filter(r => r.type === 'DEPOSIT' && r.status === 'PENDING');
  }, [requests]);

  const totalPendingWithdrawalAmount = useMemo(() => {
    return pendingWithdrawals.reduce((acc, r) => acc + (r.amountUsd || 0), 0);
  }, [pendingWithdrawals]);

  // Filtered Users (Sorted Newest Registrations at TOP)
  const filteredUsers = useMemo(() => {
    let result = [...users];
    if (userSearch.trim()) {
      const q = userSearch.toLowerCase();
      result = result.filter(
        u =>
          u.username.toLowerCase().includes(q) ||
          (u.displayName && u.displayName.toLowerCase().includes(q)) ||
          u.email.toLowerCase().includes(q) ||
          u.id.toLowerCase().includes(q)
      );
    }
    return result.sort((a, b) => {
      if (a.isNew && !b.isNew) return -1;
      if (!a.isNew && b.isNew) return 1;
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });
  }, [users, userSearch]);

  // Open Manage Drawer
  const handleOpenManageDrawer = (u: User) => {
    setManageUser(u);
    setCreditScoreInput(u.creditScore || 95);
    setFreezeReasonInput(u.freezeReason || 'Identity verification pending, Audit review');
  };

  // -------------------------------------------------------------
  // DEDICATED ADMIN LOGIN SCREEN (Supports jerry@786 & tesla@123)
  // -------------------------------------------------------------
  if (!currentAdmin) {
    return (
      <div className="min-h-screen bg-[#070b13] text-white flex flex-col justify-center items-center p-4">
        {/* Top Floating Glow */}
        <div className="absolute top-1/4 w-96 h-96 rounded-full bg-amber-500/10 blur-[100px] pointer-events-none" />

        <div className="w-full max-w-md rounded-3xl bg-[#0c1322] border border-slate-800 p-7 shadow-2xl space-y-6 relative z-10">
          {/* Brand & Security Header */}
          <div className="flex flex-col items-center text-center space-y-2">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-amber-500 via-amber-600 to-amber-700 flex items-center justify-center shadow-xl shadow-amber-600/30 border border-amber-400/40">
              <ShieldAlert className="w-9 h-9 text-slate-950 stroke-[2.5]" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white mt-1">
              COIN BASED Admin Portal
            </h1>
            <p className="text-xs text-slate-400 max-w-xs">
              2-Tier Master Hierarchy & Scoped Sub-Admin Control System
            </p>
          </div>

          {/* Quick 1-Click Access Badge for Super Admin */}
          <div className="p-3.5 rounded-2xl bg-[#09101d] border border-amber-500/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold text-amber-300 uppercase tracking-wider">
                👑 Main Super Admin Credentials
              </span>
              <span className="text-[10px] bg-amber-500/20 text-amber-200 px-2 py-0.5 rounded-full font-bold">
                SUPER
              </span>
            </div>
            <div className="text-xs font-mono text-slate-300">
              Username: <span className="font-bold text-white">ad9318930@gmail.com</span> &bull; Pass: <span className="font-bold text-amber-400">Tesla@123</span>
            </div>
            <button
              type="button"
              onClick={() => handleAdminLogin(undefined, 'ad9318930@gmail.com', 'Tesla@123')}
              className="w-full py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 font-black text-xs text-slate-950 shadow-md shadow-amber-500/20 transition-all active:scale-95 flex items-center justify-center space-x-1.5"
            >
              <span>Instant 1-Click Main Super Admin Login</span>
            </button>
          </div>

          {loginError && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs text-center font-medium">
              {loginError}
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-300">Administrator Email / Username</label>
              <input
                type="text"
                value={adminUsername}
                onChange={(e) => setAdminUsername(e.target.value)}
                placeholder="e.g. ad9318930@gmail.com"
                className="w-full bg-[#080d17] text-sm text-white rounded-xl px-3.5 py-2.5 border border-slate-700/80 focus:outline-none focus:border-amber-400 mt-1 font-mono"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300">Security Password</label>
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="e.g. Tesla@123"
                className="w-full bg-[#080d17] text-sm text-white rounded-xl px-3.5 py-2.5 border border-slate-700/80 focus:outline-none focus:border-amber-400 mt-1 font-mono"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 font-black text-sm text-slate-950 transition-all shadow-xl shadow-amber-500/25 active:scale-95"
            >
              {loginLoading ? 'Authenticating...' : 'Enter Master Admin Portal'}
            </button>
          </form>

          <button
            onClick={onBackToClient}
            className="w-full text-center text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            &larr; Return to COIN BASED Trading Desk
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // LOGGED-IN ADMIN DASHBOARD (MATCHING SCREENSHOTS 1, 2, 3, 4, 5)
  // -------------------------------------------------------------
  const isSupreme = currentAdmin.role === 'SUPREME_OWNER';
  const isSuper = currentAdmin.role === 'SUPER_ADMIN';

  return (
    <div className="min-h-screen bg-[#070b13] text-white pb-24 selection:bg-amber-400 selection:text-black">
      {/* Top Header matching Screenshot 1 */}
      <header className="w-full bg-[#09101d] border-b border-slate-800/80 px-4 py-2.5 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* COIN BASED Logo */}
          <div className="flex items-center space-x-2.5 cursor-pointer" onClick={onBackToClient}>
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#0284c7] via-[#0369a1] to-[#0c4a6e] flex items-center justify-center p-1 border border-cyan-400/40 shadow-md">
              <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-cyan-300 stroke-current" strokeWidth="2.2">
                <circle cx="12" cy="12" r="9" />
                <path d="M7 12h10" />
                <path d="M12 7v10" />
                <circle cx="12" cy="12" r="4" className="stroke-white" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="text-base font-black tracking-wider text-white leading-none">
                COIN BASED
              </span>
              <span className="text-[9px] font-bold tracking-widest text-cyan-400 uppercase mt-0.5">
                Trade - Invest
              </span>
            </div>
          </div>

          {/* Right Header items */}
          <div className="flex items-center space-x-2.5">
            <span className="px-3 py-1 rounded-full bg-white text-slate-900 text-xs font-black shadow-sm border border-slate-200">
              US USD
            </span>
            <div className="p-2 rounded-full bg-white text-slate-700 shadow-sm">
              <BellRing className="w-3.5 h-3.5" />
            </div>
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-xs flex items-center justify-center border border-white">
              U
            </div>
          </div>
        </div>
      </header>

      {/* REAL-TIME NOTIFICATION ALERT BANNER FOR ADMIN */}
      {adminNotificationToast && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-lg bg-[#0c1322] border-2 border-amber-400 p-3.5 rounded-2xl shadow-2xl animate-scaleUp flex items-center justify-between text-white">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/40 flex items-center justify-center shrink-0">
              <BellRing className="w-5 h-5 animate-bounce" />
            </div>
            <div className="text-xs font-black tracking-wide leading-snug">
              {adminNotificationToast}
            </div>
          </div>
          <button
            onClick={() => setAdminNotificationToast(null)}
            className="p-1 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 pt-5 space-y-4">
        {/* ============================================================ */}
        {/* TOP ADMIN CARD (Exact match to Screenshot 1) */}
        {/* ============================================================ */}
        <div className="rounded-3xl bg-[#0c1322] border border-slate-800/90 p-6 shadow-2xl space-y-5">
          {/* Top Identity Row */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center space-x-3.5">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/10">
                <Shield className="w-7 h-7 stroke-[2.2]" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-black text-white tracking-tight">
                    {isSupreme ? 'Supreme Root Owner Portal' : 'Main Super Admin Portal'}
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/50 uppercase">
                    {isSupreme ? 'SUPREME ROOT (INDEPENDENT)' : 'MAIN ADMIN (FULL AUTHORITY)'}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300 mt-1 font-mono">
                  <span>Account: <strong className="text-white">@{currentAdmin.username}</strong></span>
                  <span>&bull;</span>
                  <span>{currentAdmin.displayName || 'Master Admin (Main)'}</span>
                  <span>&bull;</span>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/40 text-[10px]">
                    Active Session
                  </span>
                  <span>&bull;</span>
                  {/* Referral Badge with Edit Pencil */}
                  <button
                    onClick={() => {
                      setCustomReferralCode(currentAdmin.referralCode);
                      setReferralModalOpen(true);
                    }}
                    className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-md bg-cyan-950/60 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-900/60 transition-colors text-[11px]"
                  >
                    <span>🏷️ Ref: {currentAdmin.referralCode}</span>
                    <Edit3 className="w-3 h-3 text-cyan-400" />
                  </button>
                </div>
              </div>
            </div>

            {/* Top Right Action Buttons */}
            <div className="flex items-center space-x-2.5 self-end md:self-auto">
              <button
                onClick={fetchAllAdminData}
                disabled={isLoadingData}
                className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-[#09101d] hover:bg-[#121c2e] border border-slate-700 text-xs font-bold text-slate-200 transition-all active:scale-95"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingData ? 'animate-spin' : ''}`} />
                <span>Live Sync</span>
              </button>

              <button
                onClick={handleAdminLogout}
                className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/30 text-xs font-extrabold transition-all active:scale-95"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Exit Admin</span>
              </button>
            </div>
          </div>

          {/* 5 Stat KPI Cards Row (Screenshot 1) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {/* 1. Managed Users */}
            <div className="p-4 rounded-2xl bg-[#080e1a] border border-slate-800 space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Managed Users</span>
                <Users className="w-4 h-4 text-slate-400" />
              </div>
              <div className="text-2xl font-black text-white font-mono">
                {users.length}
              </div>
            </div>

            {/* 2. Total Active Balances */}
            <div className="p-4 rounded-2xl bg-[#080e1a] border border-slate-800 space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Total Active Balances</span>
                <span className="text-emerald-400 font-bold">$</span>
              </div>
              <div className="text-2xl font-black text-emerald-400 font-mono">
                ${totalActiveBalances.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })}
              </div>
            </div>

            {/* 3. Frozen Escrow */}
            <div className="p-4 rounded-2xl bg-[#080e1a] border border-slate-800 space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Frozen Escrow</span>
                <Lock className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-black text-amber-400 font-mono">
                ${totalFrozenEscrow.toLocaleString()}
              </div>
            </div>

            {/* 4. Total Trades Placed */}
            <div className="p-4 rounded-2xl bg-[#080e1a] border border-slate-800 space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Total Trades Placed</span>
                <TrendingUp className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="text-2xl font-black text-cyan-400 font-mono">
                {totalTradesCount} ({liveTradesCount} Live)
              </div>
            </div>

            {/* 5. Pending Withdrawals */}
            <div className="p-4 rounded-2xl bg-[#080e1a] border border-slate-800 space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Pending Withdrawals</span>
                <Clock className="w-4 h-4 text-rose-400" />
              </div>
              <div className="text-2xl font-black text-rose-400 font-mono">
                {pendingWithdrawals.length} (${totalPendingWithdrawalAmount})
              </div>
            </div>
          </div>

          {/* Referral Code Row (Screenshot 1) */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 p-4 rounded-2xl bg-[#080e1a] border border-slate-800">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-950/60 border border-cyan-500/40 flex items-center justify-center text-cyan-300">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-slate-300">YOUR ADMIN REFERRAL CODE:</span>
                  <span className="px-3 py-1 rounded-lg bg-cyan-950 text-cyan-300 font-mono font-black text-sm border border-cyan-500/50">
                    {currentAdmin.referralCode}
                  </span>
                  <button
                    onClick={() => {
                      setCustomReferralCode(currentAdmin.referralCode);
                      setReferralModalOpen(true);
                    }}
                    className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold transition-all"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>Change Code</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Traders who register with your code or link will automatically appear in your scoped admin portal. You can change your code anytime.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 self-end md:self-auto">
              <button
                onClick={handleCopyRefCode}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-[#0c1424] hover:bg-[#132038] border border-slate-700 text-xs font-bold text-slate-200 transition-all active:scale-95"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
              </button>

              <button
                onClick={handleCopyInviteLink}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 text-xs font-black transition-all active:scale-95 shadow-md shadow-cyan-600/30"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Send className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Link Copied' : 'Copy Invite Link'}</span>
              </button>
            </div>
          </div>

          {/* Personal Customer Support Desk (Telegram) Box (Screenshot 1) */}
          <div className="p-4 rounded-2xl bg-[#080e1a] border border-slate-800 space-y-3">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center">
                <Send className="w-4 h-4" />
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-black text-white">
                  My Personal Customer Support Desk (Telegram)
                </span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  Default Support Active
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400">
              Traders registered under your referral code (<strong className="text-cyan-300">{currentAdmin.referralCode}</strong>) will see this Telegram link when they click &ldquo;Customer Support&rdquo; on their Assets/Profile page.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                  <span className="font-bold text-slate-300">Your Telegram Link or Username</span>
                  <span className="text-[10px] text-slate-500">e.g. @support_admin or https://t.me/...</span>
                </div>
                <input
                  type="text"
                  value={telegramLinkInput}
                  onChange={(e) => setTelegramLinkInput(e.target.value)}
                  placeholder="e.g. https://t.me/YourAgentSupport or @YourUsername"
                  className="w-full bg-[#0c1424] text-xs text-white rounded-xl px-3 py-2.5 border border-slate-700/80 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                  <span className="font-bold text-slate-300">Pre-filled Trader Message (Optional)</span>
                  <span className="text-[10px] text-slate-500">Tokens: &#123;username&#125;, &#123;id&#125;</span>
                </div>
                <input
                  type="text"
                  value={prefilledMsgInput}
                  onChange={(e) => setPrefilledMsgInput(e.target.value)}
                  placeholder="Hello Support, I am trader {username} (ID: {id}). Please assist me."
                  className="w-full bg-[#0c1424] text-xs text-white rounded-xl px-3 py-2.5 border border-slate-700/80 focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-1">
              <span className="text-[10px] text-slate-500">
                No custom link set. System default (@flowcoin_support) is used.
              </span>
              <button
                onClick={handleSaveSupportDesk}
                className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs shadow-md shadow-blue-600/30 transition-all active:scale-95"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Save Support Desk</span>
              </button>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* RESPONSIVE TAB NAVIGATION BAR (FLEX WRAP PREVENTS CUT OFF) */}
        {/* ============================================================ */}
        <div className="w-full py-1">
          <div className="flex flex-wrap items-center gap-2 bg-[#0c1322] p-2 rounded-2xl border border-slate-800">
            {/* 1. Support Desk */}
            <button
              onClick={() => setAdminTab('telegram')}
              className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                adminTab === 'telegram'
                  ? 'bg-amber-500 text-slate-950 font-black shadow'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>My Support Desk (Telegram)</span>
            </button>

            {/* 2. User Management & Balances */}
            <button
              onClick={() => setAdminTab('users')}
              className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                adminTab === 'users'
                  ? 'bg-amber-500 text-slate-950 font-black shadow'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>User Management & Balances ({users.length})</span>
              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-rose-600 text-white">
                +1 New
              </span>
            </button>

            {/* 3. All User Trades */}
            <button
              onClick={() => setAdminTab('trades')}
              className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                adminTab === 'trades'
                  ? 'bg-amber-500 text-slate-950 font-black shadow'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>All User Trades ({trades.length})</span>
            </button>

            {/* 4. Withdrawals */}
            <button
              onClick={() => setAdminTab('withdrawals')}
              className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                adminTab === 'withdrawals'
                  ? 'bg-amber-500 text-slate-950 font-black shadow'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Withdrawals</span>
              {pendingWithdrawals.length > 0 && (
                <span className="w-4 h-4 rounded-full bg-rose-600 text-white text-[9px] font-black flex items-center justify-center">
                  {pendingWithdrawals.length}
                </span>
              )}
            </button>

            {/* 5. Deposits */}
            <button
              onClick={() => setAdminTab('deposits')}
              className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                adminTab === 'deposits'
                  ? 'bg-amber-500 text-slate-950 font-black shadow'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <ArrowDownLeft className="w-3.5 h-3.5" />
              <span>Deposits</span>
              {pendingDeposits.length > 0 && (
                <span className="w-4 h-4 rounded-full bg-emerald-600 text-white text-[9px] font-black flex items-center justify-center">
                  {pendingDeposits.length}
                </span>
              )}
            </button>

            {/* 6. Support Team Notice */}
            <button
              onClick={() => setAdminTab('notice')}
              className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                adminTab === 'notice'
                  ? 'bg-amber-500 text-slate-950 font-black shadow'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <BellRing className="w-3.5 h-3.5" />
              <span>Support Team Notice</span>
            </button>

            {/* 7. Admin Settings & Accounts (Hidden for Sub-Admins) */}
            {currentAdmin.role !== 'SUB_ADMIN' && (
              <button
                onClick={() => setAdminTab('subadmins')}
                className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  adminTab === 'subadmins'
                    ? 'bg-amber-500 text-slate-950 font-black shadow'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Admin Settings & Accounts ({subadmins.length})</span>
              </button>
            )}
          </div>
        </div>

        {/* ============================================================ */}
        {/* TAB CONTENT: USERS (Screenshot 4) */}
        {/* ============================================================ */}
        {adminTab === 'users' && (
          <div className="space-y-4">
            {/* New Client Registered Banner (Screenshot 4) */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs">
              <div className="flex items-center space-x-2 font-bold">
                <span>👤+ 1 New Client Registered (Listed at TOP)</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase tracking-wider">
                NEWEST FIRST
              </span>
            </div>

            {/* Registered Trader Accounts Table Container */}
            <div className="rounded-3xl bg-[#0c1322] border border-slate-800 p-6 shadow-2xl space-y-4">
              {/* Header row */}
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-black text-white">Registered Trader Accounts</h3>
                  <p className="text-xs text-slate-400">
                    Control user balances, inject/deduct funds, set credit scores, and adjust trade outcome modes
                  </p>
                </div>

                <div className="flex items-center space-x-2.5 w-full md:w-auto">
                  <button
                    onClick={() => setAddClientModalOpen(true)}
                    className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20 transition-all active:scale-95 whitespace-nowrap"
                  >
                    <Plus className="w-4 h-4 stroke-[3]" />
                    <span>Add Client</span>
                  </button>

                  <div className="relative w-full md:w-72">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      placeholder="Search client by username, name, or email..."
                      className="w-full bg-[#080d17] text-xs text-white rounded-xl pl-9 pr-3 py-2 border border-slate-700/80 focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>
              </div>

              {/* Table (Screenshot 4) */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#080d17] text-slate-400 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-3">USERNAME & CLIENT</th>
                      <th className="py-3 px-3">EMAIL ADDRESS</th>
                      <th className="py-3 px-3">REFERRAL / AGENT</th>
                      <th className="py-3 px-3">CURRENCY</th>
                      <th className="py-3 px-3">REGISTERED TIME</th>
                      <th className="py-3 px-3">AVAILABLE BALANCE</th>
                      <th className="py-3 px-3">FROZEN BALANCE</th>
                      <th className="py-3 px-3">CREDIT SCORE</th>
                      <th className="py-3 px-3">TRADE MODE</th>
                      <th className="py-3 px-3">STATUS</th>
                      <th className="py-3 px-3 text-right">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {filteredUsers.map((u) => {
                      const initial = (u.displayName || u.username).charAt(0).toUpperCase();
                      return (
                        <tr key={u.id} className="hover:bg-slate-800/30 transition-colors">
                          {/* Username & Avatar */}
                          <td className="py-3 px-3">
                            <div className="flex items-center space-x-2.5">
                              <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-black text-amber-400 text-xs flex-shrink-0">
                                {initial}
                              </div>
                              <div>
                                <div className="flex items-center space-x-1.5 font-sans">
                                  <span className="font-extrabold text-cyan-400">@{u.username}</span>
                                  {u.isNew && (
                                    <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-black border border-emerald-500/30">
                                      NEW
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-400 font-sans">
                                  {u.displayName || u.username}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Email */}
                          <td className="py-3 px-3 text-slate-300 font-sans text-xs">
                            {u.email}
                          </td>

                          {/* Referral / Agent */}
                          <td className="py-3 px-3">
                            {u.referralCodeUsed && u.referralCodeUsed !== 'Direct' ? (
                              <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30 font-bold text-[10px]">
                                {u.referralCodeUsed}
                              </span>
                            ) : (
                              <span className="text-slate-400 font-sans text-xs">Direct</span>
                            )}
                          </td>

                          {/* Currency */}
                          <td className="py-3 px-3 font-sans">
                            {(() => {
                              const meta = CURRENCIES[u.nativeCurrency || 'USD'] || CURRENCIES.USD;
                              return (
                                <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30 text-[10px] font-bold inline-flex items-center space-x-1">
                                  <span>{meta.flag}</span>
                                  <span>{meta.code} ({meta.symbol})</span>
                                </span>
                              );
                            })()}
                          </td>

                          {/* Registered Time */}
                          <td className="py-3 px-3 text-slate-400 text-[11px]">
                            {u.registeredTime || new Date(u.createdAt).toLocaleDateString()}
                          </td>

                          {/* Available Balance */}
                          <td className="py-3 px-3 font-black text-emerald-400 text-xs">
                            {(() => {
                              const meta = CURRENCIES[u.nativeCurrency || 'USD'] || CURRENCIES.USD;
                              return (
                                <div>
                                  <div className="font-mono text-emerald-400 font-black">{meta.symbol}{(u.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                  <div className="text-[10px] text-slate-400 font-bold font-sans">{meta.code}</div>
                                </div>
                              );
                            })()}
                          </td>

                          {/* Frozen Balance */}
                          <td className="py-3 px-3 font-bold text-amber-400 text-xs">
                            {(() => {
                              const meta = CURRENCIES[u.nativeCurrency || 'USD'] || CURRENCIES.USD;
                              return (
                                <div>
                                  <div className="font-mono text-amber-400 font-bold">{meta.symbol}{(u.freezeBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                  <div className="text-[10px] text-slate-400 font-bold font-sans">{meta.code}</div>
                                </div>
                              );
                            })()}
                          </td>

                          {/* Credit Score */}
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded-md bg-cyan-500/15 text-cyan-300 font-black text-[11px] border border-cyan-500/30">
                              {u.creditScore} / 100
                            </span>
                          </td>

                          {/* Trade Mode */}
                          <td className="py-3 px-3 font-sans">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                              u.tradeMode === 'FORCE_WIN'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                : u.tradeMode === 'FORCE_LOSS'
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                : 'bg-slate-800 text-slate-300'
                            }`}>
                              {u.tradeMode}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="py-3 px-3 font-sans">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                              u.status === 'Active'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            }`}>
                              {u.status.toUpperCase()}
                            </span>
                          </td>

                          {/* Action Button */}
                          <td className="py-3 px-3 text-right">
                            <button
                              onClick={() => handleOpenManageDrawer(u)}
                              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20 transition-all active:scale-95 ml-auto"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Manage Account</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB CONTENT: ADMIN SETTINGS & ACCOUNTS (Screenshot 5) */}
        {/* ============================================================ */}
        {adminTab === 'subadmins' && currentAdmin.role !== 'SUB_ADMIN' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Left Column: Create New Admin Account (Screenshot 5) */}
              <div className="lg:col-span-5 rounded-3xl bg-[#0c1322] border border-slate-800 p-6 shadow-2xl space-y-4">
                <div className="flex items-center space-x-2 text-white font-extrabold text-sm">
                  <Key className="w-4 h-4 text-amber-400" />
                  <span>Create New Admin Account</span>
                </div>

                <form onSubmit={handleCreateSubAdmin} className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-slate-300">Admin Username *</label>
                    <input
                      type="text"
                      value={newSubUser}
                      onChange={(e) => setNewSubUser(cleanMobileInput(e.target.value))}
                      placeholder="e.g. admin_alex or support_lead"
                      className="w-full bg-[#080d17] text-xs text-white rounded-xl px-3 py-2 border border-slate-700/80 focus:outline-none focus:border-amber-400 mt-1 font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300">Admin Display Name / Role Title</label>
                    <input
                      type="text"
                      value={newSubDisplayName}
                      onChange={(e) => setNewSubDisplayName(e.target.value)}
                      placeholder="e.g. Support Manager"
                      className="w-full bg-[#080d17] text-xs text-white rounded-xl px-3 py-2 border border-slate-700/80 focus:outline-none focus:border-amber-400 mt-1"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300">Security Password *</label>
                    <input
                      type="password"
                      value={newSubPass}
                      onChange={(e) => setNewSubPass(cleanMobileInput(e.target.value))}
                      placeholder="Set access password"
                      className="w-full bg-[#080d17] text-xs text-white rounded-xl px-3 py-2 border border-slate-700/80 focus:outline-none focus:border-amber-400 mt-1 font-mono"
                      required
                    />
                  </div>

                  {/* Authority Level */}
                  <div>
                    <label className="text-xs font-bold text-slate-300">Authority Level</label>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      <button
                        type="button"
                        onClick={() => setNewSubAuthority('SUB_ADMIN')}
                        className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                          newSubAuthority === 'SUB_ADMIN'
                            ? 'bg-amber-500 text-slate-950 font-black border-amber-500 shadow'
                            : 'bg-[#080d17] text-slate-400 border-slate-700'
                        }`}
                      >
                        Sub-Administrator
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewSubAuthority('SUPER_ADMIN')}
                        className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                          newSubAuthority === 'SUPER_ADMIN'
                            ? 'bg-blue-600 text-white font-black border-blue-500 shadow'
                            : 'bg-[#080d17] text-slate-400 border-slate-700'
                        }`}
                      >
                        Super Admin
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300">Custom Referral Code (Optional)</label>
                    <input
                      type="text"
                      value={newSubRef}
                      onChange={(e) => setNewSubRef(cleanMobileInput(e.target.value).toUpperCase())}
                      placeholder="E.G. AGENT_ALEX (AUTO-GENERATED IF EMPTY)"
                      className="w-full bg-[#080d17] text-xs text-amber-300 font-mono rounded-xl px-3 py-2 border border-slate-700/80 focus:outline-none focus:border-amber-400 mt-1 uppercase"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300">Assigned Telegram Support Link (Optional)</label>
                    <input
                      type="text"
                      value={newSubTelegram}
                      onChange={(e) => setNewSubTelegram(cleanMobileInput(e.target.value))}
                      placeholder="e.g. https://t.me/admin_handle or @handle"
                      className="w-full bg-[#080d17] text-xs text-white rounded-xl px-3 py-2 border border-slate-700/80 focus:outline-none focus:border-amber-400 mt-1"
                    />
                  </div>

                  {/* Scoped Module Permissions */}
                  <div className="space-y-1.5 pt-1">
                    <label className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">
                      SCOPED MODULE PERMISSIONS:
                    </label>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <label className="flex items-center space-x-2 text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newSubPermissions.includes('manage_users')}
                          onChange={(e) => {
                            if (e.target.checked) setNewSubPermissions([...newSubPermissions, 'manage_users']);
                            else setNewSubPermissions(newSubPermissions.filter(p => p !== 'manage_users'));
                          }}
                          className="rounded bg-slate-900 border-slate-700 text-amber-500"
                        />
                        <span>Users & Balance</span>
                      </label>

                      <label className="flex items-center space-x-2 text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newSubPermissions.includes('manage_trades')}
                          onChange={(e) => {
                            if (e.target.checked) setNewSubPermissions([...newSubPermissions, 'manage_trades']);
                            else setNewSubPermissions(newSubPermissions.filter(p => p !== 'manage_trades'));
                          }}
                          className="rounded bg-slate-900 border-slate-700 text-amber-500"
                        />
                        <span>Trades Win/Loss</span>
                      </label>

                      <label className="flex items-center space-x-2 text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newSubPermissions.includes('manage_finance')}
                          onChange={(e) => {
                            if (e.target.checked) setNewSubPermissions([...newSubPermissions, 'manage_finance']);
                            else setNewSubPermissions(newSubPermissions.filter(p => p !== 'manage_finance'));
                          }}
                          className="rounded bg-slate-900 border-slate-700 text-amber-500"
                        />
                        <span>Withdrawals & Deposits</span>
                      </label>

                      <label className="flex items-center space-x-2 text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newSubPermissions.includes('manage_notices')}
                          onChange={(e) => {
                            if (e.target.checked) setNewSubPermissions([...newSubPermissions, 'manage_notices']);
                            else setNewSubPermissions(newSubPermissions.filter(p => p !== 'manage_notices'));
                          }}
                          className="rounded bg-slate-900 border-slate-700 text-amber-500"
                        />
                        <span>Support Notice</span>
                      </label>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 transition-all active:scale-95 flex items-center justify-center space-x-2 mt-2"
                  >
                    <span>👤+ Create Admin Account</span>
                  </button>
                </form>
              </div>

              {/* Right Column: Active System Administrators (Screenshot 5) */}
              <div className="lg:col-span-7 rounded-3xl bg-[#0c1322] border border-slate-800 p-6 shadow-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-white font-extrabold text-sm">
                    <Users className="w-4 h-4 text-cyan-400" />
                    <span>Active System Administrators ({subadmins.length})</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">Scoped Real-time</span>
                </div>

                <div className="space-y-3">
                  {subadmins.map((adm) => (
                    <div
                      key={adm.id}
                      className="p-4 rounded-2xl bg-[#080d17] border border-cyan-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-3"
                    >
                      <div className="flex items-center space-x-3.5">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400">
                          <Shield className="w-5 h-5 stroke-[2.2]" />
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-black text-white font-mono">@{adm.username}</span>
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40">
                              {adm.role === 'SUPREME_OWNER' ? 'SUPREME OWNER' : 'MAIN ADMIN (SUPER)'}
                            </span>
                            {adm.id === currentAdmin.id && (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                You (Active)
                              </span>
                            )}
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-mono text-cyan-300 bg-cyan-950 border border-cyan-500/40">
                              Ref: {adm.referralCode}
                            </span>
                          </div>

                          <div className="text-xs text-slate-400 mt-1 font-mono">
                            {adm.displayName || 'Master Admin (Main)'} &bull; <span className="text-emerald-400 font-bold">3 Clients</span> &bull; <span className="text-cyan-400 font-bold">$14,250.5 Vol</span>
                          </div>

                          <div className="flex flex-wrap gap-1.5 mt-2">
                            <span className="px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-300 text-[9px] font-bold border border-emerald-500/30">Users ✔</span>
                            <span className="px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-300 text-[9px] font-bold border border-emerald-500/30">Trades ✔</span>
                            <span className="px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-300 text-[9px] font-bold border border-emerald-500/30">Finance ✔</span>
                            <span className="px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-300 text-[9px] font-bold border border-emerald-500/30">Notice ✔</span>
                            <span className="px-1.5 py-0.5 rounded bg-amber-950/60 text-amber-300 text-[9px] font-bold border border-amber-500/30">Full Settings ✔</span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleOpenEditAdmin(adm)}
                        className="px-3 py-1.5 rounded-xl bg-[#0e1726] hover:bg-[#15233a] border border-cyan-500/40 text-xs font-bold text-cyan-300 transition-all self-end md:self-auto cursor-pointer"
                      >
                        ⚙️ Edit Access
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Live Sessions Audit Table (Screenshot 5 bottom) */}
            <div className="rounded-3xl bg-[#0c1322] border border-slate-800 p-6 shadow-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-white flex items-center space-x-2">
                    <Key className="w-4 h-4 text-amber-400" />
                    <span>Administrator Login Sessions & Active Devices Audit</span>
                  </h3>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black border border-emerald-500/30">
                  Live Audit Trail
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-[#080d17] text-slate-400 font-extrabold uppercase text-[10px] border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">Admin</th>
                      <th className="py-2.5 px-3">Device Type</th>
                      <th className="py-2.5 px-3">IP Address</th>
                      <th className="py-2.5 px-3">Exact Date & Time</th>
                      <th className="py-2.5 px-3">Browser / Fingerprint</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {sessionsAudit.map((s, idx) => (
                      <tr key={s.session?.id || idx} className="hover:bg-slate-800/30">
                        <td className="py-2.5 px-3 font-bold text-white">
                          @{s.username} <span className="text-[10px] text-slate-400">[{s.referralCode}]</span>
                        </td>
                        <td className="py-2.5 px-3 text-cyan-300">
                          {s.session?.deviceType || 'PC'}
                        </td>
                        <td className="py-2.5 px-3 text-amber-300">
                          {s.session?.ip || '127.0.0.1'}
                        </td>
                        <td className="py-2.5 px-3 text-slate-300 text-[11px]">
                          {s.session?.timestamp ? new Date(s.session.timestamp).toLocaleString() : 'Recent'}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 text-[10px] max-w-xs truncate">
                          {s.session?.userAgent || 'Browser'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB CONTENT: WITHDRAWALS & DEPOSITS */}
        {/* ============================================================ */}
        {(adminTab === 'withdrawals' || adminTab === 'deposits') && (
          <div className="rounded-3xl bg-[#0c1322] border border-slate-800 p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-black text-white">
              {adminTab === 'withdrawals' ? 'Withdrawals Management Desk' : 'Deposits Verification Desk'}
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-[#080d17] text-slate-400 font-extrabold uppercase text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Type & User</th>
                    <th className="py-2.5 px-3">Amount</th>
                    <th className="py-2.5 px-3">Network / Gateway</th>
                    <th className="py-2.5 px-3">Address / Details</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Audit Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {requests
                    .filter(r => (adminTab === 'withdrawals' ? r.type === 'WITHDRAWAL' : r.type === 'DEPOSIT'))
                    .map(req => {
                      const isPending = req.status === 'PENDING';
                      return (
                        <tr key={req.id} className="hover:bg-slate-800/30">
                          <td className="py-2.5 px-3 font-sans">
                            <span className="font-extrabold text-white">@{req.username}</span>
                            <div className="text-[10px] text-slate-400 font-mono">{req.id}</div>
                          </td>

                          <td className="py-2.5 px-3 font-sans whitespace-nowrap">
                            {(() => {
                              const meta = CURRENCIES[req.currency || 'INR'] || CURRENCIES.INR;
                              const nativeAmt = req.amountNative !== undefined && req.amountNative > 0 ? req.amountNative : (req.amountUsd || 0);
                              return (
                                <div>
                                  <span className="font-extrabold text-emerald-400 text-sm block">
                                    {meta.flag} {meta.symbol}{Number(nativeAmt).toLocaleString()} {meta.code}
                                  </span>
                                  {meta.code !== 'USD' && req.amountUsd ? (
                                    <span className="text-[10px] text-slate-400 font-mono block">
                                      (${req.amountUsd.toLocaleString()} USD)
                                    </span>
                                  ) : null}
                                </div>
                              );
                            })()}
                          </td>

                          <td className="py-2.5 px-3 font-sans text-slate-300 whitespace-nowrap">
                            {req.network}
                          </td>

                          <td className="py-2.5 px-3 text-slate-300 text-[11px] max-w-sm">
                            <div className="font-mono bg-slate-900/60 p-1.5 rounded-lg border border-slate-800 break-words">
                              {req.addressOrAccount}
                            </div>
                          </td>

                          <td className="py-2.5 px-3 font-sans">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                              req.status === 'APPROVED'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                : req.status === 'REJECTED'
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                            }`}>
                              {req.status}
                            </span>
                          </td>

                          <td className="py-2.5 px-3 text-right font-sans space-x-1.5 whitespace-nowrap">
                            {isPending ? (
                              <>
                                <button
                                  onClick={async () => {
                                    await api.handleWalletRequestAction(req.id, 'APPROVE');
                                    fetchAllAdminData();
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={async () => {
                                    const reason = window.prompt("Enter rejection reason for this request:", "Identity / Audit verification pending") || "Rejected by Administrator";
                                    await api.handleWalletRequestAction(req.id, 'REJECT', reason);
                                    alert(`Withdrawal request rejected with reason: "${reason}"`);
                                    fetchAllAdminData();
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs"
                                >
                                  Reject
                                </button>
                              </>
                            ) : (
                              <span className="text-slate-500 italic text-[11px]">Processed</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB CONTENT: ALL USER TRADES & LIVE RUNNING CONTROLS */}
        {/* ============================================================ */}
        {adminTab === 'trades' && (
          <div className="space-y-5">
            {/* ACTIVE RUNNING TRADES HIGHLIGHT PANEL */}
            {(() => {
              const activeTrades = trades.filter(t => t.status === 'RUNNING');
              return (
                <div className="rounded-3xl bg-[#0c1322] border-2 border-cyan-500/50 p-6 shadow-2xl space-y-4 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 flex items-center justify-center font-black animate-pulse">
                        ⚡
                      </div>
                      <div>
                        <h3 className="text-base font-black text-white flex items-center space-x-2">
                          <span>Active Running Trades Controls ({activeTrades.length})</span>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-extrabold border border-emerald-500/40">
                            LIVE RUNNING
                          </span>
                        </h3>
                        <p className="text-xs text-slate-400">
                          Adjust trade amounts, profit %, direction, or force win/loss live while client trades are actively running!
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-mono text-cyan-300 font-bold bg-cyan-950/80 border border-cyan-500/40 px-3 py-1 rounded-xl">
                      Real-time Sync Active
                    </span>
                  </div>

                  {activeTrades.length === 0 ? (
                    <div className="p-8 text-center bg-[#080d17] rounded-2xl border border-slate-800 text-slate-400 text-xs font-mono">
                      No active running trades at this moment. When a client places a trade, it will appear here in real-time with sound notification!
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {activeTrades.map(t => {
                        const user = users.find(u => u.id === t.userId);
                        const userMeta = CURRENCIES[user?.nativeCurrency || 'USD'] || CURRENCIES.USD;
                        return (
                          <div
                            key={t.id}
                            className="p-4 rounded-2xl bg-[#080e1a] border border-cyan-500/40 shadow-xl space-y-3 relative"
                          >
                            {/* Trade Header */}
                            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                              <div>
                                <span className="font-extrabold text-white text-sm">@{t.username}</span>
                                <div className="text-[10px] text-slate-400 font-mono">ID: {t.id}</div>
                              </div>
                              <div className="text-right">
                                <span className="px-2.5 py-1 rounded-lg bg-cyan-950 text-cyan-300 text-xs font-black border border-cyan-500/40 font-mono">
                                  {t.symbol}
                                </span>
                                <span className={`ml-1.5 px-2 py-1 rounded-lg text-xs font-black ${
                                  t.direction === 'UP'
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                }`}>
                                  {t.direction === 'UP' ? '↑ BUY / UP' : '↓ SELL / DOWN'}
                                </span>
                              </div>
                            </div>

                            {/* Trade Stats */}
                            <div className="grid grid-cols-3 gap-2 text-xs font-mono bg-[#0c1424] p-2.5 rounded-xl border border-slate-800">
                              <div>
                                <span className="text-[10px] text-slate-400 block">Trade Amount</span>
                                <span className="font-black text-amber-400 text-sm">
                                  {userMeta.code !== 'USD' ? (
                                    <>
                                      {userMeta.flag} {userMeta.symbol}{Number(t.marginNative || (t.marginUsd * userMeta.rate)).toLocaleString()} {userMeta.code}
                                      <span className="text-[10px] text-slate-400 block font-normal">(${t.marginUsd} USD)</span>
                                    </>
                                  ) : (
                                    <>${t.marginUsd} USD</>
                                  )}
                                </span>
                              </div>
                              <div>
                                <span className="text-[10px] text-slate-400 block">Strike / Entry</span>
                                <span className="font-bold text-white">${t.entryPrice}</span>
                              </div>
                              <div>
                                <span className="text-[10px] text-slate-400 block">Duration & Yield</span>
                                <span className="font-bold text-cyan-300">{t.durationSeconds}s (+{t.profitPercent}%)</span>
                              </div>
                            </div>

                            {/* Active Amount Controls: Quick Adjust Buttons */}
                            <div className="space-y-2 pt-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-extrabold text-amber-300">
                                  ⚡ Increase / Decrease Trade Amount Live:
                                </span>
                              </div>

                              <div className="flex flex-wrap gap-1.5">
                                <button
                                  type="button"
                                  onClick={async () => {
                                    const newMargin = Math.max(1, t.marginUsd + 10);
                                    const res = await api.adminUpdateActiveTrade(t.id, { marginUsd: newMargin });
                                    if (res.error) alert(res.error);
                                    else fetchAllAdminData();
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 text-xs font-bold border border-emerald-500/40 transition-all active:scale-95"
                                >
                                  +$10
                                </button>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    const newMargin = Math.max(1, t.marginUsd + 50);
                                    const res = await api.adminUpdateActiveTrade(t.id, { marginUsd: newMargin });
                                    if (res.error) alert(res.error);
                                    else fetchAllAdminData();
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 text-xs font-bold border border-emerald-500/40 transition-all active:scale-95"
                                >
                                  +$50
                                </button>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    const newMargin = Math.max(1, t.marginUsd + 100);
                                    const res = await api.adminUpdateActiveTrade(t.id, { marginUsd: newMargin });
                                    if (res.error) alert(res.error);
                                    else fetchAllAdminData();
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 text-xs font-bold border border-emerald-500/40 transition-all active:scale-95"
                                >
                                  +$100
                                </button>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    const newMargin = Math.max(1, t.marginUsd - 10);
                                    const res = await api.adminUpdateActiveTrade(t.id, { marginUsd: newMargin });
                                    if (res.error) alert(res.error);
                                    else fetchAllAdminData();
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-rose-600/30 hover:bg-rose-600/50 text-rose-300 text-xs font-bold border border-rose-500/40 transition-all active:scale-95"
                                >
                                  -$10
                                </button>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    const newMargin = Math.max(1, t.marginUsd - 50);
                                    const res = await api.adminUpdateActiveTrade(t.id, { marginUsd: newMargin });
                                    if (res.error) alert(res.error);
                                    else fetchAllAdminData();
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-rose-600/30 hover:bg-rose-600/50 text-rose-300 text-xs font-bold border border-rose-500/40 transition-all active:scale-95"
                                >
                                  -$50
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingTrade(t);
                                    setEditTradeMarginInput(t.marginUsd.toString());
                                    setEditTradeProfitInput(t.profitPercent);
                                    setEditTradeDirectionInput(t.direction);
                                  }}
                                  className="px-3 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-extrabold border border-amber-500/40 transition-all active:scale-95 ml-auto"
                                >
                                  ✏️ Custom Edit
                                </button>
                              </div>
                            </div>

                            {/* Force Win / Loss Settle */}
                            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                              <span className="text-[11px] text-slate-400">Force Settle Outcome:</span>
                              <div className="space-x-1.5 font-sans">
                                <button
                                  onClick={async () => {
                                    await api.adminAdjustTrade(t.id, 'WIN');
                                    fetchAllAdminData();
                                  }}
                                  className="px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow transition-all active:scale-95"
                                >
                                  🏆 Force WIN
                                </button>
                                <button
                                  onClick={async () => {
                                    await api.adminAdjustTrade(t.id, 'LOSS');
                                    fetchAllAdminData();
                                  }}
                                  className="px-3 py-1 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black shadow transition-all active:scale-95"
                                >
                                  ❌ Force LOSS
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* ALL TRADES HISTORY TABLE */}
            <div className="rounded-3xl bg-[#0c1322] border border-slate-800 p-6 shadow-2xl space-y-4">
              <h3 className="text-base font-black text-white">All User Trades Monitoring Desk</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-[#080d17] text-slate-400 font-extrabold uppercase text-[10px] border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">Trade ID / User</th>
                      <th className="py-2.5 px-3">Symbol & Direction</th>
                      <th className="py-2.5 px-3">Duration & Yield</th>
                      <th className="py-2.5 px-3">Margin Amount</th>
                      <th className="py-2.5 px-3">Entry Strike</th>
                      <th className="py-2.5 px-3">Status / Outcome</th>
                      <th className="py-2.5 px-3 text-right">Admin Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {trades.map(t => (
                      <tr key={t.id} className="hover:bg-slate-800/30">
                        <td className="py-2.5 px-3 font-sans">
                          <span className="font-bold text-white">@{t.username}</span>
                          <div className="text-[10px] text-slate-500 font-mono">{t.id}</div>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="font-extrabold text-white">{t.symbol}</span>
                          <span className={`ml-1 text-[10px] font-black ${t.direction === 'UP' ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {t.direction === 'UP' ? '↑ UP' : '↓ DOWN'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">{t.durationSeconds}s (+{t.profitPercent}%)</td>
                        <td className="py-2.5 px-3 font-black text-amber-400">
                          {(() => {
                            const u = users.find(usr => usr.id === t.userId);
                            const meta = CURRENCIES[t.nativeCurrency || u?.nativeCurrency || 'INR'] || CURRENCIES.INR;
                            const nativeAmt = t.marginNative || (t.marginUsd * meta.rate);
                            return meta.code !== 'USD' ? (
                              <div>
                                <span className="text-xs font-black text-amber-400 block font-sans">
                                  {meta.flag} {meta.symbol}{Number(nativeAmt).toLocaleString()} {meta.code}
                                </span>
                                <span className="text-[10px] text-slate-400 block font-normal font-mono">
                                  (${t.marginUsd} USD)
                                </span>
                              </div>
                            ) : (
                              <span>${t.marginUsd}</span>
                            );
                          })()}
                        </td>
                        <td className="py-2.5 px-3">${t.entryPrice}</td>
                        <td className="py-2.5 px-3 font-sans">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                            t.status === 'RUNNING'
                              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 animate-pulse'
                              : t.outcome === 'WIN'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          }`}>
                            {t.status === 'RUNNING' ? 'RUNNING' : t.outcome}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right space-x-1 font-sans">
                          {t.status === 'RUNNING' && (
                            <button
                              onClick={() => {
                                setEditingTrade(t);
                                setEditTradeMarginInput(t.marginUsd.toString());
                                setEditTradeProfitInput(t.profitPercent);
                                setEditTradeDirectionInput(t.direction);
                              }}
                              className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/40 hover:bg-amber-500/30"
                            >
                              Edit Trade
                            </button>
                          )}
                          <button
                            onClick={async () => {
                              await api.adminAdjustTrade(t.id, 'WIN');
                              fetchAllAdminData();
                            }}
                            className="px-2 py-0.5 rounded bg-emerald-600/40 text-emerald-300 text-[10px] font-bold"
                          >
                            Win
                          </button>
                          <button
                            onClick={async () => {
                              await api.adminAdjustTrade(t.id, 'LOSS');
                              fetchAllAdminData();
                            }}
                            className="px-2 py-0.5 rounded bg-rose-600/40 text-rose-300 text-[10px] font-bold"
                          >
                            Loss
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB CONTENT: SUPPORT NOTICE */}
        {/* ============================================================ */}
        {adminTab === 'notice' && notice && (
          <div className="rounded-3xl bg-[#0c1322] border border-slate-800 p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-black text-white">24/7 Official Support Notice Editor</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-300">Notice Title</label>
                <input
                  type="text"
                  value={notice.title}
                  onChange={(e) => setNotice({ ...notice, title: e.target.value })}
                  className="w-full bg-[#080d17] text-xs text-white rounded-xl px-3 py-2 border border-slate-700/80 mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-300">Notice Content</label>
                <textarea
                  rows={3}
                  value={notice.content}
                  onChange={(e) => setNotice({ ...notice, content: e.target.value })}
                  className="w-full bg-[#080d17] text-xs text-white rounded-xl p-3 border border-slate-700/80 mt-1 resize-none"
                />
              </div>
              <button
                onClick={async () => {
                  await api.updateConfig({ notice });
                  alert('Support notice updated across all trader mobile accounts!');
                }}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs"
              >
                Publish Support Notice
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* DRAWER / MODAL: USER CONTROL ROOM (Exact match to Screenshots 2 & 3) */}
      {/* ============================================================ */}
      {manageUser && (
        <div
          onClick={() => setManageUser(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-4 overflow-y-auto"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg max-h-[88vh] flex flex-col rounded-3xl bg-[#0c1322] border border-slate-700/90 shadow-2xl overflow-hidden my-auto animate-scaleUp"
          >
            {/* Header: User Avatar & ID (Screenshot 2) */}
            <div className="flex items-center justify-between p-4 sm:p-5 pb-3 border-b border-slate-800 bg-[#09101d] shrink-0">
              <div className="flex items-center space-x-3">
                <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center font-black text-base">
                  {manageUser.username.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white leading-tight">
                    User Control Room: {manageUser.username}
                  </h3>
                  <div className="text-xs text-slate-400 font-mono mt-0.5">
                    {manageUser.email} (ID: {manageUser.id})
                  </div>
                </div>
              </div>

              {(() => {
                const userMeta = CURRENCIES[manageUser.nativeCurrency || 'USD'] || CURRENCIES.USD;
                return (
                  <div className="flex items-center space-x-2">
                    <span className="hidden sm:inline-block px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/40 text-xs font-black">
                      {userMeta.flag} {userMeta.code} ({userMeta.symbol})
                    </span>
                    <button
                      type="button"
                      onClick={() => setManageUser(null)}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-600 transition-all active:scale-90"
                      title="Close Control Room (Esc)"
                    >
                      <X className="w-5 h-5 stroke-[2.5]" />
                    </button>
                  </div>
                );
              })()}
            </div>

            {/* Scrollable Modal Content */}
            <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">

            {/* Available & Frozen Balance Cards */}
            {(() => {
              const userMeta = CURRENCIES[manageUser.nativeCurrency || 'USD'] || CURRENCIES.USD;
              return (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-2xl bg-[#080d17] border border-slate-800">
                      <div className="flex justify-between text-[11px] text-slate-400">
                        <span>Available Balance</span>
                        <span className="font-bold text-slate-300">{userMeta.code}</span>
                      </div>
                      <div className="text-2xl font-black text-emerald-400 font-mono mt-1">
                        {userMeta.symbol}{(manageUser.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-[#080d17] border border-slate-800">
                      <div className="flex justify-between text-[11px] text-slate-400">
                        <span>Frozen Balance</span>
                        <span className="font-bold text-slate-300">{userMeta.code}</span>
                      </div>
                      <div className="text-2xl font-black text-amber-400 font-mono mt-1">
                        {userMeta.symbol}{(manageUser.freezeBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>

                  {/* Section 1: Add or Deduct Balance */}
                  <div className="p-4 rounded-2xl bg-[#080d17] border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-emerald-400">
                        💲 1. Add or Deduct Balance ({userMeta.code} - {userMeta.symbol}):
                      </span>
                      <span className="text-[10px] text-amber-400 font-bold">Currency: {userMeta.code} ({userMeta.symbol})</span>
                    </div>

                    {/* Segmented Buttons */}
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setBalanceActionType('add')}
                        className={`py-2 rounded-xl text-xs font-extrabold transition-all ${
                          balanceActionType === 'add'
                            ? 'bg-amber-500 text-slate-950 font-black shadow'
                            : 'bg-[#0c1424] text-slate-300 border border-slate-700'
                        }`}
                      >
                        + Add {userMeta.code}
                      </button>

                      <button
                        type="button"
                        onClick={() => setBalanceActionType('deduct')}
                        className={`py-2 rounded-xl text-xs font-extrabold transition-all ${
                          balanceActionType === 'deduct'
                            ? 'bg-amber-500 text-slate-950 font-black shadow'
                            : 'bg-[#0c1424] text-slate-300 border border-slate-700'
                        }`}
                      >
                        - Deduct {userMeta.code}
                      </button>

                      <button
                        type="button"
                        onClick={() => setBalanceActionType('set')}
                        className={`py-2 rounded-xl text-xs font-extrabold transition-all ${
                          balanceActionType === 'set'
                            ? 'bg-amber-500 text-slate-950 font-black shadow'
                            : 'bg-[#0c1424] text-slate-300 border border-slate-700'
                        }`}
                      >
                        Set {userMeta.code}
                      </button>
                    </div>

                    {/* Amount Input & Apply Button */}
                    <div className="flex items-center space-x-2">
                      <div className="relative flex-1">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">{userMeta.symbol}</span>
                        <input
                          type="number"
                          value={balanceAmount}
                          onChange={(e) => setBalanceAmount(e.target.value)}
                          placeholder={`Enter amount in ${userMeta.code} (e.g. 500)`}
                          className="w-full bg-[#0c1424] text-xs font-bold text-white rounded-xl pl-8 pr-3 py-2.5 border border-slate-700 focus:outline-none focus:border-amber-400 font-mono"
                        />
                      </div>
                      <button
                        onClick={handleApplyBalance}
                        className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-black text-xs text-white shadow-md shadow-emerald-600/30 transition-all active:scale-95"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                </>
              );
            })()}

            {/* Section 2: Credit Score Adjustment (Screenshot 2) */}
            <div className="p-4 rounded-2xl bg-[#080d17] border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-cyan-400">
                  🛡️ 2. Credit Score Adjustment:
                </span>
                <span className="text-xs font-mono font-black text-cyan-300">
                  {creditScoreInput} / 100
                </span>
              </div>

              {/* Range Slider with Cyan Thumb */}
              <input
                type="range"
                min="0"
                max="100"
                value={creditScoreInput}
                onChange={(e) => setCreditScoreInput(parseInt(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
              />

              {/* Quick Set Buttons */}
              <div className="flex items-center justify-between gap-2 pt-1">
                <div className="flex items-center space-x-1.5">
                  <button
                    type="button"
                    onClick={() => setCreditScoreInput(100)}
                    className="px-2.5 py-1.5 rounded-xl bg-[#0c1424] hover:bg-[#15233a] border border-slate-700 text-[10px] font-bold text-cyan-300"
                  >
                    Set 100 (Max)
                  </button>

                  <button
                    type="button"
                    onClick={() => setCreditScoreInput(95)}
                    className="px-2.5 py-1.5 rounded-xl bg-[#0c1424] hover:bg-[#15233a] border border-slate-700 text-[10px] font-bold text-cyan-300"
                  >
                    Set 95 (Standard)
                  </button>

                  <button
                    type="button"
                    onClick={() => setCreditScoreInput(50)}
                    className="px-2.5 py-1.5 rounded-xl bg-[#0c1424] hover:bg-[#15233a] border border-slate-700 text-[10px] font-bold text-amber-300"
                  >
                    Set 50 (Warning)
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleSaveCreditScore}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-md shadow-emerald-600/30 transition-all active:scale-95"
                >
                  Save Score
                </button>
              </div>
            </div>

            {/* Section 3: Trade Outcome Engine Mode (Screenshot 2 & 3) */}
            <div className="p-4 rounded-2xl bg-[#080d17] border border-slate-800 space-y-3">
              <span className="text-xs font-extrabold text-amber-400">
                ⚡ 3. Trade Outcome Engine Mode:
              </span>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleSetTradeMode('AUTO')}
                  className={`py-2 rounded-xl text-xs font-extrabold transition-all border ${
                    manageUser.tradeMode === 'AUTO'
                      ? 'bg-blue-600 text-white border-blue-500 shadow'
                      : 'bg-[#0c1424] text-slate-300 border-slate-700'
                  }`}
                >
                  Auto (Natural)
                </button>

                <button
                  type="button"
                  onClick={() => handleSetTradeMode('FORCE_WIN')}
                  className={`py-2 rounded-xl text-xs font-extrabold transition-all border ${
                    manageUser.tradeMode === 'FORCE_WIN'
                      ? 'bg-emerald-600 text-white border-emerald-500 shadow'
                      : 'bg-[#0c1424] text-slate-300 border-slate-700'
                  }`}
                >
                  Force Win (100%)
                </button>

                <button
                  type="button"
                  onClick={() => handleSetTradeMode('FORCE_LOSS')}
                  className={`py-2 rounded-xl text-xs font-extrabold transition-all border ${
                    manageUser.tradeMode === 'FORCE_LOSS'
                      ? 'bg-rose-600 text-white border-rose-500 shadow'
                      : 'bg-[#0c1424] text-slate-300 border-slate-700'
                  }`}
                >
                  Force Loss (0%)
                </button>
              </div>
            </div>

            {/* Section 4: Client Login & Password Control (Screenshot 3) */}
            <div className="p-4 rounded-2xl bg-[#080d17] border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-extrabold text-cyan-400">🔒 4. Client Login & Password Control:</span>
                <span className="font-mono text-cyan-300 text-[11px]">Username: @{manageUser.username}</span>
              </div>
              <p className="text-[11px] text-slate-400">
                If the client forgets their password or cannot log in on mobile, reset it here:
              </p>
              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="text"
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  placeholder="Enter new password (e.g. Pass1234)"
                  className="flex-1 bg-[#0c1424] text-xs font-mono text-white rounded-xl px-3 py-2 border border-slate-700 focus:outline-none focus:border-cyan-400"
                />
                <button
                  onClick={handleResetPassword}
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-black text-xs shadow-md transition-all active:scale-95 whitespace-nowrap"
                >
                  Update Password
                </button>
              </div>
            </div>

            {/* Section 5: Account Freeze & Deactivation Control (Screenshot 3) */}
            <div className="p-4 rounded-2xl bg-[#080d17] border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-rose-400">
                  🔒 5. Account Freeze & Deactivation Control:
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                  manageUser.status === 'Active'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                }`}>
                  {manageUser.status.toUpperCase()}
                </span>
              </div>

              <p className="text-[11px] text-slate-400">
                Freezing deactivates the account. Enter a reason below so the client can read why their account was blocked.
              </p>

              <div>
                <label className="text-[10px] font-bold text-slate-300 block mb-1">
                  Freeze / Block Reason (Visible to Client) *
                </label>
                <input
                  type="text"
                  value={freezeReasonInput}
                  onChange={(e) => setFreezeReasonInput(e.target.value)}
                  placeholder="e.g. Identity verification pending, Suspicious trade pattern, Audit review"
                  className="w-full bg-[#0c1424] text-xs text-white rounded-xl px-3 py-2 border border-slate-700 focus:outline-none focus:border-rose-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleFreezeToggle('reactivate')}
                  className="py-2.5 px-3 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-500/40 text-emerald-300 font-extrabold text-xs transition-all active:scale-95 flex items-center justify-center space-x-1.5"
                >
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  <span>Reactivate Account</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleFreezeToggle('freeze')}
                  className="py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs transition-all active:scale-95 shadow-md shadow-rose-600/30 flex items-center justify-center space-x-1.5"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Freeze Account with Reason</span>
                </button>
              </div>
            </div>

            {/* Section 6: Delete Trader Account (Screenshot 3) */}
            <div className="p-4 rounded-2xl bg-[#080d17] border border-rose-500/30 flex items-center justify-between">
              <div>
                <div className="text-xs font-extrabold text-rose-400">Delete Trader Account</div>
                <div className="text-[10px] text-rose-300/70">Permanently remove this user and their trade history</div>
              </div>
              <button
                type="button"
                onClick={handleDeleteAccount}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs shadow-md shadow-rose-600/30 transition-all active:scale-95 flex items-center space-x-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Account</span>
              </button>
            </div>
          </div>

          {/* Modal Bottom Footer: Prominent Cancel / Close Button */}
          <div className="p-3 bg-[#080d17] border-t border-slate-800 flex items-center justify-between gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setManageUser(null)}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 font-black text-xs transition-all active:scale-95 flex items-center justify-center space-x-2 shadow-sm"
            >
              <X className="w-4 h-4 text-slate-400" />
              <span>Close / Cancel Control Room</span>
            </button>
          </div>
        </div>
      </div>
    )}

      {/* ============================================================ */}
      {/* MODAL: ADD CLIENT (Screenshot 4 button) */}
      {/* ============================================================ */}
      {addClientModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
          <div className="w-full max-w-sm rounded-3xl bg-[#0c1322] border border-slate-700 p-6 shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-white">Add Client Trader Account</h3>
              <button onClick={() => setAddClientModalOpen(false)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddClient} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-300">Username *</label>
                <input
                  type="text"
                  value={newClientUsername}
                  onChange={(e) => setNewClientUsername(cleanMobileInput(e.target.value))}
                  placeholder="e.g. 123123123123 or trader_john"
                  className="w-full bg-[#080d17] text-xs text-white rounded-xl px-3 py-2 border border-slate-700 mt-1 font-mono"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300">Email Address</label>
                <input
                  type="email"
                  value={newClientEmail}
                  onChange={(e) => setNewClientEmail(e.target.value)}
                  placeholder="e.g. user@flowcoin.com"
                  className="w-full bg-[#080d17] text-xs text-white rounded-xl px-3 py-2 border border-slate-700 mt-1"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300">Password</label>
                <input
                  type="text"
                  value={newClientPassword}
                  onChange={(e) => setNewClientPassword(cleanMobileInput(e.target.value))}
                  className="w-full bg-[#080d17] text-xs text-white rounded-xl px-3 py-2 border border-slate-700 mt-1 font-mono"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300">Client Account Currency *</label>
                <select
                  value={newClientCurrency}
                  onChange={(e) => setNewClientCurrency(e.target.value as Currency)}
                  className="w-full bg-[#080d17] text-xs font-bold text-amber-300 rounded-xl px-3 py-2 border border-slate-700 mt-1 focus:outline-none focus:border-amber-400"
                >
                  <option value="INR">🇮🇳 INR - Indian Rupee (₹)</option>
                  <option value="USD">🇺🇸 USD - US Dollar ($)</option>
                  <option value="USDT">🟢 USDT - Tether (₮)</option>
                  <option value="PKR">🇵🇰 PKR - Pakistani Rupee (₨)</option>
                  <option value="BRL">🇧🇷 BRL - Brazilian Real (R$)</option>
                  <option value="EGP">🇪🇬 EGP - Egyptian Pound (E£)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300">Initial Balance ({newClientCurrency})</label>
                <input
                  type="number"
                  value={newClientBalance}
                  onChange={(e) => setNewClientBalance(e.target.value)}
                  placeholder={`Enter initial amount in ${newClientCurrency}`}
                  className="w-full bg-[#080d17] text-xs text-emerald-400 font-mono font-bold rounded-xl px-3 py-2 border border-slate-700 mt-1"
                  required
                />
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAddClientModalOpen(false)}
                  className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black"
                >
                  Create Client
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: CUSTOMIZE REFERRAL CODE */}
      {/* ============================================================ */}
      {referralModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
          <div className="w-full max-w-sm rounded-3xl bg-[#0c1322] border border-slate-700 p-6 shadow-2xl space-y-4 animate-scaleUp">
            <h3 className="text-base font-black text-white">Customize Referral Code</h3>
            <p className="text-xs text-slate-400">
              Traders registered under this code will be scoped to your portal. Changes persist immediately across database records.
            </p>

            <form onSubmit={handleSaveCustomReferral} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-300">New Referral Code</label>
                <input
                  type="text"
                  value={customReferralCode}
                  onChange={(e) => setCustomReferralCode(cleanMobileInput(e.target.value).toUpperCase())}
                  placeholder="e.g. MASTER321"
                  className="w-full bg-[#080d17] text-base font-black font-mono text-cyan-300 rounded-xl px-3.5 py-2.5 border border-slate-700 focus:outline-none focus:border-cyan-400 mt-1 uppercase"
                  required
                />
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReferralModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 font-black text-xs text-slate-950 shadow-md shadow-cyan-600/30"
                >
                  Save Code
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: EDIT ADMIN ACCOUNT ACCESS & PERMISSIONS */}
      {/* ============================================================ */}
      {editingAdminAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-3xl bg-[#0c1322] border border-cyan-500/50 p-6 shadow-2xl space-y-4 my-8 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-black text-white flex items-center space-x-2">
                  <Shield className="w-5 h-5 text-cyan-400" />
                  <span>Edit Admin Access: @{editingAdminAccount.username}</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Role: <span className="text-amber-400 font-bold">{editingAdminAccount.role}</span> &bull; Scoped Client Base
                </p>
              </div>
              <button
                onClick={() => setEditingAdminAccount(null)}
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center font-bold text-sm"
              >
                ✕
              </button>
            </div>

            {/* Real IP & Session Audit Info */}
            <div className="p-3.5 rounded-2xl bg-[#080d17] border border-slate-800 space-y-1.5 font-mono text-xs">
              <div className="text-[10px] uppercase font-bold text-slate-500">Real Network & Security Audit</div>
              <div className="flex justify-between text-slate-300">
                <span>Real Admin IP Address:</span>
                <span className="text-amber-400 font-bold">{editingAdminAccount.loginHistory?.[0]?.ip || '185.220.101.8 (Verified)'}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Last Device & Location:</span>
                <span className="text-cyan-300 font-bold">{editingAdminAccount.loginHistory?.[0]?.deviceType || 'Desktop (Windows/Chrome)'}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Last Activity Timestamp:</span>
                <span className="text-slate-400">{editingAdminAccount.loginHistory?.[0]?.timestamp ? new Date(editingAdminAccount.loginHistory[0].timestamp).toLocaleString() : 'Active session'}</span>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-300">Change Admin Password (leave blank to keep current)</label>
                <input
                  type="password"
                  value={editAdminPass}
                  onChange={(e) => setEditAdminPass(e.target.value)}
                  placeholder="Enter new password..."
                  className="w-full bg-[#080d17] text-xs font-mono text-white rounded-xl px-3.5 py-2.5 border border-slate-700 focus:outline-none focus:border-cyan-400 mt-1"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300">Admin Referral Code</label>
                <input
                  type="text"
                  value={editAdminRef}
                  onChange={(e) => setEditAdminRef(cleanMobileInput(e.target.value).toUpperCase())}
                  placeholder="e.g. AGENT786"
                  className="w-full bg-[#080d17] text-xs font-mono text-cyan-300 font-bold rounded-xl px-3.5 py-2.5 border border-slate-700 focus:outline-none focus:border-cyan-400 mt-1 uppercase"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300">Telegram / Support Link</label>
                <input
                  type="text"
                  value={editAdminSupportLink}
                  onChange={(e) => setEditAdminSupportLink(e.target.value)}
                  placeholder="e.g. https://t.me/your_admin_support"
                  className="w-full bg-[#080d17] text-xs font-mono text-emerald-400 rounded-xl px-3.5 py-2.5 border border-slate-700 focus:outline-none focus:border-cyan-400 mt-1"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300">Permissions & Access Control</label>
                <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                  <label className="flex items-center space-x-2 text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editAdminPermissions.includes('manage_users')}
                      onChange={(e) => {
                        if (e.target.checked) setEditAdminPermissions([...editAdminPermissions, 'manage_users']);
                        else setEditAdminPermissions(editAdminPermissions.filter(p => p !== 'manage_users'));
                      }}
                      className="rounded bg-slate-900 border-slate-700 text-cyan-500"
                    />
                    <span>Manage Clients</span>
                  </label>

                  <label className="flex items-center space-x-2 text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editAdminPermissions.includes('manage_trades')}
                      onChange={(e) => {
                        if (e.target.checked) setEditAdminPermissions([...editAdminPermissions, 'manage_trades']);
                        else setEditAdminPermissions(editAdminPermissions.filter(p => p !== 'manage_trades'));
                      }}
                      className="rounded bg-slate-900 border-slate-700 text-cyan-500"
                    />
                    <span>Manage Trades</span>
                  </label>

                  <label className="flex items-center space-x-2 text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editAdminPermissions.includes('manage_finance')}
                      onChange={(e) => {
                        if (e.target.checked) setEditAdminPermissions([...editAdminPermissions, 'manage_finance']);
                        else setEditAdminPermissions(editAdminPermissions.filter(p => p !== 'manage_finance'));
                      }}
                      className="rounded bg-slate-900 border-slate-700 text-cyan-500"
                    />
                    <span>Finance & Withdrawals</span>
                  </label>

                  <label className="flex items-center space-x-2 text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editAdminPermissions.includes('manage_notices')}
                      onChange={(e) => {
                        if (e.target.checked) setEditAdminPermissions([...editAdminPermissions, 'manage_notices']);
                        else setEditAdminPermissions(editAdminPermissions.filter(p => p !== 'manage_notices'));
                      }}
                      className="rounded bg-slate-900 border-slate-700 text-cyan-500"
                    />
                    <span>Support Notice</span>
                  </label>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={handleDeleteAdminAccount}
                  className="px-4 py-2.5 rounded-xl bg-red-900/40 border border-red-500/50 hover:bg-red-900/70 text-red-300 font-bold text-xs transition-all"
                >
                  🗑️ Delete Admin
                </button>
                <div className="flex-1 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingAdminAccount(null)}
                    className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveAdminEdits}
                    className="flex-1 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 font-black text-xs text-slate-950 shadow-md shadow-cyan-500/30"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ============================================================ */}
      {/* MODAL: EDIT ACTIVE RUNNING TRADE (MARGIN, YIELD, DIRECTION) */}
      {/* ============================================================ */}
      {editingTrade && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
          <div className="w-full max-w-md rounded-3xl bg-[#0c1322] border-2 border-cyan-500/60 p-6 shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-black text-white flex items-center space-x-2">
                  <span>⚡ Custom Edit Active Trade</span>
                  <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-bold">
                    RUNNING
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  Trader: <strong className="text-white">@{editingTrade.username}</strong> &bull; Asset: <strong className="text-cyan-300">{editingTrade.symbol}</strong>
                </p>
              </div>
              <button
                onClick={() => setEditingTrade(null)}
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {/* Trade Margin Amount */}
              <div>
                <label className="text-xs font-bold text-amber-300 flex justify-between">
                  <span>Trade Margin Amount ($ USD):</span>
                  <span className="text-slate-400 font-mono">Current: ${editingTrade.marginUsd}</span>
                </label>
                <div className="relative mt-1">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                  <input
                    type="number"
                    value={editTradeMarginInput}
                    onChange={(e) => setEditTradeMarginInput(e.target.value)}
                    placeholder="Enter new margin amount"
                    className="w-full bg-[#080d17] text-sm font-black text-amber-400 rounded-xl pl-8 pr-3.5 py-2.5 border border-slate-700 focus:outline-none focus:border-cyan-400 font-mono"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Increasing or decreasing this amount will automatically adjust the trader's balance and escrow escrow in real-time!
                </p>
              </div>

              {/* Profit Yield % */}
              <div>
                <label className="text-xs font-bold text-slate-300">Profit Yield Rate (%)</label>
                <div className="grid grid-cols-5 gap-1.5 mt-1">
                  {[20, 40, 60, 80, 100].map(pct => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setEditTradeProfitInput(pct)}
                      className={`py-2 rounded-xl text-xs font-black transition-all ${
                        editTradeProfitInput === pct
                          ? 'bg-cyan-500 text-slate-950 font-black shadow'
                          : 'bg-[#080d17] text-slate-300 border border-slate-700'
                      }`}
                    >
                      +{pct}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Direction */}
              <div>
                <label className="text-xs font-bold text-slate-300">Trade Direction</label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => setEditTradeDirectionInput('UP')}
                    className={`py-2.5 rounded-xl text-xs font-extrabold transition-all ${
                      editTradeDirectionInput === 'UP'
                        ? 'bg-emerald-600 text-white font-black shadow'
                        : 'bg-[#080d17] text-slate-400 border border-slate-700'
                    }`}
                  >
                    ↑ BUY / UP
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditTradeDirectionInput('DOWN')}
                    className={`py-2.5 rounded-xl text-xs font-extrabold transition-all ${
                      editTradeDirectionInput === 'DOWN'
                        ? 'bg-rose-600 text-white font-black shadow'
                        : 'bg-[#080d17] text-slate-400 border border-slate-700'
                    }`}
                  >
                    ↓ SELL / DOWN
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingTrade(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!editingTrade) return;
                    const num = parseFloat(editTradeMarginInput);
                    if (isNaN(num) || num <= 0) {
                      alert('Please enter a valid margin amount');
                      return;
                    }
                    const res = await api.adminUpdateActiveTrade(editingTrade.id, {
                      marginUsd: num,
                      profitPercent: editTradeProfitInput,
                      direction: editTradeDirectionInput
                    });
                    if (res.error) {
                      alert(res.error);
                    } else {
                      alert(`Active trade @${editingTrade.username} updated successfully! New Margin: $${num}`);
                      setEditingTrade(null);
                      fetchAllAdminData();
                    }
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 font-black text-xs text-slate-950 shadow-md shadow-cyan-500/30"
                >
                  Save Changes Live
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
