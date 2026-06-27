import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MessageSquare, Send, User, ChevronLeft, ArrowLeft, Loader, BrainCircuit } from 'lucide-react';
import API from '../services/api';
import { socket } from '../services/socket';

// REST endpoints
const fetchRecentChats = async () => {
  const res = await API.get('/messages/recent');
  return res.data.data.chats;
};

const fetchConversation = async (partnerId) => {
  const res = await API.get(`/messages/conversation/${partnerId}`);
  return res.data.data.messages;
};

const Chat = () => {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const { user } = useSelector((state) => state.auth);

  // Selected chat partner
  const urlUserId = searchParams.get('userId');
  const [activePartnerId, setActivePartnerId] = useState(urlUserId || null);
  const [messageText, setMessageText] = useState('');
  
  // Real-time local message array state (appends live sockets before React Query refetches)
  const [liveMessages, setLiveMessages] = useState([]);
  const messageEndRef = useRef(null);

  // 1. Fetch recent conversations list
  const { data: recentChats, isLoading: chatsLoading } = useQuery({
    queryKey: ['recentChats'],
    queryFn: fetchRecentChats,
    refetchInterval: 10000 // Refresh list summaries every 10s
  });

  // 2. Fetch active conversation messages
  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: ['conversation', activePartnerId],
    queryFn: () => fetchConversation(activePartnerId),
    enabled: !!activePartnerId,
    onSuccess: (data) => {
      setLiveMessages(data);
    }
  });

  // Sync query data with local state whenever active partner messages are fetched
  useEffect(() => {
    if (messages) {
      setLiveMessages(messages);
    }
  }, [messages]);

  // SOCKET CONNECTION & SUBSCRIPTIONS
  useEffect(() => {
    if (!user) return;

    // Connect socket
    socket.connect();
    socket.emit('join', user._id);

    // Listen to incoming messages
    socket.on('receive_message', (msg) => {
      // If message is from our currently active chat partner
      if (activePartnerId && (msg.sender === activePartnerId || msg.receiver === activePartnerId)) {
        setLiveMessages((prev) => [...prev, msg]);
        // Auto scroll to bottom
        setTimeout(scrollToBottom, 100);
      }
      // Invalidate recent chats and conversation cache
      queryClient.invalidateQueries({ queryKey: ['recentChats'] });
      queryClient.invalidateQueries({ queryKey: ['conversation', activePartnerId] });
    });

    // Listen to message sent confirmation
    socket.on('message_sent', (msg) => {
      setLiveMessages((prev) => {
        // Avoid duplicate appends if already listed
        if (prev.some(m => m._id === msg._id)) return prev;
        return [...prev, msg];
      });
      setTimeout(scrollToBottom, 100);
      queryClient.invalidateQueries({ queryKey: ['recentChats'] });
    });

    return () => {
      socket.off('receive_message');
      socket.off('message_sent');
    };
  }, [user, activePartnerId, queryClient]);

  // Auto-scroll logic
  const scrollToBottom = () => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [liveMessages]);

  // If URL query param has a partner ID not yet in our recent chats, load profile details to show header
  const [partnerProfile, setPartnerProfile] = useState(null);
  useEffect(() => {
    if (urlUserId && !recentChats?.some(c => c.partnerId === urlUserId)) {
      API.get(`/profiles/${urlUserId}`)
        .then(res => {
          const prof = res.data.data.profile;
          setPartnerProfile({
            partnerId: urlUserId,
            fullName: prof.fullName,
            headline: prof.headline,
            avatar: prof.avatar
          });
        })
        .catch(err => console.error(err));
    } else {
      setPartnerProfile(null);
    }
  }, [urlUserId, recentChats]);

  // SEND MESSAGE HANDLER
  const handleSend = (e) => {
    e.preventDefault();
    if (!messageText.trim() || !activePartnerId) return;

    // Emit via Socket.IO
    socket.emit('send_message', {
      senderId: user._id,
      receiverId: activePartnerId,
      content: messageText.trim()
    });

    setMessageText('');
  };

  // Find active chat partner profile details
  const activeChat = recentChats?.find(c => c.partnerId === activePartnerId) || partnerProfile;

  return (
    <div className="max-w-6xl mx-auto px-6 py-12 text-left">
      <div className="border-b border-white/10 pb-6 mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-2 m-0 margin-0">
            <MessageSquare className="h-8 w-8 text-brand-cyan" />
            Co-Founder Messaging
          </h1>
          <p className="text-slate-400 mt-2">Real-time team building chat and collaboration workspace</p>
        </div>
        <Link to="/matches" className="glass-btn-secondary py-2 px-4 text-xs flex items-center gap-1.5 hover:border-brand-purple/35">
          <BrainCircuit className="h-3.5 w-3.5 text-brand-purple" />
          Find Partners
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[65vh] min-h-[500px]">
        {/* RECENT CHATS LIST PANEL */}
        <div className="glass-card p-4 overflow-y-auto flex flex-col gap-3">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Conversations</h3>
          
          {chatsLoading ? (
            <div className="flex justify-center py-10">
              <Loader className="h-6 w-6 text-brand-cyan animate-spin" />
            </div>
          ) : recentChats?.length === 0 && !partnerProfile ? (
            <div className="text-center py-20 text-slate-500 text-xs px-4">
              No conversations started yet. Use "Find Partners" to find matching founders or co-founders!
            </div>
          ) : (
            <div className="space-y-2">
              {/* If we navigated from a Match profile, show them at top of chats */}
              {partnerProfile && (
                <button
                  onClick={() => setActivePartnerId(partnerProfile.partnerId)}
                  className={`w-full text-left p-3.5 rounded-xl border flex items-start gap-3 transition-all ${
                    activePartnerId === partnerProfile.partnerId
                      ? 'bg-brand-violet/10 border-brand-violet/40 text-white shadow-[0_0_15px_rgba(124,58,237,0.05)]'
                      : 'bg-white/5 border-white/5 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  <div className="h-9 w-9 bg-white/10 border border-white/10 rounded-lg flex items-center justify-center text-white font-bold text-xs shrink-0">
                    {partnerProfile.fullName[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold truncate">{partnerProfile.fullName}</h4>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">{partnerProfile.headline || 'New Match'}</p>
                  </div>
                </button>
              )}

              {recentChats?.map((chat) => (
                <button
                  key={chat.partnerId}
                  onClick={() => setActivePartnerId(chat.partnerId)}
                  className={`w-full text-left p-3.5 rounded-xl border flex items-start gap-3 transition-all ${
                    activePartnerId === chat.partnerId
                      ? 'bg-brand-violet/10 border-brand-violet/40 text-white shadow-[0_0_15px_rgba(124,58,237,0.05)]'
                      : 'bg-white/5 border-white/5 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  <div className="h-9 w-9 bg-white/10 border border-white/10 rounded-lg flex items-center justify-center text-white font-bold text-xs shrink-0 relative">
                    {chat.fullName[0]}
                    {chat.unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-brand-cyan text-darkBg-900 text-[9px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center shadow-md animate-pulse">
                        {chat.unreadCount}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center gap-1.5">
                      <h4 className="text-xs font-bold truncate">{chat.fullName}</h4>
                      <span className="text-[8px] text-slate-500 shrink-0">
                        {new Date(chat.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 truncate mt-1">{chat.lastMessage}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* CONVERSATION MESSAGES BOX */}
        <div className="md:col-span-2 glass-card flex flex-col justify-between overflow-hidden relative">
          {activePartnerId ? (
            <>
              {/* Conversation Header */}
              <div className="p-4 border-b border-white/10 bg-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 bg-brand-cyan/20 border border-brand-cyan/35 text-brand-cyan font-bold rounded-lg flex items-center justify-center text-xs">
                    {activeChat?.fullName[0] || 'U'}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white leading-none">{activeChat?.fullName}</h3>
                    <p className="text-[10px] text-slate-400 mt-1 capitalize">{activeChat?.role} &bull; {activeChat?.headline || 'No headline set'}</p>
                  </div>
                </div>
              </div>

              {/* Chat Message Lists */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-thin">
                {messagesLoading ? (
                  <div className="flex justify-center items-center h-full">
                    <Loader className="h-6 w-6 text-brand-cyan animate-spin" />
                  </div>
                ) : liveMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-500 text-xs">
                    <MessageSquare className="h-10 w-10 mb-2 opacity-30" />
                    <span>Send a message to initiate co-founder matching chat.</span>
                  </div>
                ) : (
                  liveMessages.map((msg) => {
                    const isMe = msg.sender === user._id;
                    return (
                      <div
                        key={msg._id || Math.random()}
                        className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-xs shadow-md ${
                            isMe
                              ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-br-none'
                              : 'bg-white/5 border border-white/10 text-slate-200 rounded-bl-none'
                          }`}
                        >
                          <p className="leading-relaxed break-words">{msg.content}</p>
                          <span className="block text-[8px] text-slate-400 mt-1 text-right">
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messageEndRef} />
              </div>

              {/* Chat input box */}
              <form onSubmit={handleSend} className="p-4 border-t border-white/10 bg-[#0c0a1a]/60 flex gap-3">
                <input
                  type="text"
                  required
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 glass-input py-2.5 text-xs"
                />
                <button
                  type="submit"
                  className="glass-btn-primary p-2.5 rounded-xl shrink-0 flex items-center justify-center"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col justify-center items-center text-slate-500 text-sm">
              <MessageSquare className="h-14 w-14 mb-4 opacity-20 text-brand-cyan" />
              <span>Select a conversation to start chat.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Chat;
