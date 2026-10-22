import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Briefcase, ListTodo, Megaphone, FileText, Calendar, Plus, Pin, Edit, CheckCircle, Clock, Star, PhoneCall, AlertCircle, Save, Folder, ChevronRight, X } from 'lucide-react';
import API from '../services/api';
import { socket } from '../services/socket';

const fetchWorkspaceData = async (startupId) => {
  const res = await API.get(`/workspace/${startupId}`);
  return res.data.data;
};

const Workspace = () => {
  const { startupId } = useParams();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('tasks'); // 'tasks', 'announcements', 'docs', 'meet'

  // Task Form State
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskPriority, setTaskPriority] = useState('medium');
  const [taskAssignee, setTaskAssignee] = useState('');
  const [taskDueDate, setTaskDueDate] = useState('');

  // Announcement Form State
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [annPinned, setAnnPinned] = useState(false);

  // Document Editor State
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [docTitle, setDocTitle] = useState('');
  const [docContent, setDocContent] = useState('');
  const [docType, setDocType] = useState('document');
  const [isCreatingDoc, setIsCreatingDoc] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['workspaceData', startupId],
    queryFn: () => fetchWorkspaceData(startupId),
    refetchInterval: 60000 // Poll every 1 min as safety fallback
  });

  // MUTATIONS
  const createTaskMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await API.post(`/workspace/${startupId}/tasks`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaceData', startupId] });
      setIsTaskModalOpen(false);
      setTaskTitle('');
      setTaskDesc('');
      setTaskAssignee('');
      setTaskDueDate('');
    }
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, status, assignee }) => {
      const res = await API.patch(`/workspace/${startupId}/tasks/${taskId}`, { status, assignee });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaceData', startupId] });
    }
  });

  const createAnnMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await API.post(`/workspace/${startupId}/announcements`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaceData', startupId] });
      setAnnTitle('');
      setAnnContent('');
      setAnnPinned(false);
    }
  });

  const togglePinAnnMutation = useMutation({
    mutationFn: async (announcementId) => {
      const res = await API.patch(`/workspace/${startupId}/announcements/${announcementId}/pin`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaceData', startupId] });
    }
  });

  const createDocMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await API.post(`/workspace/${startupId}/documents`, payload);
      return res.data;
    },
    onSuccess: (resData) => {
      queryClient.invalidateQueries({ queryKey: ['workspaceData', startupId] });
      setSelectedDoc(resData.data.document);
      setIsCreatingDoc(false);
    }
  });

  const updateDocMutation = useMutation({
    mutationFn: async ({ docId, payload }) => {
      const res = await API.patch(`/workspace/${startupId}/documents/${docId}`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaceData', startupId] });
    }
  });

  // SOCKET ROOM BINDINGS
  useEffect(() => {
    if (startupId) {
      socket.connect();
      socket.emit('join', `startup_workspace_${startupId}`);
      console.log(`🔌 Socket joined room: startup_workspace_${startupId}`);

      const handleSocketReload = () => {
        console.log('🔄 Sockets update received: refreshing workspace data...');
        queryClient.invalidateQueries({ queryKey: ['workspaceData', startupId] });
      };

      socket.on('task_created', handleSocketReload);
      socket.on('task_updated', handleSocketReload);
      socket.on('announcement_created', handleSocketReload);
      socket.on('announcement_updated', handleSocketReload);
      socket.on('document_created', handleSocketReload);
      socket.on('document_updated', handleSocketReload);

      return () => {
        socket.emit('leave', `startup_workspace_${startupId}`);
        socket.off('task_created');
        socket.off('task_updated');
        socket.off('announcement_created');
        socket.off('announcement_updated');
        socket.off('document_created');
        socket.off('document_updated');
      };
    }
  }, [startupId, queryClient]);

  // Load selected document when documents list loads or changes
  useEffect(() => {
    if (data?.documents?.length > 0 && !selectedDoc && !isCreatingDoc) {
      const initialDoc = data.documents[0];
      setSelectedDoc(initialDoc);
      setDocTitle(initialDoc.title);
      setDocContent(initialDoc.content);
      setDocType(initialDoc.type);
    }
  }, [data, selectedDoc, isCreatingDoc]);

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
        Failed to enter team workspace. Only founder owners and verified team members have access.<br />
        <Link to="/dashboard" className="text-brand-cyan hover:underline mt-4 inline-block">Go to My Dashboard</Link>
      </div>
    );
  }

  const { startup, tasks, announcements, documents, teamList } = data;
  const isOwner = startup.founder.toString() === socket.id || true; // Check permissions context

  // Task Column filtering
  const todoTasks = tasks.filter(t => t.status === 'todo');
  const progressTasks = tasks.filter(t => t.status === 'in-progress');
  const doneTasks = tasks.filter(t => t.status === 'done');

  const handleSelectDoc = (doc) => {
    setIsCreatingDoc(false);
    setSelectedDoc(doc);
    setDocTitle(doc.title);
    setDocContent(doc.content);
    setDocType(doc.type);
  };

  const handleSaveDoc = (e) => {
    e.preventDefault();
    if (!docTitle.trim() || !docContent.trim()) return;

    if (isCreatingDoc) {
      createDocMutation.mutate({ title: docTitle, content: docContent, type: docType });
    } else if (selectedDoc) {
      updateDocMutation.mutate({
        docId: selectedDoc._id,
        payload: { title: docTitle, content: docContent, type: docType }
      });
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 text-left">
      {/* HEADER */}
      <div className="border-b border-white/10 pb-6 mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-[10px] bg-brand-cyan/15 text-brand-cyan px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
            Team Workspace
          </span>
          <h1 className="text-3xl font-extrabold text-white tracking-tight mt-2 flex items-center gap-2 m-0">
            <Briefcase className="h-8 w-8 text-brand-cyan animate-pulse" />
            {startup.name} Collaboration Hub
          </h1>
        </div>
        <Link to={`/startup/${startup._id}`} className="text-slate-400 hover:text-white text-xs font-bold flex items-center gap-1">
          Back to Concept Details
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      {/* TABS SELECTOR */}
      <div className="flex border-b border-white/5 mb-8 gap-4 overflow-x-auto pb-1">
        {[
          { id: 'tasks', label: 'Sprint Board', icon: ListTodo },
          { id: 'announcements', label: 'Announcements', icon: Megaphone },
          { id: 'docs', label: 'Wiki Document Binders', icon: FileText },
          { id: 'meet', label: 'Calendar & Voice', icon: Calendar }
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 text-xs font-bold tracking-wider transition-colors border-b-2 uppercase flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === tab.id ? 'border-brand-cyan text-brand-cyan' : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB CONTENTS */}
      <div className="min-h-[50vh]">
        {/* ================= TAB 1: SPRINT KANBAN ================= */}
        {activeTab === 'tasks' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-white m-0">Project Sprint Tracker</h3>
              <button
                onClick={() => setIsTaskModalOpen(true)}
                className="bg-brand-cyan hover:bg-brand-cyan/85 text-[#0c0a1a] font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-1 hover:scale-[1.02] transition-all"
              >
                <Plus className="h-4 w-4" />
                Add Sprint Task
              </button>
            </div>

            {/* Kanban Columns */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {[
                { title: 'To Do', items: todoTasks, statusKey: 'todo', border: 'border-indigo-500/20', glow: 'text-indigo-400' },
                { title: 'In Progress', items: progressTasks, statusKey: 'in-progress', border: 'border-brand-cyan/20', glow: 'text-brand-cyan' },
                { title: 'Done', items: doneTasks, statusKey: 'done', border: 'border-emerald-500/20', glow: 'text-emerald-400' }
              ].map((col, idx) => (
                <div key={idx} className={`glass-card p-5 border ${col.border} min-h-[400px] flex flex-col justify-start`}>
                  <div className="flex justify-between items-center pb-3 border-b border-white/5 mb-4">
                    <span className="font-extrabold text-sm text-white flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${col.glow.replace('text-', 'bg-')}`}></span>
                      {col.title}
                    </span>
                    <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded-md text-slate-400 font-bold">
                      {col.items.length}
                    </span>
                  </div>

                  <div className="space-y-3 flex-1 overflow-y-auto max-h-[500px] pr-1">
                    {col.items.map((task) => {
                      const priorityColor = task.priority === 'high' 
                        ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                        : task.priority === 'medium'
                        ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                        : 'bg-slate-500/10 border-slate-500/20 text-slate-400';

                      return (
                        <div key={task._id} className="p-4 bg-[#0d0a1b]/60 border border-white/5 rounded-2xl hover:border-white/10 transition-colors text-left space-y-3">
                          <div>
                            <span className={`text-[8px] uppercase tracking-wider px-2 py-0.5 rounded-full font-black border ${priorityColor}`}>
                              {task.priority} Priority
                            </span>
                            <h4 className="font-bold text-white text-sm mt-2">{task.title}</h4>
                            {task.description && (
                              <p className="text-slate-400 text-xs mt-1.5 leading-relaxed line-clamp-2">{task.description}</p>
                            )}
                          </div>

                          <div className="flex flex-col gap-1.5 pt-3 border-t border-white/5 text-[10px]">
                            <div className="flex justify-between items-center text-slate-500">
                              <span>Assignee:</span>
                              <span className="font-bold text-slate-300 truncate max-w-[120px]">
                                {task.assignee?.email || 'Unassigned'}
                              </span>
                            </div>
                            {task.dueDate && (
                              <div className="flex justify-between items-center text-slate-500">
                                <span>Due Date:</span>
                                <span className="font-bold text-slate-400">
                                  {new Date(task.dueDate).toLocaleDateString()}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Quick State Shifter */}
                          <div className="flex justify-end gap-1.5 pt-2">
                            {col.statusKey !== 'todo' && (
                              <button
                                onClick={() => updateTaskMutation.mutate({ taskId: task._id, status: 'todo' })}
                                className="text-[9px] bg-white/5 text-slate-400 hover:text-white px-2 py-1 rounded"
                                title="Move to To Do"
                              >
                                Todo
                              </button>
                            )}
                            {col.statusKey !== 'in-progress' && (
                              <button
                                onClick={() => updateTaskMutation.mutate({ taskId: task._id, status: 'in-progress' })}
                                className="text-[9px] bg-white/5 text-slate-400 hover:text-white px-2 py-1 rounded"
                                title="Move to In Progress"
                              >
                                Work
                              </button>
                            )}
                            {col.statusKey !== 'done' && (
                              <button
                                onClick={() => updateTaskMutation.mutate({ taskId: task._id, status: 'done' })}
                                className="text-[9px] bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded"
                                title="Move to Done"
                              >
                                Done
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {col.items.length === 0 && (
                      <div className="text-center py-12 text-slate-500 text-xs italic">
                        Empty column
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= TAB 2: ANNOUNCEMENTS ================= */}
        {activeTab === 'announcements' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* POST ANNOUNCEMENT (FOUNDERS) */}
            <div className="lg:col-span-1 text-left">
              <div className="glass-card p-6 space-y-4">
                <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-1.5">
                  <Megaphone className="h-5 w-5 text-brand-purple" />
                  Post Broadcast
                </h3>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!annTitle.trim() || !annContent.trim()) return;
                    createAnnMutation.mutate({ title: annTitle, content: annContent, isPinned: annPinned });
                  }}
                  className="space-y-4 text-xs"
                >
                  <div className="flex flex-col gap-1.5">
                    <label className="font-bold uppercase tracking-wider text-slate-400">Broadcast Title</label>
                    <input
                      type="text"
                      placeholder="e.g. Server Migration Tonight"
                      value={annTitle}
                      onChange={(e) => setAnnTitle(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-brand-cyan"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="font-bold uppercase tracking-wider text-slate-400">Content</label>
                    <textarea
                      rows={5}
                      placeholder="Type your message description here..."
                      value={annContent}
                      onChange={(e) => setAnnContent(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-brand-cyan resize-none"
                      required
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="pin-chk"
                      checked={annPinned}
                      onChange={(e) => setAnnPinned(e.target.checked)}
                      className="rounded border-white/10 bg-white/5 text-brand-cyan focus:ring-0 focus:ring-offset-0"
                    />
                    <label htmlFor="pin-chk" className="font-bold uppercase tracking-wider text-slate-400 cursor-pointer">
                      Pin Announcement
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={createAnnMutation.isPending}
                    className="w-full py-3 bg-brand-cyan hover:bg-brand-cyan/85 disabled:bg-slate-700 text-[#0c0a1a] font-bold rounded-xl transition-all hover:scale-[1.02]"
                  >
                    Broadcast Alert
                  </button>
                </form>
              </div>
            </div>

            {/* ANNOUNCEMENTS LIST */}
            <div className="lg:col-span-2 space-y-4 text-left">
              {announcements.length === 0 ? (
                <div className="glass-card p-12 text-center text-slate-500">
                  No announcements posted yet in this workspace.
                </div>
              ) : (
                announcements.map((ann) => (
                  <div
                    key={ann._id}
                    className={`glass-card p-6 border-l-4 relative hover:border-white/20 transition-all ${
                      ann.isPinned ? 'border-l-amber-400 bg-amber-500/[0.02]' : 'border-l-white/15'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        {ann.isPinned && (
                          <span className="inline-flex items-center gap-1 text-[8px] uppercase tracking-wider px-2 py-0.5 rounded-full font-black bg-amber-500/10 border border-amber-500/20 text-amber-400 mb-2">
                            <Star className="h-3 w-3" />
                            Pinned Announcement
                          </span>
                        )}
                        <h4 className="font-extrabold text-white text-base leading-snug">{ann.title}</h4>
                        <p className="text-slate-300 text-xs mt-3 leading-relaxed whitespace-pre-wrap">{ann.content}</p>
                      </div>

                      <button
                        onClick={() => togglePinAnnMutation.mutate(ann._id)}
                        className="text-slate-400 hover:text-amber-400 p-1.5 rounded-full transition-colors shrink-0"
                        title="Toggle Pin"
                      >
                        <Pin className={`h-4 w-4 ${ann.isPinned ? 'text-amber-400 fill-amber-400' : ''}`} />
                      </button>
                    </div>

                    <div className="pt-4 mt-4 border-t border-white/5 flex justify-between items-center text-[10px] text-slate-500">
                      <span>Broadcasted by: <strong>{ann.author?.email}</strong></span>
                      <span>{new Date(ann.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ================= TAB 3: WIKI DOCS ================= */}
        {activeTab === 'docs' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* DOCUMENTS FILES LIST */}
            <div className="lg:col-span-1 text-left space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Binder Folders</span>
                <button
                  onClick={() => {
                    setIsCreatingDoc(true);
                    setSelectedDoc(null);
                    setDocTitle('Untitled Document');
                    setDocContent('# Untitled Document\n\nStart typing documentation notes here...');
                    setDocType('document');
                  }}
                  className="text-[10px] bg-brand-cyan/10 hover:bg-brand-cyan/20 border border-brand-cyan/20 text-brand-cyan font-bold px-3 py-1.5 rounded-lg flex items-center gap-1"
                >
                  <Plus className="h-3 w-3" />
                  New Doc
                </button>
              </div>

              <div className="glass-card p-4 space-y-2 max-h-[450px] overflow-y-auto pr-1">
                {documents.map((doc) => {
                  const isSelected = selectedDoc?._id === doc._id;
                  const typeLabel = doc.type === 'meeting-note' 
                    ? 'Meeting Note' 
                    : doc.type === 'roadmap' 
                    ? 'Roadmap' 
                    : 'Wiki Doc';

                  return (
                    <button
                      key={doc._id}
                      onClick={() => handleSelectDoc(doc)}
                      className={`w-full p-3 rounded-xl border flex items-center justify-between text-left transition-all ${
                        isSelected 
                          ? 'bg-brand-cyan/10 border-brand-cyan/30 text-white' 
                          : 'bg-white/5 border-transparent text-slate-400 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <div className="truncate">
                        <div className="font-bold text-xs truncate leading-none">{doc.title}</div>
                        <span className="text-[9px] text-slate-500 font-bold uppercase block mt-1.5">
                          {typeLabel}
                        </span>
                      </div>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  );
                })}

                {documents.length === 0 && !isCreatingDoc && (
                  <div className="text-center py-10 text-slate-500 text-xs">
                    No documents created yet.
                  </div>
                )}
              </div>
            </div>

            {/* DOCUMENT VIEWER/EDITOR */}
            <div className="lg:col-span-2 text-left">
              {(selectedDoc || isCreatingDoc) ? (
                <form onSubmit={handleSaveDoc} className="glass-card p-6 space-y-4">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-white/5 pb-4 gap-4">
                    <div className="flex-1 w-full">
                      <input
                        type="text"
                        value={docTitle}
                        onChange={(e) => setDocTitle(e.target.value)}
                        className="w-full bg-transparent border-0 border-b border-transparent focus:border-brand-cyan/35 text-lg font-black text-white focus:outline-none p-0 leading-tight"
                        required
                      />
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <select
                        value={docType}
                        onChange={(e) => setDocType(e.target.value)}
                        className="bg-[#0c0a1a] border border-white/15 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-brand-cyan font-semibold"
                      >
                        <option value="document">Wiki Document</option>
                        <option value="meeting-note">Meeting Note</option>
                        <option value="roadmap">Roadmap</option>
                      </select>
                      <button
                        type="submit"
                        className="bg-brand-cyan hover:bg-brand-cyan/85 text-[#0c0a1a] font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-[0_0_10px_rgba(0,242,254,0.1)] transition-all"
                      >
                        <Save className="h-3.5 w-3.5" />
                        Save
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Document Editor Content (Markdown supported)</label>
                    <textarea
                      rows={14}
                      value={docContent}
                      onChange={(e) => setDocContent(e.target.value)}
                      className="w-full bg-white/[0.02] border border-white/10 rounded-2xl px-4 py-3 text-xs text-slate-200 focus:outline-none focus:border-brand-cyan font-mono resize-none leading-relaxed"
                    />
                  </div>
                  
                  {selectedDoc && (
                    <div className="text-[10px] text-slate-500 flex justify-between">
                      <span>Edited by: <strong>{selectedDoc.author?.email}</strong></span>
                      <span>Last updated: {new Date(selectedDoc.updatedAt).toLocaleString()}</span>
                    </div>
                  )}
                </form>
              ) : (
                <div className="glass-card p-12 text-center text-slate-500 min-h-[350px] flex flex-col justify-center items-center">
                  <Folder className="h-10 w-10 text-slate-600 mb-4" />
                  <h4 className="text-white font-bold text-base mb-1">Select Document Folder</h4>
                  <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                    Select a document folder from the list or click "New Doc" to begin typing documentation.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= TAB 4: CALENDAR & VOICE ================= */}
        {activeTab === 'meet' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Voice Meet Card */}
            <div className="lg:col-span-1 text-left">
              <div className="glass-card p-6 text-center space-y-4 flex flex-col justify-between min-h-[220px]">
                <div className="inline-flex p-3 bg-brand-cyan/10 border border-brand-cyan/20 text-brand-cyan rounded-full mx-auto">
                  <PhoneCall className="h-6 w-6 text-brand-cyan" />
                </div>
                <div>
                  <h4 className="font-extrabold text-white text-base">Huddle Room</h4>
                  <p className="text-slate-400 text-xs mt-2 leading-relaxed">
                    Establish instant voice meeting huddles with team co-founders.
                  </p>
                </div>
                <a
                  href={`https://meet.jit.si/startuphub_workspace_huddle_${startupId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-2.5 bg-brand-cyan hover:bg-brand-cyan/85 text-[#0c0a1a] font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_0_15px_rgba(0,242,254,0.15)]"
                >
                  <PhoneCall className="h-3.5 w-3.5" />
                  Start Live Call
                </a>
              </div>
            </div>

            {/* Calendar Event Schedule List */}
            <div className="lg:col-span-2 glass-card p-6 text-left">
              <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-brand-purple" />
                Milestone Schedule Planner
              </h3>
              
              <div className="space-y-4">
                {[
                  { title: 'AI Validation Report V2 Review', date: 'Jul 15, 2026', time: '10:00 AM', type: 'Design' },
                  { title: 'MVP Wireframes Integration Sync', date: 'Jul 22, 2026', time: '02:30 PM', type: 'Frontend' },
                  { title: 'Database Schema Migration to Production', date: 'Jul 30, 2026', time: '11:00 AM', type: 'DevOps' }
                ].map((event, idx) => (
                  <div key={idx} className="p-4 border border-white/5 bg-white/5 rounded-2xl flex justify-between items-center gap-4 hover:border-white/10 transition-colors">
                    <div>
                      <span className="text-[9px] bg-brand-purple/10 border border-brand-purple/20 text-brand-purple px-2 py-0.5 rounded font-bold uppercase">
                        {event.type}
                      </span>
                      <h4 className="font-bold text-white text-sm mt-2 leading-none">{event.title}</h4>
                      <p className="text-[10px] text-slate-500 mt-2 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {event.date} at {event.time}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SPRINT TASK MODAL */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-[#0d0a1b] border border-brand-cyan/20 rounded-3xl p-6 shadow-2xl">
            <button
              onClick={() => setIsTaskModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 p-2 rounded-full transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            <h3 className="text-xl font-extrabold text-white mb-2">Create Sprint Task</h3>
            <p className="text-xs text-slate-400 mb-4">Add a new actionable objective to your Kanban sprints.</p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!taskTitle.trim()) return;
                createTaskMutation.mutate({
                  title: taskTitle,
                  description: taskDesc,
                  priority: taskPriority,
                  assignee: taskAssignee || undefined,
                  dueDate: taskDueDate || undefined
                });
              }}
              className="space-y-4 text-left text-xs"
            >
              <div className="flex flex-col gap-1.5">
                <label className="font-bold uppercase tracking-wider text-slate-400">Task Title</label>
                <input
                  type="text"
                  placeholder="e.g. Design Landing Page UX"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-brand-cyan"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-bold uppercase tracking-wider text-slate-400">Description</label>
                <textarea
                  rows={3}
                  placeholder="Outline criteria or details..."
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-brand-cyan resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="font-bold uppercase tracking-wider text-slate-400">Priority</label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value)}
                    className="w-full bg-[#0c0a1a] border border-white/10 rounded-xl px-4 py-2 text-xs text-white focus:outline-none"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-bold uppercase tracking-wider text-slate-400">Due Date</label>
                  <input
                    type="date"
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-bold uppercase tracking-wider text-slate-400">Assign Teammate</label>
                <select
                  value={taskAssignee}
                  onChange={(e) => setTaskAssignee(e.target.value)}
                  className="w-full bg-[#0c0a1a] border border-white/10 rounded-xl px-4 py-2 text-xs text-white focus:outline-none"
                >
                  <option value="">Select Assignee</option>
                  {teamList.map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.fullName} ({t.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsTaskModalOpen(false)}
                  className="px-4 py-2 bg-white/5 text-white rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createTaskMutation.isPending}
                  className="px-5 py-2 bg-brand-cyan hover:bg-brand-cyan/85 disabled:bg-slate-700 text-[#0c0a1a] rounded-xl text-xs font-bold transition-all"
                >
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Workspace;
