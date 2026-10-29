import React, { useState } from 'react';
import { X, Copy, Check, QrCode } from 'lucide-react';
import { User, Currency, CURRENCIES, AppConfig } from '../types.ts';
import { api } from '../services/api.ts';

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  currency: Currency;
  appConfig: AppConfig;
  onSuccess: () => void;
}

export const DepositModal: React.FC<DepositModalProps> = ({
  isOpen,
  onClose,
  user,
  currency,
  appConfig,
  onSuccess
}) => {
  const [network, setNetwork] = useState('USDT (TRC20)');
  const [amountNative, setAmountNative] = useState('50');
  const [txHash, setTxHash] = useState('');
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const effectiveCurrency: Currency = (user.nativeCurrency === 'USD') ? 'USD' : 'INR';
  const currentMeta = CURRENCIES[effectiveCurrency] || CURRENCIES.INR;
  const rate = currentMeta.rate;
  const numNative = parseFloat(amountNative) || 0;
  const equivalentUsd = +(numNative / (rate || 1)).toFixed(2);

  const depositAddresses: Record<string, { address: string; info: string }> = {
    'USDT (TRC20)': {
      address: 'TY9b4KXGvjLqp8N72eK1wS4Z4a6P8QzmB9',
      info: 'Send only USDT via TRON (TRC20) network. Instant validation upon 1 block confirmation.'
    },
    'Bank Transfer': {
      address: 'Flow Financial Corp • IBAN: GB29FLOW99001234567890 • SWIFT: FLOWGB2L',
      info: 'Include your username as reference note in the wire description.'
    },
    'UPI / PIX Fast Pay': {
      address: 'flowcoin.pay@okhdfcbank / chave-pix: pix@flowcoin.finance',
      info: 'Scan QR or paste VPA. Submit payment UTR/TxID below.'
    }
  };

  const currentDetails = depositAddresses[network] || depositAddresses['USDT (TRC20)'];

  const handleCopy = () => {
    navigator.clipboard.writeText(currentDetails.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (numNative <= 0) {
      alert('Please enter a valid deposit amount');
      return;
    }

    if (equivalentUsd < appConfig.minDepositUsd) {
      alert(`Minimum deposit is $${appConfig.minDepositUsd} USD equivalent (approx ${Math.ceil(appConfig.minDepositUsd * rate)} ${currency})`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.requestDeposit({
        userId: user.id,
        amountNative: numNative,
        network,
        addressOrAccount: currentDetails.address,
        txHash: txHash.trim() || `tx_${Date.now()}`
      });

      if (res.success) {
        setSuccessMsg('Deposit request submitted successfully! Funds will credit upon network verification.');
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1800);
      } else {
        alert(res.error || 'Failed to submit deposit');
      }
    } catch (err: any) {
      alert(err.message || 'Error submitting deposit request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="w-full max-w-sm rounded-3xl bg-[#111827] border border-slate-700 p-5 shadow-2xl space-y-4 animate-scaleUp">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-black text-white">Deposit Funds</h3>
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
            {/* Network Selector */}
            <div>
              <label className="text-[11px] font-bold text-slate-300">Select Gateway / Network</label>
              <div className="grid grid-cols-3 gap-1.5 mt-1">
                {Object.keys(depositAddresses).map(net => (
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

            {/* Address Box */}
            <div className="bg-[#0b0f19] p-3 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>Official Receiving Address</span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex items-center space-x-1 text-cyan-400 hover:text-cyan-300 font-bold"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <div className="text-xs font-mono font-bold text-white break-all bg-slate-900/90 p-2 rounded-xl border border-slate-800">
                {currentDetails.address}
              </div>
              <div className="flex items-center space-x-1.5 text-[10px] text-slate-400">
                <QrCode className="w-3.5 h-3.5 text-cyan-400" />
                <span>{currentDetails.info}</span>
              </div>
            </div>

            {/* Deposit Amount */}
            <div>
              <div className="flex justify-between text-[11px] font-bold text-slate-300 mb-1">
                <span>Deposit Amount ({currency})</span>
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
              </div>
            </div>

            {/* TxHash / UTR */}
            <div>
              <label className="text-[11px] font-bold text-slate-300">Transaction Hash / UTR / Reference</label>
              <input
                type="text"
                value={txHash}
                onChange={(e) => setTxHash(e.target.value)}
                placeholder="e.g. 0x8f2... or Bank Reference No"
                className="w-full bg-[#0b0f19] text-xs text-white rounded-xl px-3 py-2.5 border border-slate-700 focus:outline-none focus:border-cyan-400 mt-1"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 font-extrabold text-xs text-white transition-all shadow-lg shadow-emerald-700/30"
            >
              {submitting ? 'Submitting...' : 'Confirm Deposit Request'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
