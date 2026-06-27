import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ShieldCheck, ShieldAlert, Loader } from 'lucide-react';
import API from '../services/api';

const VerifyEmail = () => {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const verifyAccount = async () => {
      try {
        const res = await API.get(`/auth/verify-email/${token}`);
        if (res.data.status === 'success') {
          setSuccess(true);
        } else {
          setErrorMessage('Failed to verify account. Please try again.');
        }
      } catch (err) {
        setErrorMessage(
          err.response?.data?.message || 'Verification link is invalid or has expired.'
        );
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      verifyAccount();
    } else {
      setErrorMessage('No verification token provided.');
      setLoading(false);
    }
  }, [token]);

  return (
    <div className="max-w-md mx-auto px-6 py-20 text-center">
      <div className="glass-card p-8 md:p-10 shadow-2xl relative overflow-hidden">
        {/* Decorative ambient background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-brand-cyan/10 rounded-full blur-3xl -z-10"></div>

        {loading ? (
          <div className="flex flex-col items-center justify-center space-y-4 py-8">
            <Loader className="h-12 w-12 text-brand-cyan animate-spin" />
            <h2 className="text-xl font-bold text-white">Verifying Account...</h2>
            <p className="text-slate-400 text-sm">Please wait while we confirm your email address.</p>
          </div>
        ) : success ? (
          <div className="space-y-6 py-4">
            <div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-emerald-500/10 border border-emerald-500/25 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
              <ShieldCheck className="h-10 w-10 text-emerald-400" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-extrabold text-white tracking-tight">Email Verified!</h2>
              <p className="text-slate-300 text-sm leading-relaxed">
                Your account is now fully verified and activated. You can now publish ideas, request AI insights, and match with team members.
              </p>
            </div>
            <div className="pt-4">
              <Link to="/login" className="glass-btn-primary block w-full py-3">
                Log In to Your Account
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-6 py-4">
            <div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-rose-500/10 border border-rose-500/25 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
              <ShieldAlert className="h-10 w-10 text-rose-400" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-extrabold text-white tracking-tight">Verification Failed</h2>
              <p className="text-rose-300 text-sm font-medium">{errorMessage}</p>
              <p className="text-slate-400 text-xs leading-relaxed">
                If the link has expired, you can request a new verification token from your account dashboard.
              </p>
            </div>
            <div className="pt-4 flex flex-col gap-3">
              <Link to="/login" className="glass-btn-secondary block w-full py-3">
                Back to Login
              </Link>
              <Link to="/" className="text-xs text-brand-cyan hover:underline">
                Go to Explore Feed
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VerifyEmail;
