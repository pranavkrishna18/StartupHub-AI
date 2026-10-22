import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Plus, Trash2, Briefcase } from 'lucide-react';
import API from '../services/api';

const SUPPORTED_ROLES = [
  'Founder',
  'Technical Co-Founder',
  'Business Co-Founder',
  'Frontend Developer',
  'Backend Developer',
  'Full Stack Developer',
  'Mobile Developer',
  'AI Engineer',
  'ML Engineer',
  'Data Scientist',
  'Cloud Engineer',
  'DevOps Engineer',
  'Cybersecurity Engineer',
  'UI Designer',
  'UX Designer',
  'Graphic Designer',
  'Product Designer',
  'Product Manager',
  'Business Analyst',
  'Marketing Lead',
  'Growth Hacker',
  'Sales Lead',
  'Finance Manager',
  'Legal Advisor',
  'Community Manager',
  'Content Writer',
  'QA Engineer',
  'Intern',
  'Volunteer'
];

const JobCreateModal = ({ isOpen, onClose, startupId, onSuccess }) => {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(SUPPORTED_ROLES[0]);
  const [responsibilities, setResponsibilities] = useState('');
  const [reqSkillsInput, setReqSkillsInput] = useState('');
  const [prefSkillsInput, setPrefSkillsInput] = useState('');
  const [experience, setExperience] = useState('2+ years');
  const [compensation, setCompensation] = useState('$5,000 - $8,000 / month');
  const [equity, setEquity] = useState('1% - 3%');
  const [workMode, setWorkMode] = useState('remote');
  const [location, setLocation] = useState('');
  const [deadline, setDeadline] = useState('');
  const [stages, setStages] = useState(['Screening', 'Technical Evaluation', 'HR Interview', 'Offer', 'Hired', 'Rejected']);
  const [newStageName, setNewStageName] = useState('');
  const [formError, setFormError] = useState('');

  const createJobMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await API.post('/jobs', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['founderStats'] });
      if (onSuccess) onSuccess();
      onClose();
      // Reset form
      setResponsibilities('');
      setReqSkillsInput('');
      setPrefSkillsInput('');
      setLocation('');
      setDeadline('');
    },
    onError: (err) => {
      setFormError(err.response?.data?.message || 'Failed to create job opening');
    }
  });

  if (!isOpen) return null;

  const handleAddStage = (e) => {
    e.preventDefault();
    if (!newStageName.trim()) return;
    if (stages.includes(newStageName.trim())) {
      setNewStageName('');
      return;
    }
    // Add stage before Hired and Rejected fallbacks
    const updated = [...stages];
    const insertIdx = Math.max(0, updated.length - 2);
    updated.splice(insertIdx, 0, newStageName.trim());
    setStages(updated);
    setNewStageName('');
  };

  const handleRemoveStage = (stageName) => {
    if (['Hired', 'Rejected', 'Screening'].includes(stageName)) return; // Required
    setStages(stages.filter(s => s !== stageName));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError('');

    if (!responsibilities.trim()) {
      setFormError('Responsibilities field is required');
      return;
    }
    if (!reqSkillsInput.trim()) {
      setFormError('Please add at least one required skill');
      return;
    }
    if ((workMode === 'hybrid' || workMode === 'on-site') && !location.trim()) {
      setFormError('Location is required for hybrid or on-site roles');
      return;
    }

    const payload = {
      startupId,
      title,
      responsibilities,
      requiredSkills: reqSkillsInput.split(',').map(s => s.trim()).filter(Boolean),
      preferredSkills: prefSkillsInput.split(',').map(s => s.trim()).filter(Boolean),
      experience,
      compensation,
      equity,
      workMode,
      location: workMode === 'remote' ? 'Remote' : location,
      applicationDeadline: deadline ? new Date(deadline) : undefined,
      hiringStages: stages
    };

    createJobMutation.mutate(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-[#0d0a1b]/95 border border-brand-purple/20 rounded-3xl p-6 md:p-8 shadow-2xl my-8">
        {/* CLOSE BUTTON */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 p-2 rounded-full transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        {/* HEADER */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-brand-cyan/10 border border-brand-cyan/20 rounded-2xl text-brand-cyan">
            <Briefcase className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-black text-white m-0 tracking-tight">Create Job Opening</h2>
            <p className="text-xs text-slate-400 mt-1">Configure role criteria and customized pipeline stages</p>
          </div>
        </div>

        {formError && (
          <div className="mb-4 p-3 bg-rose-950/30 border border-rose-500/30 rounded-xl text-rose-300 text-xs font-semibold">
            {formError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* TITLE */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Role Title</label>
              <select
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-cyan"
              >
                {SUPPORTED_ROLES.map((role) => (
                  <option key={role} value={role} className="bg-[#0d0a1b] text-white">
                    {role}
                  </option>
                ))}
              </select>
            </div>

            {/* WORK MODE */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Work Mode</label>
              <select
                value={workMode}
                onChange={(e) => setWorkMode(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-cyan"
              >
                <option value="remote" className="bg-[#0d0a1b] text-white">Remote</option>
                <option value="hybrid" className="bg-[#0d0a1b] text-white">Hybrid</option>
                <option value="on-site" className="bg-[#0d0a1b] text-white">On-site</option>
              </select>
            </div>
          </div>

          {/* LOCATION (Conditionally Rendered) */}
          {workMode !== 'remote' && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Office Location</label>
              <input
                type="text"
                placeholder="e.g. San Francisco, CA"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-cyan"
                required
              />
            </div>
          )}

          {/* RESPONSIBILITIES */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Responsibilities</label>
            <textarea
              rows={3}
              placeholder="Outline the core responsibilities, key tasks, and goals for this position..."
              value={responsibilities}
              onChange={(e) => setResponsibilities(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-cyan resize-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* REQUIRED SKILLS */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Required Skills</label>
              <input
                type="text"
                placeholder="e.g. React, Node.js, Python (comma separated)"
                value={reqSkillsInput}
                onChange={(e) => setReqSkillsInput(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-cyan"
              />
            </div>

            {/* PREFERRED SKILLS */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Preferred Skills</label>
              <input
                type="text"
                placeholder="e.g. AWS, Docker, Kubernetes (comma separated)"
                value={prefSkillsInput}
                onChange={(e) => setPrefSkillsInput(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-cyan"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* EXPERIENCE */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Experience Needed</label>
              <input
                type="text"
                placeholder="e.g. 2+ years, Entry Level"
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-cyan"
              />
            </div>

            {/* COMPENSATION */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Compensation</label>
              <input
                type="text"
                placeholder="e.g. $4,000/mo, Equity Only"
                value={compensation}
                onChange={(e) => setCompensation(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-cyan"
              />
            </div>

            {/* EQUITY */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Equity Share</label>
              <input
                type="text"
                placeholder="e.g. 1% - 5%"
                value={equity}
                onChange={(e) => setEquity(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-cyan"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* DEADLINE */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Application Deadline</label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-cyan"
              />
            </div>

            {/* PIPELINE CUSTOM STAGE ADDITION */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Custom Pipeline Stage</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. System Design Interview"
                  value={newStageName}
                  onChange={(e) => setNewStageName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-cyan"
                />
                <button
                  type="button"
                  onClick={handleAddStage}
                  className="bg-brand-cyan hover:bg-brand-cyan/80 text-[#0c0a1a] font-bold text-xs px-4 py-2 rounded-xl transition-all"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* ACTIVE PIPELINE STAGES VIEW */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Recruitment Pipeline Stages</label>
            <div className="flex flex-wrap gap-2 p-3 bg-white/5 border border-white/5 rounded-2xl">
              {stages.map((stageName, idx) => {
                const isSystem = ['Screening', 'Hired', 'Rejected'].includes(stageName);
                return (
                  <span
                    key={idx}
                    className={`inline-flex items-center gap-1.5 text-xs px-3.5 py-1.5 rounded-xl font-semibold border ${
                      isSystem
                        ? 'bg-brand-cyan/10 border-brand-cyan/20 text-brand-cyan'
                        : 'bg-brand-purple/10 border-brand-purple/20 text-brand-purple'
                    }`}
                  >
                    {idx + 1}. {stageName}
                    {!isSystem && (
                      <button
                        type="button"
                        onClick={() => handleRemoveStage(stageName)}
                        className="text-slate-400 hover:text-rose-400 p-0.5 rounded-full"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </span>
                );
              })}
            </div>
          </div>

          {/* SUBMIT BUTTON */}
          <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl text-sm font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createJobMutation.isPending}
              className="px-6 py-2.5 bg-brand-cyan hover:bg-brand-cyan/90 disabled:bg-slate-700 text-[#0c0a1a] rounded-xl text-sm font-black transition-all hover:scale-[1.02] shadow-[0_0_15px_rgba(0,242,254,0.2)]"
            >
              {createJobMutation.isPending ? 'Publishing...' : 'Publish Opening'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default JobCreateModal;
