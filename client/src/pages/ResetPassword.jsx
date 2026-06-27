import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { KeyRound, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';
import API from '../services/api';

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Client-side validations
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const res = await API.patch(`/auth/reset-password/${token}`, { password });
      if (res.data.status === 'success') {
        setSuccess(true);
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      }
    } catch (err) {
      setError(
        err.response?.data?.message || 'Failed to reset password. Link may be invalid or expired.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-6 py-20 text-left">
      <div className="glass-card p-8 md:p-10 shadow-2xl relative overflow-hidden">
        {/* Decorative background ambient violet glow */}
        <div className="absolute top-0 right-0 w-36 h-36 bg-brand-violet/10 rounded-full blur-3xl -z-10"></div>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-brand-violet/10 border border-brand-violet/25 mb-4 shadow-[0_0_15px_rgba(124,58,237,0.15)]">
            <KeyRound className="h-8 w-8 text-brand-cyan" />
          </div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">Set New Password</h2>
          <p className="text-slate-400 text-sm mt-1">Please enter your new secure password below.</p>
        </div>

        {error && (
          <div className="mb-6 flex items-start gap-2 bg-rose-500/10 border border-rose-500/20 text-rose-300 p-4 rounded-xl text-xs">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div className="space-y-6 text-center py-4">
            <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-emerald-500/10 border border-emerald-500/25">
              <CheckCircle2 className="h-6 w-6 text-emerald-400" />
            </div>
            <div className="space-y-2">
              <p className="text-emerald-300 text-sm font-semibold">Password Reset Successful!</p>
              <p className="text-slate-400 text-xs">
                Redirecting you to the login page shortly...
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* New Password */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block">New Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full glass-input pr-12 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block">Confirm New Password</label>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                className="w-full glass-input text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full glass-btn-primary py-3.5 mt-2 flex justify-center items-center gap-1.5"
            >
              {loading ? (
                <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                'Update Password'
              )}
            </button>
          </form>
        )}

        <div className="mt-6 pt-6 border-t border-white/5 text-center">
          <Link to="/login" className="text-xs text-slate-400 hover:text-white transition-colors">
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
