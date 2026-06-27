import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { Rocket, User, LayoutDashboard, LogOut, Compass, Users, MessageSquare, Shield, Bell } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import API from '../services/api';
import { logoutSuccess } from '../features/authSlice';
import { socket } from '../services/socket';

const Navbar = () => {
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await API.post('/auth/logout');
      socket.disconnect(); // Terminate websocket connection on logout
      dispatch(logoutSuccess());
      navigate('/login');
    } catch (err) {
      console.error('Logout error', err);
    }
  };

  const dropdownRef = useRef(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const queryClient = useQueryClient();

  // Query notifications with polling
  const { data: notifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await API.get('/notifications');
      return res.data.data.notifications;
    },
    enabled: isAuthenticated,
    refetchInterval: 15000
  });

  // Click away dropdown listener
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Global socket listener for real-time notifications
  useEffect(() => {
    if (isAuthenticated && user) {
      socket.connect();
      socket.emit('join', user._id);

      socket.on('new_notification', (data) => {
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
        console.log('🔔 Global real-time notification socket event:', data);
      });

      socket.on('receive_message', (msg) => {
        if (window.location.pathname !== '/chat') {
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
          console.log('💬 Global real-time chat message socket event:', msg.sender);
        }
      });
    }

    return () => {
      socket.off('new_notification');
      socket.off('receive_message');
    };
  }, [isAuthenticated, user, queryClient]);

  const unreadCount = notifications?.filter(n => !n.isRead).length || 0;

  const markReadMutation = useMutation({
    mutationFn: async (id) => {
      await API.patch(`/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  return (
    <nav className="sticky top-0 z-50 w-full px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between bg-white/5 backdrop-blur-md border border-white/10 px-6 py-3 rounded-2xl shadow-lg">
        {/* LOGO */}
        <Link to="/" className="flex items-center gap-2 text-white hover:opacity-95 transition-opacity">
          <div className="bg-gradient-to-r from-violet-600 to-cyan-400 p-2 rounded-xl">
            <Rocket className="h-5 w-5 text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-300">
            StartupHub <span className="text-brand-cyan">AI</span>
          </span>
        </Link>

        {/* LINKS */}
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-1.5 text-slate-300 hover:text-white transition-colors text-sm font-medium">
            <Compass className="h-4 w-4" />
            Explore
          </Link>

          {isAuthenticated ? (
            <>
              {/* Founder / Admin features */}
              {(user?.role === 'founder' || user?.role === 'admin') && (
                <>
                  <Link to="/dashboard" className="flex items-center gap-1.5 text-slate-300 hover:text-white transition-colors text-sm font-medium">
                    <LayoutDashboard className="h-4 w-4" />
                    Dashboard
                  </Link>
                  <Link to="/submit-startup" className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-md transition-all duration-200">
                    Submit Idea
                  </Link>
                </>
              )}

              {/* Investor / Admin features */}
              {(user?.role === 'investor' || user?.role === 'admin') && (
                <>
                  <Link to="/investor-dashboard" className="flex items-center gap-1.5 text-slate-300 hover:text-white transition-colors text-sm font-medium">
                    <LayoutDashboard className="h-4 w-4" />
                    Investor Dashboard
                  </Link>
                  <Link to="/discovery" className="flex items-center gap-1.5 text-slate-300 hover:text-white transition-colors text-sm font-medium">
                    <Compass className="h-4 w-4" />
                    Discovery
                  </Link>
                </>
              )}

              {/* Admin Console Link */}
              {user?.role === 'admin' && (
                <Link to="/admin-dashboard" className="flex items-center gap-1.5 text-slate-300 hover:text-white transition-colors text-sm font-medium">
                  <Shield className="h-4 w-4 text-brand-purple" />
                  Admin Console
                </Link>
              )}

              <Link to="/matches" className="flex items-center gap-1.5 text-slate-300 hover:text-white transition-colors text-sm font-medium">
                <Users className="h-4 w-4" />
                Matches
              </Link>
              <Link to="/chat" className="flex items-center gap-1.5 text-slate-300 hover:text-white transition-colors text-sm font-medium">
                <MessageSquare className="h-4 w-4" />
                Chat
              </Link>

              {/* Notification Bell Dropdown */}
              <div className="relative flex items-center" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center text-slate-300 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/5 relative"
                  title="Notifications"
                >
                  <Bell className="h-4.5 w-4.5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-brand-cyan text-[8px] font-black text-darkBg-900 shadow-[0_0_10px_rgba(0,242,254,0.4)] animate-pulse">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 top-full mt-3 w-80 glass-card p-4 shadow-2xl z-50 text-left border border-white/10 animate-[fadeIn_0.2s_ease] max-h-[400px] overflow-hidden flex flex-col">
                    <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-3 shrink-0">
                      <span className="font-bold text-xs text-white">Recent Alerts</span>
                      <Link
                        to="/notifications"
                        onClick={() => setDropdownOpen(false)}
                        className="text-[10px] font-bold text-brand-cyan hover:underline uppercase tracking-wide"
                      >
                        View All
                      </Link>
                    </div>

                    <div className="space-y-2 overflow-y-auto pr-1 flex-1">
                      {notifications && notifications.length > 0 ? (
                        notifications.slice(0, 5).map((n) => (
                          <div
                            key={n._id}
                            onClick={() => {
                              setDropdownOpen(false);
                              if (!n.isRead) markReadMutation.mutate(n._id);
                              if (n.relatedResource) {
                                const { resourceType, resourceId } = n.relatedResource;
                                if (resourceType === 'Startup') navigate(`/startup/${resourceId}`);
                                else if (resourceType === 'Message') navigate('/chat');
                                else if (resourceType === 'Application') navigate('/dashboard');
                              }
                            }}
                            className={`p-2.5 rounded-xl border border-white/5 hover:border-white/10 hover:bg-white/5 cursor-pointer transition-all ${
                              !n.isRead ? 'bg-white/[0.02] border-l-2 border-l-brand-cyan' : ''
                            }`}
                          >
                            <p className="text-white text-xs font-bold truncate">{n.title}</p>
                            <p className="text-slate-400 text-[10px] line-clamp-2 mt-0.5">{n.message}</p>
                            <span className="text-[8px] text-slate-500 block mt-1">
                              {new Date(n.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        ))
                      ) : (
                        <p className="text-center text-slate-500 text-xs py-6 m-0">All caught up! No alerts.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Profile onboarding link */}
              <Link to="/onboarding" className="flex items-center gap-1.5 text-slate-300 hover:text-white transition-colors text-sm font-medium">
                <User className="h-4 w-4" />
                Profile
              </Link>

              {/* LogOut */}
              <button onClick={handleLogout} className="flex items-center gap-1.5 text-slate-400 hover:text-rose-400 transition-colors text-sm font-medium">
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </>
          ) : (
            <div className="flex items-center gap-4">
              <Link to="/login" className="text-slate-300 hover:text-white transition-colors text-sm font-medium">
                Log In
              </Link>
              <Link to="/signup" className="bg-white/10 hover:bg-white/15 border border-white/10 text-white text-sm font-medium px-4 py-2 rounded-xl transition-all duration-200">
                Join Now
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
