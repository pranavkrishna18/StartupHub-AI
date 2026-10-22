import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Landmark, FileText, Plus, Check, X, ShieldAlert, PieChart as PieIcon, UploadCloud, CheckCircle2, RefreshCw } from 'lucide-react';
import API from '../services/api';

const fetchFounderCampaigns = async () => {
  const res = await API.get('/dashboard/founder');
  return res.data.data;
};

const FundraisingDashboard = () => {
  const queryClient = useQueryClient();
  const [selectedStartupId, setSelectedStartupId] = useState('');

  // Fundraising Configuration States
  const [targetRaise, setTargetRaise] = useState(500000);
  const [equityOffered, setEquityOffered] = useState(10);
  const [deckUrl, setDeckUrl] = useState('');

  // Cap Table Input States
  const [capName, setCapName] = useState('');
  const [capShares, setCapShares] = useState(1000000);
  const [capOwnership, setCapOwnership] = useState(10);
  const [capRole, setCapRole] = useState('Investor');

  // VDR Input States
  const [vdrFolder, setVdrFolder] = useState('Financials');
  const [vdrFileName, setVdrFileName] = useState('');
  const [vdrFileUrl, setVdrFileUrl] = useState('');

  const { data: founderStats, isLoading, error } = useQuery({
    queryKey: ['founderStats'],
    queryFn: fetchFounderCampaigns
  });

  const activeStartupId = selectedStartupId || founderStats?.startups[0]?._id;

  const { data: fundProfile, isLoading: profileLoading } = useQuery({
    queryKey: ['fundraisingProfile', activeStartupId],
    queryFn: async () => {
      const res = await API.get(`/fundraising/${activeStartupId}`);
      return res.data.data;
    },
    enabled: !!activeStartupId
  });

  // MUTATIONS
  const saveConfigMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await API.patch(`/fundraising/${activeStartupId}`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fundraisingProfile', activeStartupId] });
    }
  });

  const respondTermSheetMutation = useMutation({
    mutationFn: async ({ sheetId, status }) => {
      const res = await API.patch(`/fundraising/term-sheet/${sheetId}/respond`, { status });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fundraisingProfile', activeStartupId] });
    }
  });

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-cyan"></div>
      </div>
    );
  }

  if (error || founderStats?.startups?.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-20 text-center text-slate-400 font-semibold glass-card">
        Only founders with active ideas can manage fundraising dashboards.<br />
        <Link to="/" className="text-brand-cyan hover:underline mt-4 inline-block">Back to Feed</Link>
      </div>
    );
  }

  const { startups } = founderStats;
  const currentStartupId = activeStartupId || startups[0]?._id;

  const handleSaveConfig = (e) => {
    e.preventDefault();
    if (!fundProfile?.profile) return;
    saveConfigMutation.mutate({
      targetRaise,
      equityOffered,
      pitchDeckUrl: deckUrl
    });
  };

  const handleAddCapHolder = (e) => {
    e.preventDefault();
    if (!fundProfile?.profile) return;

    const newCapTable = [...fundProfile.profile.capTable, {
      holderName: capName,
      shares: capShares,
      ownership: capOwnership,
      role: capRole
    }];

    saveConfigMutation.mutate({ capTable: newCapTable });
    setCapName('');
    setCapShares(1000000);
    setCapOwnership(10);
  };

  const handleAddVdrFile = (e) => {
    e.preventDefault();
    if (!fundProfile?.profile || !vdrFileName || !vdrFileUrl) return;

    const newVdrFiles = [...fundProfile.profile.vdrFiles, {
      folderName: vdrFolder,
      fileName: vdrFileName,
      fileUrl: vdrFileUrl,
      uploadedAt: new Date()
    }];

    saveConfigMutation.mutate({ vdrFiles: newVdrFiles });
    setVdrFileName('');
    setVdrFileUrl('');
  };

  const capTableData = fundProfile?.profile?.capTable || [];
  const incomingOffers = fundProfile?.termSheets || [];

  // Recharts color palette
  const COLORS = ['#00f2fe', '#7c3aed', '#10b981', '#f59e0b', '#ec4899', '#3b82f6'];

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 text-left">
      {/* HEADER */}
      <div className="border-b border-white/10 pb-6 mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-2 m-0">
            <Landmark className="h-8 w-8 text-brand-cyan" />
            Fundraising Dashboard
          </h1>
          <p className="text-slate-400 mt-2">Manage cap tables, upload legal data rooms, and review incoming investor term sheets</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={currentStartupId}
            onChange={(e) => {
              setSelectedStartupId(e.target.value);
              // reset config fields to profile once loaded
            }}
            className="bg-[#0c0a1a] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-brand-cyan font-bold w-48"
          >
            {startups.map((s) => (
              <option key={s._id} value={s._id}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>

      {profileLoading ? (
        <div className="min-h-[50vh] flex items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-brand-cyan"></div>
        </div>
      ) : !fundProfile?.profile ? (
        <div className="glass-card p-12 text-center text-slate-500">
          Fundraising not initialized for this startup.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* LEFT: CONFIG & PIE CHART */}
          <div className="lg:col-span-1 space-y-6">
            {/* CONFIG CAMPAIGN */}
            <div className="glass-card p-6">
              <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-wider">Raise Target Config</h3>
              <form onSubmit={handleSaveConfig} className="space-y-4 text-xs">
                <div className="flex flex-col gap-1.5">
                  <label className="font-bold uppercase text-slate-400">Target Raise Amount ($)</label>
                  <input
                    type="number"
                    defaultValue={fundProfile.profile.targetRaise}
                    onChange={(e) => setTargetRaise(Number(e.target.value))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-bold uppercase text-slate-400">Equity Offered Allocation (%)</label>
                  <input
                    type="number"
                    defaultValue={fundProfile.profile.equityOffered}
                    onChange={(e) => setEquityOffered(Number(e.target.value))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-bold uppercase text-slate-400">Pitch Deck PDF File Link</label>
                  <input
                    type="text"
                    defaultValue={fundProfile.profile.pitchDeckUrl}
                    onChange={(e) => setDeckUrl(e.target.value)}
                    placeholder="https://drive.google.com/..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={saveConfigMutation.isPending}
                  className="w-full py-2.5 bg-brand-cyan hover:bg-brand-cyan/85 disabled:bg-slate-700 text-[#0c0a1a] font-bold rounded-xl"
                >
                  Save Raising Profile
                </button>
              </form>
            </div>

            {/* CAP TABLE VISUALIZER PIE CHART */}
            <div className="glass-card p-6 flex flex-col justify-between">
              <h3 className="text-sm font-bold text-white mb-2 uppercase tracking-wider flex items-center gap-1">
                <PieIcon className="h-4.5 w-4.5 text-brand-cyan" />
                Equity Distribution Chart
              </h3>
              <div className="h-56 w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={capTableData}
                      dataKey="ownership"
                      nameKey="holderName"
                      cx="50%"
                      cy="50%"
                      outerRadius={65}
                      innerRadius={40}
                    >
                      {capTableData.map((entry, idx) => (
                        <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0c0a1a',
                        borderColor: '#ffffff1a',
                        borderRadius: '12px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-1 mt-4 text-[10px]">
                {capTableData.map((holder, idx) => (
                  <div key={idx} className="flex justify-between items-center text-slate-400">
                    <span className="flex items-center gap-1.5 truncate max-w-[150px]">
                      <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                      {holder.holderName}
                    </span>
                    <span className="font-bold text-slate-300">{holder.ownership}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* MIDDLE/RIGHT: CAP TABLE EDITOR, VDR FILE MANAGER, INCOMING PROPOSALS */}
          <div className="lg:col-span-2 space-y-6">
            {/* CAP TABLE EDITOR */}
            <div className="glass-card p-6">
              <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-wider">Modify Shareholders Cap Table</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Add shareholder form */}
                <form onSubmit={handleAddCapHolder} className="space-y-4 text-xs">
                  <div className="flex flex-col gap-1">
                    <label className="font-bold uppercase text-slate-500">Shareholder Legal Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Andreessen Horowitz"
                      value={capName}
                      onChange={(e) => setCapName(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="font-bold uppercase text-slate-500">Shares Quantity</label>
                      <input
                        type="number"
                        value={capShares}
                        onChange={(e) => setCapShares(Number(e.target.value))}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs text-white"
                        required
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="font-bold uppercase text-slate-500">Ownership Share (%)</label>
                      <input
                        type="number"
                        value={capOwnership}
                        onChange={(e) => setCapOwnership(Number(e.target.value))}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs text-white"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2 bg-brand-cyan hover:bg-brand-cyan/85 text-[#0c0a1a] font-bold rounded-xl flex items-center justify-center gap-1.5"
                  >
                    <Plus className="h-4 w-4" />
                    Add Shareholder
                  </button>
                </form>

                {/* Table listing */}
                <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1 text-xs">
                  {capTableData.map((holder, idx) => (
                    <div key={idx} className="p-3 bg-white/5 border border-white/5 rounded-xl flex justify-between items-center">
                      <div>
                        <div className="font-bold text-white">{holder.holderName}</div>
                        <div className="text-[10px] text-slate-500 mt-1">{holder.role} &bull; {holder.shares.toLocaleString()} shares</div>
                      </div>
                      <span className="font-black text-brand-cyan text-sm">{holder.ownership}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* VIRTUAL DATA ROOM FILE COMPONENT */}
            <div className="glass-card p-6">
              <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-wider flex items-center gap-1.5">
                <UploadCloud className="h-4.5 w-4.5 text-brand-cyan" />
                VDR compliance Vault Manager
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <form onSubmit={handleAddVdrFile} className="space-y-4 text-xs">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="font-bold uppercase text-slate-500">Compliance Folder</label>
                      <select
                        value={vdrFolder}
                        onChange={(e) => setVdrFolder(e.target.value)}
                        className="bg-[#0c0a1a] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                      >
                        <option value="Financials">Financials & Audits</option>
                        <option value="Legal">Legal & Incorporation</option>
                        <option value="IP">IP & Patents</option>
                        <option value="Team">Team & Employment</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="font-bold uppercase text-slate-500">Document Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Q1 Income Spreadsheets"
                        value={vdrFileName}
                        onChange={(e) => setVdrFileName(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="font-bold uppercase text-slate-500">Document Access URL</label>
                    <input
                      type="text"
                      placeholder="e.g. https://drive.google.com/..."
                      value={vdrFileUrl}
                      onChange={(e) => setVdrFileUrl(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs text-white focus:outline-none"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2 bg-brand-cyan/15 hover:bg-brand-cyan/20 border border-brand-cyan/25 text-brand-cyan font-bold rounded-xl flex items-center justify-center gap-1"
                  >
                    <Plus className="h-4 w-4" />
                    Upload File to VDR
                  </button>
                </form>

                {/* VDR files list */}
                <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1 text-xs">
                  {fundProfile.profile.vdrFiles.map((file, idx) => (
                    <div key={idx} className="p-3 bg-white/5 border border-white/5 rounded-xl flex justify-between items-center">
                      <div>
                        <div className="font-bold text-white truncate max-w-[200px]">{file.fileName}</div>
                        <span className="text-[9px] uppercase tracking-wider text-slate-500 block mt-1">
                          {file.folderName}
                        </span>
                      </div>
                      <a
                        href={file.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] text-brand-cyan hover:underline"
                      >
                        Visit Link
                      </a>
                    </div>
                  ))}
                  {fundProfile.profile.vdrFiles.length === 0 && (
                    <div className="text-center py-10 text-slate-500 text-xs italic">
                      No files uploaded.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* INCOMING TERM SHEETS OFFERS PIPELINE */}
            <div className="glass-card p-6">
              <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-wider">Incoming Term Sheets Offers Pipeline</h3>
              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                {incomingOffers.length === 0 ? (
                  <div className="text-center py-10 text-slate-500 text-xs italic">
                    No term sheets proposals received yet. Promote your raise campaign!
                  </div>
                ) : (
                  incomingOffers.map((sheet) => {
                    const statusColor = sheet.status === 'accepted'
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                      : sheet.status === 'rejected'
                      ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                      : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400';

                    return (
                      <div key={sheet._id} className="p-4 bg-[#0d0a1b]/40 border border-white/5 rounded-2xl space-y-4 text-left">
                        <div className="flex justify-between items-start flex-wrap gap-2">
                          <div>
                            <div className="font-bold text-white text-xs">Investor Proposal ({sheet.investor?.email})</div>
                            <span className="text-[10px] text-slate-500 block mt-1">
                              Amount: <strong>${sheet.investmentAmount.toLocaleString()}</strong> for <strong>{sheet.equityOffered}%</strong> equity
                            </span>
                            <span className="text-[10px] text-slate-500 block mt-0.5">
                              Pre-money Valuation: <strong>${sheet.valuation.toLocaleString()}</strong>
                            </span>
                          </div>

                          <span className={`text-[8px] uppercase tracking-wider px-2 py-0.5 rounded-full font-black border ${statusColor}`}>
                            {sheet.status}
                          </span>
                        </div>

                        {/* Collapsible terms outline block */}
                        <details className="text-[10px] text-slate-400">
                          <summary className="cursor-pointer font-bold hover:text-white select-none">Show generated VC terms text...</summary>
                          <div className="p-3 bg-black/45 border border-white/5 rounded-xl font-mono mt-2 overflow-y-auto max-h-[150px] whitespace-pre-wrap">
                            {sheet.termsText}
                          </div>
                        </details>

                        {sheet.status === 'submitted' && (
                          <div className="flex justify-end gap-2 pt-2">
                            <button
                              onClick={() => respondTermSheetMutation.mutate({ sheetId: sheet._id, status: 'rejected' })}
                              disabled={respondTermSheetMutation.isPending}
                              className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold text-[10px] px-3.5 py-1.5 rounded-xl border border-rose-500/20 flex items-center gap-1 transition-all"
                            >
                              <X className="h-3.5 w-3.5" />
                              Decline
                            </button>
                            <button
                              onClick={() => respondTermSheetMutation.mutate({ sheetId: sheet._id, status: 'accepted' })}
                              disabled={respondTermSheetMutation.isPending}
                              className="bg-emerald-500 hover:bg-emerald-500/90 text-[#0c0a1a] font-bold text-[10px] px-4 py-1.5 rounded-xl flex items-center gap-1 shadow-[0_0_10px_rgba(16,185,129,0.1)] transition-all"
                            >
                              <Check className="h-3.5 w-3.5" />
                              Accept & Sign
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FundraisingDashboard;
