import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Users, Rocket, CheckCircle, Mail, Briefcase, Plus, AlertCircle, MessageSquare } from 'lucide-react';
import API from '../services/api';

const fetchMatches = async () => {
  const res = await API.get('/match');
  return res.data.data.matches;
};

const applyAPI = async ({ startupId, roleProposed, message }) => {
  const res = await API.post(`/applications/startup/${startupId}`, {
    roleProposed,
    message
  });
  return res.data;
};

const Matches = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  // Modal State
  const [selectedStartup, setSelectedStartup] = useState(null);
  const [roleProposed, setRoleProposed] = useState('');
  const [message, setMessage] = useState('');
  const [applySuccess, setApplySuccess] = useState('');
  const [applyError, setApplyError] = useState('');

  // Fetch matches
  const { data: matches, isLoading, error } = useQuery({
    queryKey: ['matches'],
    queryFn: fetchMatches
  });

  // Application Mutation
  const applyMutation = useMutation({
    mutationFn: applyAPI,
    onSuccess: () => {
      setApplySuccess('Your collaboration request has been submitted successfully!');
      setRoleProposed('');
      setMessage('');
      setTimeout(() => {
        setSelectedStartup(null);
        setApplySuccess('');
      }, 2500);
    },
    onError: (err) => {
      setApplyError(err.response?.data?.message || 'Failed to submit application.');
    }
  });

  const handleApplySubmit = (e) => {
    e.preventDefault();
    setApplyError('');
    setApplySuccess('');
    
    if (!roleProposed || !message) {
      setApplyError('All fields are required');
      return;
    }

    applyMutation.mutate({
      startupId: selectedStartup._id,
      roleProposed,
      message
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-cyan"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-20 text-center text-slate-400 font-semibold glass-card">
        Failed to fetch matches. Please ensure your profile is fully complete.{' '}
        <Link to="/onboarding" className="text-brand-cyan hover:underline">Complete Profile</Link>
      </div>
    );
  }

  const isFounder = user?.role === 'founder';

  return (
    <div className="max-w-6xl mx-auto px-6 py-12 text-left">
      {/* HEADER */}
      <div className="border-b border-white/10 pb-6 mb-8">
        <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-2 m-0 margin-0">
          <Users className="h-8 w-8 text-brand-purple" />
          {isFounder ? 'Matching Co-Founders' : 'Matching Startups'}
        </h1>
        <p className="text-slate-400 mt-2">
          {isFounder 
            ? 'Discover co-founders with skills that match your active startup categories' 
            : 'Find and apply to startups seeking your skills and focus interests'}
        </p>
      </div>

      {matches?.length === 0 ? (
        <div className="glass-card p-12 text-center text-slate-400 font-medium">
          No matches found right now. Check back later or update your skills in profile settings!
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {matches?.map((match, idx) => {
            if (isFounder) {
              // Match is a co-founder Profile
              const cofounder = match.profile;
              return (
                <div key={idx} className="glass-card p-6 flex flex-col justify-between gap-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-brand-purple/5 rounded-full blur-xl"></div>
                  
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 bg-white/10 border border-white/10 rounded-xl flex items-center justify-center text-white font-bold text-lg shrink-0 shadow-md">
                      {cofounder.fullName[0]}
                    </div>
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-bold text-white text-base truncate">{cofounder.fullName}</h3>
                        <span className="text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold">
                          {match.matchScore}% Match
                        </span>
                      </div>
                      <p className="text-slate-300 text-xs truncate">{cofounder.headline || 'Co-founder candidate'}</p>
                      
                      {/* Skills tags */}
                      <div className="flex flex-wrap gap-1.5 pt-2">
                        {cofounder.skills?.slice(0, 4).map((skill, sIdx) => (
                          <span key={sIdx} className="text-[9px] bg-white/5 border border-white/10 px-2 py-0.5 rounded-md text-slate-400 font-semibold">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-white/5 flex items-center justify-between gap-4">
                    <span className="text-[10px] text-slate-500 font-medium italic">{match.matchReasons}</span>
                    <button
                      onClick={() => navigate(`/chat?userId=${cofounder.user._id}`)}
                      className="glass-btn-primary py-2 px-4 text-xs flex items-center gap-1.5"
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      Chat Now
                    </button>
                  </div>
                </div>
              );
            } else {
              // Match is a Startup
              const startup = match.startup;
              return (
                <div key={idx} className="glass-card p-6 flex flex-col justify-between gap-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-brand-cyan/5 rounded-full blur-xl"></div>

                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 bg-gradient-to-tr from-violet-600/30 to-cyan-500/30 border border-white/10 flex items-center justify-center text-white font-black text-lg rounded-xl shrink-0 shadow-md">
                      {startup.name[0]}
                    </div>
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-bold text-white text-base truncate">{startup.name}</h3>
                        <span className="text-xs bg-brand-cyan/10 border border-brand-cyan/20 text-brand-cyan px-2 py-0.5 rounded-full font-bold">
                          {match.matchScore}% Match
                        </span>
                      </div>
                      <p className="text-slate-300 text-xs line-clamp-2 leading-relaxed">{startup.tagline}</p>
                      
                      <div className="flex items-center gap-2 pt-1">
                        <span className="text-[10px] bg-white/5 border border-white/10 px-2 py-0.5 rounded-full text-slate-400 font-semibold uppercase">
                          {startup.category?.name}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-white/5 flex items-center justify-between gap-4">
                    <span className="text-[10px] text-slate-500 font-medium italic">{match.matchReasons}</span>
                    <button
                      onClick={() => setSelectedStartup(startup)}
                      className="glass-btn-primary py-2 px-4 text-xs flex items-center gap-1"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Apply to Join
                    </button>
                  </div>
                </div>
              );
            }
          })}
        </div>
      )}

      {/* COLLABORATION APPLICATION MODAL */}
      {selectedStartup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg glass-card p-6 md:p-8 shadow-2xl relative overflow-hidden text-left">
            <h3 className="text-xl font-bold text-white mb-2">Apply to: {selectedStartup.name}</h3>
            <p className="text-slate-400 text-xs mb-6">Propose your skills and pitch why you fit this concept.</p>

            {applySuccess && (
              <div className="mb-4 flex items-start gap-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 p-3 rounded-xl text-xs">
                <CheckCircle className="h-5 w-5 shrink-0" />
                <span>{applySuccess}</span>
              </div>
            )}

            {applyError && (
              <div className="mb-4 flex items-start gap-1 bg-rose-500/10 border border-rose-500/20 text-rose-300 p-3 rounded-xl text-xs">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <span>{applyError}</span>
              </div>
            )}

            <form onSubmit={handleApplySubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-300 uppercase tracking-wider block">Proposed Role / Title</label>
                <div className="relative">
                  <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={roleProposed}
                    onChange={(e) => setRoleProposed(e.target.value)}
                    placeholder="e.g. Lead Developer / CTO / CMO"
                    className="w-full glass-input pl-11 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-300 uppercase tracking-wider block">Pitch Message</label>
                <textarea
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Pitch your core experience, motivation, and how you can support this project..."
                  rows="4"
                  maxLength="500"
                  className="w-full glass-input text-xs resize-none p-3"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setSelectedStartup(null)}
                  className="glass-btn-secondary py-2 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={applyMutation.isPending}
                  className="glass-btn-primary py-2 px-5 text-xs"
                >
                  {applyMutation.isPending ? 'Submitting...' : 'Submit Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Matches;
