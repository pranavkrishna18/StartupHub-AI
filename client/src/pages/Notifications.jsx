import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { Bell, Check, Trash2, MailOpen, AlertCircle, Calendar, MessageSquare, ChevronUp, Users, ArrowRight, CheckCircle2 } from 'lucide-react';
import API from '../services/api';

const fetchNotifications = async () => {
  const res = await API.get('/notifications');
  return res.data.data.notifications;
};

const Notifications = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all'); // 'all', 'unread'

  // Fetch notifications query
  const { data: notifications, isLoading, isError } = useQuery({
    queryKey: ['notifications'],
    queryFn: fetchNotifications
  });

  // Mark single as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (id) => {
      await API.patch(`/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  // Mark all as read mutation
  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await API.patch('/notifications/mark-all-read');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  // Delete notification mutation
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await API.delete(`/notifications/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'comment':
        return <MessageSquare className="h-5 w-5 text-brand-purple" />;
      case 'vote':
        return <ChevronUp className="h-5 w-5 text-brand-cyan" />;
      case 'waitlist':
        return <Users className="h-5 w-5 text-emerald-400" />;
      case 'follow':
        return <Users className="h-5 w-5 text-indigo-400" />;
      case 'apply_cofounder':
        return <Users className="h-5 w-5 text-pink-400" />;
      case 'accept_application':
        return <CheckCircle2 className="h-5 w-5 text-emerald-400" />;
      case 'reject_application':
        return <AlertCircle className="h-5 w-5 text-rose-400" />;
      case 'chat_message':
        return <MessageSquare className="h-5 w-5 text-cyan-400" />;
      default:
        return <Bell className="h-5 w-5 text-slate-400" />;
    }
  };

  const handleRowClick = (n) => {
    // Mark as read first if unread
    if (!n.isRead) {
      markAsReadMutation.mutate(n._id);
    }

    // Navigate to related resource
    if (n.relatedResource) {
      const { resourceType, resourceId } = n.relatedResource;
      if (resourceType === 'Startup') {
        navigate(`/startup/${resourceId}`);
      } else if (resourceType === 'Message') {
        navigate('/chat');
      } else if (resourceType === 'Application') {
        navigate('/dashboard');
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-cyan"></div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-20 text-center text-slate-400 font-semibold glass-card">
        Failed to fetch notifications. Please try again.
      </div>
    );
  }

  const filteredNotifications = notifications?.filter((n) => {
    if (filter === 'unread') return !n.isRead;
    return true;
  }) || [];

  const unreadCount = notifications?.filter(n => !n.isRead).length || 0;

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 text-left">
      {/* HEADER */}
      <div className="border-b border-white/10 pb-6 mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-2 m-0 margin-0">
            <Bell className="h-8 w-8 text-brand-cyan" />
            Notification Center
          </h1>
          <p className="text-slate-400 mt-2">Manage updates, messages, and platform activity</p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending}
            className="glass-btn-secondary py-2 px-4 text-xs flex items-center gap-2 self-start sm:self-auto shrink-0"
          >
            <Check className="h-4 w-4" />
            Mark All as Read
          </button>
        )}
      </div>

      {/* FILTER TABS */}
      <div className="flex border-b border-white/5 mb-6">
        <button
          onClick={() => setFilter('all')}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-all ${
            filter === 'all'
              ? 'border-brand-cyan text-brand-cyan'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          All Notifications ({notifications?.length || 0})
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-all ${
            filter === 'unread'
              ? 'border-brand-cyan text-brand-cyan'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Unread ({unreadCount})
        </button>
      </div>

      {/* NOTIFICATIONS LIST */}
      {filteredNotifications.length === 0 ? (
        <div className="glass-card p-12 text-center text-slate-400 font-medium">
          <MailOpen className="h-12 w-12 mx-auto text-slate-500 mb-4 animate-bounce" />
          {filter === 'unread' ? "You don't have any unread notifications." : "You don't have any notifications yet."}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredNotifications.map((n) => (
            <div
              key={n._id}
              onClick={() => handleRowClick(n)}
              className={`glass-card p-5 flex items-start gap-4 cursor-pointer hover:border-white/20 transition-all ${
                !n.isRead ? 'bg-white/[0.03] border-l-4 border-l-brand-cyan' : ''
              }`}
            >
              {/* Icon Container */}
              <div className="h-10 w-10 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center shrink-0">
                {getNotificationIcon(n.type)}
              </div>

              {/* Message Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4">
                  <h3 className="font-bold text-white text-sm sm:text-base m-0 leading-tight">
                    {n.title}
                  </h3>
                  <span className="text-[10px] text-slate-500 font-medium whitespace-nowrap shrink-0 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(n.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-slate-400 text-xs sm:text-sm mt-1 mb-2 leading-relaxed">
                  {n.message}
                </p>
                {n.senderProfile && (
                  <span className="text-[10px] text-slate-500">
                    By {n.senderProfile.fullName}
                  </span>
                )}
              </div>

              {/* Actions Block */}
              <div className="flex items-center gap-2 shrink-0 self-center" onClick={(e) => e.stopPropagation()}>
                {!n.isRead && (
                  <button
                    onClick={() => markAsReadMutation.mutate(n._id)}
                    className="p-2 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-colors"
                    title="Mark as Read"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={() => deleteMutation.mutate(n._id)}
                  className="p-2 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-rose-400 hover:border-rose-500/30 transition-colors"
                  title="Delete Notification"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Notifications;
