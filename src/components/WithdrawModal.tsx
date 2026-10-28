import React, { useState } from 'react';
import { X, Check, AlertCircle } from 'lucide-react';
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
  currency,
  appConfig,
  onSuccess
}) => {
  const [network, setNetwork] = useState('USDT (TRC20)');
  const [amountNative, setAmountNative] = useState('50');
  const [accountDetails, setAccountDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const currentMeta = CURRENCIES[currency] || CURRENCIES.USD;
  const rate = currentMeta.rate;
  const numNative = parseFloat(amountNative) || 0;
  const equivalentUsd = +(numNative / rate).toFixed(2);
  const maxAvailableNative = +(user.balance * rate).toFixed(2);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (numNative <= 0) {
      alert('Please enter a valid withdrawal amount');
      return;
    }

    if (equivalentUsd < appConfig.minWithdrawalUsd) {
      alert(`Minimum withdrawal is $${appConfig.minWithdrawalUsd} USD equivalent (approx ${Math.ceil(appConfig.minWithdrawalUsd * rate)} ${currency})`);
      return;
    }

    if (equivalentUsd > user.balance) {
      alert(`Insufficient available balance! Max withdrawable is $${user.balance.toFixed(2)} USD.`);
      return;
    }

    if (!accountDetails.trim()) {
      alert('Please provide your recipient wallet address or bank account details');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.requestWithdrawal({
        userId: user.id,
        amountNative: numNative,
        network,
        addressOrAccount: accountDetails.trim()
      });

      if (res.success) {
        setSuccessMsg('Withdrawal request placed! Funds have been moved to escrow freeze and will disburse upon security audit.');
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 2000);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="w-full max-w-sm rounded-3xl bg-[#111827] border border-slate-700 p-5 shadow-2xl space-y-4 animate-scaleUp">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-black text-white">Withdraw Funds</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {successMsg ? (
          <div className="py-8 text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
              <Check className="w-6 h-6 stroke-[3]" />
            </div>
            <p className="text-xs font-bold text-white">{successMsg}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Balance info */}
            <div className="flex items-center justify-between bg-[#0b0f19] p-3 rounded-2xl border border-slate-800 text-xs">
              <span className="text-slate-400">Available to Withdraw:</span>
              <span className="font-extrabold text-emerald-400 font-mono-numbers">
                {currentMeta.symbol}{maxAvailableNative} ({user.balance.toFixed(2)} USD)
              </span>
            </div>

            {/* Payout Network */}
            <div>
              <label className="text-[11px] font-bold text-slate-300">Select Payout Method</label>
              <div className="grid grid-cols-3 gap-1.5 mt-1">
                {['USDT (TRC20)', 'Local Bank', 'UPI / PIX'].map(net => (
                  <button
                    key={net}
                    type="button"
                    onClick={() => setNetwork(net)}
                    className={`py-2 px-1 text-[10px] font-bold rounded-xl border text-center transition-all ${
                      network === net
                        ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                        : 'bg-[#0b0f19] text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    {net}
                  </button>
                ))}
              </div>
            </div>

            {/* Withdrawal Amount */}
            <div>
              <div className="flex justify-between text-[11px] font-bold text-slate-300 mb-1">
                <span>Withdrawal Amount ({currency})</span>
                <span className="text-slate-400">≈ ${equivalentUsd} USD</span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  value={amountNative}
                  onChange={(e) => setAmountNative(e.target.value)}
                  className="w-full bg-[#0b0f19] text-sm font-bold text-white rounded-xl px-3 py-2.5 border border-slate-700 focus:outline-none focus:border-cyan-400"
                  placeholder="50"
                  min="1"
                  required
                />
                <button
                  type="button"
                  onClick={() => setAmountNative(maxAvailableNative.toString())}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-extrabold text-cyan-400 hover:text-cyan-300 bg-cyan-500/10 px-2 py-1 rounded-lg border border-cyan-500/20"
                >
                  MAX
                </button>
              </div>
            </div>

            {/* Recipient Address / Account Details */}
            <div>
              <label className="text-[11px] font-bold text-slate-300">
                {network.includes('Bank') ? 'Bank Name, Account Number & IFSC / IBAN' : 'Recipient TRC20 Wallet Address or UPI ID'}
              </label>
              <textarea
                value={accountDetails}
                onChange={(e) => setAccountDetails(e.target.value)}
                rows={2}
                placeholder={network.includes('Bank') ? 'Chase Bank, Acc: 123456789, Routine: 987654' : 'T... (TRC20 Address) or user@upi'}
                className="w-full bg-[#0b0f19] text-xs text-white rounded-xl p-2.5 border border-slate-700 focus:outline-none focus:border-cyan-400 mt-1 resize-none"
                required
              />
            </div>

            <div className="flex items-start space-x-2 bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20 text-[10px] text-amber-300 leading-tight">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-400 mt-0.5" />
              <span>Funds are held in escrow freeze instantly until the transaction is confirmed by finance audit.</span>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 font-extrabold text-xs text-white transition-all shadow-lg shadow-blue-700/30"
            >
              {submitting ? 'Processing...' : 'Submit Withdrawal Request'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
