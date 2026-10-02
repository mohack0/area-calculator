import React, { useState } from 'react';
import { Key, Trash2, Check, ShieldCheck, X, AlertCircle, Lock, Shield } from 'lucide-react';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  isCustomKey: boolean;
  onUpdateKey: (newKey: string) => void;
  onDeleteKey: () => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({
  isOpen,
  onClose,
  isCustomKey,
  onUpdateKey,
  onDeleteKey,
}) => {
  const [inputKey, setInputKey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputKey.trim();
    if (!trimmed) {
      setError('Please enter a Google Maps API Key.');
      return;
    }
    if (!trimmed.startsWith('AIza') || trimmed.length < 30) {
      setError('Invalid format: Google Maps API keys start with "AIza".');
      return;
    }

    setError(null);
    onUpdateKey(trimmed);
    setSuccessMessage('API key updated securely. Reloading map...');
    setInputKey('');
    setTimeout(() => {
      setSuccessMessage(null);
      onClose();
    }, 1200);
  };

  const handleDelete = () => {
    if (window.confirm('Delete custom API key and revert to the default system key?')) {
      onDeleteKey();
      setError(null);
      setSuccessMessage('Custom API key deleted. Reverted to default system key.');
      setTimeout(() => {
        setSuccessMessage(null);
        onClose();
      }, 1200);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-5 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Google Maps API Key</h3>
              <p className="text-xs text-slate-400">Secure credential configuration</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Security & Status Banner (Never reveals the actual key) */}
        <div className="bg-slate-800/80 rounded-xl p-3.5 border border-slate-700 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
              Credential Status
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${
                isCustomKey
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
              }`}
            >
              <Lock className="w-2.5 h-2.5" />
              <span>{isCustomKey ? 'Custom Key Installed' : 'Default System Key'}</span>
            </span>
          </div>

          <p className="text-slate-300 text-[11px] leading-relaxed">
            {isCustomKey
              ? 'Your custom Google Maps API key is active. Key details are protected and never displayed on screen for privacy.'
              : 'Currently using the built-in system key. You can install your own Google Cloud key below.'}
          </p>
        </div>

        {/* Success or Error Alert */}
        {successMessage && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 px-3.5 py-2 rounded-xl text-emerald-400 text-xs font-semibold flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/30 px-3.5 py-2 rounded-xl text-rose-400 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Update Key Input (Password field - concealed input) */}
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              {isCustomKey ? 'Replace / Update API Key' : 'Enter Google Maps API Key'}
            </label>
            <div className="relative">
              <input
                type="password"
                value={inputKey}
                onChange={(e) => {
                  setInputKey(e.target.value);
                  setError(null);
                }}
                placeholder="•••••••••••••••••••••••••••••••••••••••"
                autoComplete="off"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-green-500 font-mono placeholder-slate-500 tracking-widest"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
                <Lock className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Key is stored locally in your browser and masked at all times.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-1">
            {isCustomKey ? (
              <button
                type="button"
                onClick={handleDelete}
                className="px-3 py-2 rounded-xl bg-red-600/15 hover:bg-red-600/30 text-red-300 border border-red-500/30 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                title="Delete custom key and revert to default system key"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Key</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-semibold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!inputKey.trim()}
                className="px-4 py-2 rounded-xl bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:pointer-events-none text-white text-xs font-bold shadow-lg shadow-green-600/20 flex items-center gap-1.5 transition cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{isCustomKey ? 'Update Key' : 'Save Key'}</span>
              </button>
            </div>
          </div>
        </form>

        {/* Security Notice */}
        <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
          <span>
            API keys are never exposed in the interface or transmitted to third parties. Always restrict keys to your domain in the Google Cloud Console.
          </span>
        </div>
      </div>
    </div>
  );
};
