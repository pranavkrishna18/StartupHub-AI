import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Rocket, FileText, Globe, Tag, AlertCircle } from 'lucide-react';
import API from '../services/api';

const fetchCategories = async () => {
  const res = await API.get('/categories');
  return res.data.data.categories;
};

const createStartupAPI = async (data) => {
  const res = await API.post('/startups', data);
  return res.data.data.startup;
};

const CreateStartup = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [tagline, setTagline] = useState('');
  const [description, setDescription] = useState('');
  const [website, setWebsite] = useState('');
  const [pitchDeckUrl, setPitchDeckUrl] = useState('');
  const [categoryId, setCategoryId] = useState('');

  const [formError, setFormError] = useState('');

  // Fetch categories for selector
  const { data: categories, isLoading: catLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories
  });

  const mutation = useMutation({
    mutationFn: createStartupAPI,
    onSuccess: (data) => {
      navigate(`/startup/${data._id}`);
    },
    onError: (err) => {
      setFormError(err.response?.data?.message || 'Failed to submit startup idea.');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError('');

    if (!categoryId) {
      setFormError('Please select a focus category for your startup');
      return;
    }

    mutation.mutate({
      name,
      tagline,
      description,
      website,
      pitchDeckUrl,
      categoryId
    });
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <div className="glass-card p-8 md:p-10 shadow-2xl relative overflow-hidden">
        {/* Glow */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-violet-600/5 rounded-full blur-3xl"></div>

        <div className="border-b border-white/10 pb-6 mb-8 text-left">
          <h1 className="text-3xl font-extrabold text-white tracking-tight m-0 margin-0">Submit Startup Idea</h1>
          <p className="text-slate-400 mt-2">Publish your startup concept to start validating and building early waitlists</p>
        </div>

        {formError && (
          <div className="mb-6 flex items-start gap-2 bg-rose-500/10 border border-rose-500/20 text-rose-300 p-4 rounded-xl text-sm">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 text-left">
          {/* Startup Name */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">Startup Name</label>
            <div className="relative">
              <Rocket className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength="100"
                placeholder="Acme Corp"
                className="w-full glass-input pl-12"
              />
            </div>
          </div>

          {/* Catchy Tagline */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">Catchy Tagline</label>
            <div className="relative">
              <FileText className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="text"
                required
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                maxLength="150"
                placeholder="The ultimate dashboard for remote developers"
                className="w-full glass-input pl-12"
              />
            </div>
          </div>

          {/* Category Dropdown */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">Industry Category</label>
            <div className="relative">
              <Tag className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <select
                required
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full glass-input pl-12 appearance-none cursor-pointer pr-10"
              >
                <option value="" className="bg-[#0c0a1a]">Select category...</option>
                {categories?.map((cat) => (
                  <option key={cat._id} value={cat._id} className="bg-[#0c0a1a]">
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">Detailed Concept Description</label>
            <textarea
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detail the problem you are solving, your core features, target audience, and how your AI-assisted validation score will help you launch..."
              rows="6"
              className="w-full glass-input p-4 resize-none text-sm"
            />
          </div>

          {/* Websites links */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">Website URL (Optional)</label>
              <div className="relative">
                <Globe className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://acme.com"
                  className="w-full glass-input pl-12 text-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">Pitch Deck URL (Optional)</label>
              <div className="relative">
                <FileText className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input
                  type="url"
                  value={pitchDeckUrl}
                  onChange={(e) => setPitchDeckUrl(e.target.value)}
                  placeholder="https://slideshare.com/my-deck"
                  className="w-full glass-input pl-12 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-4 pt-6 border-t border-white/10">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="glass-btn-secondary py-2.5"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="glass-btn-primary py-2.5 flex items-center gap-2"
            >
              {mutation.isPending ? (
                <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                'Submit Concept'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateStartup;
