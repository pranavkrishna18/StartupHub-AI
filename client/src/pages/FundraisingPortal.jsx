import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { Landmark, FileText, Lock, Globe, CheckCircle2, AlertTriangle, Compass, ShieldAlert, Cpu, Sparkles, Send, Download, RefreshCw } from 'lucide-react';
import API from '../services/api';

const fetchFundraisingProfile = async (startupId) => {
  const res = await API.get(`/fundraising/${startupId}`);
  return res.data.data;
};

const FundraisingPortal = () => {
  const { startupId } = useParams();
  const queryClient = useQueryClient();
  const { user } = useSelector((state) => state.auth);

  // NDA Sign States
  const [investorName, setInvestorName] = useState('');
  const [signatureText, setSignatureText] = useState('');
  const [ndaError, setNdaError] = useState('');

  // AI Term Sheet States
  const [investAmount, setInvestAmount] = useState(100000);
  const [equityWanted, setEquityWanted] = useState(5);
  const [preValuation, setPreValuation] = useState(2000000);
  const [termSheetError, setTermSheetError] = useState('');
  const [termSheetDraft, setTermSheetDraft] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['fundraisingProfile', startupId],
    queryFn: () => fetchFundraisingProfile(startupId)
  });

  // VDR documents query (Only triggered if profile is loaded)
  const { data: vdrData, isLoading: vdrLoading } = useQuery({
    queryKey: ['vdrDocuments', startupId],
    queryFn: async () => {
      const res = await API.get(`/fundraising/${startupId}/vdr`);
      return res.data.data;
    },
    enabled: !!data?.profile,
    retry: false // Avoid long polling failures if VDR is compliance locked
  });

  const signNdaMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await API.post(`/fundraising/${startupId}/nda/sign`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fundraisingProfile', startupId] });
      queryClient.invalidateQueries({ queryKey: ['vdrDocuments', startupId] });
    },
    onError: (err) => {
      setNdaError(err.response?.data?.message || 'Failed to sign NDA');
    }
  });

  const generateSheetMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await API.post(`/fundraising/${startupId}/term-sheet/generate`, payload);
      return res.data.data.termSheet;
    },
    onSuccess: (data) => {
      setTermSheetDraft(data.termsText);
      queryClient.invalidateQueries({ queryKey: ['fundraisingProfile', startupId] });
    },
    onError: (err) => {
      setTermSheetError(err.response?.data?.message || 'Failed to generate term sheet draft');
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
        Failed to load fundraising details. This startup may not have initialized their raising profile yet.<br />
        <Link to="/" className="text-brand-cyan hover:underline mt-4 inline-block">Back to Feed</Link>
      </div>
    );
  }

  const { profile, termSheets } = data;
  const activeNda = profile.ndas?.find(n => n.investor?.toString() === user?._id);
  const isVdrLocked = !vdrData?.vdrFiles;

  const handleNdaSubmit = (e) => {
    e.preventDefault();
    setNdaError('');
    if (!investorName.trim() || !signatureText.trim()) {
      setNdaError('Please complete all sign off fields');
      return;
    }
    signNdaMutation.mutate({ investorName, signatureText });
  };

  const handleGenerateTermSheet = (e) => {
    e.preventDefault();
    setTermSheetError('');
    setTermSheetDraft('');
    generateSheetMutation.mutate({
      investmentAmount: investAmount,
      equityOffered: equityWanted,
      valuation: preValuation
    });
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-12 text-left">
      {/* HEADER */}
      <div className="border-b border-white/10 pb-6 mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
            Funding Opportunity
          </span>
          <h1 className="text-3xl font-extrabold text-white tracking-tight mt-2 flex items-center gap-2 m-0">
            <Landmark className="h-8 w-8 text-emerald-400" />
            Raise Campaign Profile
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* INVESTMENT METRICS SHIFT */}
        <div className="lg:col-span-1 space-y-6">
          <div className="glass-card p-6 text-center space-y-4">
            <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider block">Target Campaign Raise</span>
            <h2 className="text-3xl font-black text-white m-0">${profile.targetRaise.toLocaleString()}</h2>
            <div className="text-xs text-slate-400">For <strong>{profile.equityOffered}%</strong> equity allocation</div>

            {profile.pitchDeckUrl ? (
              <a
                href={profile.pitchDeckUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full mt-4 py-2.5 bg-emerald-500 hover:bg-emerald-500/85 text-[#0c0a1a] font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 hover:scale-[1.02] transition-all"
              >
                <FileText className="h-4 w-4" />
                View Pitch Deck PDF
              </a>
            ) : (
              <div className="text-[10px] text-slate-500 italic py-2">No pitch deck uploaded yet</div>
            )}
          </div>

          {/* AI TERM SHEET BUILDER */}
          <div className="glass-card p-6 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5 mb-2">
              <Sparkles className="h-4 w-4 text-emerald-400" />
              AI Term Sheet Draft
            </h3>

            {termSheetError && (
              <div className="p-3 bg-rose-950/30 border border-rose-500/30 rounded-xl text-rose-300 text-xs">
                {termSheetError}
              </div>
            )}

            <form onSubmit={handleGenerateTermSheet} className="space-y-4 text-xs">
              <div className="flex flex-col gap-1.5">
                <label className="font-bold uppercase tracking-wider text-slate-400">Proposed Investment ($)</label>
                <input
                  type="number"
                  value={investAmount}
                  onChange={(e) => setInvestAmount(Number(e.target.value))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-bold uppercase tracking-wider text-slate-400">Equity Share Wanted (%)</label>
                <input
                  type="number"
                  value={equityWanted}
                  onChange={(e) => setEquityWanted(Number(e.target.value))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-bold uppercase tracking-wider text-slate-400">Pre-Money Valuation ($)</label>
                <input
                  type="number"
                  value={preValuation}
                  onChange={(e) => setPreValuation(Number(e.target.value))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={generateSheetMutation.isPending}
                className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-500/85 disabled:bg-slate-700 text-[#0c0a1a] font-bold rounded-xl flex items-center justify-center gap-1 hover:scale-[1.02]"
              >
                {generateSheetMutation.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Generating terms...
                  </>
                ) : (
                  <>
                    <Cpu className="h-4 w-4" />
                    Generate Term Sheet
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* COMPLIANCE & VIRTUAL DATA ROOM */}
        <div className="lg:col-span-2 space-y-6">
          {/* TERM SHEET CONTRACT RENDER OUTPUT */}
          {termSheetDraft && (
            <div className="glass-card p-6 border border-emerald-500/25 bg-emerald-500/[0.01]">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-1.5">
                <FileText className="h-4.5 w-4.5 text-emerald-400" />
                AI Generated VC Proposal
              </h3>
              <div className="p-4 bg-black/40 rounded-2xl border border-white/5 text-xs font-mono text-slate-300 overflow-y-auto max-h-[300px] whitespace-pre-wrap leading-relaxed">
                {termSheetDraft}
              </div>
              <div className="text-[10px] text-emerald-400 font-semibold mt-3 flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4" />
                AI Draft submitted successfully. The founder has been notified.
              </div>
            </div>
          )}

          {/* VDR FILE SHELF */}
          <div className="glass-card p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Lock className="h-5 w-5 text-brand-cyan" />
              Virtual Data Room (VDR) compliance vault
            </h3>

            {isVdrLocked ? (
              /* NDA REQUIRED SPLIT SCREEN */
              <div className="border border-white/5 bg-white/[0.01] rounded-3xl p-6 text-center space-y-6">
                <div className="inline-flex p-4 bg-rose-500/5 border border-rose-500/10 text-rose-400 rounded-full">
                  <ShieldAlert className="h-8 w-8" />
                </div>
                <div>
                  <h4 className="font-extrabold text-white text-base">NDA Sign-off Required</h4>
                  <p className="text-slate-400 text-xs mt-2 max-w-sm mx-auto leading-relaxed">
                    You must digital sign the mutual Non-Disclosure Agreement (NDA) to browse incorporated files, financials sheets, and asset audits.
                  </p>
                </div>

                {ndaError && (
                  <div className="p-3 bg-rose-950/30 border border-rose-500/30 rounded-xl text-rose-300 text-xs">
                    {ndaError}
                  </div>
                )}

                <form onSubmit={handleNdaSubmit} className="max-w-md mx-auto space-y-4 text-xs text-left">
                  <div className="flex flex-col gap-1.5">
                    <label className="font-bold uppercase tracking-wider text-slate-500">Legal Full Name</label>
                    <input
                      type="text"
                      placeholder="e.g. John Doe"
                      value={investorName}
                      onChange={(e) => setInvestorName(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="font-bold uppercase tracking-wider text-slate-500">Digital Signature (Type 'I AGREE' or your name)</label>
                    <input
                      type="text"
                      placeholder="Type signature"
                      value={signatureText}
                      onChange={(e) => setSignatureText(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none font-mono"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={signNdaMutation.isPending}
                    className="w-full py-3 bg-brand-cyan hover:bg-brand-cyan/85 text-[#0c0a1a] font-extrabold rounded-xl"
                  >
                    Accept NDA & Request VDR Access
                  </button>
                </form>
              </div>
            ) : (
              /* FILES UNLOCKED SCREEN */
              <div className="space-y-4">
                <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl text-emerald-400 text-xs flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  NDA Sign-off active. Compliance check unlocked.
                </div>

                <div className="space-y-3">
                  {vdrData.vdrFiles.length === 0 ? (
                    <div className="p-10 border border-dashed border-white/10 text-center text-slate-500 text-xs">
                      No files uploaded in this Virtual Data Room yet by the founder.
                    </div>
                  ) : (
                    vdrData.vdrFiles.map((file, idx) => (
                      <div key={idx} className="p-4 border border-white/5 bg-white/5 rounded-2xl flex justify-between items-center gap-4">
                        <div className="text-left">
                          <span className="text-[8px] bg-brand-cyan/10 border border-brand-cyan/20 text-brand-cyan px-2 py-0.5 rounded uppercase font-bold">
                            {file.folderName}
                          </span>
                          <h4 className="font-bold text-white text-xs mt-2">{file.fileName}</h4>
                          <span className="text-[9px] text-slate-500 block mt-1">Uploaded: {new Date(file.uploadedAt).toLocaleDateString()}</span>
                        </div>
                        <a
                          href={file.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 bg-white/5 hover:bg-white/10 rounded-full border border-white/10 text-slate-400 hover:text-white transition-colors"
                          title="Download File"
                        >
                          <Download className="h-4 w-4" />
                        </a>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FundraisingPortal;
