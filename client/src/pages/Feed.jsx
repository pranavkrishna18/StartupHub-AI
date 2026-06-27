import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Search, ChevronUp, MessageSquare, ExternalLink, Filter, TrendingUp, Calendar } from 'lucide-react';
import API from '../services/api';

// API Fetch Helpers
const fetchStartups = async ({ queryKey }) => {
  const [_, search, category, sort] = queryKey;
  const params = {};
  if (search) params.search = search;
  if (category) params.category = category;
  if (sort) params.sort = sort;

  const res = await API.get('/startups', { params });
  return res.data.data.startups;
};

const fetchCategories = async () => {
  const res = await API.get('/categories');
  return res.data.data.categories;
};

const toggleVoteAPI = async (id) => {
  const res = await API.post(`/startups/${id}/vote`);
  return res.data.data;
};

const Feed = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { isAuthenticated } = useSelector((state) => state.auth);

  // Filters State
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState('votes'); // 'votes' or 'newest'

  // TanStack Queries
  const { data: startups, isLoading, isError, refetch } = useQuery({
    queryKey: ['startups', search, category, sort],
    queryFn: fetchStartups
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories
  });

  // Upvote Mutation
  const voteMutation = useMutation({
    mutationFn: toggleVoteAPI,
    onSuccess: () => {
      // Invalidate startups feeds to refresh votes count
      queryClient.invalidateQueries({ queryKey: ['startups'] });
    },
    onError: (err) => {
      if (!isAuthenticated) {
        navigate('/login');
      } else {
        console.error(err);
      }
    }
  });

  const handleVote = (e, startupId) => {
    e.stopPropagation(); // Prevent card redirect
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    voteMutation.mutate(startupId);
  };

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      {/* Platform Tagline Section */}
      <div className="text-center mb-16 relative">
        {/* Colorful gradient overlay blur */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl -z-10"></div>
        <div className="absolute left-1/3 top-1/3 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl -z-10"></div>

        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white mb-6">
          Validate Ideas. Build Teams.<br />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-brand-cyan to-brand-violet">
            Launch Your Next Startup.
          </span>
        </h1>
        <p className="text-slate-400 max-w-2xl mx-auto text-lg md:text-xl font-normal leading-relaxed">
          AI-Powered Startup Validation, Co-Founder Discovery, and Startup Growth Platform. Upvote the best ideas, join early waitlists, and discover builders.
        </p>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="glass-card p-4 md:p-6 mb-8 flex flex-col md:flex-row gap-4 items-center justify-between">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={handleSearchChange}
            placeholder="Search startups, taglines..."
            className="w-full glass-input pl-12 py-2"
          />
        </div>

        {/* Categories Selector */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <Filter className="h-4 w-4 text-slate-400 shrink-0" />
          <button
            onClick={() => setCategory('')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              category === ''
                ? 'bg-brand-violet/20 border-brand-violet text-brand-cyan'
                : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
            }`}
          >
            All
          </button>
          {categories?.map((cat) => (
            <button
              key={cat._id}
              onClick={() => setCategory(cat.slug)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                category === cat.slug
                  ? 'bg-brand-violet/20 border-brand-violet text-brand-cyan'
                  : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Sorting Toggles */}
        <div className="flex gap-2 shrink-0 border border-white/10 p-1.5 rounded-xl bg-white/5">
          <button
            onClick={() => setSort('votes')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              sort === 'votes' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <TrendingUp className="h-3.5 w-3.5" />
            Top Voted
          </button>
          <button
            onClick={() => setSort('newest')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              sort === 'newest' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calendar className="h-3.5 w-3.5" />
            Newest
          </button>
        </div>
      </div>

      {/* STARTUPS FEED */}
      {isLoading ? (
        <div className="py-20 flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-cyan"></div>
        </div>
      ) : isError ? (
        <div className="text-center py-20 text-rose-400 font-semibold glass-card">
          Failed to load startups. Please try again.
        </div>
      ) : startups?.length === 0 ? (
        <div className="text-center py-20 text-slate-400 font-medium glass-card">
          No startups found matching your filter options. Be the first to submit!
        </div>
      ) : (
        <div className="space-y-4">
          {startups?.map((startup) => (
            <div
              key={startup._id}
              onClick={() => navigate(`/startup/${startup._id}`)}
              className="glass-card glass-card-hover p-5 flex items-center justify-between cursor-pointer gap-6"
            >
              {/* Info Details */}
              <div className="flex items-start gap-4">
                <div className="h-16 w-16 bg-gradient-to-tr from-violet-600/30 to-cyan-500/30 border border-white/10 flex items-center justify-center text-white text-2xl font-bold rounded-2xl shrink-0">
                  {startup.name[0]}
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold text-white hover:text-brand-cyan transition-colors m-0 text-left">
                      {startup.name}
                    </h2>
                    <span className="text-[10px] bg-white/5 border border-white/10 px-2 py-0.5 rounded-full text-slate-400 tracking-wide font-semibold uppercase">
                      {startup.category?.name}
                    </span>
                  </div>
                  <p className="text-slate-400 text-sm text-left">{startup.tagline}</p>
                  
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <MessageSquare className="h-3.5 w-3.5" />
                      {startup.commentsCount || 0} Comments
                    </span>
                    <span>&bull;</span>
                    <span>
                      Waitlist: {startup.metrics?.waitlistCount || 0} early signups
                    </span>
                  </div>
                </div>
              </div>

              {/* Vote Actions Button */}
              <button
                onClick={(e) => handleVote(e, startup._id)}
                className={`flex flex-col items-center justify-center w-16 h-16 border rounded-2xl transition-all select-none shrink-0 ${
                  startup.hasVoted
                    ? 'bg-brand-violet/20 border-brand-violet text-brand-cyan shadow-[0_0_15px_rgba(124,58,237,0.15)]'
                    : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:border-white/20'
                }`}
              >
                <ChevronUp className={`h-6 w-6 transition-transform ${startup.hasVoted ? 'translate-y-[-2px]' : ''}`} />
                <span className="text-xs font-extrabold tracking-tight">{startup.votesCount}</span>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Feed;
