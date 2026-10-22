import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { User, Mail, Lock, UserPlus, AlertCircle } from 'lucide-react';
import API from '../services/api';
import { authStart, authSuccess, authFailure } from '../features/authSlice';

const Signup = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('cofounder');

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error } = useSelector((state) => state.auth);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fullName || !email || !password || !role) return;

    dispatch(authStart());
    try {
      const res = await API.post('/auth/signup', { fullName, email, password, role });
      dispatch(authSuccess(res.data.data.user));
      navigate('/onboarding'); // Redirect to profile setup
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Registration failed. Try again.';
      dispatch(authFailure(errMsg));
    }
  };

  return (
    <div className="min-h-[85vh] flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-md glass-card p-8 shadow-2xl relative overflow-hidden">
        {/* Subtle decorative glows */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-violet-600/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-cyan-600/10 rounded-full blur-3xl"></div>

        <div className="text-center mb-8 relative">
          <h2 className="text-3xl font-extrabold text-white tracking-tight">Create Account</h2>
          <p className="text-slate-400 mt-2 text-sm">Join StartupHub AI to explore & match</p>
        </div>

        {error && (
          <div className="mb-6 flex items-start gap-2 bg-rose-500/10 border border-rose-500/20 text-rose-300 p-3 rounded-xl text-sm">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Full Name */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">Full Name</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jane Doe"
                className="w-full glass-input pl-12"
              />
            </div>
          </div>

          {/* Email */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full glass-input pl-12"
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="•••••••• (Min 8 chars)"
                className="w-full glass-input pl-12"
              />
            </div>
          </div>

          {/* Role selector */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">Choose Role</label>
            <div className="flex flex-col gap-2.5">
              {[
                { value: 'cofounder', label: 'Join a Team (Talent / Co-founder)', desc: 'Search for opportunities, analyze your resume, and get matched.' },
                { value: 'founder', label: 'Start a Venture (Founder)', desc: 'Submit concepts, post job openings, and build your team.' },
                { value: 'investor', label: 'Invest Capital (Investor)', desc: 'Explore campaigns, sign NDAs, and generate term sheets.' }
              ].map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setRole(item.value)}
                  className={`p-4 rounded-2xl border text-left transition-all duration-200 ${
                    role === item.value
                      ? 'bg-brand-violet/20 border-brand-violet text-brand-cyan shadow-[0_0_15px_rgba(124,58,237,0.15)] scale-[1.01]'
                      : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                  }`}
                >
                  <div className={`font-bold text-xs ${role === item.value ? 'text-brand-cyan' : 'text-slate-200'}`}>{item.label}</div>
                  <div className="text-[10px] text-slate-400 mt-1 leading-normal">{item.desc}</div>
                </button>
              ))}
            </div>
          </div>


          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full glass-btn-primary flex items-center justify-center gap-2 mt-4"
          >
            {loading ? (
              <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>
                <UserPlus className="h-4 w-4" />
                Sign Up
              </>
            )}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-slate-400">
          Already have an account?{' '}
          <Link to="/login" className="text-brand-cyan font-semibold hover:underline">
            Login here
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;
