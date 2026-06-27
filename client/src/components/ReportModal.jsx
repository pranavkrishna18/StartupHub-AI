import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { ShieldAlert, X } from 'lucide-react';
import API from '../services/api';

const ReportModal = ({ isOpen, onClose, startupId, startupName }) => {
  const [reason, setReason] = useState('Spam');
  const [description, setDescription] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const reportMutation = useMutation({
    mutationFn: async (reportData) => {
      const res = await API.post(`/reports/${startupId}`, reportData);
      return res.data;
    },
    onSuccess: () => {
      setSuccessMsg('Thank you. The report has been submitted to system moderators.');
      setTimeout(() => {
        setSuccessMsg('');
        setDescription('');
        setReason('Spam');
        onClose();
      }, 3000);
    },
    onError: (error) => {
      setErrorMsg(error.response?.data?.message || 'Failed to submit report. Please try again.');
      setTimeout(() => setErrorMsg(''), 5000);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!description.trim()) {
      setErrorMsg('Please describe the reason for reporting.');
      return;
    }
    reportMutation.mutate({ reason, description });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="glass-card w-full max-w-md p-6 relative overflow-hidden border border-white/10 rounded-2xl shadow-2xl text-left">
        {/* Header decoration */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-xl"></div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Title */}
        <div className="flex items-center gap-2 mb-4 text-rose-400">
          <ShieldAlert className="h-5 w-5" />
          <h3 className="text-lg font-bold text-white">Flag & Report Idea</h3>
        </div>

        <p className="text-slate-400 text-xs mb-6">
          Reporting <span className="text-slate-200 font-semibold">{startupName}</span> submits this concept to platform administrators for investigation. Please provide details.
        </p>

        {successMsg ? (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs p-4 rounded-xl font-medium">
            {successMsg}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Reason Select */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-slate-300 uppercase tracking-wider block">
                Reason Category
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full glass-input py-2 text-xs appearance-none cursor-pointer bg-[#0c0a1a]"
              >
                <option value="Spam" className="bg-[#0c0a1a]">Spam / Irrelevant Content</option>
                <option value="Scam" className="bg-[#0c0a1a]">Scam / Fraudulent Project</option>
                <option value="Inappropriate Content" className="bg-[#0c0a1a]">Inappropriate/Offensive Content</option>
                <option value="Copyright" className="bg-[#0c0a1a]">Copyright / IP Infringement</option>
                <option value="Other" className="bg-[#0c0a1a]">Other Reason</option>
              </select>
            </div>

            {/* Description Textarea */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-slate-300 uppercase tracking-wider block">
                Details & Explanation
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows="4"
                maxLength="1000"
                placeholder="Describe exactly why this startup violates policy..."
                className="w-full glass-input text-xs p-3 bg-[#0c0a1a] resize-none focus:outline-none"
              ></textarea>
            </div>

            {errorMsg && (
              <div className="text-rose-400 text-xs font-semibold">
                {errorMsg}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-white/5 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={reportMutation.isPending}
                className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-lg shadow-rose-900/20 transition-all flex items-center gap-1.5"
              >
                {reportMutation.isPending ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ReportModal;
