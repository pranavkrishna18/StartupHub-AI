import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { ArrowLeft, BrainCircuit, RefreshCw, AlertTriangle, ShieldCheck, Sparkles, PieChart, Users, Compass, HelpCircle } from 'lucide-react';
import API from '../services/api';

const fetchAIReport = async (startupId) => {
  const res = await API.get(`/ai/${startupId}`);
  return res.data.data.report;
};

const generateAIReportAPI = async ({ startupId, regenerate }) => {
  const res = await API.post(`/ai/${startupId}${regenerate ? '?regenerate=true' : ''}`);
  return res.data.data.report;
};

const AIReportView = () => {
  const { id: startupId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAuthenticated, user } = useSelector((state) => state.auth);

  const [activeTab, setActiveTab] = useState('overview');
  const [loadingStep, setLoadingStep] = useState('Initiating AI Validation Engine...');

  // Query cached report
  const { data: report, isLoading, isError, error } = useQuery({
    queryKey: ['aiReport', startupId],
    queryFn: () => fetchAIReport(startupId),
    retry: false
  });

  // Query startup profile details to display names
  const { data: startup } = useQuery({
    queryKey: ['startup', startupId],
    queryFn: async () => {
      const res = await API.get(`/startups/${startupId}`);
      return res.data.data.startup;
    }
  });

  // Mutation to trigger generation
  const generateMutation = useMutation({
    mutationFn: generateAIReportAPI,
    onMutate: () => {
      const steps = [
        'Connecting to Gemini API nodes...',
        'Extracting product focus categories...',
        'Evaluating target market pain points...',
        'Calculating validation & feasibility indices...',
        'Building SWOT SWOT analysis matrix...',
        'Formulating subscription & monetization streams...',
        'Analyzing competitors and mapping differentiators...',
        'Structuring 3-month launch roadmap milestones...',
        'Drafting investment deck slide details...',
        'Caching validation logs into MongoDB...'
      ];
      let stepIdx = 0;
      const interval = setInterval(() => {
        if (stepIdx < steps.length - 1) {
          stepIdx++;
          setLoadingStep(steps[stepIdx]);
        }
      }, 1500);

      return { interval };
    },
    onSuccess: (data, variables, context) => {
      clearInterval(context.interval);
      queryClient.setQueryData(['aiReport', startupId], data);
    },
    onError: (err, variables, context) => {
      if (context?.interval) clearInterval(context.interval);
    }
  });

  const handleGenerate = (regenerate = false) => {
    generateMutation.mutate({ startupId, regenerate });
  };

  const isOwner = startup?.founder?._id === user?._id || user?.role === 'admin';

  if (isLoading || generateMutation.isPending) {
    return (
      <div className="min-h-[75vh] flex flex-col items-center justify-center text-center px-6">
        <BrainCircuit className="h-16 w-16 text-brand-cyan animate-pulse mb-6" />
        <h2 className="text-2xl font-bold text-white mb-2">Analyzing Startup Concept</h2>
        <p className="text-slate-400 text-sm max-w-sm animate-pulse">{generateMutation.isPending ? loadingStep : 'Searching database for cached validation reports...'}</p>
        {generateMutation.isPending && (
          <div className="w-64 bg-white/5 h-1.5 rounded-full overflow-hidden mt-6 border border-white/5">
            <div className="bg-gradient-to-r from-brand-cyan to-brand-violet h-full animate-[loading_15s_ease-in-out_infinite] w-2/3"></div>
          </div>
        )}
      </div>
    );
  }

  // If no report cached and user is owner -> show prompt to generate
  const is404 = error?.response?.status === 404 || isError;
  if (is404 && !report) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-20 text-center">
        <div className="glass-card p-10 md:p-12 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-brand-cyan/5 rounded-full blur-2xl"></div>
          <BrainCircuit className="h-14 w-14 text-brand-cyan mx-auto mb-6" />
          <h2 className="text-3xl font-extrabold text-white mb-4">Validate Your Concept</h2>
          <p className="text-slate-400 max-w-md mx-auto mb-8 text-sm leading-relaxed">
            Validate market pain points, SWOT matrix items, pricing strategies, and milestones using StartupHub's rotating AI engines.
          </p>
          {isOwner ? (
            <button
              onClick={() => handleGenerate(false)}
              className="glass-btn-primary px-8 py-3.5 flex items-center justify-center gap-2 mx-auto"
            >
              <Sparkles className="h-4 w-4" />
              Generate Validation Report
            </button>
          ) : (
            <p className="text-rose-400 text-sm font-semibold">
              No validation report has been requested for this startup yet. Only the founder can generate validation reports.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-12 text-left">
      {/* BACK LINK */}
      <Link to={`/startup/${startupId}`} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-6 text-sm">
        <ArrowLeft className="h-4 w-4" />
        Back to Startup Profile
      </Link>

      {/* HEADER BLOCK */}
      <div className="glass-card p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8 relative">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 bg-gradient-to-tr from-brand-cyan/20 to-brand-purple/20 border border-white/10 flex items-center justify-center text-brand-cyan rounded-2xl shrink-0">
            <BrainCircuit className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white margin-0 m-0 leading-tight">AI Validation Insights</h1>
            <p className="text-slate-400 mt-1 text-sm">Analysis report for startup: <span className="text-white font-bold">{startup?.name}</span></p>
          </div>
        </div>

        {isOwner && (
          <button
            onClick={() => handleGenerate(true)}
            disabled={generateMutation.isPending}
            className="glass-btn-secondary py-2.5 px-4 text-xs flex items-center gap-1.5 shrink-0 hover:border-brand-cyan/35"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${generateMutation.isPending ? 'animate-spin' : ''}`} />
            Regenerate Analysis
          </button>
        )}
      </div>

      {/* TABS CONTAINER */}
      <div className="flex flex-wrap gap-2 mb-6 border-b border-white/10 pb-4">
        {[
          { id: 'overview', label: 'Overview & Index' },
          { id: 'swot', label: 'SWOT Grid' },
          { id: 'canvas', label: 'Business Canvas' },
          { id: 'competitors', label: 'Competitors' },
          { id: 'roadmap', label: 'Launch Roadmap' },
          { id: 'pitch', label: 'Pitch Deck Slide' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
              activeTab === tab.id
                ? 'bg-brand-violet/20 border-brand-violet text-brand-cyan shadow-[0_0_15px_rgba(124,58,237,0.1)]'
                : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB DETAILS VIEWPORTS */}
      <div className="space-y-6">
        {/* OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Score 1 */}
            <div className="glass-card p-6 flex flex-col justify-between text-center relative overflow-hidden min-h-[180px]">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Validation Index</h3>
              <div className="my-4">
                <span className="text-5xl font-black text-brand-cyan leading-none">{report.validationScore}%</span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 justify-center">
                <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>Score represents market viability & pain-point alignment</span>
              </div>
            </div>

            {/* Score 2 */}
            <div className="glass-card p-6 flex flex-col justify-between text-center relative overflow-hidden min-h-[180px]">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Feasibility Index</h3>
              <div className="my-4">
                <span className="text-5xl font-black text-brand-purple leading-none">{report.feasibilityScore}%</span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 justify-center">
                <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>Estimates product development effort & complex barriers</span>
              </div>
            </div>

            {/* AI Summary Recommendation */}
            <div className="glass-card p-6 flex flex-col justify-between md:col-span-1 border-brand-cyan/20">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">AI Summary Rating</h3>
              <p className="text-slate-300 text-xs leading-relaxed">
                Based on validator outputs, this concept shows a high viability layout. We recommend starting with a landing waitlist form (Phase 1 complete!) before building secondary logic channels.
              </p>
              <div className="mt-4 pt-4 border-t border-white/5 text-[10px] text-brand-cyan font-bold tracking-wider uppercase">
                Ready to find co-founders
              </div>
            </div>
          </div>
        )}

        {/* SWOT */}
        {activeTab === 'swot' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Strengths */}
            <div className="glass-card p-6 border-emerald-500/10 shadow-[0_0_20px_rgba(16,185,129,0.02)]">
              <h4 className="text-emerald-400 font-bold mb-4 flex items-center gap-2 text-sm uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                Strengths
              </h4>
              <ul className="space-y-2.5 text-slate-300 text-xs pl-4 list-disc">
                {report.swot?.strengths?.map((item, idx) => (
                  <li key={idx} className="leading-relaxed">{item}</li>
                ))}
              </ul>
            </div>

            {/* Weaknesses */}
            <div className="glass-card p-6 border-amber-500/10 shadow-[0_0_20px_rgba(245,158,11,0.02)]">
              <h4 className="text-amber-400 font-bold mb-4 flex items-center gap-2 text-sm uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                Weaknesses
              </h4>
              <ul className="space-y-2.5 text-slate-300 text-xs pl-4 list-disc">
                {report.swot?.weaknesses?.map((item, idx) => (
                  <li key={idx} className="leading-relaxed">{item}</li>
                ))}
              </ul>
            </div>

            {/* Opportunities */}
            <div className="glass-card p-6 border-brand-cyan/10 shadow-[0_0_20px_rgba(6,182,212,0.02)]">
              <h4 className="text-brand-cyan font-bold mb-4 flex items-center gap-2 text-sm uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-brand-cyan"></span>
                Opportunities
              </h4>
              <ul className="space-y-2.5 text-slate-300 text-xs pl-4 list-disc">
                {report.swot?.opportunities?.map((item, idx) => (
                  <li key={idx} className="leading-relaxed">{item}</li>
                ))}
              </ul>
            </div>

            {/* Threats */}
            <div className="glass-card p-6 border-rose-500/10 shadow-[0_0_20px_rgba(239,68,68,0.02)]">
              <h4 className="text-rose-400 font-bold mb-4 flex items-center gap-2 text-sm uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                Threats
              </h4>
              <ul className="space-y-2.5 text-slate-300 text-xs pl-4 list-disc">
                {report.swot?.threats?.map((item, idx) => (
                  <li key={idx} className="leading-relaxed">{item}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* BUSINESS MODEL */}
        {activeTab === 'canvas' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Streams */}
              <div className="glass-card p-6">
                <h4 className="text-white font-bold mb-4 text-sm uppercase tracking-wider flex items-center gap-2">
                  <PieChart className="h-4.5 w-4.5 text-brand-cyan" />
                  Revenue Streams
                </h4>
                <ul className="space-y-2.5 text-slate-300 text-xs pl-4 list-disc">
                  {report.businessModel?.revenueStreams?.map((item, idx) => (
                    <li key={idx} className="leading-relaxed">{item}</li>
                  ))}
                </ul>
              </div>

              {/* Strategy */}
              <div className="glass-card p-6">
                <h4 className="text-white font-bold mb-4 text-sm uppercase tracking-wider flex items-center gap-2">
                  <Compass className="h-4.5 w-4.5 text-brand-purple" />
                  Growth Strategy
                </h4>
                <ul className="space-y-2.5 text-slate-300 text-xs pl-4 list-disc">
                  {report.businessModel?.growthStrategy?.map((item, idx) => (
                    <li key={idx} className="leading-relaxed">{item}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Pricing Model */}
            <div className="glass-card p-6">
              <h4 className="text-white font-bold mb-3 text-sm uppercase tracking-wider flex items-center gap-2">
                <Users className="h-4.5 w-4.5 text-amber-400" />
                Recommended Pricing Strategy
              </h4>
              <p className="text-slate-300 text-xs leading-relaxed whitespace-pre-line">{report.businessModel?.pricingModel}</p>
            </div>
          </div>
        )}

        {/* COMPETITORS */}
        {activeTab === 'competitors' && (
          <div className="glass-card p-6 overflow-x-auto">
            <h3 className="text-lg font-bold text-white mb-6">Competitive Landscape</h3>
            <table className="w-full text-left text-xs border-collapse min-w-[600px]">
              <thead>
                <tr className="border-b border-white/10 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="pb-3">Competitor Name</th>
                  <th className="pb-3">Comparison Outline</th>
                  <th className="pb-3 text-right">Differentiation Opportunity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-300">
                {report.competitors?.map((comp, idx) => (
                  <tr key={idx} className="hover:bg-white/5 transition-colors">
                    <td className="py-4 font-bold text-white">{comp.name}</td>
                    <td className="py-4 pr-4 leading-relaxed">{comp.comparison}</td>
                    <td className="py-4 text-right leading-relaxed text-brand-cyan">{comp.differentiation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ROADMAP */}
        {activeTab === 'roadmap' && (
          <div className="glass-card p-6 md:p-8 space-y-8 relative">
            {/* Timeline vertical bar */}
            <div className="absolute left-8 top-12 bottom-12 w-0.5 bg-white/10"></div>

            {report.roadmap?.map((phase, idx) => (
              <div key={idx} className="flex gap-6 relative">
                {/* Timeline node */}
                <div className="h-4 w-4 bg-brand-cyan border-4 border-darkBg-800 rounded-full shrink-0 z-10 mt-1 select-none"></div>
                <div className="space-y-2">
                  <h4 className="text-base font-bold text-white uppercase tracking-wider">{phase.month}</h4>
                  <ul className="space-y-2 text-slate-300 text-xs pl-4 list-disc">
                    {phase.milestones?.map((milestone, mIdx) => (
                      <li key={mIdx} className="leading-relaxed">{milestone}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* PITCH DECK */}
        {activeTab === 'pitch' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { title: '1. Problem Statement', content: report.pitchDeck?.problem },
              { title: '2. Solution Definition', content: report.pitchDeck?.solution },
              { title: '3. Market Potential (TAM/SAM)', content: report.pitchDeck?.market },
              { title: '4. Monetization Mechanics', content: report.pitchDeck?.revenue },
              { title: '5. Core Roles Needed', content: report.pitchDeck?.team },
              { title: '6. Long-Term Vision', content: report.pitchDeck?.vision }
            ].map((slide, idx) => (
              <div key={idx} className="glass-card p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-white/5 rounded-full blur-xl"></div>
                <h4 className="text-white font-bold mb-3 text-xs uppercase tracking-wider text-brand-cyan">{slide.title}</h4>
                <p className="text-slate-300 text-xs leading-relaxed whitespace-pre-line">{slide.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AIReportView;
