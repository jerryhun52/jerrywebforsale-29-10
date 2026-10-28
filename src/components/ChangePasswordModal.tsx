import React, { useState } from 'react';
import { X, KeyRound, Check } from 'lucide-react';
import { api } from '../services/api.ts';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  onClose,
  userId
}) => {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword || !newPassword) {
      alert('Please fill all password fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      alert('New password and confirmation do not match');
      return;
    }

    if (newPassword.length < 5) {
      alert('Password must be at least 5 characters');
      return;
    }

    setLoading(true);
    try {
      const res = await api.changePassword(userId, oldPassword, newPassword);
      if (res.success) {
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          onClose();
        }, 1500);
      } else {
        alert(res.error || 'Failed to update password');
      }
    } catch (err: any) {
      alert(err.message || 'Error updating password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="w-full max-w-sm rounded-3xl bg-[#111827] border border-slate-700 p-5 shadow-2xl space-y-4 animate-scaleUp">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <KeyRound className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-black text-white">Change Account Password</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {success ? (
          <div className="py-6 text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
              <Check className="w-6 h-6 stroke-[3]" />
            </div>
            <p className="text-xs font-bold text-white">Password Updated Successfully!</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="text-[11px] font-bold text-slate-300">Current Password</label>
              <input
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className="w-full bg-[#0b0f19] text-xs text-white rounded-xl px-3 py-2.5 border border-slate-700 focus:outline-none focus:border-cyan-400 mt-1"
                required
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-300">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-[#0b0f19] text-xs text-white rounded-xl px-3 py-2.5 border border-slate-700 focus:outline-none focus:border-cyan-400 mt-1"
                required
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-300">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-[#0b0f19] text-xs text-white rounded-xl px-3 py-2.5 border border-slate-700 focus:outline-none focus:border-cyan-400 mt-1"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 font-extrabold text-xs text-white transition-all shadow-lg shadow-blue-700/30 mt-2"
            >
              {loading ? 'Updating...' : 'Save New Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
