import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Compass, BookMarked, UserPlus, UserCheck, ArrowRight, BrainCircuit } from 'lucide-react';
import API from '../services/api';

const fetchDiscovery = async ({ queryKey }) => {
  const [_, minScore, category, sort] = queryKey;
  const params = {};
  if (minScore) params.minScore = minScore;
  if (category) params.category = category;
  if (sort) params.sort = sort;

  const res = await API.get('/investor/discovery', { params });
  return res.data.data.startups;
};

const fetchCategories = async () => {
  const res = await API.get('/categories');
  return res.data.data.categories;
};

const Discovery = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { isAuthenticated } = useSelector((state) => state.auth);

  // States
  const [minScore, setMinScore] = useState(0);
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState('ai-score'); // 'ai-score', 'votes', 'newest'

  // TanStack Queries
  const { data: startups, isLoading, isError } = useQuery({
    queryKey: ['discovery', minScore, category, sort],
    queryFn: fetchDiscovery
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories
  });

  // Bookmark Mutation
  const bookmarkMutation = useMutation({
    mutationFn: async (startupId) => {
      await API.post(`/investor/bookmark/${startupId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discovery'] });
    }
  });

  // Follow Mutation
  const followMutation = useMutation({
    mutationFn: async (userId) => {
      await API.post(`/investor/follow/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discovery'] });
    }
  });

  const handleBookmarkToggle = (startupId) => {
    if (!isAuthenticated) return navigate('/login');
    bookmarkMutation.mutate(startupId);
  };

  const handleFollowToggle = (userId) => {
    if (!isAuthenticated) return navigate('/login');
    followMutation.mutate(userId);
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 text-left">
      {/* HEADER */}
      <div className="border-b border-white/10 pb-6 mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-2 m-0 margin-0">
            <Compass className="h-8 w-8 text-brand-cyan animate-pulse" />
            Startup Discovery Engine
          </h1>
          <p className="text-slate-400 mt-2">Filter startups based on automated AI Validation ratings and traction metrics</p>
        </div>
      </div>

      {/* FILTERS WIDGET */}
      <div className="glass-card p-6 mb-8 grid grid-cols-1 md:grid-cols-4 gap-6 items-center">
        {/* Min Score Slider */}
        <div className="space-y-2 md:col-span-2">
          <div className="flex justify-between items-center text-xs font-bold text-slate-300 uppercase tracking-wider">
            <span>Minimum AI Validation Score</span>
            <span className="text-brand-cyan font-extrabold">{minScore}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="95"
            step="5"
            value={minScore}
            onChange={(e) => setMinScore(e.target.value)}
            className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-brand-cyan"
          />
        </div>

        {/* Categories Dropdown */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-semibold text-slate-300 uppercase tracking-wider block">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full glass-input py-2 text-xs appearance-none cursor-pointer pr-10 bg-[#0c0a1a]"
          >
            <option value="">All Focus Sectors</option>
            {categories?.map((cat) => (
              <option key={cat._id} value={cat.slug} className="bg-[#0c0a1a]">{cat.name}</option>
            ))}
          </select>
        </div>

        {/* Sort Select */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-semibold text-slate-300 uppercase tracking-wider block">Sort By</label>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="w-full glass-input py-2 text-xs appearance-none cursor-pointer pr-10 bg-[#0c0a1a]"
          >
            <option value="ai-score">Highest AI Validation</option>
            <option value="votes">Top Upvotes</option>
            <option value="newest">Newest Submission</option>
          </select>
        </div>
      </div>

      {/* DISCOVERY LIST */}
      {isLoading ? (
        <div className="py-20 flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-cyan"></div>
        </div>
      ) : isError ? (
        <div className="text-center py-20 text-rose-400 font-semibold glass-card">
          Failed to load startups feed. Try refreshing.
        </div>
      ) : startups?.length === 0 ? (
        <div className="text-center py-20 text-slate-400 font-medium glass-card">
          No concepts found matching these filtration thresholds. Adjust minimum validation slider!
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {startups?.map((s) => (
            <div
              key={s._id}
              className="glass-card p-6 flex flex-col justify-between gap-6 hover:shadow-[0_0_30px_rgba(0,242,254,0.06)] hover:border-brand-cyan/20 transition-all duration-300 relative overflow-hidden"
            >
              {/* Decorative light overlay */}
              <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full blur-2xl"></div>

              {/* Startup details block */}
              <div className="space-y-4">
                <div className="flex justify-between items-start gap-4">
                  <div className="h-12 w-12 bg-gradient-to-tr from-violet-600/30 to-cyan-500/30 border border-white/10 flex items-center justify-center text-white font-bold text-lg rounded-xl shrink-0">
                    {s.name[0]}
                  </div>

                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-white text-base truncate">{s.name}</h3>
                      <span className="text-[9px] bg-white/5 border border-white/10 px-2 py-0.5 rounded-full text-slate-400 font-semibold uppercase">
                        {s.category?.name}
                      </span>
                    </div>
                    <p className="text-slate-400 text-xs mt-1 truncate">{s.tagline}</p>
                  </div>

                  {/* Bookmark Toggle Icon */}
                  <button
                    onClick={() => handleBookmarkToggle(s._id)}
                    className={`p-2 rounded-xl border transition-all shrink-0 ${
                      s.isBookmarked
                        ? 'bg-brand-cyan/10 border-brand-cyan text-brand-cyan shadow-[0_0_10px_rgba(0,242,254,0.15)]'
                        : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                    }`}
                  >
                    <BookMarked className="h-4 w-4" />
                  </button>
                </div>

                {/* AI Score Badge Panel */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <BrainCircuit className="h-5 w-5 text-brand-cyan shrink-0" />
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">AI Validation Score</span>
                      <span className="text-xs font-bold text-slate-300">
                        {s.aiReport?.validationScore ? 'Evaluated Viola Score' : 'Unvalidated concept'}
                      </span>
                    </div>
                  </div>
                  <span className="text-2xl font-black text-brand-cyan">
                    {s.aiReport?.validationScore ? `${s.aiReport.validationScore}%` : '--'}
                  </span>
                </div>

                {/* Founder follow action row */}
                <div className="flex justify-between items-center border-t border-white/5 pt-4">
                  <div className="min-w-0">
                    <span className="text-[9px] uppercase tracking-wider text-slate-500 block font-semibold">Founder</span>
                    <span className="text-xs font-bold text-slate-300 truncate block max-w-[150px]">{s.founder?.fullName}</span>
                  </div>

                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handleFollowToggle(s.founder?._id)}
                      className={`py-1.5 px-3 rounded-xl border text-[10px] font-bold transition-all flex items-center gap-1 ${
                        s.founder?.isFollowed
                          ? 'bg-brand-purple/20 border-brand-purple text-brand-cyan'
                          : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {s.founder?.isFollowed ? (
                        <>
                          <UserCheck className="h-3 w-3" />
                          Following
                        </>
                      ) : (
                        <>
                          <UserPlus className="h-3 w-3" />
                          Follow
                        </>
                      )}
                    </button>

                    <Link
                      to={`/startup/${s._id}`}
                      className="glass-btn-primary py-1.5 px-3 text-[10px] flex items-center gap-1"
                    >
                      View Idea
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Discovery;
