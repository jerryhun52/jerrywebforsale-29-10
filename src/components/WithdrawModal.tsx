import React, { useState } from 'react';
import { X, Check, Building2, Smartphone, DollarSign } from 'lucide-react';
import { User, Currency, CURRENCIES, AppConfig } from '../types.ts';
import { api } from '../services/api.ts';

interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  currency: Currency;
  appConfig: AppConfig;
  onSuccess: () => void;
}

export const WithdrawModal: React.FC<WithdrawModalProps> = ({
  isOpen,
  onClose,
  user,
  onSuccess
}) => {
  // If registered in USD, use USD, otherwise default strictly to INR as requested
  const isUsdUser = user.nativeCurrency === 'USD';
  const effectiveCurrency: Currency = isUsdUser ? 'USD' : 'INR';
  const currentMeta = CURRENCIES[effectiveCurrency] || CURRENCIES.INR;
  const availableBalance = Number(user.balance || 0);

  const [payoutMethod, setPayoutMethod] = useState<'bank' | 'upi' | 'crypto'>('bank');
  const [amount, setAmount] = useState<string>('');

  // 4 Mandatory Bank Box fields requested by user:
  // Bank name, Ifsc, account number, Holder name
  const [bankName, setBankName] = useState<string>('');
  const [ifscCode, setIfscCode] = useState<string>('');
  const [accountNumber, setAccountNumber] = useState<string>('');
  const [holderName, setHolderName] = useState<string>('');

  // Alternative fields
  const [upiId, setUpiId] = useState<string>('');
  const [walletAddress, setWalletAddress] = useState<string>('');

  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const numAmount = parseFloat(amount) || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (numAmount <= 0) {
      alert('Please enter a valid withdrawal amount');
      return;
    }

    if (numAmount > availableBalance) {
      alert(`Insufficient available balance! Max withdrawable is ${currentMeta.symbol}${availableBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${effectiveCurrency}.`);
      return;
    }

    let network = 'Bank Transfer (IMPS / NEFT)';
    let addressOrAccount = '';

    if (payoutMethod === 'bank') {
      if (!bankName.trim() || !ifscCode.trim() || !accountNumber.trim() || !holderName.trim()) {
        alert('Please complete all 4 bank account fields: Bank Name, IFSC, Account Number, and Holder Name.');
        return;
      }
      network = `${effectiveCurrency} Bank Transfer`;
      addressOrAccount = `Bank: ${bankName.trim()} | Holder: ${holderName.trim()} | Acc: ${accountNumber.trim()} | IFSC: ${ifscCode.trim().toUpperCase()}`;
    } else if (payoutMethod === 'upi') {
      if (!upiId.trim()) {
        alert('Please provide your UPI ID');
        return;
      }
      network = 'UPI Payment';
      addressOrAccount = `UPI: ${upiId.trim()}${holderName.trim() ? ` | Name: ${holderName.trim()}` : ''}`;
    } else {
      if (!walletAddress.trim()) {
        alert('Please provide your TRC20 USDT Wallet Address');
        return;
      }
      network = 'USDT (TRC20)';
      addressOrAccount = walletAddress.trim();
    }

    setSubmitting(true);
    try {
      const res = await api.requestWithdrawal({
        userId: user.id,
        amountNative: numAmount,
        amountUsd: numAmount,
        currency: effectiveCurrency,
        network,
        addressOrAccount
      });

      if (res.success) {
        setSuccessMsg(`Withdrawal of ${currentMeta.symbol}${numAmount.toLocaleString()} ${effectiveCurrency} placed! Amount deducted from your balance.`);
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1800);
      } else {
        alert(res.error || 'Failed to submit withdrawal');
      }
    } catch (err: any) {
      alert(err.message || 'Error processing withdrawal request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
      <div className="w-full max-w-sm rounded-3xl bg-[#111827] border border-slate-700 p-5 shadow-2xl space-y-4 animate-scaleUp">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">Withdraw Funds</h3>
              <p className="text-[10px] text-slate-400">Direct payout in {effectiveCurrency}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {successMsg ? (
          <div className="py-8 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center border border-emerald-500/40 shadow-lg shadow-emerald-500/20 animate-scaleUp">
              <Check className="w-8 h-8 stroke-[3]" />
            </div>
            <h4 className="text-sm font-black text-white">Request Submitted</h4>
            <p className="text-xs text-slate-300 px-4 leading-relaxed">{successMsg}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Real-time Available Balance Card */}
            <div className="flex items-center justify-between bg-[#0b0f19] p-3 rounded-2xl border border-slate-800 text-xs">
              <span className="text-slate-400 font-semibold">Available to Withdraw:</span>
              <span className="font-black text-emerald-400 font-mono-numbers text-sm">
                {currentMeta.symbol}{availableBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {effectiveCurrency}
              </span>
            </div>

            {/* Payout Method Toggle */}
            <div>
              <label className="text-[11px] font-bold text-slate-300">Select Payout Method</label>
              <div className="grid grid-cols-3 gap-1.5 mt-1">
                <button
                  type="button"
                  onClick={() => setPayoutMethod('bank')}
                  className={`py-2 px-1 text-[11px] font-extrabold rounded-xl border text-center transition-all flex items-center justify-center space-x-1 ${
                    payoutMethod === 'bank'
                      ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/30'
                      : 'bg-[#0b0f19] text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Bank Account</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPayoutMethod('upi')}
                  className={`py-2 px-1 text-[11px] font-extrabold rounded-xl border text-center transition-all flex items-center justify-center space-x-1 ${
                    payoutMethod === 'upi'
                      ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/30'
                      : 'bg-[#0b0f19] text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>UPI Payout</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPayoutMethod('crypto')}
                  className={`py-2 px-1 text-[11px] font-extrabold rounded-xl border text-center transition-all flex items-center justify-center space-x-1 ${
                    payoutMethod === 'crypto'
                      ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/30'
                      : 'bg-[#0b0f19] text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>USDT (TRC20)</span>
                </button>
              </div>
            </div>

            {/* Withdrawal Amount (No minimum limit, any amount valid) */}
            <div>
              <div className="flex justify-between text-[11px] font-bold text-slate-300 mb-1">
                <span>Withdrawal Amount ({effectiveCurrency})</span>
                <span className="text-cyan-400">No Limit Restriction</span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-[#0b0f19] text-sm font-black text-white rounded-xl px-3 py-2.5 border border-slate-700 focus:outline-none focus:border-cyan-400 pr-16"
                  placeholder="e.g. 500"
                  min="1"
                  step="any"
                  required
                />
                <button
                  type="button"
                  onClick={() => setAmount(availableBalance.toString())}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-extrabold text-cyan-400 hover:text-cyan-300 bg-cyan-500/15 px-2.5 py-1 rounded-lg border border-cyan-500/30 active:scale-95"
                >
                  MAX
                </button>
              </div>
              {numAmount > 0 && numAmount <= availableBalance && (
                <div className="text-[10px] text-slate-400 mt-1 flex justify-between">
                  <span>Remaining Balance after payout:</span>
                  <span className="font-mono text-emerald-400 font-bold">
                    {currentMeta.symbol}{(availableBalance - numAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {effectiveCurrency}
                  </span>
                </div>
              )}
            </div>

            {/* Payout Details Section */}
            {payoutMethod === 'bank' && (
              <div className="bg-[#0b0f19] p-3 rounded-2xl border border-slate-800 space-y-2.5">
                <div className="text-[11px] font-black text-amber-400 uppercase tracking-wide flex items-center space-x-1.5">
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Bank Account Details</span>
                </div>

                {/* 1. Bank name */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-0.5">Bank Name</label>
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="e.g. State Bank of India, HDFC, ICICI, PNB"
                    className="w-full bg-[#111827] text-xs text-white rounded-xl px-3 py-2 border border-slate-700 focus:outline-none focus:border-cyan-400"
                    required
                  />
                </div>

                {/* 2. Account Holder name */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-0.5">Account Holder Name</label>
                  <input
                    type="text"
                    value={holderName}
                    onChange={(e) => setHolderName(e.target.value)}
                    placeholder="Enter full name as per bank record"
                    className="w-full bg-[#111827] text-xs text-white rounded-xl px-3 py-2 border border-slate-700 focus:outline-none focus:border-cyan-400"
                    required
                  />
                </div>

                {/* 3. Account Number */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-0.5">Account Number</label>
                  <input
                    type="text"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value.replace(/\s+/g, ''))}
                    placeholder="e.g. 123456789012"
                    className="w-full bg-[#111827] text-xs text-white rounded-xl px-3 py-2 border border-slate-700 focus:outline-none focus:border-cyan-400 font-mono"
                    required
                  />
                </div>

                {/* 4. IFSC Code */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-0.5">IFSC Code</label>
                  <input
                    type="text"
                    value={ifscCode}
                    onChange={(e) => setIfscCode(e.target.value.toUpperCase().replace(/\s+/g, ''))}
                    placeholder="e.g. SBIN0001234"
                    className="w-full bg-[#111827] text-xs text-white rounded-xl px-3 py-2 border border-slate-700 focus:outline-none focus:border-cyan-400 font-mono uppercase"
                    maxLength={11}
                    required
                  />
                </div>
              </div>
            )}

            {payoutMethod === 'upi' && (
              <div className="bg-[#0b0f19] p-3 rounded-2xl border border-slate-800 space-y-2.5">
                <div className="text-[11px] font-black text-amber-400 uppercase tracking-wide flex items-center space-x-1.5">
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>UPI Payment Details</span>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-0.5">UPI ID (VPA)</label>
                  <input
                    type="text"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="e.g. username@okaxis, username@paytm"
                    className="w-full bg-[#111827] text-xs text-white rounded-xl px-3 py-2 border border-slate-700 focus:outline-none focus:border-cyan-400"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-0.5">Payee Name (Optional)</label>
                  <input
                    type="text"
                    value={holderName}
                    onChange={(e) => setHolderName(e.target.value)}
                    placeholder="Enter recipient name"
                    className="w-full bg-[#111827] text-xs text-white rounded-xl px-3 py-2 border border-slate-700 focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>
            )}

            {payoutMethod === 'crypto' && (
              <div className="bg-[#0b0f19] p-3 rounded-2xl border border-slate-800 space-y-2.5">
                <div className="text-[11px] font-black text-amber-400 uppercase tracking-wide flex items-center space-x-1.5">
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>USDT TRC20 Wallet</span>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-0.5">TRC20 Address</label>
                  <input
                    type="text"
                    value={walletAddress}
                    onChange={(e) => setWalletAddress(e.target.value.trim())}
                    placeholder="Starts with T... (Tron network)"
                    className="w-full bg-[#111827] text-xs text-white rounded-xl px-3 py-2 border border-slate-700 focus:outline-none focus:border-cyan-400 font-mono"
                    required
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 font-black text-xs text-white transition-all shadow-lg shadow-blue-700/30 active:scale-95 disabled:opacity-50"
            >
              {submitting ? 'Processing Payout Request...' : `Submit Withdrawal (${currentMeta.symbol}${numAmount > 0 ? numAmount.toLocaleString() : '0'})`}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
