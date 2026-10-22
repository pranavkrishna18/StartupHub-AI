import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { FileText, Cpu, CheckCircle2, ChevronRight, RefreshCw, Award, BookOpen, Compass, Download, Check, AlertCircle } from 'lucide-react';
import API from '../services/api';

const fetchResumeReport = async () => {
  const res = await API.get('/resumes/report');
  return res.data.data.resumeAnalysis;
};

const resolveFileUrl = (filePath) => {
  if (!filePath) return '';
  if (filePath.startsWith('data:')) return filePath;
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) return filePath;
  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
  const serverBase = apiBase.replace('/api/v1', '');
  return `${serverBase}${filePath}`;
};

const ResumeAnalyzer = () => {
  const queryClient = useQueryClient();
  const [resumeText, setResumeText] = useState('');
  const [resumeFile, setResumeFile] = useState('');
  const [activeTab, setActiveTab] = useState('summary'); // 'summary', 'roadmap', 'profile', 'pdf'
  const [uploadError, setUploadError] = useState('');

  const { data: analysis, isLoading, error } = useQuery({
    queryKey: ['resumeReport'],
    queryFn: fetchResumeReport
  });

  const analyzeMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await API.post('/resumes/analyze', payload);
      return res.data.data.resumeAnalysis;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resumeReport'] });
      setResumeText('');
      setResumeFile('');
    },
    onError: (err) => {
      setUploadError(err.response?.data?.message || 'Failed to analyze resume text');
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

  const handleFileUpload = async (e) => {
    setUploadError('');
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) { // 2MB limit
      setUploadError('File exceeds the 2MB limit.');
      return;
    }

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
            setUploadError(parseErr.message);
          }
        };
        reader.readAsArrayBuffer(file);
      } catch (err) {
        setUploadError('Failed to read PDF file.');
      }
    } else {
      setResumeFile('');
      const reader = new FileReader();
      reader.onload = (event) => {
        setResumeText(event.target.result);
      };
      reader.onerror = () => {
        setUploadError('Failed to read text file.');
      };
      reader.readAsText(file);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setUploadError('');
    if (!resumeText.trim()) {
      setUploadError('Please paste resume details or upload a file first.');
      return;
    }
    analyzeMutation.mutate({ resumeText, resumeFile });
  };

  const handlePrint = () => {
    window.print();
  };

  const isPending = analyzeMutation.isPending;

  return (
    <div className="max-w-6xl mx-auto px-6 py-12 text-left print:p-0">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-white/10 pb-6 mb-8 gap-4 print:hidden">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-2 m-0">
            <FileText className="h-8 w-8 text-brand-cyan" />
            AI Resume Analyzer
          </h1>
          <p className="text-slate-400 mt-2">Upload or paste your resume profile to scan ATS metrics and find startup team fits</p>
        </div>
        {analysis && (
          <button
            onClick={handlePrint}
            className="glass-btn-primary py-2.5 px-5 text-sm flex items-center gap-1.5 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Download className="h-4 w-4" />
            Download Report PDF
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* INPUT SHELF (HIDES ON PRINT) */}
        <div className="lg:col-span-1 space-y-6 print:hidden">
          <div className="glass-card p-6">
            <h3 className="text-lg font-bold text-white mb-4">Ingest Resume Data</h3>
            
            {uploadError && (
              <div className="mb-4 p-3 bg-rose-950/30 border border-rose-500/30 rounded-xl text-rose-300 text-xs font-semibold flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {uploadError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* File upload reader */}
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Upload Resume (.pdf, .txt, .md)</label>
                <input
                  type="file"
                  accept=".pdf,.txt,.md"
                  onChange={handleFileUpload}
                  className="w-full text-xs text-slate-400 bg-white/5 border border-white/10 rounded-xl px-3 py-2 focus:outline-none file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:uppercase file:bg-brand-cyan/20 file:text-brand-cyan hover:file:bg-brand-cyan/35 cursor-pointer"
                />
              </div>

              {/* Paste textarea box */}
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Or Paste Resume Text</label>
                <textarea
                  rows={10}
                  placeholder="Paste work experience, skills list, education details, side-projects..."
                  value={resumeText}
                  onChange={(e) => setResumeText(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-brand-cyan resize-none"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="w-full py-3 bg-brand-cyan hover:bg-brand-cyan/85 disabled:bg-slate-700 text-[#0c0a1a] text-xs font-black rounded-xl transition-all hover:scale-[1.02] flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(0,242,254,0.15)]"
              >
                {isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Parsing CV metrics...
                  </>
                ) : (
                  <>
                    <Cpu className="h-4 w-4" />
                    Analyze Resume Profile
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* OUTPUT ANALYSIS RESULTS */}
        <div className="lg:col-span-2 space-y-6 print:w-full print:col-span-3">
          {isLoading ? (
            <div className="glass-card p-12 text-center flex flex-col items-center justify-center min-h-[350px]">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-brand-cyan mb-4"></div>
              <p className="text-slate-400 text-xs font-semibold">Loading profile report...</p>
            </div>
          ) : !analysis ? (
            <div className="glass-card p-12 text-center text-slate-500 min-h-[350px] flex flex-col justify-center items-center">
              <FileText className="h-12 w-12 text-slate-600 mb-4" />
              <h4 className="text-white font-bold text-lg mb-1">No Active Vetting Report</h4>
              <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
                Ingest your CV profile using the panel tools to review ATS score matrices, customized training paths, and startup compatibility matches.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* CORE GAUGES */}
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'Resume Strength', val: analysis.resumeScore, color: 'text-brand-cyan', bg: 'bg-brand-cyan/10' },
                  { label: 'ATS Compliance', val: analysis.atsScore, color: 'text-brand-purple', bg: 'bg-brand-purple/10' },
                  { label: 'Startup Match Signal', val: analysis.compatibility, color: 'text-emerald-400', bg: 'bg-emerald-400/10' }
                ].map((item, idx) => (
                  <div key={idx} className="glass-card p-5 text-center flex flex-col justify-between min-h-[120px]">
                    <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold block">{item.label}</span>
                    <h2 className={`text-3xl font-black mt-3 ${item.color} leading-none`}>{item.val}%</h2>
                    <div className="w-full bg-white/5 h-1.5 rounded-full mt-3 overflow-hidden">
                      <div className={`h-full ${item.bg}`} style={{ width: `${item.val}%`, backgroundColor: 'currentColor' }}></div>
                    </div>
                  </div>
                ))}
              </div>

              {/* REPORT CONTROLLER TABS */}
              <div className="flex border-b border-white/5 gap-4 print:hidden">
                <button
                  onClick={() => setActiveTab('summary')}
                  className={`pb-3 text-xs font-bold tracking-wider transition-colors border-b-2 uppercase ${
                    activeTab === 'summary' ? 'border-brand-cyan text-brand-cyan' : 'border-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  Match Summary
                </button>
                <button
                  onClick={() => setActiveTab('roadmap')}
                  className={`pb-3 text-xs font-bold tracking-wider transition-colors border-b-2 uppercase ${
                    activeTab === 'roadmap' ? 'border-brand-cyan text-brand-cyan' : 'border-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  Learning Roadmap
                </button>
                <button
                  onClick={() => setActiveTab('profile')}
                  className={`pb-3 text-xs font-bold tracking-wider transition-colors border-b-2 uppercase ${
                    activeTab === 'profile' ? 'border-brand-cyan text-brand-cyan' : 'border-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  Parsed Profile
                </button>
                {analysis.resumeFile && (
                  <button
                    onClick={() => setActiveTab('pdf')}
                    className={`pb-3 text-xs font-bold tracking-wider transition-colors border-b-2 uppercase ${
                      activeTab === 'pdf' ? 'border-brand-cyan text-brand-cyan' : 'border-transparent text-slate-400 hover:text-white'
                    }`}
                  >
                    Original PDF
                  </button>
                )}
              </div>


              {/* TAB 1: SUMMARY */}
              {activeTab === 'summary' && (
                <div className="space-y-6">
                  {/* RECOMMENDED STARTUPS */}
                  <div className="glass-card p-6">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                      <Compass className="h-5 w-5 text-emerald-400" />
                      Startup Recommendations
                    </h3>
                    <div className="space-y-4">
                      {analysis.recommendedStartups.map((rec, idx) => (
                        <div key={idx} className="p-4 border border-white/5 bg-white/5 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-brand-cyan/20 transition-all">
                          <div className="text-left">
                            <h4 className="font-bold text-white text-sm">{rec.name}</h4>
                            <p className="text-xs text-slate-400 mt-1 leading-relaxed">{rec.matchReason}</p>
                          </div>
                          {rec.startupId && (
                            <Link
                              to={`/startup/${rec.startupId}`}
                              className="text-xs text-brand-cyan font-bold hover:underline shrink-0 flex items-center gap-0.5"
                            >
                              Explore Startup
                              <ChevronRight className="h-3.5 w-3.5" />
                            </Link>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* SUGGESTIONS & ROLES */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="glass-card p-6">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Recommended Job Roles</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {analysis.recommendedRoles.map((role, idx) => (
                          <span key={idx} className="text-[10px] bg-brand-cyan/15 border border-brand-cyan/25 text-brand-cyan px-2.5 py-1 rounded-md font-semibold">
                            {role}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="glass-card p-6">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Vetting Improvement Tips</h4>
                      <ul className="space-y-2 text-xs text-slate-300 list-disc list-inside m-0 pl-0">
                        {analysis.personalizedSuggestions.map((sug, idx) => (
                          <li key={idx} className="leading-relaxed">{sug}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: ROADMAP */}
              {activeTab === 'roadmap' && (
                <div className="glass-card p-6 text-left space-y-6">
                  <div className="flex items-center gap-2 mb-2">
                    <BookOpen className="h-5 w-5 text-brand-purple" />
                    <h3 className="text-lg font-bold text-white m-0">Personalized Learning Roadmap</h3>
                  </div>

                  {/* ROADMAP TIMELINE */}
                  <div className="relative border-l border-white/10 pl-6 space-y-6">
                    {analysis.learningRoadmap.map((step, idx) => (
                      <div key={idx} className="relative">
                        <div className="absolute -left-[31px] top-1 bg-brand-purple border border-brand-purple/20 h-4 w-4 rounded-full flex items-center justify-center">
                          <Check className="h-2.5 w-2.5 text-white" />
                        </div>
                        <div>
                          <span className="text-[9px] font-bold uppercase tracking-wider text-brand-cyan">Milestone {idx + 1}</span>
                          <p className="text-xs text-slate-200 font-semibold mt-1 leading-relaxed">{step}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {analysis.missingSkills?.length > 0 && (
                    <div className="pt-4 border-t border-white/5 space-y-2">
                      <div className="text-[10px] uppercase font-bold text-slate-500">Skills Gaps to Bridge</div>
                      <div className="flex flex-wrap gap-1.5">
                        {analysis.missingSkills.map((sk, idx) => (
                          <span key={idx} className="text-[10px] bg-rose-500/10 border border-rose-500/20 text-rose-400 px-2.5 py-1 rounded-md font-semibold">
                            {sk}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: PARSED PROFILE */}
              {activeTab === 'profile' && (
                <div className="space-y-6">
                  <div className="glass-card p-6">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                      <Award className="h-5 w-5 text-brand-cyan" />
                      Extracted Credentials Profile
                    </h3>
                    <div className="space-y-4 text-xs">
                      {[
                        { label: 'Skills Extracted', val: analysis.extractedSkills },
                        { label: 'Professional Positions', val: analysis.extractedExperience },
                        { label: 'Education Milestones', val: analysis.extractedEducation },
                        { label: 'Side Projects & Portfolios', val: analysis.extractedProjects },
                        { label: 'Certifications & Badges', val: analysis.extractedCertifications },
                        { label: 'Personal Interests', val: analysis.extractedInterests }
                      ].map((item, idx) => (
                        <div key={idx} className="border-b border-white/5 pb-3 last:border-b-0">
                          <div className="font-bold text-slate-400 mb-1.5">{item.label}</div>
                          {item.val?.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {item.val.map((tag, tIdx) => (
                                <span key={tIdx} className="bg-white/5 border border-white/10 px-2.5 py-0.5 rounded text-slate-300 font-medium">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-500">None detected</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: ORIGINAL PDF PREVIEW */}
              {activeTab === 'pdf' && analysis.resumeFile && (
                <div className="glass-card p-6 text-left space-y-4">
                  <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-brand-cyan" />
                    Uploaded Resume Document
                  </h3>
                  <div className="w-full h-[600px] rounded-2xl overflow-hidden border border-white/10 bg-slate-950">
                    <iframe
                      src={resolveFileUrl(analysis.resumeFile)}
                      title="Uploaded PDF Resume"
                      width="100%"
                      height="100%"
                      className="border-0"
                    />
                  </div>
                </div>
              )}

              {/* PRINT DISPLAY SECTION */}

              <div className="hidden print:block border-t border-slate-300 pt-6 mt-8 space-y-6 text-black text-xs text-left">
                <div className="text-center pb-4 border-b border-slate-200">
                  <h2 className="text-xl font-bold">StartupHub AI Resume Analysis Report</h2>
                  <p className="text-slate-600">Generated: {new Date(analysis.analyzedAt).toLocaleDateString()}</p>
                </div>
                
                <div className="grid grid-cols-3 gap-4 border-b border-slate-200 pb-4">
                  <div><strong>Resume Strength:</strong> {analysis.resumeScore}%</div>
                  <div><strong>ATS Compliance Score:</strong> {analysis.atsScore}%</div>
                  <div><strong>Startup Match Indicator:</strong> {analysis.compatibility}%</div>
                </div>

                <div>
                  <h3 className="font-bold text-sm border-b pb-1 mb-2">Recommended Startups</h3>
                  <ul className="space-y-1 pl-4 list-disc">
                    {analysis.recommendedStartups.map((rec, idx) => (
                      <li key={idx}><strong>{rec.name}</strong> — {rec.matchReason}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="font-bold text-sm border-b pb-1 mb-2">Recommended Career Roles</h3>
                  <p>{analysis.recommendedRoles.join(', ')}</p>
                </div>

                <div>
                  <h3 className="font-bold text-sm border-b pb-1 mb-2">Learning Roadmap Suggestions</h3>
                  <ol className="space-y-1 pl-4 list-decimal">
                    {analysis.learningRoadmap.map((step, idx) => (
                      <li key={idx}>{step}</li>
                    ))}
                  </ol>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResumeAnalyzer;
