/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Header } from './components/Header.tsx';
import { BottomNav, NavigationTab } from './components/BottomNav.tsx';
import { HomeTab } from './components/HomeTab.tsx';
import { MarketTab } from './components/MarketTab.tsx';
import { TradeTab } from './components/TradeTab.tsx';
import { OrdersTab } from './components/OrdersTab.tsx';
import { AssetsTab } from './components/AssetsTab.tsx';
import { CurrencyModal } from './components/CurrencyModal.tsx';
import { DepositModal } from './components/DepositModal.tsx';
import { WithdrawModal } from './components/WithdrawModal.tsx';
import { ChangePasswordModal } from './components/ChangePasswordModal.tsx';
import { AuthModal } from './components/AuthModal.tsx';
import { AdminPortal } from './components/AdminPortal.tsx';
import {
  User,
  Currency,
  CoinTicker,
  TradeOrder,
  SupportNotice,
  AppConfig
} from './types.ts';
import { api } from './services/api.ts';
import { X, Bell, CheckCircle2 } from 'lucide-react';

export default function App() {
  // Navigation & View
  const [currentTab, setCurrentTab] = useState<NavigationTab>('home');
  const [isAdminView, setIsAdminView] = useState<boolean>(false);

  // User & Currency
  const [user, setUser] = useState<User | null>(null);
  const [currency, setCurrency] = useState<Currency>('USD');

  // Market & Trading State
  const [tickers, setTickers] = useState<CoinTicker[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState<string>('BTC/USDT');
  const [userTrades, setUserTrades] = useState<TradeOrder[]>([]);

  // Config & Notices
  const [appConfig, setAppConfig] = useState<AppConfig>({
    telegramSupportUsername: '@flowcoin_support_desk',
    telegramLink: 'https://t.me/flowcoin_support_desk',
    exchangeRates: { USD: 1.0, USDT: 1.0, PKR: 278.5, INR: 87.2, BRL: 5.8, EGP: 50.5 },
    minDepositUsd: 10,
    minWithdrawalUsd: 20,
    platformNotice: 'High Yield 60s Option Settlement Desk Active'
  });

  const [supportNotice, setSupportNotice] = useState<SupportNotice>({
    title: 'Official Support Notice',
    date: '9/4/2026',
    content: 'Welcome to FLOW COIN Trading. Our real-time settlement and customer support desk is active 24/7.',
    isActive: true
  });

  // Modals
  const [isCurrencyModalOpen, setIsCurrencyModalOpen] = useState(false);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  // Notifications
  const [notifications, setNotifications] = useState<Array<{ id: string; title: string; message: string; time: string }>>([
    {
      id: 'notif_1',
      title: 'Welcome to Flow Coin',
      message: 'Your account is verified. 60s Option contracts with +20% return are ready to trade.',
      time: 'Just now'
    }
  ]);

  // Initial Load: User & Market
  useEffect(() => {
    // 1. Initial Login as Default Demo User (matching screenshots)
    const savedUserId = localStorage.getItem('flowcoin_user_id') || 'usr_123123123123';
    api.getUserProfile(savedUserId).then(res => {
      if (res.success && res.user) {
        setUser(res.user);
        setCurrency(res.user.nativeCurrency || 'USD');
      }
    }).catch(console.error);

    // 2. Fetch App Config & Notice
    api.getConfig().then(data => {
      if (data) {
        setAppConfig(data.config);
        setSupportNotice(data.notice);
      }
    }).catch(console.error);

    // 3. Check URL hash for direct admin link
    if (window.location.hash === '#admin') {
      setIsAdminView(true);
    }

    const onHashChange = () => {
      setIsAdminView(window.location.hash === '#admin');
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // Poll live tickers & user trades
  useEffect(() => {
    const fetchTickers = () => {
      api.getTickers().then(data => {
        if (data && data.length > 0) setTickers(data);
      }).catch(console.error);
    };

    fetchTickers();
    const interval = setInterval(fetchTickers, 3000);
    return () => clearInterval(interval);
  }, []);

  // Poll User Trades & Profile
  const refreshUserData = () => {
    if (!user) return;
    api.getUserProfile(user.id).then(res => {
      if (res.success && res.user) {
        setUser(res.user);
      }
    }).catch(console.error);

    api.getTrades(user.id).then(trades => {
      if (trades) setUserTrades(trades);
    }).catch(console.error);
  };

  useEffect(() => {
    if (user) {
      refreshUserData();
      const interval = setInterval(refreshUserData, 4000);
      return () => clearInterval(interval);
    }
  }, [user?.id]);

  const handleSelectCoin = (symbol: string) => {
    setSelectedSymbol(symbol);
    setCurrentTab('trade');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleTradePlaced = (newTrade: TradeOrder) => {
    setUserTrades(prev => [newTrade, ...prev]);
    setNotifications(prev => [
      {
        id: `notif_${Date.now()}`,
        title: 'Option Contract Entered',
        message: `${newTrade.direction === 'UP' ? 'BUY UP' : 'BUY DOWN'} on ${newTrade.symbol} ($${newTrade.marginUsd} USD) in execution.`,
        time: 'Just now'
      },
      ...prev
    ]);
  };

  const handleUserLogout = () => {
    setUser(null);
    localStorage.removeItem('flowcoin_user_id');
    setIsAuthModalOpen(true);
  };

  const handleLoginSuccess = (loggedInUser: User) => {
    setUser(loggedInUser);
    setCurrency(loggedInUser.nativeCurrency || 'USD');
    localStorage.setItem('flowcoin_user_id', loggedInUser.id);
  };

  const runningTradesCount = userTrades.filter(t => t.status === 'RUNNING').length;

  // If in Admin Portal Mode, render full-featured Admin Control Portal
  if (isAdminView) {
    return (
      <AdminPortal
        onBackToClient={() => {
          setIsAdminView(false);
          window.location.hash = '';
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0f19] text-white flex flex-col font-sans selection:bg-cyan-500 selection:text-black">
      {/* Top Header */}
      <Header
        user={user}
        currency={currency}
        onOpenCurrency={() => setIsCurrencyModalOpen(true)}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onToggleAdmin={() => {
          setIsAdminView(true);
          window.location.hash = 'admin';
        }}
        isAdminView={isAdminView}
        unreadCount={notifications.length}
      />

      {/* Main Responsive Container */}
      <main className="flex-1 w-full max-w-md md:max-w-4xl lg:max-w-5xl xl:max-w-6xl mx-auto px-3.5 pt-3 transition-all">
        {currentTab === 'home' && (
          <HomeTab
            tickers={tickers}
            currency={currency}
            onSelectCoin={handleSelectCoin}
            onViewAllMarkets={() => setCurrentTab('market')}
            onNavigateToTrade={() => setCurrentTab('trade')}
            onNavigateToWithdraw={() => setIsWithdrawModalOpen(true)}
          />
        )}

        {currentTab === 'market' && (
          <MarketTab
            tickers={tickers}
            currency={currency}
            onSelectCoin={handleSelectCoin}
          />
        )}

        {currentTab === 'trade' && (
          <TradeTab
            user={user}
            selectedSymbol={selectedSymbol}
            onSelectSymbol={setSelectedSymbol}
            tickers={tickers}
            currency={currency}
            onRefreshUser={refreshUserData}
            onTradePlaced={handleTradePlaced}
          />
        )}

        {currentTab === 'order' && (
          <OrdersTab
            trades={userTrades}
            currency={currency}
            onGoToTrade={() => setCurrentTab('trade')}
          />
        )}

        {currentTab === 'assets' && (
          <AssetsTab
            user={user}
            currency={currency}
            supportNotice={supportNotice}
            appConfig={appConfig}
            onOpenDeposit={() => setIsDepositModalOpen(true)}
            onOpenWithdraw={() => setIsWithdrawModalOpen(true)}
            onOpenChangePassword={() => setIsPasswordModalOpen(true)}
            onLogout={handleUserLogout}
            onOpenAuth={() => setIsAuthModalOpen(true)}
          />
        )}
      </main>

      {/* Bottom Navigation */}
      <BottomNav
        currentTab={currentTab}
        onChangeTab={setCurrentTab}
        runningOrderCount={runningTradesCount}
      />

      {/* Notifications Drawer */}
      {isNotificationsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-sm rounded-3xl bg-[#111827] border border-slate-700 p-5 shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Bell className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-black text-white">Notifications</h3>
              </div>
              <button
                onClick={() => setIsNotificationsOpen(false)}
                className="p-1 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-2.5">
              {notifications.map(n => (
                <div key={n.id} className="p-3 rounded-2xl bg-[#0b0f19] border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-white">{n.title}</span>
                    <span className="text-[10px] text-slate-500">{n.time}</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-snug">{n.message}</p>
                </div>
              ))}
            </div>

            <button
              onClick={() => setIsNotificationsOpen(false)}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Currency Switch Modal */}
      <CurrencyModal
        isOpen={isCurrencyModalOpen}
        onClose={() => setIsCurrencyModalOpen(false)}
        currentCurrency={currency}
        onSelectCurrency={setCurrency}
      />

      {/* Deposit Modal */}
      {user && (
        <DepositModal
          isOpen={isDepositModalOpen}
          onClose={() => setIsDepositModalOpen(false)}
          user={user}
          currency={currency}
          appConfig={appConfig}
          onSuccess={refreshUserData}
        />
      )}

      {/* Withdraw Modal */}
      {user && (
        <WithdrawModal
          isOpen={isWithdrawModalOpen}
          onClose={() => setIsWithdrawModalOpen(false)}
          user={user}
          currency={currency}
          appConfig={appConfig}
          onSuccess={refreshUserData}
        />
      )}

      {/* Change Password Modal */}
      {user && (
        <ChangePasswordModal
          isOpen={isPasswordModalOpen}
          onClose={() => setIsPasswordModalOpen(false)}
          userId={user.id}
        />
      )}

      {/* Client & Admin Unified Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
        onAdminLoginSuccess={(adm) => {
          localStorage.setItem('flowcoin_admin_id', adm.id);
          setIsAdminView(true);
          window.location.hash = '#admin';
        }}
        defaultCurrency={currency}
      />
    </div>
  );
}
