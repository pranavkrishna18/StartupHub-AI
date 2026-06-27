import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Compass, BookMarked, Users, Eye, ArrowUpCircle, MessageSquare, ExternalLink, Trash2 } from 'lucide-react';
import API from '../services/api';

const fetchInvestorStats = async () => {
  const res = await API.get('/investor/dashboard');
  return res.data.data;
};

const InvestorDashboard = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data, isLoading, error } = useQuery({
    queryKey: ['investorStats'],
    queryFn: fetchInvestorStats
  });

  // Bookmark Toggle Mutation
  const unbookmarkMutation = useMutation({
    mutationFn: async (id) => {
      await API.post(`/investor/bookmark/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investorStats'] });
    }
  });

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-cyan"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-20 text-center text-slate-400 font-semibold glass-card">
        Failed to load investor metrics. Only investors can view this dashboard.{' '}
        <Link to="/" className="text-brand-cyan hover:underline">Back to Feed</Link>
      </div>
    );
  }

  const { summary, bookmarks } = data;

  // Chart data formatting
  const chartData = bookmarks.map(s => ({
    name: s.name.length > 10 ? s.name.substring(0, 10) + '...' : s.name,
    validationScore: s.aiReport?.validationScore || 0,
    votes: s.votesCount || 0
  }));

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 text-left">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-white/10 pb-6 mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight m-0 margin-0 flex items-center gap-2">
            <BookMarked className="h-8 w-8 text-brand-cyan" />
            Investor Portal
          </h1>
          <p className="text-slate-400 mt-2">Track bookmarked startups, growth velocity, and validation achievements</p>
        </div>
        <Link to="/discovery" className="glass-btn-primary py-2 px-5 text-sm shrink-0 flex items-center gap-1.5">
          <Compass className="h-4 w-4" />
          Startup Discovery
        </Link>
      </div>

      {/* SUMMARY STATS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 max-w-xl">
        <div className="glass-card p-5 relative overflow-hidden flex flex-col justify-between min-h-[110px]">
          <div className="flex justify-between items-start">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">Bookmarked Concepts</span>
            <BookMarked className="h-4 w-4 text-brand-cyan" />
          </div>
          <h2 className="text-2xl font-black text-white m-0 tracking-tight leading-none mt-2">{summary.totalBookmarks}</h2>
        </div>

        <div className="glass-card p-5 relative overflow-hidden flex flex-col justify-between min-h-[110px]">
          <div className="flex justify-between items-start">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">Followed Founders</span>
            <Users className="h-4 w-4 text-brand-purple" />
          </div>
          <h2 className="text-2xl font-black text-white m-0 tracking-tight leading-none mt-2">{summary.totalFollowing}</h2>
        </div>
      </div>

      {summary.totalBookmarks === 0 ? (
        <div className="glass-card p-12 text-center text-slate-400 font-medium">
          No bookmarks saved yet. Use the{' '}
          <Link to="/discovery" className="text-brand-cyan hover:underline font-bold">
            Startup Discovery Engine
          </Link>{' '}
          to find validation metrics!
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* VISUALIZATION CHART */}
          <div className="lg:col-span-2 glass-card p-6 flex flex-col justify-between">
            <h3 className="text-lg font-bold text-white mb-6">Validation Index vs Upvotes</h3>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0a" />
                  <XAxis dataKey="name" stroke="#9ca3af" fontSize={11} tickLine={false} />
                  <YAxis stroke="#9ca3af" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0c0a1a',
                      borderColor: '#ffffff1a',
                      borderRadius: '12px',
                      color: '#f3f4f6'
                    }}
                  />
                  <Bar dataKey="validationScore" fill="#00f2fe" radius={[4, 4, 0, 0]} name="AI Validation %" />
                  <Bar dataKey="votes" fill="#7c3aed" radius={[4, 4, 0, 0]} name="Upvotes" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* BOOKMARKED LIST TABLE */}
          <div className="lg:col-span-3 glass-card p-6 overflow-x-auto">
            <h3 className="text-lg font-bold text-white mb-6">Bookmarked Startups</h3>
            <table className="w-full text-left text-sm border-collapse min-w-[600px]">
              <thead>
                <tr className="border-b border-white/10 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                  <th className="pb-3">Startup Name</th>
                  <th className="pb-3 text-center">AI Validation</th>
                  <th className="pb-3 text-center">Views</th>
                  <th className="pb-3 text-center">Votes</th>
                  <th className="pb-3 text-center">Waitlist</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {bookmarks.map((s) => (
                  <tr key={s._id} className="hover:bg-white/5 transition-colors">
                    <td className="py-4">
                      <div className="font-bold text-white">{s.name}</div>
                      <div className="text-xs text-slate-400 truncate max-w-[200px]">{s.tagline}</div>
                    </td>
                    <td className="py-4 text-center">
                      <span className="text-[10px] bg-brand-cyan/10 border border-brand-cyan/20 px-2 py-0.5 rounded-full font-bold text-brand-cyan">
                        {s.aiReport?.validationScore ? `${s.aiReport.validationScore}%` : 'Not Rated'}
                      </span>
                    </td>
                    <td className="py-4 text-center font-semibold text-slate-300">{s.metrics?.views || 0}</td>
                    <td className="py-4 text-center font-semibold text-slate-300">{s.votesCount}</td>
                    <td className="py-4 text-center font-semibold text-slate-300">{s.metrics?.waitlistCount || 0}</td>
                    <td className="py-4 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <Link
                          to={`/startup/${s._id}`}
                          className="inline-flex items-center gap-1 text-xs text-brand-cyan hover:underline font-bold"
                        >
                          Visit
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                        <button
                          onClick={() => unbookmarkMutation.mutate(s._id)}
                          className="text-slate-500 hover:text-rose-400 transition-colors shrink-0"
                          title="Remove bookmark"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvestorDashboard;
