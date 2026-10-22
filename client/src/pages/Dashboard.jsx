import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { LayoutDashboard, Users, Eye, ArrowUpCircle, MessageSquare, ExternalLink, Calendar, CheckCircle2, XCircle, Briefcase, Plus, TrendingUp, Cpu, RefreshCw, X, ShieldAlert, Award, Star } from 'lucide-react';
import API from '../services/api';
import JobCreateModal from '../components/JobCreateModal';
import { socket } from '../services/socket';

const fetchDashboardStats = async () => {
  const res = await API.get('/dashboard/founder');
  return res.data.data;
};

const resolveFileUrl = (filePath) => {
  if (!filePath) return '';
  if (filePath.startsWith('data:')) return filePath;
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) return filePath;
  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
  const serverBase = apiBase.replace('/api/v1', '');
  return `${serverBase}${filePath}`;
};

const Dashboard = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('analytics'); // 'analytics' or 'hiring'
  const [selectedStartupId, setSelectedStartupId] = useState('');
  const [isJobModalOpen, setIsJobModalOpen] = useState(false);
  const [activeStartupForJob, setActiveStartupForJob] = useState(null);
  
  // Sorting & Drawer states
  const [sortBy, setSortBy] = useState('date'); // 'date' or 'match'
  const [selectedAppForEval, setSelectedAppForEval] = useState(null);
  const [drawerTab, setDrawerTab] = useState('metrics'); // 'metrics' or 'pdf'

  // Reset tab to metrics when new applicant is opened
  useEffect(() => {
    setDrawerTab('metrics');
  }, [selectedAppForEval]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['founderStats'],
    queryFn: fetchDashboardStats
  });


  // Pipeline stage update mutation
  const updateStageMutation = useMutation({
    mutationFn: async ({ applicationId, stage }) => {
      const res = await API.patch(`/applications/${applicationId}/stage`, { stage });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['founderStats'] });
    }
  });

  // Manual AI Match evaluation trigger mutation
  const evaluateMutation = useMutation({
    mutationFn: async (applicationId) => {
      const res = await API.post(`/applications/${applicationId}/evaluate`);
      return res.data.data.application;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['founderStats'] });
      // Update drawer if opened
      if (selectedAppForEval && selectedAppForEval._id === data._id) {
        setSelectedAppForEval(data);
      }
    }
  });

  // Socket listener for real-time background evaluation finishes
  useEffect(() => {
    socket.on('application_evaluated', (payload) => {
      console.log('🔔 Application evaluated event received:', payload);
      queryClient.invalidateQueries({ queryKey: ['founderStats'] });
    });
    return () => {
      socket.off('application_evaluated');
    };
  }, [queryClient]);

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

  const currentStartupId = selectedStartupId || startups[0]?._id;

  // Filter & sort applicants
  const filteredApps = pendingApplications
    ? pendingApplications.filter(app => app.startup?._id === currentStartupId)
    : [];

  const sortedApps = [...filteredApps].sort((a, b) => {
    if (sortBy === 'match') {
      const scoreA = a.evaluation?.compatibilityScore || 0;
      const scoreB = b.evaluation?.compatibilityScore || 0;
      return scoreB - scoreA;
    }
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 text-left">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-white/10 pb-6 mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight m-0 flex items-center gap-2">
            <LayoutDashboard className="h-8 w-8 text-brand-cyan" />
            Founder Workspace
          </h1>
          <p className="text-slate-400 mt-2">Manage team pipelines, analyze project traction, and grow waitlists</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <Link to="/submit-startup" className="glass-btn-primary py-2.5 px-5 text-sm shrink-0">
            Submit New Idea
          </Link>
        </div>
      </div>

      {/* TABS */}
      <div className="flex border-b border-white/5 mb-8 gap-4">
        <button
          onClick={() => setActiveTab('analytics')}
          className={`pb-4 text-sm font-extrabold tracking-tight transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === 'analytics' ? 'border-brand-cyan text-brand-cyan' : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <TrendingUp className="h-4 w-4" />
          Traction Analytics
        </button>
        <button
          onClick={() => setActiveTab('hiring')}
          className={`pb-4 text-sm font-extrabold tracking-tight transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === 'hiring' ? 'border-brand-cyan text-brand-cyan' : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Briefcase className="h-4 w-4" />
          Hiring Pipeline Portal
        </button>
      </div>

      {summary.totalStartups === 0 ? (
        <div className="glass-card p-12 text-center text-slate-400 font-medium">
          You haven't submitted any startup ideas yet. Submit one to open your workspace!
        </div>
      ) : activeTab === 'analytics' ? (
        /* ==================== TAB 1: ANALYTICS ==================== */
        <div className="space-y-8">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
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

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
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

            <div className="glass-card p-6 flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                  <Users className="h-5 w-5 text-brand-purple" />
                  Recent Waitlist Signups
                </h3>
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
                        <span className="text-[9px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full border bg-emerald-500/10 border-emerald-500/20 text-emerald-400">
                          {s.status}
                        </span>
                      </td>
                      <td className="py-4 text-center font-semibold text-slate-300">{s.views}</td>
                      <td className="py-4 text-center font-semibold text-slate-300">{s.votesCount}</td>
                      <td className="py-4 text-center font-semibold text-brand-cyan">{s.waitlistCount}</td>
                      <td className="py-4 text-right flex justify-end gap-3">
                        <button
                          onClick={() => {
                            setActiveStartupForJob(s._id);
                            setIsJobModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1 bg-brand-cyan/10 hover:bg-brand-cyan/20 border border-brand-cyan/30 text-brand-cyan text-xs px-3 py-1.5 rounded-lg font-bold"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Post Job
                        </button>
                        <Link
                          to={`/startup/${s._id}`}
                          className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white font-bold py-1.5"
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
        </div>
      ) : (
        /* ==================== TAB 2: HIRING PIPELINE ==================== */
        <div className="space-y-6">
          {/* CONTROL BAR */}
          <div className="glass-card p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-brand-cyan" />
                Applicant Pipeline Boards
              </h3>
              <p className="text-xs text-slate-400">Advance candidate stages and check AI matching assessments</p>
            </div>
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <select
                value={currentStartupId}
                onChange={(e) => setSelectedStartupId(e.target.value)}
                className="bg-[#0c0a1a] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-brand-cyan w-full md:w-48 font-bold"
              >
                {startups.map((s) => (
                  <option key={s._id} value={s._id}>{s.name}</option>
                ))}
              </select>
              
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-[#0c0a1a] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-brand-purple w-full md:w-40 font-bold"
              >
                <option value="date">Sort by Date</option>
                <option value="match">Sort by AI Match</option>
              </select>

              <button
                onClick={() => {
                  setActiveStartupForJob(currentStartupId);
                  setIsJobModalOpen(true);
                }}
                className="bg-brand-cyan hover:bg-brand-cyan/85 text-[#0c0a1a] font-bold text-xs px-5 py-2.5 rounded-xl flex items-center gap-1 w-full md:w-auto justify-center"
              >
                <Plus className="h-4 w-4" />
                Create Job Opening
              </button>
            </div>
          </div>

          {/* PIPELINE LISTING */}
          {sortedApps.length === 0 ? (
            <div className="glass-card p-12 text-center text-slate-400 font-medium">
              No applications received for this startup yet. Create openings in the Hiring tab to receive applicants!
            </div>
          ) : (
            <div className="space-y-6">
              {sortedApps.map((app) => {
                const evalScore = app.evaluation?.compatibilityScore;
                const scoreBg = evalScore >= 80 
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                  : evalScore >= 50 
                  ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' 
                  : evalScore > 0 
                  ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' 
                  : 'bg-slate-500/10 border-slate-500/20 text-slate-400';

                return (
                  <div
                    key={app._id}
                    className="glass-card p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-white/10 transition-all bg-white/5"
                  >
                    <div className="space-y-3 flex-1 text-left">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="font-extrabold text-white text-base leading-none">{app.user.fullName}</span>
                        {app.jobOpening ? (
                          <span className="text-[10px] bg-brand-cyan/10 border border-brand-cyan/20 text-brand-cyan px-2.5 py-0.5 rounded-full font-bold uppercase">
                            {app.jobOpening.title}
                          </span>
                        ) : (
                          <span className="text-[10px] bg-slate-500/10 border border-slate-500/20 text-slate-400 px-2.5 py-0.5 rounded-full font-bold uppercase">
                            General Co-Founder
                          </span>
                        )}
                        
                        {/* COMPATIBILITY BADGE */}
                        <span className={`text-[10px] border px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 ${scoreBg}`}>
                          <Cpu className="h-3 w-3" />
                          {evalScore !== undefined ? `${evalScore}% Match` : 'AI Vetting Pending'}
                        </span>
                      </div>

                      <p className="text-slate-300 text-xs italic leading-relaxed">"{app.message}"</p>

                      <div className="flex flex-wrap gap-1.5">
                        {app.user.skills?.map((skill, sIdx) => (
                          <span key={sIdx} className="text-[9px] bg-white/5 border border-white/10 px-2.5 py-1 rounded-md text-slate-400 font-semibold">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 w-full md:w-auto justify-end">
                      {/* VET DETAILS DRAWER LAUNCHER */}
                      {app.jobOpening && (
                        <button
                          onClick={() => setSelectedAppForEval(app)}
                          className="bg-white/5 hover:bg-white/10 text-white font-bold text-xs px-4 py-2 rounded-xl border border-white/10 flex items-center gap-1.5"
                        >
                          <Cpu className="h-3.5 w-3.5 text-brand-cyan" />
                          AI Vetting Report
                        </button>
                      )}

                      {/* STAGE SELECTOR */}
                      {app.jobOpening && (
                        <div className="flex flex-col gap-1 text-left">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Pipeline Stage</span>
                          <select
                            value={app.currentStage}
                            onChange={(e) => updateStageMutation.mutate({ applicationId: app._id, stage: e.target.value })}
                            className="bg-[#0c0a1a] border border-white/15 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-brand-cyan font-semibold w-40"
                          >
                            {app.jobOpening.hiringStages.map((stg) => (
                              <option key={stg} value={stg}>{stg}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* CREATE JOB MODAL */}
      {isJobModalOpen && (
        <JobCreateModal
          isOpen={isJobModalOpen}
          onClose={() => setIsJobModalOpen(false)}
          startupId={activeStartupForJob}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ['founderStats'] })}
        />
      )}

      {/* AI EVALUATION SIDE-DRAWER */}
      {selectedAppForEval && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-[#0d0a1b] border-l border-brand-purple/20 p-6 md:p-8 overflow-y-auto h-full shadow-2xl relative animate-[slideIn_0.3s_ease]">
            {/* CLOSE */}
            <button
              onClick={() => setSelectedAppForEval(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 p-2 rounded-full transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            {/* HEADER */}
            <div className="border-b border-white/10 pb-6 mb-6">
              <h3 className="text-xl font-extrabold text-white flex items-center gap-2 m-0">
                <Cpu className="h-6 w-6 text-brand-cyan animate-pulse" />
                AI Talent Evaluation Report
              </h3>
              <p className="text-slate-400 text-xs mt-1">
                Candidate: <strong>{selectedAppForEval.user.fullName}</strong> for <strong>{selectedAppForEval.jobOpening?.title}</strong>
              </p>
            </div>

            {/* DETAILED CONTENT */}
            {selectedAppForEval.evaluation?.compatibilityScore !== undefined ? (
              <div className="space-y-6 text-left">
                {/* DRAWER SUB-TABS */}
                {selectedAppForEval.resumeFile && (
                  <div className="flex border-b border-white/5 gap-4 mb-4">
                    <button
                      onClick={() => setDrawerTab('metrics')}
                      className={`pb-2.5 text-xs font-bold tracking-wider uppercase transition-all border-b-2 ${
                        drawerTab === 'metrics' ? 'border-brand-cyan text-brand-cyan' : 'border-transparent text-slate-400 hover:text-white'
                      }`}
                    >
                      AI Vetting Report
                    </button>
                    <button
                      onClick={() => setDrawerTab('pdf')}
                      className={`pb-2.5 text-xs font-bold tracking-wider uppercase transition-all border-b-2 ${
                        drawerTab === 'pdf' ? 'border-brand-cyan text-brand-cyan' : 'border-transparent text-slate-400 hover:text-white'
                      }`}
                    >
                      Original PDF Resume
                    </button>
                  </div>
                )}

                {drawerTab === 'pdf' && selectedAppForEval.resumeFile ? (
                  /* HIGH FIDELITY PDF VIEW */
                  <div className="w-full h-[550px] rounded-2xl overflow-hidden border border-white/10 bg-slate-950 mt-4">
                    <iframe
                      src={resolveFileUrl(selectedAppForEval.resumeFile)}
                      title="Candidate PDF Resume"
                      width="100%"
                      height="100%"
                      className="border-0"
                    />
                  </div>
                ) : (
                  <>
                    {/* RADAR GRIDS PROGRESS */}
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { label: 'Overall Suitability', val: selectedAppForEval.evaluation.compatibilityScore, color: 'bg-brand-cyan' },
                        { label: 'ATS Score', val: selectedAppForEval.evaluation.atsScore || 0, color: 'bg-teal-400' },
                        { label: 'Skill Match', val: selectedAppForEval.evaluation.skillMatch, color: 'bg-brand-purple' },
                        { label: 'Experience Match', val: selectedAppForEval.evaluation.experienceMatch, color: 'bg-indigo-500' },
                        { label: 'Culture Fit', val: selectedAppForEval.evaluation.cultureMatch, color: 'bg-emerald-500' },
                        { label: 'Communication Score', val: selectedAppForEval.evaluation.communicationScore, color: 'bg-amber-500' }
                      ].map((item, idx) => (
                        <div key={idx} className="bg-white/5 p-4 rounded-2xl border border-white/5">
                          <div className="flex justify-between items-center text-xs font-semibold text-slate-400 mb-1.5">
                            <span>{item.label}</span>
                            <span className="font-bold text-white">{item.val}%</span>
                          </div>
                          <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                            <div className={`${item.color} h-full rounded-full`} style={{ width: `${item.val}%` }}></div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* SUBMITTED RESUME TEXT */}
                    {selectedAppForEval.resumeText && (
                      <div className="bg-white/5 p-5 rounded-2xl border border-white/5 text-left">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Submitted Resume Content</h4>
                        <div className="bg-slate-950/60 p-4 rounded-xl text-slate-300 text-xs font-sans whitespace-pre-wrap max-h-48 overflow-y-auto border border-white/5 leading-relaxed">
                          {selectedAppForEval.resumeText}
                        </div>
                      </div>
                    )}

                    {/* STRENGTHS & WEAKNESSES */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-emerald-500/5 border border-emerald-500/10 p-5 rounded-2xl">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-3 flex items-center gap-1">
                          <Star className="h-4 w-4" />
                          Strengths
                        </h4>
                        <ul className="space-y-2 text-xs text-slate-300 list-disc list-inside m-0 pl-0">
                          {selectedAppForEval.evaluation.strengths.map((str, idx) => (
                            <li key={idx} className="leading-relaxed">{str}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="bg-rose-500/5 border border-rose-500/10 p-5 rounded-2xl">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-rose-400 mb-3 flex items-center gap-1">
                          <ShieldAlert className="h-4 w-4" />
                          Weaknesses
                        </h4>
                        <ul className="space-y-2 text-xs text-slate-300 list-disc list-inside m-0 pl-0">
                          {selectedAppForEval.evaluation.weaknesses.map((weak, idx) => (
                            <li key={idx} className="leading-relaxed">{weak}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* MISSING SKILLS */}
                    {selectedAppForEval.evaluation.missingSkills?.length > 0 && (
                      <div className="bg-white/5 p-5 rounded-2xl border border-white/5">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Missing Required Skills</h4>
                        <div className="flex flex-wrap gap-1.5">
                          {selectedAppForEval.evaluation.missingSkills.map((sk, idx) => (
                            <span key={idx} className="text-[10px] bg-rose-500/10 border border-rose-500/20 text-rose-400 px-3 py-1 rounded-md font-semibold">
                              {sk}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* DEVELOPMENT PLAN GROWTH SUGGESTIONS */}
                    <div className="bg-brand-purple/5 border border-brand-purple/10 p-5 rounded-2xl">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-brand-purple mb-3 flex items-center gap-1">
                        <Award className="h-4 w-4" />
                        Growth Suggestions
                      </h4>
                      <ul className="space-y-2 text-xs text-slate-300 list-disc list-inside m-0 pl-0">
                        {selectedAppForEval.evaluation.growthSuggestions.map((sug, idx) => (
                          <li key={idx} className="leading-relaxed">{sug}</li>
                        ))}
                      </ul>
                    </div>

                    {/* RE-RUN VETTING */}
                    <div className="pt-4 border-t border-white/10 flex justify-between items-center text-xs">
                      <span className="text-slate-500">
                        Last evaluated: {new Date(selectedAppForEval.evaluation.evaluatedAt).toLocaleString()}
                      </span>
                      <button
                        onClick={() => evaluateMutation.mutate(selectedAppForEval._id)}
                        disabled={evaluateMutation.isPending}
                        className="bg-brand-cyan/10 hover:bg-brand-cyan/20 border border-brand-cyan/30 text-brand-cyan px-4 py-2 rounded-xl font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${evaluateMutation.isPending ? 'animate-spin' : ''}`} />
                        {evaluateMutation.isPending ? 'Vetting...' : 'Re-Run Vetting'}
                      </button>
                    </div>
                  </>
                )}
              </div>

            ) : (
              /* EMPTY VETTING INITIATOR DISPLAY */
              <div className="py-20 text-center space-y-4">
                <div className="inline-flex p-4 bg-brand-cyan/5 border border-brand-cyan/10 text-brand-cyan rounded-full">
                  <Cpu className="h-10 w-10" />
                </div>
                <h4 className="text-white font-bold">No Evaluation Report Found</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                  Start candidate profile vetting to calculate skills alignment ratios, culture compatibility, and communication scores.
                </p>
                <button
                  onClick={() => evaluateMutation.mutate(selectedAppForEval._id)}
                  disabled={evaluateMutation.isPending}
                  className="bg-brand-cyan hover:bg-brand-cyan/90 disabled:bg-slate-700 text-[#0c0a1a] font-bold text-xs px-6 py-2.5 rounded-xl flex items-center gap-1.5 mx-auto hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_0_15px_rgba(0,242,254,0.15)]"
                >
                  <RefreshCw className={`h-4 w-4 ${evaluateMutation.isPending ? 'animate-spin' : ''}`} />
                  {evaluateMutation.isPending ? 'Analyzing Candidate...' : 'Run AI Vetting'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
