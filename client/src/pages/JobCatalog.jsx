import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Search, MapPin, Briefcase, DollarSign, Calendar, Info, CheckCircle2, ChevronRight } from 'lucide-react';
import API from '../services/api';

const fetchJobs = async ({ queryKey }) => {
  const [_, { search, workMode, title, skills }] = queryKey;
  const params = {};
  if (search) params.search = search;
  if (workMode) params.workMode = workMode;
  if (title) params.title = title;
  if (skills) params.skills = skills;

  const res = await API.get('/jobs', { params });
  return res.data.data.jobs;
};

const JobCatalog = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [workMode, setWorkMode] = useState('');
  const [title, setTitle] = useState('');
  const [skills, setSkills] = useState('');

  // Selected job for applying
  const [selectedJob, setSelectedJob] = useState(null);
  const [appMessage, setAppMessage] = useState('');
  const [resumeText, setResumeText] = useState('');
  const [resumeFile, setResumeFile] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const { data: jobs, isLoading, error, refetch } = useQuery({
    queryKey: ['jobsList', { search, workMode, title, skills }],
    queryFn: fetchJobs
  });

  // Query to pre-populate resume if candidate already has one analyzed
  const { data: profileReport } = useQuery({
    queryKey: ['myProfileResume'],
    queryFn: async () => {
      const res = await API.get('/resumes/report');
      return res.data.data.resumeAnalysis;
    },
    enabled: !!selectedJob
  });

  // Query to fetch candidate's existing applications
  const { data: myApplications } = useQuery({
    queryKey: ['myApplications'],
    queryFn: async () => {
      try {
        const res = await API.get('/applications/me');
        return res.data.data.applications;
      } catch (err) {
        return [];
      }
    }
  });

  const hasAlreadyApplied = (jobId) => {
    return myApplications?.some(app => app.jobOpening?._id === jobId);
  };

  const applyMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await API.post('/applications/apply', payload);
      return res.data;
    },
    onSuccess: () => {
      setSubmitSuccess(true);
      setAppMessage('');
      setResumeText('');
      setResumeFile('');
      queryClient.invalidateQueries({ queryKey: ['myApplications'] });
      setTimeout(() => {
        setSelectedJob(null);
        setSubmitSuccess(false);
      }, 2000);
    },
    onError: (err) => {
      setSubmitError(err.response?.data?.message || 'Failed to submit application');
    }
  });

  const convertToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  };

  const extractPdfText = async (arrayBuffer) => {
    try {
      const pdfjsLib = window.pdfjsLib;
      if (!pdfjsLib) {
        throw new Error('PDF parsing library is not loaded. Please refresh the page.');
      }
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item) => item.str).join(' ');
        fullText += pageText + '\n';
      }
      return fullText;
    } catch (err) {
      console.error('PDF text extraction error:', err);
      throw new Error('Failed to parse text from PDF. Ensure file is not password-protected.');
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    refetch();
  };

  const handleApplySubmit = (e) => {
    e.preventDefault();
    setSubmitError('');
    if (!appMessage.trim()) {
      setSubmitError('Please provide an application message');
      return;
    }
    applyMutation.mutate({
      jobId: selectedJob._id,
      message: appMessage,
      resumeText: resumeText,
      resumeFile: resumeFile
    });
  };


  return (
    <div className="max-w-7xl mx-auto px-6 py-12 text-left">
      {/* HEADER */}
      <div className="border-b border-white/10 pb-6 mb-8">
        <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-2 m-0">
          <Briefcase className="h-8 w-8 text-brand-cyan" />
          Startup Opportunities
        </h1>
        <p className="text-slate-400 mt-2">Browse active co-founding openings and technical roles in validated teams</p>
      </div>

      {/* FILTER PANEL */}
      <form onSubmit={handleSearchSubmit} className="glass-card p-6 mb-8 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Search Keywords</label>
          <div className="relative">
            <input
              type="text"
              placeholder="Search title, startup name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-brand-cyan"
            />
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Work Mode</label>
          <select
            value={workMode}
            onChange={(e) => setWorkMode(e.target.value)}
            className="w-full bg-[#0c0a1a] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-brand-cyan font-semibold"
          >
            <option value="">All Modes</option>
            <option value="remote">Remote</option>
            <option value="hybrid">Hybrid</option>
            <option value="onsite">On-site</option>
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Role Title</label>
          <input
            type="text"
            placeholder="e.g. AI Engineer"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-brand-cyan"
          />
        </div>

        <button
          type="submit"
          className="w-full py-2.5 bg-brand-cyan hover:bg-brand-cyan/85 text-[#0c0a1a] font-extrabold text-xs rounded-xl shadow-[0_0_15px_rgba(0,242,254,0.15)] transition-all hover:scale-[1.01]"
        >
          Apply Filters
        </button>
      </form>

      {/* JOBS LISTING */}
      {isLoading ? (
        <div className="py-20 text-center flex flex-col items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-brand-cyan mb-4"></div>
          <p className="text-slate-400 text-xs font-semibold">Loading active openings...</p>
        </div>
      ) : !jobs || jobs.length === 0 ? (
        <div className="glass-card p-12 text-center text-slate-400 font-semibold">
          No job openings matching filters found. Adjust your keywords!
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {jobs.map((job) => (
            <div key={job._id} className="glass-card p-6 flex flex-col justify-between hover:border-white/10 transition-all bg-white/5">
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-extrabold text-white text-base leading-snug m-0">{job.title}</h3>
                    <p className="text-brand-cyan text-xs font-bold tracking-tight mt-1">{job.startup?.name}</p>
                  </div>
                  <span className="text-[9px] uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded-full border bg-brand-cyan/10 border-brand-cyan/20 text-brand-cyan">
                    {job.workMode}
                  </span>
                </div>

                <p className="text-slate-300 text-xs leading-relaxed line-clamp-3">{job.responsibilities}</p>

                <div className="flex flex-wrap gap-1.5 pt-2">
                  {job.requiredSkills.map((sk, sIdx) => (
                    <span key={sIdx} className="text-[9px] bg-white/5 border border-white/10 px-2 py-0.5 rounded text-slate-400 font-medium">
                      {sk}
                    </span>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 mt-4 border-t border-white/5 text-[10px]">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <DollarSign className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>Comp: {job.compensation}</span>
                  </div>
                  {job.applicationDeadline && (
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <Calendar className="h-4 w-4 text-amber-400 shrink-0" />
                      <span>Ends: {new Date(job.applicationDeadline).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-6 mt-6 border-t border-t-white/5">
                {(() => {
                  const alreadyApplied = hasAlreadyApplied(job._id);
                  return (
                    <button
                      disabled={alreadyApplied}
                      onClick={() => {
                        setSelectedJob(job);
                        setSubmitSuccess(false);
                        setSubmitError('');
                        // prefill candidate resume context if present
                        if (profileReport) {
                          setResumeText(profileReport.extractedSkills?.join(', ') || '');
                        }
                      }}
                      className={`w-full py-2.5 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                        alreadyApplied
                          ? 'bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 cursor-not-allowed'
                          : 'bg-white/5 border border-white/10 hover:border-brand-cyan/40 hover:bg-brand-cyan/5 text-white hover:text-brand-cyan'
                      }`}
                    >
                      {alreadyApplied ? (
                        <>
                          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                          Applied Successfully
                        </>
                      ) : (
                        <>
                          Apply to Join
                          <ChevronRight className="h-4 w-4" />
                        </>
                      )}
                    </button>
                  );
                })()}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* APPLICATION MODAL SHELF */}
      {selectedJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="relative w-full max-w-lg bg-[#0d0a1b] border border-brand-cyan/20 rounded-3xl p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <button
              onClick={() => setSelectedJob(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 p-2 rounded-full transition-colors"
            >
              <ChevronRight className="h-4 w-4 rotate-180" />
            </button>

            <h3 className="text-xl font-extrabold text-white mb-2">Apply for {selectedJob.title}</h3>
            <p className="text-xs text-slate-400 mb-4">Submit your application message and resume to {selectedJob.startup?.name}</p>

            {submitSuccess ? (
              <div className="py-8 text-center space-y-3">
                <div className="inline-flex p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full animate-bounce">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <h4 className="text-white font-bold">Application Submitted!</h4>
                <p className="text-xs text-slate-400">The startup owner has been notified via email and in-app alerts.</p>
              </div>
            ) : (
              <form onSubmit={handleApplySubmit} className="space-y-4">
                {submitError && (
                  <div className="p-3 bg-rose-950/30 border border-rose-500/30 rounded-xl text-rose-300 text-xs font-semibold">
                    {submitError}
                  </div>
                )}

                <div className="flex flex-col gap-1.5 text-left">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Application Message</label>
                  <textarea
                    rows={3}
                    placeholder="Describe your relevant skills, past work, and why you are interested in joining this team..."
                    value={appMessage}
                    onChange={(e) => setAppMessage(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-brand-cyan resize-none"
                    maxLength={500}
                    required
                  />
                  <span className="text-[10px] text-slate-500 text-right">{appMessage.length}/500 chars</span>
                </div>

                <div className="flex flex-col gap-1.5 text-left mt-3">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Upload or Paste Resume</label>
                  <input
                    type="file"
                    accept=".pdf,.txt,.md"
                    onChange={async (e) => {
                      const file = e.target.files[0];
                      if (!file) return;
                      
                      setSubmitError('');
                      const fileType = file.name.split('.').pop().toLowerCase();
                      if (fileType === 'pdf') {
                        try {
                          const base64Str = await convertToBase64(file);
                          setResumeFile(base64Str);

                          const reader = new FileReader();
                          reader.onload = async (event) => {
                            try {
                              const extractedText = await extractPdfText(event.target.result);
                              setResumeText(extractedText);
                            } catch (parseErr) {
                              setSubmitError(parseErr.message);
                            }
                          };
                          reader.readAsArrayBuffer(file);
                        } catch (err) {
                          setSubmitError('Failed to read PDF file.');
                        }
                      } else {
                        setResumeFile('');
                        const reader = new FileReader();
                        reader.onload = (event) => setResumeText(event.target.result);
                        reader.readAsText(file);
                      }
                    }}

                    className="w-full text-[10px] text-slate-400 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-[9px] file:font-bold file:uppercase file:bg-brand-cyan/20 file:text-brand-cyan cursor-pointer"
                  />
                  <textarea
                    rows={6}
                    placeholder="Paste your CV details here (work experience, skills, education, projects) to run automated AI matchmaking and ATS scoring..."
                    value={resumeText}
                    onChange={(e) => setResumeText(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-brand-cyan mt-1.5 resize-none font-sans"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setSelectedJob(null)}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={applyMutation.isPending}
                    className="px-5 py-2 bg-brand-cyan hover:bg-brand-cyan/85 disabled:bg-slate-700 text-[#0c0a1a] rounded-xl text-xs font-bold transition-all"
                  >
                    {applyMutation.isPending ? 'Sending...' : 'Submit Application'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default JobCatalog;
