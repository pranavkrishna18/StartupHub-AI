import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { LayoutDashboard, Users, Eye, ArrowUpCircle, MessageSquare, ExternalLink, Calendar, CheckCircle2, XCircle } from 'lucide-react';
import API from '../services/api';

const fetchDashboardStats = async () => {
  const res = await API.get('/dashboard/founder');
  return res.data.data;
};

const Dashboard = () => {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ['founderStats'],
    queryFn: fetchDashboardStats
  });

  // Application response mutation
  const respondMutation = useMutation({
    mutationFn: async ({ applicationId, status }) => {
      const res = await API.patch(`/applications/${applicationId}`, { status });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['founderStats'] });
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
        Failed to load dashboard metrics. Only founders can view this dashboard.{' '}
        <Link to="/" className="text-brand-cyan hover:underline">Back to Feed</Link>
      </div>
    );
  }

  const { summary, startups, recentWaitlist, pendingApplications } = data;

  // Chart data formatting
  const chartData = startups.map(s => ({
    name: s.name.length > 10 ? s.name.substring(0, 10) + '...' : s.name,
    views: s.views || 0,
    waitlist: s.waitlistCount || 0,
    votes: s.votesCount || 0
  }));

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 text-left">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-white/10 pb-6 mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight m-0 margin-0 flex items-center gap-2">
            <LayoutDashboard className="h-8 w-8 text-brand-cyan" />
            Founder Analytics
          </h1>
          <p className="text-slate-400 mt-2">Track startup traction, early waitlists, and community growth</p>
        </div>
        <Link to="/submit-startup" className="glass-btn-primary py-2 px-5 text-sm shrink-0">
          Submit New Idea
        </Link>
      </div>

      {/* STATS SUMMARY CARD GRID */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {[
          { label: 'Total Projects', val: summary.totalStartups, icon: LayoutDashboard, color: 'text-indigo-400' },
          { label: 'Total Views', val: summary.totalViews, icon: Eye, color: 'text-brand-cyan' },
          { label: 'Total Votes', val: summary.totalVotes, icon: ArrowUpCircle, color: 'text-emerald-400' },
          { label: 'Total Comments', val: summary.totalComments, icon: MessageSquare, color: 'text-amber-400' },
          { label: 'Waitlist Subs', val: summary.totalWaitlist, icon: Users, color: 'text-brand-purple' }
        ].map((stat, idx) => {
          const IconComp = stat.icon;
          return (
            <div key={idx} className="glass-card p-5 relative overflow-hidden flex flex-col justify-between min-h-[110px]">
              <div className="flex justify-between items-start">
                <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">{stat.label}</span>
                <IconComp className={`h-4 w-4 ${stat.color}`} />
              </div>
              <h2 className="text-2xl font-black text-white m-0 tracking-tight leading-none mt-2">{stat.val}</h2>
            </div>
          );
        })}
      </div>

      {summary.totalStartups === 0 ? (
        <div className="glass-card p-12 text-center text-slate-400 font-medium">
          You haven't submitted any startup ideas yet. Submit one to view analytics!
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* PENDING COLLABORATION REQUESTS */}
          {pendingApplications && pendingApplications.length > 0 && (
            <div className="lg:col-span-3 glass-card p-6 border-brand-purple/20 shadow-[0_0_20px_rgba(124,58,237,0.05)]">
              <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <Users className="h-5 w-5 text-brand-purple animate-pulse" />
                Pending Partnership Applications ({pendingApplications.length})
              </h3>
              <div className="space-y-4">
                {pendingApplications.map((app) => (
                  <div 
                    key={app._id} 
                    className="p-5 border border-white/5 rounded-2xl bg-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-white/10 transition-colors"
                  >
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-white text-sm">{app.user.fullName}</span>
                        <span className="text-[10px] bg-brand-purple/20 border border-brand-purple/35 text-brand-cyan px-2.5 py-0.5 rounded-full font-bold uppercase">
                          Applying for: {app.roleProposed}
                        </span>
                        <span className="text-[10px] text-slate-500 font-semibold uppercase">
                          for {app.startup?.name}
                        </span>
                      </div>
                      <p className="text-slate-300 text-xs italic font-medium leading-relaxed">"{app.message}"</p>
                      
                      {/* Skills badges */}
                      <div className="flex flex-wrap gap-1 pt-1">
                        {app.user.skills?.map((skill, sIdx) => (
                          <span key={sIdx} className="text-[9px] bg-white/5 border border-white/10 px-2 py-0.5 rounded-md text-slate-400 font-semibold">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-2 shrink-0 w-full md:w-auto justify-end">
                      <button
                        onClick={() => respondMutation.mutate({ applicationId: app._id, status: 'accepted' })}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2 rounded-xl flex items-center gap-1 hover:scale-[1.02] active:scale-[0.98] transition-all"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Accept
                      </button>
                      <button
                        onClick={() => respondMutation.mutate({ applicationId: app._id, status: 'rejected' })}
                        className="bg-rose-600/10 hover:bg-rose-600/20 border border-rose-600/30 text-rose-300 text-xs font-semibold px-4 py-2 rounded-xl flex items-center gap-1 hover:scale-[1.02] active:scale-[0.98] transition-all"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* VISUALIZATION CHART */}
          <div className="lg:col-span-2 glass-card p-6 flex flex-col justify-between">
            <h3 className="text-lg font-bold text-white mb-6">Traction Breakdown</h3>
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
                  <Bar dataKey="views" fill="#00f2fe" radius={[4, 4, 0, 0]} name="Views" />
                  <Bar dataKey="waitlist" fill="#7c3aed" radius={[4, 4, 0, 0]} name="Waitlist" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* RECENT WAITLIST SIGNUPS */}
          <div className="glass-card p-6 flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-bold text-white mb-6">Recent Waitlist Signups</h3>
              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                {recentWaitlist.length === 0 ? (
                  <div className="text-center py-10 text-slate-500 text-sm">
                    No waitlist subscribers yet. Promote your project!
                  </div>
                ) : (
                  recentWaitlist.map((sub) => (
                    <div key={sub._id} className="flex justify-between items-start border-b border-white/5 pb-3 last:border-b-0">
                      <div>
                        <p className="text-sm font-semibold text-white truncate max-w-[200px]">{sub.email}</p>
                        <span className="text-[10px] text-brand-cyan uppercase tracking-wider font-semibold">
                          {sub.startup?.name}
                        </span>
                      </div>
                      <span className="text-[9px] text-slate-500 flex items-center gap-1 shrink-0">
                        <Calendar className="h-3 w-3" />
                        {new Date(sub.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* MY STARTUPS TABLE */}
          <div className="lg:col-span-3 glass-card p-6 overflow-x-auto">
            <h3 className="text-lg font-bold text-white mb-6">My Projects</h3>
            <table className="w-full text-left text-sm border-collapse min-w-[600px]">
              <thead>
                <tr className="border-b border-white/10 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                  <th className="pb-3">Project Name</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-center">Views</th>
                  <th className="pb-3 text-center">Votes</th>
                  <th className="pb-3 text-center">Waitlist</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {startups.map((s) => (
                  <tr key={s._id} className="hover:bg-white/5 transition-colors">
                    <td className="py-4">
                      <div className="font-bold text-white">{s.name}</div>
                      <div className="text-xs text-slate-400 line-clamp-1 max-w-[250px]">{s.tagline}</div>
                    </td>
                    <td className="py-4">
                      <span className="text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border bg-emerald-500/10 border-emerald-500/20 text-emerald-400">
                        {s.status}
                      </span>
                    </td>
                    <td className="py-4 text-center font-semibold text-slate-300">{s.views}</td>
                    <td className="py-4 text-center font-semibold text-slate-300">{s.votesCount}</td>
                    <td className="py-4 text-center font-semibold text-brand-cyan">{s.waitlistCount}</td>
                    <td className="py-4 text-right">
                      <Link
                        to={`/startup/${s._id}`}
                        className="inline-flex items-center gap-1.5 text-xs text-brand-cyan hover:underline font-bold"
                      >
                        Visit Idea
                        <ExternalLink className="h-3 w-3" />
                      </Link>
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

export default Dashboard;
