import React from 'react';
import { X, Check } from 'lucide-react';
import { Currency, CURRENCIES } from '../types.ts';

interface CurrencyModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCurrency: Currency;
  onSelectCurrency: (currency: Currency) => void;
}

export const CurrencyModal: React.FC<CurrencyModalProps> = ({
  isOpen,
  onClose,
  currentCurrency,
  onSelectCurrency
}) => {
  if (!isOpen) return null;

  const currenciesList = Object.values(CURRENCIES);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-3xl bg-[#111827] border border-slate-700 p-5 shadow-2xl space-y-4 animate-scaleUp">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-black text-white">Select Display Currency</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-slate-400">
          All wallet balances, orders, and market quotes will automatically recalculate in real-time.
        </p>

        <div className="space-y-2">
          {currenciesList.map(item => {
            const isSelected = item.code === currentCurrency;
            return (
              <div
                key={item.code}
                onClick={() => {
                  onSelectCurrency(item.code);
                  onClose();
                }}
                className={`flex items-center justify-between p-3.5 rounded-2xl cursor-pointer border transition-all ${
                  isSelected
                    ? 'bg-blue-600/15 border-blue-500 shadow-sm'
                    : 'bg-[#0b0f19] border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{item.flag}</span>
                  <div>
                    <div className="text-sm font-extrabold text-white">
                      {item.code} ({item.symbol})
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {item.name} • 1 USD = {item.rate} {item.code}
                    </div>
                  </div>
                </div>

                {isSelected && (
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
