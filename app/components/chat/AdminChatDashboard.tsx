// app/components/chat/AdminChatDashboard.tsx
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { usePollingChat } from '@/app/hooks/usePollingChat';
import { useSession } from 'next-auth/react';
import {
  MessageCircle,
  Search,
  Send,
  Paperclip,
  MoreVertical,
  CheckCircle,
  Clock,
  User,
  Loader2,
  Check,
  CheckCheck,
  RefreshCw,
  Phone,
  Video,
  AlertCircle
} from 'lucide-react';
import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns';

interface Message {
  _id: string;
  sender_id: string;
  content: string;
  message_type: string;
  status: string;
  created_at: string;
  sender?: {
    _id: string;
    username: string;
    role: string;
    avatar?: string;
  };
}

interface Conversation {
  _id: string;
  participants: any[];
  last_message?: any;
  unread_counts: Map<string, number>;
  status: string;
  priority: string;
  assigned_to?: string;
  resolved: boolean;
  created_at: string;
}

// Typing indicator component
const TypingIndicator = ({ username }: { username?: string }) => (
  <div className="flex items-start space-x-2 animate-fadeIn">
    <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-xs font-semibold text-gray-600 flex-shrink-0">
      {username?.[0]?.toUpperCase() || 'U'}
    </div>
    <div className="flex items-center space-x-1 px-4 py-3 bg-white border border-gray-200 rounded-2xl rounded-tl-md shadow-sm">
      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
    </div>
  </div>
);

// Date separator component
const DateSeparator = ({ date }: { date: string }) => {
  const getDateLabel = (dateStr: string) => {
    const messageDate = new Date(dateStr);
    if (isToday(messageDate)) return 'Today';
    if (isYesterday(messageDate)) return 'Yesterday';
    return format(messageDate, 'MMMM dd, yyyy');
  };

  return (
    <div className="flex items-center justify-center my-6">
      <div className="bg-gray-200 text-gray-600 text-xs font-medium px-4 py-1.5 rounded-full shadow-sm">
        {getDateLabel(date)}
      </div>
    </div>
  );
};

// Message status icon component
const MessageStatusIcon = ({ status }: { status: string }) => {
  switch (status) {
    case 'sending':
      return <Clock className="w-3 h-3 text-green-200 animate-pulse" />;
    case 'sent':
      return <Check className="w-3 h-3 text-green-200" />;
    case 'delivered':
      return <CheckCheck className="w-3 h-3 text-green-200" />;
    case 'read':
      return <CheckCheck className="w-3 h-3 text-green-300" />;
    default:
      return <Clock className="w-3 h-3 text-green-200" />;
  }
};

// Avatar component
const Avatar = ({ user, size = 'md', showOnline = false }: { 
  user?: { username: string; avatar?: string; role?: string }; 
  size?: 'sm' | 'md' | 'lg';
  showOnline?: boolean;
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base'
  };

  const initial = user?.username?.[0]?.toUpperCase() || 'U';
  
  return (
    <div className="relative flex-shrink-0">
      {user?.avatar ? (
        <img
          src={user.avatar}
          alt={user.username}
          className={`${sizeClasses[size]} rounded-full object-cover`}
        />
      ) : (
        <div className={`${sizeClasses[size]} bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold`}>
          {initial}
        </div>
      )}
      {showOnline && (
        <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
      )}
    </div>
  );
};

export default function AdminChatDashboard() {
  const { data: session } = useSession();
  const {
    connected,
    conversations,
    messages,
    unreadCount,
    error,
    isLoading,
    sendMessage,
    joinConversation,
    leaveConversation,
    fetchConversations,
    markMessagesAsRead,
    typingUsers
  } = usePollingChat();

  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'resolved'>('all');
  const [filterPriority, setFilterPriority] = useState<'all' | 'urgent' | 'high' | 'medium' | 'low'>('all');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const markAsReadTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasMarkedAsReadRef = useRef<Set<string>>(new Set());

  const currentConversation = conversations.find(c => c._id === selectedConversation);
  const conversationMessages = selectedConversation ? messages[selectedConversation] || [] : [];
  
  // Get the user participant
  const userParticipant = currentConversation?.participants.find(
    p => p.role === 'user'
  );

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversationMessages]);

  // Load conversations automatically with proper cleanup
  useEffect(() => {
    if (connected) {
      fetchConversations();
      pollingIntervalRef.current = setInterval(fetchConversations, 5000);
      
      return () => {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
        if (markAsReadTimeoutRef.current) {
          clearTimeout(markAsReadTimeoutRef.current);
          markAsReadTimeoutRef.current = null;
        }
      };
    }
  }, [connected, fetchConversations]);

  // Manual refresh function
  const handleRefresh = useCallback(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Join conversation when selected
  useEffect(() => {
    if (selectedConversation) {
      joinConversation(selectedConversation);
    }
  }, [selectedConversation, joinConversation]);

  // Mark messages as read when conversation is viewed
  useEffect(() => {
    if (selectedConversation && conversationMessages.length > 0 && session?.user?.id) {
      if (markAsReadTimeoutRef.current) {
        clearTimeout(markAsReadTimeoutRef.current);
      }

      const unreadMessageIds = conversationMessages
        .filter(m => 
          m.sender_id !== session.user.id && 
          m.status !== 'read' &&
          !hasMarkedAsReadRef.current.has(m._id)
        )
        .map(m => m._id);

      if (unreadMessageIds.length > 0) {
        markAsReadTimeoutRef.current = setTimeout(() => {
          markMessagesAsRead(selectedConversation, unreadMessageIds)
            .then(() => {
              unreadMessageIds.forEach(id => hasMarkedAsReadRef.current.add(id));
            })
            .catch(err => {
              console.error('Failed to mark messages as read:', err);
            });
        }, 1000);
      }
    }
  }, [selectedConversation, conversationMessages, session, markMessagesAsRead]);

  // Reset marked messages when conversation changes
  useEffect(() => {
    hasMarkedAsReadRef.current.clear();
  }, [selectedConversation]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (selectedConversation) {
        leaveConversation();
      }
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      if (markAsReadTimeoutRef.current) {
        clearTimeout(markAsReadTimeoutRef.current);
      }
    };
  }, [selectedConversation, leaveConversation]);

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedConversation || isLoading) return;

    const content = messageInput;
    setMessageInput('');

    await sendMessage({
      conversationId: selectedConversation,
      content: content,
      messageType: 'text'
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSelectConversation = (conversationId: string) => {
    setSelectedConversation(conversationId);
  };

  // Filter conversations
  const filteredConversations = conversations.filter(conv => {
    if (filterStatus === 'active' && conv.resolved) return false;
    if (filterStatus === 'resolved' && !conv.resolved) return false;
    if (filterPriority !== 'all' && conv.priority !== filterPriority) return false;

    if (searchQuery) {
      const user = conv.participants.find(p => p.role === 'user');
      const username = user?.user_id?.username || '';
      return username.toLowerCase().includes(searchQuery.toLowerCase());
    }

    return true;
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-600 bg-red-100 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-100 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-100 border-green-200';
      default: return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent': return '🔴';
      case 'high': return '🟠';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      default: return '⚪';
    }
  };

  const formatMessageTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, 'h:mm a');
    } catch {
      return '';
    }
  };

  // Group messages by date
  const groupMessagesByDate = (messages: Message[]) => {
    const groups: { [key: string]: Message[] } = {};
    
    messages.forEach(message => {
      const date = format(new Date(message.created_at), 'yyyy-MM-dd');
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(message);
    });
    
    return groups;
  };

  // Check if messages should be grouped together
  const shouldGroupMessage = (current: Message, previous: Message | null) => {
    if (!previous) return false;
    if (previous.sender_id !== current.sender_id) return false;
    
    const timeDiff = new Date(current.created_at).getTime() - new Date(previous.created_at).getTime();
    return timeDiff < 60000; // Group if less than 1 minute apart
  };

  const groupedMessages = groupMessagesByDate(conversationMessages);
  const isUserTyping = selectedConversation && typingUsers[selectedConversation]?.some(
    (userId: string) => userId !== session?.user?.id
  );

  if (!session?.user || (session.user as any).role !== 'admin') {
    return null;
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Conversations Sidebar */}
      <div className="w-96 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-white">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900 flex items-center">
                <MessageCircle className="w-6 h-6 mr-2 text-blue-600" />
                Support Chats
              </h2>
              <p className="text-xs text-gray-500 mt-1">Manage customer conversations</p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
              aria-label="Refresh conversations"
              title="Refresh conversations"
            >
              <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          
          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by username..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm"
            />
          </div>

          {/* Filters */}
          <div className="flex space-x-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="resolved">Resolved</option>
            </select>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value as any)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm"
            >
              <option value="all">All Priority</option>
              <option value="urgent">🔴 Urgent</option>
              <option value="high">🟠 High</option>
              <option value="medium">🟡 Medium</option>
              <option value="low">🟢 Low</option>
            </select>
          </div>

          {/* Stats */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200">
            <span className={`flex items-center text-xs font-medium ${connected ? 'text-green-600' : 'text-red-600'}`}>
              <span className={`w-2 h-2 rounded-full mr-2 ${connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
              {connected ? 'Connected' : 'Disconnected'}
            </span>
            <div className="flex items-center space-x-3 text-xs text-gray-600">
              <span className="flex items-center">
                <MessageCircle className="w-3.5 h-3.5 mr-1" />
                {filteredConversations.length}
              </span>
              {unreadCount > 0 && (
                <span className="flex items-center text-blue-600 font-semibold">
                  <AlertCircle className="w-3.5 h-3.5 mr-1" />
                  {unreadCount} unread
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border-b border-red-200 p-3 flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6">
              <div className="bg-gray-100 rounded-full p-6 mb-4">
                <MessageCircle className="w-16 h-16 text-gray-400" />
              </div>
              <p className="text-gray-600 text-sm font-medium mb-1">No conversations found</p>
              <p className="text-gray-400 text-xs">Try adjusting your filters</p>
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const user = conv.participants.find(p => p.role === 'user');
              const isSelected = selectedConversation === conv._id;
              const unreadCount = conv.unread_counts?.get(session.user.id) || 0;

              return (
                <button
                  key={conv._id}
                  onClick={() => handleSelectConversation(conv._id)}
                  className={`w-full p-4 border-b border-gray-100 hover:bg-blue-50 transition-all text-left ${
                    isSelected ? 'bg-blue-50 border-l-4 border-l-blue-500 shadow-sm' : ''
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className="relative flex-shrink-0">
                      <Avatar 
                        user={user?.user_id} 
                        size="md"
                        showOnline={connected}
                      />
                      {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs font-bold rounded-full min-w-5 h-5 flex items-center justify-center px-1.5 shadow-lg">
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-semibold text-sm text-gray-900 truncate">
                          {user?.user_id?.username || 'Unknown User'}
                        </p>
                        <span className="text-xs text-gray-400 ml-2 flex-shrink-0">
                          {formatMessageTime(conv.created_at)}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-2 mb-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${getPriorityColor(conv.priority)}`}>
                          {getPriorityIcon(conv.priority)} {conv.priority}
                        </span>
                        {conv.resolved && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200 font-medium flex items-center">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Resolved
                          </span>
                        )}
                      </div>
                      
                      {conv.last_message && (
                        <p className="text-xs text-gray-600 truncate">
                          {conv.last_message.text}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedConversation && currentConversation ? (
          <>
            {/* Chat Header */}
            <div className="bg-white border-b border-gray-200 p-5 flex items-center justify-between shadow-sm">
              <div className="flex items-center space-x-4">
                <Avatar 
                  user={userParticipant?.user_id} 
                  size="lg"
                  showOnline={connected}
                />
                <div>
                  <h3 className="font-bold text-lg text-gray-900 flex items-center">
                    {userParticipant?.user_id?.username || 'Unknown User'}
                    {isUserTyping && (
                      <span className="ml-3 text-xs text-gray-500 font-normal italic flex items-center">
                        <span className="inline-block w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5 animate-pulse"></span>
                        typing...
                      </span>
                    )}
                  </h3>
                  <p className="text-sm text-gray-500 flex items-center space-x-2">
                    <span>{userParticipant?.user_id?.email || ''}</span>
                    <span>•</span>
                    <span className={`flex items-center ${connected ? 'text-green-600' : 'text-gray-400'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${connected ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                      {connected ? 'Online' : 'Offline'}
                    </span>
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <span className={`text-xs px-3 py-1.5 rounded-full font-medium border ${getPriorityColor(currentConversation.priority)}`}>
                  {getPriorityIcon(currentConversation.priority)} {currentConversation.priority}
                </span>
                <button 
                  className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Call user"
                >
                  <Phone className="w-5 h-5" />
                </button>
                <button 
                  className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Video call"
                >
                  <Video className="w-5 h-5" />
                </button>
                <button 
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  title="More options"
                >
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div 
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto p-6 space-y-1 bg-gradient-to-b from-gray-50 to-white"
            >
              {conversationMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center px-4">
                  <div className="bg-blue-50 rounded-full p-8 mb-4">
                    <MessageCircle className="w-20 h-20 text-blue-500" />
                  </div>
                  <h4 className="text-gray-700 text-lg font-semibold mb-2">No messages yet</h4>
                  <p className="text-gray-500 text-sm max-w-md">
                    Start the conversation with {userParticipant?.user_id?.username || 'the user'}
                  </p>
                </div>
              ) : (
                <>
                  {Object.entries(groupedMessages).map(([date, msgs]) => (
                    <div key={date}>
                      <DateSeparator date={date} />
                      {msgs.map((message, index) => {
                        const isOwn = message.sender_id === session.user.id;
                        const previousMessage = index > 0 ? msgs[index - 1] : null;
                        const shouldGroup = shouldGroupMessage(message, previousMessage);
                        const isFirstInGroup = !shouldGroup;
                        const uniqueKey = `${message._id}-${index}`;
                        
                        return (
                          <div key={uniqueKey} className={`${isFirstInGroup ? 'mt-4' : 'mt-1'}`}>
                            {isOwn ? (
                              // ADMIN MESSAGES - Right aligned, green
                              <div className="flex justify-end items-end space-x-2 animate-fadeIn">
                                <div className="max-w-[70%]">
                                  {isFirstInGroup && (
                                    <p className="text-xs text-gray-500 mb-1 text-right mr-3">
                                      You (Admin)
                                    </p>
                                  )}
                                  <div className="bg-green-500 text-white rounded-2xl rounded-tr-md px-4 py-3 shadow-sm">
                                    <p className="text-sm break-words whitespace-pre-wrap leading-relaxed">
                                      {message.content}
                                    </p>
                                    <div className="flex items-center justify-end space-x-1.5 mt-2">
                                      <span className="text-xs text-green-100">
                                        {formatMessageTime(message.created_at)}
                                      </span>
                                      <MessageStatusIcon status={message.status} />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              // USER MESSAGES - Left aligned, white/gray
                              <div className="flex justify-start items-end space-x-2 animate-fadeIn">
                                {isFirstInGroup && (
                                  <Avatar user={message.sender} size="sm" />
                                )}
                                {!isFirstInGroup && <div className="w-8" />}
                                <div className="max-w-[70%]">
                                  {isFirstInGroup && message.sender && (
                                    <p className="text-xs font-semibold text-gray-700 mb-1 ml-3 flex items-center">
                                      <User className="w-3 h-3 mr-1" />
                                      {message.sender.username}
                                    </p>
                                  )}
                                  <div className="bg-white border border-gray-200 text-gray-800 rounded-2xl rounded-tl-md px-4 py-3 shadow-sm">
                                    <p className="text-sm break-words whitespace-pre-wrap leading-relaxed">
                                      {message.content}
                                    </p>
                                    <div className="flex items-center justify-end mt-2">
                                      <span className="text-xs text-gray-400">
                                        {formatMessageTime(message.created_at)}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                  
                  {/* Typing indicator */}
                  {isUserTyping && userParticipant && (
                    <div className="mt-4">
                      <TypingIndicator username={userParticipant.user_id?.username} />
                    </div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Input Area */}
            <div className="bg-white border-t border-gray-200 p-5 shadow-lg">
              <div className="flex items-end space-x-3">
                <button 
                  className="p-2.5 text-gray-500 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors self-end mb-0.5"
                  title="Attach file"
                >
                  <Paperclip className="w-5 h-5" />
                </button>
                
                <div className="flex-1 relative">
                  <textarea
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type your message..."
                    rows={1}
                    disabled={!connected || isLoading}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none disabled:opacity-50 disabled:bg-gray-100 shadow-sm"
                    style={{
                      minHeight: '48px',
                      maxHeight: '120px',
                    }}
                    onInput={(e) => {
                      const target = e.target as HTMLTextAreaElement;
                      target.style.height = 'auto';
                      target.style.height = Math.min(target.scrollHeight, 120) + 'px';
                    }}
                  />
                </div>
                
                <button
                  onClick={handleSendMessage}
                  disabled={!messageInput.trim() || !connected || isLoading}
                  className="p-3 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95 shadow-md self-end mb-0.5"
                >
                  {isLoading ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <Send className="w-6 h-6" />
                  )}
                </button>
              </div>
              
              <div className="flex items-center justify-center mt-3">
                <p className="text-xs text-gray-500 flex items-center">
                  {connected ? (
                    <>
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                      Connected
                    </>
                  ) : (
                    <>
                      <span className="w-1.5 h-1.5 bg-red-500 rounded-full mr-2"></span>
                      Disconnected
                    </>
                  )}
                </p>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-gradient-to-b from-gray-50 to-white">
            <div className="bg-blue-50 rounded-full p-8 mb-6">
              <MessageCircle className="w-24 h-24 text-blue-400" />
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-3">No Conversation Selected</h3>
            <p className="text-gray-500 text-lg max-w-md">
              Choose a conversation from the sidebar to start chatting with customers
            </p>
            <div className="mt-6 flex items-center space-x-2 text-sm text-gray-400">
              <Clock className="w-4 h-4" />
              <span>Waiting for your response...</span>
            </div>
          </div>
        )}
      </div>

      {/* Custom Animations */}
      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes bounce {
          0%, 80%, 100% {
            transform: translateY(0);
          }
          40% {
            transform: translateY(-8px);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }

        .animate-bounce {
          animation: bounce 1.4s infinite;
        }

        /* Custom scrollbar */
        .overflow-y-auto::-webkit-scrollbar {
          width: 8px;
        }

        .overflow-y-auto::-webkit-scrollbar-track {
          background: transparent;
        }

        .overflow-y-auto::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }

        .overflow-y-auto::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </div>
  );
}
