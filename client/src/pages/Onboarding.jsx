import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { User, Briefcase, Globe, Github, Linkedin, Check, AlertCircle, Bell } from 'lucide-react';
import API from '../services/api';

const fetchProfile = async () => {
  const res = await API.get('/profiles/me');
  return res.data.data.profile;
};

const updateProfile = async (data) => {
  const res = await API.put('/profiles/me', data);
  return res.data.data.profile;
};

const Onboarding = () => {
  const queryClient = useQueryClient();
  const [fullName, setFullName] = useState('');
  const [headline, setHeadline] = useState('');
  const [bio, setBio] = useState('');
  const [skills, setSkills] = useState('');
  const [interests, setInterests] = useState('');
  
  const [linkedin, setLinkedin] = useState('');
  const [github, setGithub] = useState('');
  const [website, setWebsite] = useState('');

  // Notification preferences states
  const [messagesPref, setMessagesPref] = useState(true);
  const [applicationsPref, setApplicationsPref] = useState(true);
  const [commentsPref, setCommentsPref] = useState(true);
  const [waitlistPref, setWaitlistPref] = useState(true);
  const [aiReportsPref, setAiReportsPref] = useState(true);
  const [digestPref, setDigestPref] = useState(true);
  const [marketingPref, setMarketingPref] = useState(false);

  const [saveSuccess, setSaveSuccess] = useState(false);

  // TanStack Query to load current profile
  const { data: profile, isLoading, error } = useQuery({
    queryKey: ['myProfile'],
    queryFn: fetchProfile,
    retry: false
  });

  // TanStack Mutation to save profile
  const mutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: (data) => {
      queryClient.setQueryData(['myProfile'], data);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  });

  useEffect(() => {
    if (profile) {
      setFullName(profile.fullName || '');
      setHeadline(profile.headline || '');
      setBio(profile.bio || '');
      setSkills(profile.skills?.join(', ') || '');
      setInterests(profile.interests?.join(', ') || '');
      setLinkedin(profile.socialLinks?.linkedin || '');
      setGithub(profile.socialLinks?.github || '');
      setWebsite(profile.socialLinks?.website || '');

      // Load preferences if available
      const prefs = profile.user?.notificationPreferences || {};
      setMessagesPref(prefs.messages !== false);
      setApplicationsPref(prefs.applications !== false);
      setCommentsPref(prefs.comments !== false);
      setWaitlistPref(prefs.waitlist !== false);
      setAiReportsPref(prefs.aiReports !== false);
      setDigestPref(prefs.digest !== false);
      setMarketingPref(!!prefs.marketing);
    }
  }, [profile]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Parse comma separated fields
    const parsedSkills = skills.split(',').map(s => s.trim()).filter(Boolean);
    const parsedInterests = interests.split(',').map(i => i.trim()).filter(Boolean);

    mutation.mutate({
      fullName,
      headline,
      bio,
      skills: parsedSkills,
      interests: parsedInterests,
      socialLinks: {
        linkedin,
        github,
        website
      },
      notificationPreferences: {
        messages: messagesPref,
        applications: applicationsPref,
        comments: commentsPref,
        waitlist: waitlistPref,
        aiReports: aiReportsPref,
        digest: digestPref,
        marketing: marketingPref
      }
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-darkBg-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-cyan"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <div className="glass-card p-8 md:p-10 shadow-2xl relative overflow-hidden">
        {/* Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-violet-600/5 rounded-full blur-3xl"></div>

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-white/10 pb-8 mb-8 gap-4 relative">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight margin-0 m-0">Setup Profile</h1>
            <p className="text-slate-400 mt-2">Introduce yourself to the StartupHub AI community</p>
          </div>
          <div className="bg-brand-violet/20 border border-brand-violet/30 px-4 py-2 rounded-xl text-brand-cyan text-sm font-semibold capitalize">
            Role: {profile?.user?.role || 'User'}
          </div>
        </div>

        {mutation.isError && (
          <div className="mb-6 flex items-start gap-2 bg-rose-500/10 border border-rose-500/20 text-rose-300 p-4 rounded-xl text-sm">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <span>{mutation.error?.response?.data?.message || 'Failed to update profile.'}</span>
          </div>
        )}

        {saveSuccess && (
          <div className="mb-6 flex items-start gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 p-4 rounded-xl text-sm">
            <Check className="h-5 w-5 shrink-0" />
            <span>Profile successfully updated!</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8 relative">
          {/* Main Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">Full Name</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jane Doe"
                className="w-full glass-input"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">Professional Headline</label>
              <input
                type="text"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="SaaS Developer / Founder of AI labs"
                className="w-full glass-input"
              />
            </div>
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell the community about yourself, your background, and your startup aspirations..."
              rows="4"
              className="w-full glass-input resize-none"
            />
          </div>

          {/* Skills & Interests */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">Skills (Comma-separated)</label>
              <input
                type="text"
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                placeholder="React, Express, Node.js, AI, Product Design"
                className="w-full glass-input"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">Interests (Comma-separated)</label>
              <input
                type="text"
                value={interests}
                onChange={(e) => setInterests(e.target.value)}
                placeholder="SaaS, FinTech, DevTools, Remote Work"
                className="w-full glass-input"
              />
            </div>
          </div>

          {/* Socials */}
          <div className="border-t border-white/10 pt-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Globe className="h-5 w-5 text-brand-cyan" />
              Social & Web Links
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">LinkedIn URL</label>
                <div className="relative">
                  <Linkedin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <input
                    type="url"
                    value={linkedin}
                    onChange={(e) => setLinkedin(e.target.value)}
                    placeholder="https://linkedin.com/in/username"
                    className="w-full glass-input pl-12 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">GitHub URL</label>
                <div className="relative">
                  <Github className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <input
                    type="url"
                    value={github}
                    onChange={(e) => setGithub(e.target.value)}
                    placeholder="https://github.com/username"
                    className="w-full glass-input pl-12 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">Personal Website</label>
                <div className="relative">
                  <Globe className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <input
                    type="url"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://mywebsite.com"
                    className="w-full glass-input pl-12 text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Notification Preferences Section */}
          <div className="border-t border-white/10 pt-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Bell className="h-5 w-5 text-brand-cyan" />
              Email Notification Settings
            </h3>
            <p className="text-slate-400 text-xs mb-6 text-left">
              Configure which email updates you would like to receive. Security alerts are always active.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 text-left">
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={messagesPref}
                  onChange={(e) => setMessagesPref(e.target.checked)}
                  className="h-4.5 w-4.5 rounded border-white/10 bg-white/5 text-brand-violet focus:ring-brand-cyan accent-brand-cyan"
                />
                <span className="text-xs text-slate-300">New Direct Messages</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={applicationsPref}
                  onChange={(e) => setApplicationsPref(e.target.checked)}
                  className="h-4.5 w-4.5 rounded border-white/10 bg-white/5 text-brand-violet focus:ring-brand-cyan accent-brand-cyan"
                />
                <span className="text-xs text-slate-300">Team Applications</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={commentsPref}
                  onChange={(e) => setCommentsPref(e.target.checked)}
                  className="h-4.5 w-4.5 rounded border-white/10 bg-white/5 text-brand-violet focus:ring-brand-cyan accent-brand-cyan"
                />
                <span className="text-xs text-slate-300">Startup Comments</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={waitlistPref}
                  onChange={(e) => setWaitlistPref(e.target.checked)}
                  className="h-4.5 w-4.5 rounded border-white/10 bg-white/5 text-brand-violet focus:ring-brand-cyan accent-brand-cyan"
                />
                <span className="text-xs text-slate-300">Waitlist & Upvote Traction</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={aiReportsPref}
                  onChange={(e) => setAiReportsPref(e.target.checked)}
                  className="h-4.5 w-4.5 rounded border-white/10 bg-white/5 text-brand-violet focus:ring-brand-cyan accent-brand-cyan"
                />
                <span className="text-xs text-slate-300">AI Validation Reports</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={digestPref}
                  onChange={(e) => setDigestPref(e.target.checked)}
                  className="h-4.5 w-4.5 rounded border-white/10 bg-white/5 text-brand-violet focus:ring-brand-cyan accent-brand-cyan"
                />
                <span className="text-xs text-slate-300">Weekly Performance Digest</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={marketingPref}
                  onChange={(e) => setMarketingPref(e.target.checked)}
                  className="h-4.5 w-4.5 rounded border-white/10 bg-white/5 text-brand-violet focus:ring-brand-cyan accent-brand-cyan"
                />
                <span className="text-xs text-slate-300">Marketing & Newsletters</span>
              </label>
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end pt-4 border-t border-white/10">
            <button
              type="submit"
              disabled={mutation.isPending}
              className="glass-btn-primary flex items-center gap-2"
            >
              {mutation.isPending ? (
                <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Onboarding;
