import React from 'react';
import { Shield, Lock, FileText, Check, X, Building2, Eye, UserCheck, AlertCircle } from 'lucide-react';

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-5 overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-2xl max-h-[90vh] rounded-3xl bg-[#0b101d] border border-slate-700/80 shadow-2xl flex flex-col overflow-hidden text-white my-auto">
        
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-[#0d1627] via-[#111e36] to-[#0d1627] border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Shield className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight text-white leading-tight">
                Privacy & Data Security Policy
              </h2>
              <p className="text-[11px] text-slate-400">
                COIN BASED &bull; Institutional Grade Asset Protection Standards
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-600/80 transition-all active:scale-95"
            title="Close"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 text-xs text-slate-300 leading-relaxed font-sans">
          
          {/* Important Notice Callout */}
          <div className="p-4 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 flex items-start space-x-3 text-cyan-200">
            <Lock className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-extrabold text-white text-xs mb-0.5">
                Zero-Knowledge Privacy Commitment
              </div>
              <p className="text-[11px] text-cyan-200/90">
                At COIN BASED, we prioritize user anonymity, secure ledger encryption, and zero unauthorized third-party data sharing. Your funds, trade logs, and personal identity remain strictly encrypted.
              </p>
            </div>
          </div>

          {/* Section 1: Information Collection */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-white font-extrabold text-sm">
              <UserCheck className="w-4 h-4 text-amber-400" />
              <span>1. Information We Collect</span>
            </div>
            <p>
              When you register and trade on COIN BASED, we collect essential account metadata necessary to deliver secure digital asset trading services:
            </p>
            <ul className="list-disc list-inside space-y-1 pl-2 text-slate-400 text-[11px]">
              <li><strong className="text-slate-200">Account Identity:</strong> Registered username, full name, email address, and account preferences.</li>
              <li><strong className="text-slate-200">Trading Ledger & Activity:</strong> Order execution histories, entry prices, leverage settings, and trade margin allocations.</li>
              <li><strong className="text-slate-200">Financial Records:</strong> Deposit hashes, withdrawal wallet addresses, and account settlement history in your native currency.</li>
              <li><strong className="text-slate-200">Security Audit Telemetry:</strong> Anonymized login session timestamps, IP location checks, and device audit signatures.</li>
            </ul>
          </div>

          {/* Section 2: How Data is Used */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-white font-extrabold text-sm">
              <Eye className="w-4 h-4 text-cyan-400" />
              <span>2. How We Use Your Data</span>
            </div>
            <p>
              Your data is processed exclusively for core platform functionality, asset security, and account verification:
            </p>
            <ul className="list-disc list-inside space-y-1 pl-2 text-slate-400 text-[11px]">
              <li>Executing real-time cryptocurrency trade orders and continuous portfolio balance updates.</li>
              <li>Preventing unauthorized account takeovers through multi-tiered session validation.</li>
              <li>Fulfilling deposit credits, withdrawal processing, and customer support desk inquiries.</li>
              <li>Enforcing credit score integrity and maintaining transparent platform operation.</li>
            </ul>
          </div>

          {/* Section 3: Data Encryption & Security */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-white font-extrabold text-sm">
              <Building2 className="w-4 h-4 text-emerald-400" />
              <span>3. Encryption & Asset Protection</span>
            </div>
            <p>
              All sensitive credentials and database interactions are protected using high-grade cryptographic protocols:
            </p>
            <ul className="list-disc list-inside space-y-1 pl-2 text-slate-400 text-[11px]">
              <li>AES-256 bit encryption applied to password storage and authentication session tokens.</li>
              <li>Isolated cold wallet storage structures for customer funds with multi-signature key verification.</li>
              <li>Zero disclosure of client identities or trading parameters to external commercial third parties.</li>
            </ul>
          </div>

          {/* Section 4: AML & KYC Compliance */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-white font-extrabold text-sm">
              <AlertCircle className="w-4 h-4 text-rose-400" />
              <span>4. Anti-Money Laundering (AML) & KYC</span>
            </div>
            <p>
              COIN BASED strictly complies with global Anti-Money Laundering standards. Accounts exhibiting suspicious transaction surges or fraudulent activity may be placed under review or frozen pending identity confirmation.
            </p>
          </div>

          {/* Section 5: Cookies & Local Storage */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-white font-extrabold text-sm">
              <FileText className="w-4 h-4 text-purple-400" />
              <span>5. Session Persistence & Cookies</span>
            </div>
            <p>
              We utilize encrypted client-side local storage and secure browser cookies solely to maintain your active login session and remember your selected account currency across browser refreshes.
            </p>
          </div>

          {/* Section 6: Contact & Support */}
          <div className="p-4 rounded-2xl bg-[#080e1a] border border-slate-800 space-y-1 text-center">
            <div className="font-extrabold text-white text-xs">Questions or Data Privacy Inquiries?</div>
            <p className="text-[11px] text-slate-400">
              Contact our 24/7 Telegram Customer Support Desk directly from your account profile tab or email compliance at <span className="text-cyan-400 font-mono">support@coinbased.io</span>.
            </p>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-[#080d17] border-t border-slate-800 flex items-center justify-end shrink-0">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 rounded-2xl bg-cyan-600 hover:bg-cyan-500 font-black text-xs text-slate-950 shadow-lg shadow-cyan-600/30 transition-all active:scale-95 flex items-center justify-center space-x-2"
          >
            <Check className="w-4 h-4" />
            <span>I Understand & Accept</span>
          </button>
        </div>

      </div>
    </div>
  );
};
