import React, { useState } from 'react';
import {
  X,
  Lock,
  Mail,
  User as UserIcon,
  Phone,
  Sparkles,
  BarChart3,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  ArrowRight,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'signup' | 'forgot';
  onSuccess?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'login',
  onSuccess,
}) => {
  const { login, signup, loginWithGoogle, showToast } = useStore();

  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetSent, setResetSent] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);

    try {
      if (mode === 'login') {
        const res = await login(email, password);
        if (res.ok) {
          showToast(`Welcome back, ${res.user?.name || 'Customer'}!`);
          if (onSuccess) onSuccess();
          onClose();
        } else {
          setError(res.error || 'Invalid email or password.');
        }
      } else if (mode === 'signup') {
        const res = await signup(name, email, password, phone);
        if (res.ok) {
          showToast(`Account created! Welcome to Ahuza, ${name || 'Customer'}`);
          if (onSuccess) onSuccess();
          onClose();
        } else {
          setError(res.error || 'Failed to create account.');
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Authentication error occurred.');
    } finally {
      setBusy(false);
    }
  };

  const handleSendResetCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        setResetSent(true);
        if (data.demoResetCode) {
          setResetCode(data.demoResetCode);
        }
        showToast('Password reset verification code dispatched.');
      } else {
        setError(data.error || 'Could not send verification code.');
      }
    } catch {
      setError('Network error while requesting password reset.');
    } finally {
      setBusy(false);
    }
  };

  const handleConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, resetCode, newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Password reset successfully! Please sign in with your new password.');
        setMode('login');
        setPassword(newPassword);
      } else {
        setError(data.error || 'Failed to reset password.');
      }
    } catch {
      setError('Network error during password reset.');
    } finally {
      setBusy(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await loginWithGoogle();
      if (res.ok) {
        showToast(`Signed in with Google as ${res.user?.name || ''}!`);
        if (onSuccess) onSuccess();
        onClose();
      } else {
        setError(res.error || 'Google authentication could not be completed.');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-md bg-white text-[#18181B] rounded-2xl shadow-2xl border border-[#18181B]/15 overflow-hidden flex flex-col my-auto">
        {/* Header with Brand Styling */}
        <div className="p-6 pb-4 bg-[#F8FAF7] border-b border-[#1E293B]/10 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-black inline-block" />
              <span className="font-display text-xl font-semibold tracking-wider text-[#1E293B]">AHUZA</span>
            </div>
            <p className="text-xs text-[#64748B] mt-0.5">
              {mode === 'login'
                ? 'Sign in to access your saved orders & wishlist'
                : mode === 'signup'
                ? 'Create an account for expedited checkout & tracking'
                : 'Reset your account password'}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#64748B] hover:text-[#18181B] rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        {mode !== 'forgot' && (
          <div className="grid grid-cols-2 p-1.5 bg-[#F1F5F0] border-b border-[#1E293B]/10 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
              }}
              className={`py-2 rounded-xl transition-all cursor-pointer ${
                mode === 'login'
                  ? 'bg-black text-white shadow-xs'
                  : 'text-[#64748B] hover:text-[#1E293B]'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setError(null);
              }}
              className={`py-2 rounded-xl transition-all cursor-pointer ${
                mode === 'signup'
                  ? 'bg-black text-white shadow-xs'
                  : 'text-[#64748B] hover:text-[#1E293B]'
              }`}
            >
              Create Account
            </button>
          </div>
        )}

        <div className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {mode === 'forgot' ? (
            !resetSent ? (
              <form onSubmit={handleSendResetCode} className="space-y-4">
                <div>
                  <label className="block text-[#334155] font-semibold mb-1">
                    Registered Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full pl-9 pr-3 py-2.5 bg-[#F8FAF7] border border-[#1E293B]/15 rounded-xl text-xs text-[#1E293B] focus:border-black focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={busy}
                  className="w-full py-3 bg-black hover:bg-neutral-800 text-white font-semibold rounded-xl text-xs transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {busy ? 'Sending Code...' : 'Send Verification Code'}
                </button>

                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="w-full text-center text-xs text-[#64748B] hover:text-black font-medium"
                >
                  Back to Sign In
                </button>
              </form>
            ) : (
              <form onSubmit={handleConfirmReset} className="space-y-4">
                <div>
                  <label className="block text-[#334155] font-semibold mb-1">
                    Verification Code
                  </label>
                  <input
                    type="text"
                    required
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value)}
                    placeholder="e.g. AHZ-849201"
                    className="w-full px-3 py-2.5 bg-[#F8FAF7] border border-[#1E293B]/15 rounded-xl text-xs font-mono font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[#334155] font-semibold mb-1">
                    New Password
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    className="w-full px-3 py-2.5 bg-[#F8FAF7] border border-[#1E293B]/15 rounded-xl text-xs"
                  />
                </div>

                <button
                  type="submit"
                  disabled={busy}
                  className="w-full py-3 bg-black hover:bg-neutral-800 text-white font-semibold rounded-xl text-xs transition-colors cursor-pointer shadow-xs"
                >
                  {busy ? 'Updating...' : 'Save New Password'}
                </button>
              </form>
            )
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && (
                <>
                  <div>
                    <label className="block text-[#334155] font-semibold mb-1">Full Name</label>
                    <div className="relative">
                      <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Ananya Deshmukh"
                        className="w-full pl-9 pr-3 py-2.5 bg-[#F8FAF7] border border-[#1E293B]/15 rounded-xl text-xs text-[#1E293B] focus:border-black focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[#334155] font-semibold mb-1">Mobile Number</label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+91 98230 44510"
                        className="w-full pl-9 pr-3 py-2.5 bg-[#F8FAF7] border border-[#1E293B]/15 rounded-xl text-xs font-mono text-[#1E293B] focus:border-black focus:outline-none"
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-[#334155] font-semibold mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full pl-9 pr-3 py-2.5 bg-[#F8FAF7] border border-[#1E293B]/15 rounded-xl text-xs text-[#1E293B] focus:border-black focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[#334155] font-semibold">Password</label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => setMode('forgot')}
                      className="text-[11px] text-[#64748B] hover:text-black hover:underline cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-9 py-2.5 bg-[#F8FAF7] border border-[#1E293B]/15 rounded-xl text-xs text-[#1E293B] focus:border-black focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Black Action Button */}
              <button
                type="submit"
                disabled={busy}
                className="w-full py-3 bg-black hover:bg-neutral-800 text-white font-semibold rounded-xl text-xs transition-colors cursor-pointer shadow-xs disabled:opacity-50"
              >
                {busy ? 'Please wait...' : mode === 'login' ? 'Sign In to Account' : 'Create Free Account'}
              </button>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-[#1E293B]/10" />
                <span className="flex-shrink mx-3 text-[11px] text-[#94A3B8]">OR</span>
                <div className="flex-grow border-t border-[#1E293B]/10" />
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="w-full py-2.5 px-4 bg-white hover:bg-[#F8FAF7] text-[#1E293B] text-xs font-semibold rounded-xl border border-[#1E293B]/15 transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Continue with Google</span>
              </button>

              {/* Instant One-Click Demo Credentials */}
              <div className="pt-2 border-t border-[#1E293B]/10 space-y-2">
                <p className="text-[11px] font-semibold text-[#64748B]">Instant Demo Sign-In:</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      setEmail('ananya@example.com');
                      setPassword('Customer@2026');
                      await login('ananya@example.com', 'Customer@2026');
                      showToast('Signed in as Demo Customer!');
                      if (onSuccess) onSuccess();
                      onClose();
                    }}
                    className="py-1.5 px-2.5 bg-[#F8FAF7] hover:bg-[#EBF2E8] border border-[#1E293B]/15 rounded-lg text-[#1E293B] text-[11px] font-semibold transition-colors cursor-pointer text-center"
                  >
                    Demo Customer
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      setEmail('nallagondarosy@gmail.com');
                      setPassword('AhuzaOwner@2026');
                      await login('nallagondarosy@gmail.com', 'AhuzaOwner@2026');
                      showToast('Signed in as Store Owner (Rosy Nallagonda)!');
                      if (onSuccess) onSuccess();
                      onClose();
                    }}
                    className="py-1.5 px-2.5 bg-black hover:bg-neutral-800 text-white rounded-lg text-[11px] font-semibold transition-colors cursor-pointer text-center flex items-center justify-center gap-1"
                  >
                    <BarChart3 className="w-3 h-3" />
                    <span>Store Owner</span>
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
