import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { ChevronUp, Globe, CornerDownRight, MessageSquare, Plus, Check, Send, AlertCircle, ArrowLeft, BrainCircuit, Briefcase, CheckCircle2, BookMarked, UserPlus, UserCheck, ShieldAlert, ExternalLink, Landmark } from 'lucide-react';

import API from '../services/api';
import ReportModal from '../components/ReportModal';

// API Functions
const fetchStartup = async (id) => {
  const res = await API.get(`/startups/${id}`);
  return res.data.data.startup;
};

const fetchComments = async (startupId) => {
  const res = await API.get(`/startups/${startupId}/comments`);
  return res.data.data.comments;
};

const postCommentAPI = async ({ startupId, content, parentCommentId }) => {
  const res = await API.post(`/startups/${startupId}/comments`, {
    content,
    parentCommentId
  });
  return res.data.data.comment;
};

const joinWaitlistAPI = async ({ id, email }) => {
  const res = await API.post(`/startups/${id}/waitlist`, { email });
  return res.data;
};

const voteAPI = async (id) => {
  const res = await API.post(`/startups/${id}/vote`);
  return res.data.data;
};

const StartupDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAuthenticated, user } = useSelector((state) => state.auth);

  // States
  const [waitlistEmail, setWaitlistEmail] = useState('');
  const [waitlistSuccess, setWaitlistSuccess] = useState('');
  const [waitlistError, setWaitlistError] = useState('');
  const [commentContent, setCommentContent] = useState('');
  
  // Replying state tracks which commentId the user is replying to
  const [replyingToId, setReplyingToId] = useState(null);
  const [replyContent, setReplyContent] = useState('');

  // Application Modal States
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [roleProposed, setRoleProposed] = useState('');
  const [applyMessage, setApplyMessage] = useState('');
  const [applySuccess, setApplySuccess] = useState('');
  const [applyError, setApplyError] = useState('');

  // Verification & Report States
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [documentUrl, setDocumentUrl] = useState('');
  const [verifySuccess, setVerifySuccess] = useState('');
  const [verifyError, setVerifyError] = useState('');

  // TanStack Queries
  const { data: startup, isLoading: startupLoading, error: startupError } = useQuery({
    queryKey: ['startup', id],
    queryFn: () => fetchStartup(id)
  });

  const { data: comments, isLoading: commentsLoading } = useQuery({
    queryKey: ['comments', id],
    queryFn: () => fetchComments(id)
  });

  // Upvote Mutation
  const voteMutation = useMutation({
    mutationFn: () => voteAPI(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['startup', id] });
    },
    onError: () => {
      if (!isAuthenticated) navigate('/login');
    }
  });

  // Join Waitlist Mutation
  const waitlistMutation = useMutation({
    mutationFn: joinWaitlistAPI,
    onSuccess: (data) => {
      setWaitlistSuccess(data.message || 'Joined waitlist successfully!');
      setWaitlistEmail('');
      queryClient.invalidateQueries({ queryKey: ['startup', id] });
    },
    onError: (err) => {
      setWaitlistError(err.response?.data?.message || 'Failed to join waitlist.');
    }
  });

  // Comment Mutation
  const commentMutation = useMutation({
    mutationFn: postCommentAPI,
    onSuccess: () => {
      setCommentContent('');
      setReplyContent('');
      setReplyingToId(null);
      queryClient.invalidateQueries({ queryKey: ['comments', id] });
      queryClient.invalidateQueries({ queryKey: ['startup', id] });
    }
  });

  // Collaboration Apply Mutation
  const applyMutation = useMutation({
    mutationFn: async () => {
      const res = await API.post(`/applications/startup/${id}`, {
        roleProposed,
        message: applyMessage
      });
      return res.data;
    },
    onSuccess: () => {
      setApplySuccess('Your collaboration request has been submitted successfully!');
      setRoleProposed('');
      setApplyMessage('');
      setTimeout(() => {
        setIsApplyModalOpen(false);
        setApplySuccess('');
      }, 2500);
    },
    onError: (err) => {
      setApplyError(err.response?.data?.message || 'Failed to submit application.');
    }
  });

  // Bookmark Toggle Mutation
  const bookmarkMutation = useMutation({
    mutationFn: async () => {
      await API.post(`/investor/bookmark/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['startup', id] });
    }
  });

  // Follow Founder Mutation
  const followMutation = useMutation({
    mutationFn: async () => {
      await API.post(`/investor/follow/${startup?.founder?._id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['startup', id] });
    }
  });

  const handleVote = () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    voteMutation.mutate();
  };

  const handleWaitlistSubmit = (e) => {
    e.preventDefault();
    setWaitlistError('');
    setWaitlistSuccess('');
    if (!waitlistEmail) return;
    waitlistMutation.mutate({ id, email: waitlistEmail });
  };

  const handleCommentSubmit = (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (!commentContent.trim()) return;
    commentMutation.mutate({ startupId: id, content: commentContent });
  };

  const handleReplySubmit = (e, parentId) => {
    e.preventDefault();
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (!replyContent.trim()) return;
    commentMutation.mutate({ startupId: id, content: replyContent, parentCommentId: parentId });
  };

  const handleApplySubmit = (e) => {
    e.preventDefault();
    setApplyError('');
    setApplySuccess('');
    if (!roleProposed || !applyMessage) return;
    applyMutation.mutate();
  };

  // Request Verification Mutation
  const requestVerificationMutation = useMutation({
    mutationFn: async (docUrl) => {
      const res = await API.post('/admin/verifications', { startupId: id, documentUrl: docUrl });
      return res.data;
    },
    onSuccess: () => {
      setVerifySuccess('Verification request submitted successfully!');
      setDocumentUrl('');
      queryClient.invalidateQueries({ queryKey: ['startup', id] });
    },
    onError: (err) => {
      setVerifyError(err.response?.data?.message || 'Failed to submit verification request.');
    }
  });

  const handleVerifySubmit = (e) => {
    e.preventDefault();
    setVerifyError('');
    setVerifySuccess('');
    if (!documentUrl.trim()) return;
    requestVerificationMutation.mutate(documentUrl);
  };

  if (startupLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-darkBg-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-cyan"></div>
      </div>
    );
  }

  if (startupError || !startup) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-20 text-center text-slate-400 font-semibold glass-card">
        Startup not found. <Link to="/" className="text-brand-cyan hover:underline">Back to feed</Link>
      </div>
    );
  }

  // Tree representation of hierarchical comments
  const rootComments = comments?.filter(c => !c.parentComment) || [];
  const getRepliesFor = (parentId) => comments?.filter(c => c.parentComment === parentId) || [];

  const isTeamMember = startup.team?.some(t => t.user?._id === user?._id);

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      {/* Back Button */}
      <Link to="/" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-6 text-sm">
        <ArrowLeft className="h-4 w-4" />
        Back to Explorer Feed
      </Link>

      {/* HEADER SECTION */}
      <div className="glass-card p-6 md:p-8 flex flex-col gap-6 mb-8">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-5">
          <div className="h-20 w-20 bg-gradient-to-tr from-violet-600/30 to-cyan-500/30 border border-white/10 flex items-center justify-center text-white text-3xl font-extrabold rounded-3xl shrink-0 shadow-lg">
            {startup.name[0]}
          </div>
          <div className="space-y-2 text-center md:text-left flex-1 min-w-0">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
              <h1 className="text-3xl font-extrabold text-white margin-0 m-0 leading-tight">{startup.name}</h1>
              {startup.status === 'verified' && (
                <CheckCircle2 className="h-6 w-6 text-brand-cyan fill-brand-cyan/10 shrink-0" title="Verified Startup" />
              )}
              <span className="text-xs bg-white/5 border border-white/10 px-3 py-1 rounded-full text-slate-400 tracking-wide font-semibold uppercase">
                {startup.category?.name}
              </span>
            </div>
            <p className="text-slate-300 text-lg leading-snug">{startup.tagline}</p>
            {startup.website && (
              <a
                href={startup.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-brand-cyan hover:underline"
              >
                <Globe className="h-3.5 w-3.5" />
                Visit Website
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>

        {/* Action Separator Divider */}
        <div className="border-t border-white/5 pt-2"></div>

        <div className="flex flex-wrap items-center gap-3 w-full justify-center md:justify-start">
          {/* Apply to Startup button */}
          {isAuthenticated && user?._id !== startup.founder?._id && !isTeamMember && (
            <button
              onClick={() => setIsApplyModalOpen(true)}
              className="flex items-center gap-2 px-5 py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white rounded-2xl transition-all font-bold text-sm"
            >
              <Plus className="h-4 w-4 text-brand-purple" />
              Apply as Co-founder
            </button>
          )}

          {/* Go to Team Workspace button */}
          {isAuthenticated && (user?._id === startup.founder?._id || isTeamMember) && (
            <Link
              to={`/workspace/${startup._id}`}
              className="flex items-center gap-2 px-5 py-4 bg-brand-cyan/15 hover:bg-brand-cyan/20 border border-brand-cyan/35 text-brand-cyan hover:text-white rounded-2xl transition-all font-black text-sm shadow-[0_0_15px_rgba(0,242,254,0.1)]"
            >
              <Briefcase className="h-4 w-4 text-brand-cyan" />
              Team Workspace
            </Link>
          )}

          {/* Raising Portal Button */}
          {isAuthenticated && (
            <Link
              to={`/fundraising/${startup._id}`}
              className="flex items-center gap-2 px-5 py-4 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:text-white rounded-2xl transition-all font-bold text-sm shadow-[0_0_15px_rgba(16,185,129,0.08)]"
            >
              <Landmark className="h-4 w-4 text-emerald-400" />
              Raise Campaign
            </Link>
          )}

          {/* AI Insights Button */}
          <Link


            to={`/startup/${startup._id}/ai-insights`}
            className="flex items-center gap-2 px-5 py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white rounded-2xl transition-all font-bold text-sm"
          >
            <BrainCircuit className="h-4.5 w-4.5 text-brand-cyan" />
            AI Insights
          </Link>

          {/* Flag Idea Button */}
          {isAuthenticated && user?._id !== startup.founder?._id && (
            <button
              onClick={() => setIsReportModalOpen(true)}
              className="flex items-center gap-2 px-5 py-4 bg-white/5 hover:bg-rose-500/10 border border-white/10 hover:border-rose-500/20 text-slate-300 hover:text-rose-400 rounded-2xl transition-all font-bold text-sm"
              title="Report abuse or spam"
            >
              <ShieldAlert className="h-4.5 w-4.5 text-rose-400" />
              Flag Idea
            </button>
          )}

          {/* Bookmark Toggle Icon */}
          {isAuthenticated && (
            <button
              onClick={() => bookmarkMutation.mutate()}
              className={`p-4 border rounded-2xl transition-all shrink-0 ${
                startup.isBookmarked
                  ? 'bg-brand-cyan/20 border-brand-cyan text-brand-cyan shadow-[0_0_15px_rgba(0,242,254,0.15)]'
                  : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
              }`}
              title={startup.isBookmarked ? 'Bookmarked!' : 'Bookmark Startup'}
            >
              <BookMarked className="h-5 w-5" />
            </button>
          )}

          {/* Upvote Detail button */}
          <button
            onClick={handleVote}
            className={`flex items-center gap-3 px-6 py-4 border rounded-2xl transition-all font-bold select-none shrink-0 ${
              startup.hasVoted
                ? 'bg-brand-violet/20 border-brand-violet text-brand-cyan shadow-[0_0_20px_rgba(124,58,237,0.2)]'
                : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:border-white/20'
            }`}
          >
            <ChevronUp className="h-5 w-5" />
            <span>{startup.hasVoted ? 'Upvoted' : 'Upvote'}</span>
            <span className="border-l border-white/15 pl-3 text-white">{startup.votesCount}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
        {/* DESCRIPTION BLOCK */}
        <div className="md:col-span-2 space-y-6">
          <div className="glass-card p-6 md:p-8 space-y-4">
            <h3 className="text-xl font-bold text-white tracking-wide">About this Startup</h3>
            <p className="text-slate-300 whitespace-pre-line text-sm leading-relaxed">{startup.description}</p>
          </div>
        </div>

        {/* SIDEBAR WIDGETS */}
        <div className="space-y-6">
          {/* WAITLIST / TRACTION WIDGET */}
          <div className="glass-card p-6 border-brand-cyan/20 shadow-[0_0_25px_rgba(0,242,254,0.05)] relative overflow-hidden">
            {/* Cyan glow */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl"></div>

            <h3 className="text-lg font-bold text-white mb-2 tracking-wide">Join Early Waitlist</h3>
            <p className="text-slate-400 text-xs mb-4 leading-relaxed">
              Show early support. Join the private launch waitlist to stay updated on validation achievements.
            </p>

            {waitlistSuccess && (
              <div className="mb-4 flex items-start gap-1 bg-emerald-500/15 border border-emerald-500/20 text-emerald-300 p-2.5 rounded-xl text-xs">
                <Check className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{waitlistSuccess}</span>
              </div>
            )}

            {waitlistError && (
              <div className="mb-4 flex items-start gap-1 bg-rose-500/15 border border-rose-500/20 text-rose-300 p-2.5 rounded-xl text-xs">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{waitlistError}</span>
              </div>
            )}

            <form onSubmit={handleWaitlistSubmit} className="space-y-3">
              <input
                type="email"
                required
                value={waitlistEmail}
                onChange={(e) => setWaitlistEmail(e.target.value)}
                placeholder="you@email.com"
                className="w-full glass-input py-2 text-xs"
              />
              <button
                type="submit"
                disabled={waitlistMutation.isPending}
                className="w-full glass-btn-primary py-2.5 text-xs flex justify-center items-center gap-1.5"
              >
                {waitlistMutation.isPending ? (
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  'Subscribe for Updates'
                )}
              </button>
            </form>

            <div className="mt-4 pt-4 border-t border-white/5 text-[10px] text-slate-500 font-semibold uppercase tracking-wider flex justify-between">
              <span>Current Subscribers</span>
              <span className="text-brand-cyan">{startup.metrics?.waitlistCount || 0} users</span>
            </div>
          </div>

          {/* FOUNDER VERIFICATION PANEL */}
          {isAuthenticated && user?._id === startup.founder?._id && startup.status !== 'verified' && (
            <div className="glass-card p-6 border-white/5 relative overflow-hidden text-left">
              <h3 className="text-lg font-bold text-white mb-2 tracking-wide flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-brand-cyan shrink-0" />
                Founder Verification
              </h3>
              <p className="text-slate-400 text-xs mb-4 leading-relaxed">
                Submit incorporation proof links or verification files to earn the verification trust badge.
              </p>

              {verifySuccess && (
                <div className="mb-4 flex items-start gap-1 bg-emerald-500/15 border border-emerald-500/20 text-emerald-300 p-2.5 rounded-xl text-xs">
                  <Check className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{verifySuccess}</span>
                </div>
              )}

              {verifyError && (
                <div className="mb-4 flex items-start gap-1 bg-rose-500/15 border border-rose-500/20 text-rose-300 p-2.5 rounded-xl text-xs">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{verifyError}</span>
                </div>
              )}

              <form onSubmit={handleVerifySubmit} className="space-y-3">
                <input
                  type="url"
                  required
                  value={documentUrl}
                  onChange={(e) => setDocumentUrl(e.target.value)}
                  placeholder="https://link-to-proof-document.pdf"
                  className="w-full glass-input py-2 text-xs"
                />
                <button
                  type="submit"
                  disabled={requestVerificationMutation.isPending}
                  className="w-full glass-btn-primary py-2.5 text-xs flex justify-center items-center gap-1.5"
                >
                  {requestVerificationMutation.isPending ? (
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    'Request Trust Badge'
                  )}
                </button>
              </form>
            </div>
          )}

          {/* STARTUP TEAM MEMBERS */}
          <div className="glass-card p-6 border-white/5 relative overflow-hidden">
            <h3 className="text-lg font-bold text-white mb-4 tracking-wide">Startup Team</h3>
            <div className="space-y-4">
              {/* Founder */}
              <div className="flex justify-between items-center pb-2.5 border-b border-white/5 last:border-b-0 animate-[fadeIn_0.5s_ease]">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-white">Founder</p>
                  <span className="text-[10px] text-slate-500 font-semibold truncate block">{startup.founder?.email}</span>
                </div>
                
                <div className="flex gap-2 items-center shrink-0">
                  {isAuthenticated && user?._id !== startup.founder?._id && (
                    <>
                      <button
                        onClick={() => followMutation.mutate()}
                        className="text-[10px] font-bold text-brand-purple hover:underline uppercase tracking-wide"
                      >
                        {startup.founder?.isFollowed ? 'Following' : 'Follow'}
                      </button>
                      <span className="text-slate-600 text-xs">|</span>
                      <button
                        onClick={() => navigate(`/chat?userId=${startup.founder?._id}`)}
                        className="text-[10px] font-bold text-brand-cyan hover:underline uppercase tracking-wide"
                      >
                        Chat
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Co-founders */}
              {startup.team?.length === 0 ? (
                <div className="text-[10px] text-slate-500 italic pt-1">No co-founders have joined this team yet.</div>
              ) : (
                startup.team?.map((member, idx) => (
                  <div key={idx} className="flex justify-between items-center pb-2.5 border-b border-white/5 last:border-b-0 animate-[fadeIn_0.5s_ease]">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white truncate">{member.user?.fullName || member.user?.email || 'Team Member'}</p>
                      <span className="text-[10px] text-brand-cyan font-bold uppercase tracking-wider block">{member.role}</span>
                    </div>
                    {isAuthenticated && user?._id !== member.user?._id && member.user?._id && (
                      <button
                        onClick={() => navigate(`/chat?userId=${member.user._id}`)}
                        className="text-[10px] font-bold text-brand-cyan hover:underline uppercase tracking-wide shrink-0"
                      >
                        Chat
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* COMMENTS / DISCUSSION SECTION */}
      <div className="glass-card p-6 md:p-8 space-y-8">
        <h3 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-brand-violet" />
          Community Discussion ({comments?.length || 0})
        </h3>

        {/* Post Comment form */}
        {isAuthenticated ? (
          <form onSubmit={handleCommentSubmit} className="flex gap-4">
            <div className="h-9 w-9 bg-brand-violet/20 border border-brand-violet/30 rounded-xl flex items-center justify-center text-brand-cyan font-bold text-sm shrink-0">
              {user?.email[0].toUpperCase()}
            </div>
            <div className="flex-1 space-y-3">
              <textarea
                value={commentContent}
                onChange={(e) => setCommentContent(e.target.value)}
                placeholder="Add your thoughts or ask a question about this idea..."
                rows="3"
                className="w-full glass-input text-sm p-3 resize-none"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={commentMutation.isPending}
                  className="glass-btn-primary py-2 px-5 text-xs flex items-center gap-1.5"
                >
                  <Send className="h-3 w-3" />
                  Post Comment
                </button>
              </div>
            </div>
          </form>
        ) : (
          <div className="bg-white/5 border border-white/10 p-4 rounded-2xl text-center text-sm text-slate-400">
            Please{' '}
            <Link to="/login" className="text-brand-cyan font-bold hover:underline">
              login
            </Link>{' '}
            to join the discussion.
          </div>
        )}

        {/* Comment list */}
        {commentsLoading ? (
          <div className="py-8 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-cyan"></div>
          </div>
        ) : rootComments.length === 0 ? (
          <div className="text-center py-6 text-slate-500 text-sm">
            No questions asked yet. Be the first to start the discussion!
          </div>
        ) : (
          <div className="space-y-6 pt-4">
            {rootComments.map((comment) => {
              const replies = getRepliesFor(comment._id);

              return (
                <div key={comment._id} className="space-y-4 border-b border-white/5 pb-6 last:border-b-0">
                  <div className="flex items-start gap-3">
                    <div className="h-9 w-9 bg-white/10 border border-white/10 rounded-xl flex items-center justify-center text-white font-bold text-xs shrink-0">
                      {comment.user.fullName?.[0] || 'A'}
                    </div>
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white">{comment.user.fullName}</span>
                        <span className="text-[10px] text-slate-500">
                          {new Date(comment.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-slate-300 text-sm mt-1 leading-relaxed">{comment.content}</p>

                      {/* Reply toggle button */}
                      {isAuthenticated && (
                        <button
                          onClick={() => {
                            setReplyingToId(replyingToId === comment._id ? null : comment._id);
                            setReplyContent('');
                          }}
                          className="mt-2 text-[10px] font-bold text-brand-cyan hover:underline uppercase tracking-wide flex items-center gap-1"
                        >
                          <Plus className="h-3 w-3" />
                          Reply
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Replies nesting */}
                  {replies.length > 0 && (
                    <div className="pl-8 space-y-4">
                      {replies.map((reply) => (
                        <div key={reply._id} className="flex items-start gap-3">
                          <CornerDownRight className="h-4 w-4 text-slate-600 shrink-0 mt-1" />
                          <div className="h-7 w-7 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center text-slate-300 font-bold text-[10px] shrink-0">
                            {reply.user.fullName?.[0] || 'A'}
                          </div>
                          <div className="flex-1 text-left">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-white">{reply.user.fullName}</span>
                              <span className="text-[9px] text-slate-500">
                                {new Date(reply.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-slate-400 text-xs mt-1 leading-relaxed">{reply.content}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Inline Reply input */}
                  {replyingToId === comment._id && (
                    <form onSubmit={(e) => handleReplySubmit(e, comment._id)} className="pl-8 flex gap-3 mt-3">
                      <input
                        type="text"
                        required
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        placeholder={`Reply to ${comment.user.fullName}...`}
                        className="flex-1 glass-input py-1.5 text-xs"
                      />
                      <button
                        type="submit"
                        disabled={commentMutation.isPending}
                        className="glass-btn-primary py-2 px-3 text-xs flex items-center"
                      >
                        <Send className="h-3 w-3" />
                      </button>
                    </form>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* CO-FOUNDER APPLICATION MODAL */}
      {isApplyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg glass-card p-6 md:p-8 shadow-2xl relative overflow-hidden text-left">
            <h3 className="text-xl font-bold text-white mb-2">Apply to: {startup.name}</h3>
            <p className="text-slate-400 text-xs mb-6">Propose your skills and pitch why you fit this concept.</p>

            {applySuccess && (
              <div className="mb-4 flex items-start gap-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 p-3 rounded-xl text-xs">
                <CheckCircle2 className="h-5 w-5 shrink-0" />
                <span>{applySuccess}</span>
              </div>
            )}

            {applyError && (
              <div className="mb-4 flex items-start gap-1 bg-rose-500/10 border border-rose-500/20 text-rose-300 p-3 rounded-xl text-xs">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <span>{applyError}</span>
              </div>
            )}

            <form onSubmit={handleApplySubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-300 uppercase tracking-wider block">Proposed Role / Title</label>
                <div className="relative">
                  <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={roleProposed}
                    onChange={(e) => setRoleProposed(e.target.value)}
                    placeholder="e.g. Lead Developer / CTO / CMO"
                    className="w-full glass-input pl-11 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-300 uppercase tracking-wider block">Pitch Message</label>
                <textarea
                  required
                  value={applyMessage}
                  onChange={(e) => setApplyMessage(e.target.value)}
                  placeholder="Pitch your core experience, motivation, and how you can support this project..."
                  rows="4"
                  maxLength="500"
                  className="w-full glass-input text-xs resize-none p-3"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setIsApplyModalOpen(false)}
                  className="glass-btn-secondary py-2 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={applyMutation.isPending}
                  className="glass-btn-primary py-2 px-5 text-xs"
                >
                  {applyMutation.isPending ? 'Submitting...' : 'Submit Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REPORT ABUSE / FLAG MODAL */}
      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        startupId={id}
        startupName={startup.name}
      />
    </div>
  );
};

export default StartupDetail;
