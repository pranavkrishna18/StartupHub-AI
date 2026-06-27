import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Shield, ShieldAlert, CheckCircle, XCircle, Database, Users, Rocket, Eye, ExternalLink, Calendar, Info, Check, Trash, Megaphone } from 'lucide-react';
import API from '../services/api';

const AdminDashboard = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('verifications'); // 'verifications', 'moderation', 'audit'
  const [adminNotes, setAdminNotes] = useState('');
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const [resolutionDetails, setResolutionDetails] = useState('');
  const [selectedReportId, setSelectedReportId] = useState(null);

  // Announcement States
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementMessage, setAnnouncementMessage] = useState('');
  const [announcementTarget, setAnnouncementTarget] = useState('everyone');
  const [announcementUserIds, setAnnouncementUserIds] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState('both');
  const [broadcastStatus, setBroadcastStatus] = useState({ type: '', message: '' });

  // Queries
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['adminStats'],
    queryFn: async () => {
      const res = await API.get('/admin/stats');
      return res.data.data.stats;
    }
  });

  const { data: verificationsData, isLoading: verificationsLoading } = useQuery({
    queryKey: ['adminVerifications', activeTab],
    queryFn: async () => {
      const res = await API.get('/admin/verifications', { params: { status: 'pending' } });
      return res.data.data.requests;
    },
    enabled: activeTab === 'verifications'
  });

  const { data: reportsData, isLoading: reportsLoading } = useQuery({
    queryKey: ['adminReports', activeTab],
    queryFn: async () => {
      const res = await API.get('/admin/reports', { params: { status: 'pending' } });
      return res.data.data.reports;
    },
    enabled: activeTab === 'moderation'
  });

  const { data: auditData, isLoading: auditLoading } = useQuery({
    queryKey: ['adminLogs', activeTab],
    queryFn: async () => {
      const res = await API.get('/admin/logs');
      return res.data.data.logs;
    },
    enabled: activeTab === 'audit'
  });

  // Mutations
  const verifyMutation = useMutation({
    mutationFn: async ({ id, status, adminNotes }) => {
      const res = await API.patch(`/admin/verifications/${id}`, { status, adminNotes });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminStats'] });
      queryClient.invalidateQueries({ queryKey: ['adminVerifications'] });
      setSelectedRequestId(null);
      setAdminNotes('');
    }
  });

  const reportMutation = useMutation({
    mutationFn: async ({ id, status, actionTaken, resolutionDetails }) => {
      const res = await API.patch(`/admin/reports/${id}`, { status, actionTaken, resolutionDetails });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminStats'] });
      queryClient.invalidateQueries({ queryKey: ['adminReports'] });
      setSelectedReportId(null);
      setResolutionDetails('');
    }
  });

  const handleVerification = (id, status) => {
    verifyMutation.mutate({ id, status, adminNotes });
  };

  const handleReport = (id, status, actionTaken) => {
    reportMutation.mutate({ id, status, actionTaken, resolutionDetails });
  };

  const broadcastMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await API.post('/admin/announcements', payload);
      return res.data;
    },
    onSuccess: (data) => {
      setBroadcastStatus({ type: 'success', message: data.message || 'Announcement broadcasted successfully!' });
      setAnnouncementTitle('');
      setAnnouncementMessage('');
      setAnnouncementUserIds('');
      queryClient.invalidateQueries({ queryKey: ['adminLogs'] });
      queryClient.invalidateQueries({ queryKey: ['adminStats'] });
    },
    onError: (err) => {
      const errMsg = err.response?.data?.message || 'Failed to broadcast announcement';
      setBroadcastStatus({ type: 'error', message: errMsg });
    }
  });

  const handleBroadcast = (e) => {
    e.preventDefault();
    setBroadcastStatus({ type: 'loading', message: 'Broadcasting announcement in progress...' });
    
    let userIdsArray = [];
    if (announcementTarget === 'specific') {
      userIdsArray = announcementUserIds
        .split(',')
        .map(id => id.trim())
        .filter(id => id.length > 0);
      
      if (userIdsArray.length === 0) {
        setBroadcastStatus({ type: 'error', message: 'Please provide at least one valid user ID for specific target' });
        return;
      }
    }

    broadcastMutation.mutate({
      target: announcementTarget,
      userIds: announcementTarget === 'specific' ? userIdsArray : undefined,
      title: announcementTitle,
      message: announcementMessage,
      deliveryMethod
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 text-left">
      {/* HEADER */}
      <div className="border-b border-white/10 pb-6 mb-8">
        <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-2 m-0 margin-0">
          <Shield className="h-8 w-8 text-brand-purple" />
          Administrative Control Center
        </h1>
        <p className="text-slate-400 mt-2">Manage validation verifications, flag report queues, and audit system activities</p>
      </div>

      {/* METRICS PANELS */}
      {statsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="glass-card p-5 animate-pulse min-h-[90px]"></div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="glass-card p-5 relative overflow-hidden flex flex-col justify-between min-h-[100px]">
            <div className="flex justify-between items-start">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">System Users</span>
              <Users className="h-4 w-4 text-brand-cyan" />
            </div>
            <h2 className="text-2xl font-black text-white m-0 tracking-tight leading-none mt-2">{statsData?.totalUsers}</h2>
          </div>

          <div className="glass-card p-5 relative overflow-hidden flex flex-col justify-between min-h-[100px]">
            <div className="flex justify-between items-start">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">Total Startups</span>
              <Rocket className="h-4 w-4 text-brand-purple" />
            </div>
            <h2 className="text-2xl font-black text-white m-0 tracking-tight leading-none mt-2">{statsData?.totalStartups}</h2>
          </div>

          <div className="glass-card p-5 relative overflow-hidden flex flex-col justify-between min-h-[100px]">
            <div className="flex justify-between items-start">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">Pending Verifications</span>
              <CheckCircle className="h-4 w-4 text-emerald-400" />
            </div>
            <h2 className={`text-2xl font-black m-0 tracking-tight leading-none mt-2 ${statsData?.pendingVerifications > 0 ? 'text-emerald-400' : 'text-white'}`}>
              {statsData?.pendingVerifications}
            </h2>
          </div>

          <div className="glass-card p-5 relative overflow-hidden flex flex-col justify-between min-h-[100px]">
            <div className="flex justify-between items-start">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">Pending Reports</span>
              <ShieldAlert className="h-4 w-4 text-rose-400" />
            </div>
            <h2 className={`text-2xl font-black m-0 tracking-tight leading-none mt-2 ${statsData?.pendingReports > 0 ? 'text-rose-400 animate-pulse' : 'text-white'}`}>
              {statsData?.pendingReports}
            </h2>
          </div>
        </div>
      )}

      {/* NAVIGATION TABS */}
      <div className="flex border-b border-white/5 gap-2 mb-8">
        <button
          onClick={() => setActiveTab('verifications')}
          className={`pb-3 px-4 text-sm font-semibold tracking-tight transition-all border-b-2 ${
            activeTab === 'verifications'
              ? 'border-brand-cyan text-brand-cyan'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Verification Requests ({statsData?.pendingVerifications || 0})
        </button>
        <button
          onClick={() => setActiveTab('moderation')}
          className={`pb-3 px-4 text-sm font-semibold tracking-tight transition-all border-b-2 ${
            activeTab === 'moderation'
              ? 'border-brand-cyan text-brand-cyan'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Reports Queue ({statsData?.pendingReports || 0})
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`pb-3 px-4 text-sm font-semibold tracking-tight transition-all border-b-2 ${
            activeTab === 'audit'
              ? 'border-brand-cyan text-brand-cyan'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Audit System Trails
        </button>
        <button
          onClick={() => {
            setActiveTab('announcements');
            setBroadcastStatus({ type: '', message: '' });
          }}
          className={`pb-3 px-4 text-sm font-semibold tracking-tight transition-all border-b-2 ${
            activeTab === 'announcements'
              ? 'border-brand-cyan text-brand-cyan'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Announcements Broadcaster
        </button>
      </div>

      {/* TAB CONTENT PANELS */}
      {/* 1. VERIFICATION QUEUE */}
      {activeTab === 'verifications' && (
        <div className="glass-card p-6 overflow-x-auto">
          <h3 className="text-lg font-bold text-white mb-6">Verification Actions Queue</h3>
          {verificationsLoading ? (
            <div className="py-20 flex justify-center">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-brand-cyan"></div>
            </div>
          ) : verificationsData?.length === 0 ? (
            <div className="text-center py-20 text-slate-400">No pending verification requests.</div>
          ) : (
            <table className="w-full text-left text-sm border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-white/10 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                  <th className="pb-3">Startup & Category</th>
                  <th className="pb-3">Founder Profile</th>
                  <th className="pb-3">Verification Document</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {verificationsData?.map((req) => (
                  <tr key={req._id} className="hover:bg-white/5 transition-colors">
                    <td className="py-4">
                      <div className="font-bold text-white">{req.startup?.name}</div>
                      <div className="text-xs text-slate-400 truncate max-w-[200px]">{req.startup?.tagline}</div>
                    </td>
                    <td className="py-4">
                      <div className="font-semibold text-slate-200">{req.founder?.fullName}</div>
                      <div className="text-xs text-slate-400">{req.founder?.email}</div>
                    </td>
                    <td className="py-4">
                      <a
                        href={req.documentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-brand-cyan hover:underline font-bold"
                      >
                        View Credentials File
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </td>
                    <td className="py-4 text-right">
                      {selectedRequestId === req._id ? (
                        <div className="flex flex-col gap-2 max-w-xs ml-auto">
                          <textarea
                            value={adminNotes}
                            onChange={(e) => setAdminNotes(e.target.value)}
                            placeholder="Add administrative notes (optional)..."
                            className="glass-input p-2 text-xs w-full resize-none h-14 bg-[#0c0a1a]"
                          ></textarea>
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => setSelectedRequestId(null)}
                              className="px-2 py-1 text-xs text-slate-400 hover:text-white"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleVerification(req._id, 'rejected')}
                              className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold px-2 py-1 rounded-lg"
                            >
                              Reject
                            </button>
                            <button
                              onClick={() => handleVerification(req._id, 'approved')}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-2 py-1 rounded-lg"
                            >
                              Approve
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setSelectedRequestId(req._id);
                            setAdminNotes('');
                          }}
                          className="bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-all"
                        >
                          Review Request
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* 2. MODERATION QUEUE */}
      {activeTab === 'moderation' && (
        <div className="glass-card p-6 overflow-x-auto">
          <h3 className="text-lg font-bold text-white mb-6">User Flagging Moderation Queue</h3>
          {reportsLoading ? (
            <div className="py-20 flex justify-center">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-brand-cyan"></div>
            </div>
          ) : reportsData?.length === 0 ? (
            <div className="text-center py-20 text-slate-400">No pending startup abuse flags.</div>
          ) : (
            <table className="w-full text-left text-sm border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-white/10 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                  <th className="pb-3">Reported Startup</th>
                  <th className="pb-3">Abuse Reason</th>
                  <th className="pb-3">Reporter Description</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {reportsData?.map((rep) => (
                  <tr key={rep._id} className="hover:bg-white/5 transition-colors">
                    <td className="py-4">
                      <div className="font-bold text-white">{rep.startup?.name}</div>
                      <div className="text-[10px] text-slate-400 bg-white/5 border border-white/10 px-1.5 py-0.5 rounded-full inline-block mt-1 font-semibold">
                        Status: {rep.startup?.status}
                      </div>
                    </td>
                    <td className="py-4">
                      <span className="text-xs bg-rose-500/10 border border-rose-500/20 text-rose-400 px-2 py-0.5 rounded-full font-bold">
                        {rep.reason}
                      </span>
                    </td>
                    <td className="py-4">
                      <p className="text-slate-300 text-xs leading-relaxed max-w-sm whitespace-pre-wrap">{rep.description}</p>
                      <span className="text-[10px] text-slate-500 mt-1 block">
                        Flagged by: {rep.reporter?.fullName} ({rep.reporter?.email})
                      </span>
                    </td>
                    <td className="py-4 text-right">
                      {selectedReportId === rep._id ? (
                        <div className="flex flex-col gap-2 max-w-xs ml-auto">
                          <textarea
                            value={resolutionDetails}
                            onChange={(e) => setResolutionDetails(e.target.value)}
                            placeholder="Add resolution explanation..."
                            className="glass-input p-2 text-xs w-full resize-none h-14 bg-[#0c0a1a]"
                          ></textarea>
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => setSelectedReportId(null)}
                              className="px-2 py-1 text-xs text-slate-400 hover:text-white"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleReport(rep._id, 'dismissed', 'none')}
                              className="bg-white/10 hover:bg-white/15 text-white text-xs font-bold px-2 py-1 rounded-lg border border-white/5"
                            >
                              Dismiss
                            </button>
                            <button
                              onClick={() => handleReport(rep._id, 'resolved', 'takedown')}
                              className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold px-2 py-1 rounded-lg"
                            >
                              Take Down Startup
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setSelectedReportId(rep._id);
                            setResolutionDetails('');
                          }}
                          className="bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-all"
                        >
                          Resolve Flag
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* 3. AUDIT TRAIL LOGS */}
      {activeTab === 'audit' && (
        <div className="glass-card p-6 overflow-x-auto">
          <div className="flex items-center gap-2 mb-6 text-brand-cyan">
            <Database className="h-5 w-5" />
            <h3 className="text-lg font-bold text-white">Security & Activity Audit Trail</h3>
          </div>
          {auditLoading ? (
            <div className="py-20 flex justify-center">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-brand-cyan"></div>
            </div>
          ) : auditData?.length === 0 ? (
            <div className="text-center py-20 text-slate-400">No activity logs recorded yet.</div>
          ) : (
            <table className="w-full text-left text-xs border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-white/10 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="pb-3">Timestamp</th>
                  <th className="pb-3">Actor (Admin)</th>
                  <th className="pb-3">Action Type</th>
                  <th className="pb-3">Target Details</th>
                  <th className="pb-3">Network Metadata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {auditData?.map((log) => (
                  <tr key={log._id} className="hover:bg-white/5 transition-colors">
                    <td className="py-3 text-slate-400 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3">
                      <div className="font-bold text-white">{log.actor?.fullName}</div>
                      <div className="text-[10px] text-slate-500">{log.actor?.email}</div>
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded-full font-bold uppercase ${
                        log.action.includes('TAKEDOWN') || log.action.includes('REJECT')
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="text-slate-300">
                        {log.targetType}: <span className="font-semibold text-white">{log.targetId}</span>
                      </div>
                      {log.details && (
                        <div className="text-[10px] text-slate-400 bg-black/40 border border-white/5 p-1.5 rounded-lg mt-1 font-mono max-w-xs overflow-hidden text-ellipsis">
                          {JSON.stringify(log.details)}
                        </div>
                      )}
                    </td>
                    <td className="py-3 text-slate-400">
                      <div>IP: {log.ipAddress || 'Internal'}</div>
                      <div className="truncate max-w-[150px] text-[10px]" title={log.userAgent}>
                        UA: {log.userAgent || 'None'}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* 4. ANNOUNCEMENTS BROADCASTER */}
      {activeTab === 'announcements' && (
        <div className="glass-card p-8 max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-6 text-brand-purple">
            <Megaphone className="h-6 w-6" />
            <h3 className="text-xl font-bold text-white m-0">Platform Announcements Broadcaster</h3>
          </div>

          <p className="text-slate-400 text-sm mb-6">
            Broadcast official platform updates, notifications, and alerts directly to users. You can choose to dispatch via real-time in-app notifications, email notifications (powered by Resend), or both.
          </p>

          <form onSubmit={handleBroadcast} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Target Audience
                </label>
                <select
                  value={announcementTarget}
                  onChange={(e) => {
                    setAnnouncementTarget(e.target.value);
                    setBroadcastStatus({ type: '', message: '' });
                  }}
                  className="w-full glass-input bg-[#0c0a1a] text-sm text-slate-100"
                >
                  <option value="everyone" className="bg-[#0c0a1a]">Everyone (All Users)</option>
                  <option value="founders" className="bg-[#0c0a1a]">Founders Only</option>
                  <option value="investors" className="bg-[#0c0a1a]">Investors Only</option>
                  <option value="cofounders" className="bg-[#0c0a1a]">Co-founders Only</option>
                  <option value="specific" className="bg-[#0c0a1a]">Specific User IDs</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Delivery Channel
                </label>
                <select
                  value={deliveryMethod}
                  onChange={(e) => setDeliveryMethod(e.target.value)}
                  className="w-full glass-input bg-[#0c0a1a] text-sm text-slate-100"
                >
                  <option value="both" className="bg-[#0c0a1a]">Both (In-App & Email)</option>
                  <option value="in-app" className="bg-[#0c0a1a]">In-App Notification Center Only</option>
                  <option value="email" className="bg-[#0c0a1a]">Email Notification Only</option>
                </select>
              </div>
            </div>

            {announcementTarget === 'specific' && (
              <div className="transition-all duration-300">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Target User IDs (Comma Separated)
                </label>
                <input
                  type="text"
                  value={announcementUserIds}
                  onChange={(e) => setAnnouncementUserIds(e.target.value)}
                  placeholder="e.g. 60d5ec4b8d7c4912b4a1a5b6, 60d5ec4b8d7c4912b4a1a5b7"
                  className="w-full glass-input bg-[#0c0a1a] text-sm text-slate-100"
                  required
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Provide valid MongoDB ObjectIDs separated by commas.
                </p>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Announcement Title
              </label>
              <input
                type="text"
                value={announcementTitle}
                onChange={(e) => setAnnouncementTitle(e.target.value)}
                placeholder="e.g. Major Platform Update: New Features Released!"
                className="w-full glass-input bg-[#0c0a1a] text-sm text-slate-100"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Announcement Message
              </label>
              <textarea
                value={announcementMessage}
                onChange={(e) => setAnnouncementMessage(e.target.value)}
                placeholder="Write your announcement details here..."
                rows={5}
                className="w-full glass-input bg-[#0c0a1a] text-sm resize-none text-slate-100"
                required
              ></textarea>
            </div>

            {broadcastStatus.message && (
              <div
                className={`p-4 rounded-xl text-xs flex items-center gap-2 border ${
                  broadcastStatus.type === 'success'
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                    : broadcastStatus.type === 'error'
                    ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                    : 'bg-brand-cyan/10 border-brand-cyan/20 text-brand-cyan'
                }`}
              >
                {broadcastStatus.type === 'success' ? (
                  <CheckCircle className="h-4 w-4 shrink-0" />
                ) : broadcastStatus.type === 'error' ? (
                  <ShieldAlert className="h-4 w-4 shrink-0" />
                ) : (
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-brand-cyan shrink-0"></div>
                )}
                <span>{broadcastStatus.message}</span>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={broadcastMutation.isPending}
                className="glass-btn-primary flex items-center gap-2 px-8 py-3 text-sm font-bold disabled:opacity-50 disabled:pointer-events-none"
              >
                <Megaphone className="h-4 w-4" />
                {broadcastMutation.isPending ? 'Broadcasting...' : 'Broadcast Announcement'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
