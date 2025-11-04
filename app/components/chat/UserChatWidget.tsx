// app/components/chat/UserChatWidget.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { usePollingChat } from '@/app/hooks/usePollingChat';
import { useSession } from 'next-auth/react';
import {
  MessageCircle,
  X,
  Send,
  Paperclip,
  Minimize2,
  Maximize2,
  Loader2,
  Check,
  CheckCheck,
  Clock,
  RefreshCw,
  Phone,
  Video,
  MoreVertical
} from 'lucide-react';
import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns';

interface Message {
  _id: string;
  sender_id: string;
  content: string;
  message_type: string;
  status: string;
  created_at: string;
  attachments?: any[];
  sender?: {
    _id: string;
    username: string;
    email: string;
    role: string;
    avatar?: string;
  };
}

// Typing indicator component
const TypingIndicator = ({ username }: { username?: string }) => (
  <div className="flex items-start space-x-2 animate-fadeIn">
    <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-xs font-semibold text-gray-600 flex-shrink-0">
      {username?.[0]?.toUpperCase() || 'S'}
    </div>
    <div className="flex items-center space-x-1 px-4 py-3 bg-white border border-gray-200 rounded-2xl rounded-tl-sm shadow-sm">
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
    <div className="flex items-center justify-center my-4">
      <div className="bg-gray-200 text-gray-600 text-xs font-medium px-3 py-1 rounded-full">
        {getDateLabel(date)}
      </div>
    </div>
  );
};

// Message status icon component
const MessageStatusIcon = ({ status }: { status: string }) => {
  switch (status) {
    case 'sending':
      return <Clock className="w-3 h-3 text-blue-200 animate-pulse" />;
    case 'sent':
      return <Check className="w-3 h-3 text-blue-200" />;
    case 'delivered':
      return <CheckCheck className="w-3 h-3 text-blue-200" />;
    case 'read':
      return <CheckCheck className="w-3 h-3 text-blue-300" />;
    default:
      return <Clock className="w-3 h-3 text-blue-200" />;
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

  const initial = user?.username?.[0]?.toUpperCase() || 'S';
  
  return (
    <div className="relative flex-shrink-0">
      {user?.avatar ? (
        <img
          src={user.avatar}
          alt={user.username}
          className={`${sizeClasses[size]} rounded-full object-cover`}
        />
      ) : (
        <div className={`${sizeClasses[size]} bg-gradient-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold`}>
          {initial}
        </div>
      )}
      {showOnline && (
        <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
      )}
    </div>
  );
};

export default function UserChatWidget() {
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
    createConversation,
    markMessagesAsRead,
    typingUsers
  } = usePollingChat();

  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentConversation = conversations.find(c => c._id === selectedConversation);
  const conversationMessages = selectedConversation ? messages[selectedConversation] || [] : [];
  
  // Get the other participant (support agent)
  const otherParticipant = currentConversation?.participants.find(
    p => p.user_id?._id !== session?.user?.id
  );

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversationMessages]);

  // Auto-select first conversation when opening
  useEffect(() => {
    if (isOpen && conversations.length > 0 && !selectedConversation) {
      const firstConv = conversations[0];
      setSelectedConversation(firstConv._id);
      joinConversation(firstConv._id);
    }
  }, [isOpen, conversations, selectedConversation, joinConversation]);

  // Mark messages as read when conversation is viewed
  useEffect(() => {
    if (selectedConversation && conversationMessages.length > 0) {
      const unreadMessageIds = conversationMessages
        .filter(m => m.sender_id !== session?.user?.id && m.status !== 'read')
        .map(m => m._id);
      
      if (unreadMessageIds.length > 0) {
        const timer = setTimeout(() => {
          markMessagesAsRead(selectedConversation, unreadMessageIds);
        }, 1000);
        
        return () => clearTimeout(timer);
      }
    }
  }, [selectedConversation, conversationMessages, session, markMessagesAsRead]);

  // Cleanup on close
  useEffect(() => {
    if (!isOpen && selectedConversation) {
      leaveConversation();
      setSelectedConversation(null);
    }
  }, [isOpen, selectedConversation, leaveConversation]);

  const handleSendMessage = async () => {
    if (!messageInput.trim() || isLoading) return;

    const content = messageInput;
    setMessageInput('');

    if (!selectedConversation) {
      await createConversation(content, 'medium');
    } else {
      await sendMessage({
        conversationId: selectedConversation,
        content: content,
        messageType: 'text'
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedConversation) return;

    console.log('File selected:', file);
    alert('File upload will be implemented soon!');
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
  const isOtherUserTyping = selectedConversation && typingUsers[selectedConversation]?.some(
    (userId: string) => userId !== session?.user?.id
  );

  if (!session?.user) return null;

  return (
    <>
      {/* Chat Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-110 z-50 group"
          aria-label="Open chat"
        >
          <MessageCircle className="w-6 h-6" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-5 h-5 flex items-center justify-center px-1.5 animate-pulse">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
          <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-gray-900 text-white text-sm px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            Need help? Chat with us!
          </div>
        </button>
      )}

      {/* Chat Widget */}
      {isOpen && (
        <div
          className={`fixed bottom-6 right-6 bg-white rounded-2xl shadow-2xl z-50 border border-gray-200 transition-all duration-300 ${
            isMinimized ? 'w-80 h-16' : 'w-96 h-[600px]'
          } flex flex-col`}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-t-2xl shrink-0">
            <div className="flex items-center space-x-3 min-w-0">
              {otherParticipant ? (
                <>
                  <Avatar 
                    user={otherParticipant.user_id} 
                    size="md" 
                    showOnline={connected}
                  />
                  <div className="min-w-0">
                    <h3 className="font-semibold text-sm truncate">{otherParticipant.user_id?.username || 'Support'}</h3>
                    <p className="text-xs text-blue-100 flex items-center">
                      {isOtherUserTyping ? (
                        <>
                          <span className="inline-block w-1.5 h-1.5 bg-green-400 rounded-full mr-1.5 animate-pulse"></span>
                          typing...
                        </>
                      ) : (
                        <>
                          <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${connected ? 'bg-green-400' : 'bg-gray-400'}`}></span>
                          {connected ? 'Online' : 'Offline'}
                        </>
                      )}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <MessageCircle className="w-8 h-8 flex-shrink-0" />
                  <div className="min-w-0">
                    <h3 className="font-semibold text-sm">Support Chat</h3>
                    <p className="text-xs text-blue-100 flex items-center">
                      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${connected ? 'bg-green-400' : 'bg-gray-400'}`}></span>
                      {connected ? 'Online' : 'Offline'}
                    </p>
                  </div>
                </>
              )}
            </div>
            <div className="flex items-center space-x-1 flex-shrink-0">
              <button
                onClick={() => fetchConversations()}
                className="hover:bg-blue-600 p-2 rounded-lg transition-colors"
                aria-label="Refresh"
                title="Refresh"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="hover:bg-blue-600 p-2 rounded-lg transition-colors"
                aria-label={isMinimized ? 'Maximize' : 'Minimize'}
              >
                {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="hover:bg-blue-600 p-2 rounded-lg transition-colors"
                aria-label="Close chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Error Display */}
              {error && (
                <div className="bg-red-50 border-b border-red-200 p-3 shrink-0">
                  <p className="text-red-600 text-sm flex items-center">
                    <span className="mr-2">⚠️</span>
                    {error}
                  </p>
                </div>
              )}

              {/* Messages Area */}
              <div 
                ref={messagesContainerRef}
                className="flex-1 overflow-y-auto p-4 space-y-1 bg-gradient-to-b from-gray-50 to-white"
                style={{ minHeight: 0 }}
              >
                {conversationMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center px-4">
                    <div className="bg-blue-50 rounded-full p-6 mb-4">
                      <MessageCircle className="w-16 h-16 text-blue-500" />
                    </div>
                    <h4 className="text-gray-700 text-base font-semibold mb-2">Start a Conversation</h4>
                    <p className="text-gray-500 text-sm max-w-xs">
                      Our support team is here to help. Send us a message and we'll respond as soon as possible.
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
                          
                          return (
                            <div key={message._id} className={`${isFirstInGroup ? 'mt-4' : 'mt-1'}`}>
                              {isOwn ? (
                                // YOUR MESSAGES - Right aligned, blue
                                <div className="flex justify-end items-end space-x-2 animate-fadeIn">
                                  <div className="max-w-[75%]">
                                    {isFirstInGroup && (
                                      <p className="text-xs text-gray-500 mb-1 text-right mr-3">
                                        You
                                      </p>
                                    )}
                                    <div className="bg-blue-500 text-white rounded-2xl rounded-tr-md px-4 py-2.5 shadow-sm">
                                      <p className="text-sm break-words whitespace-pre-wrap leading-relaxed">
                                        {message.content}
                                      </p>
                                      <div className="flex items-center justify-end space-x-1.5 mt-1">
                                        <span className="text-xs text-blue-100">
                                          {formatMessageTime(message.created_at)}
                                        </span>
                                        <MessageStatusIcon status={message.status} />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                // OTHER USER'S MESSAGES - Left aligned, white/gray
                                <div className="flex justify-start items-end space-x-2 animate-fadeIn">
                                  {isFirstInGroup && (
                                    <Avatar user={message.sender} size="sm" />
                                  )}
                                  {!isFirstInGroup && <div className="w-8" />}
                                  <div className="max-w-[75%]">
                                    {isFirstInGroup && message.sender && (
                                      <p className="text-xs font-medium text-gray-600 mb-1 ml-3 flex items-center">
                                        {message.sender.username}
                                        {message.sender.role === 'admin' && (
                                          <span className="ml-1 text-blue-600" title="Admin">👑</span>
                                        )}
                                        {message.sender.role === 'support' && (
                                          <span className="ml-1 text-green-600" title="Support">🎧</span>
                                        )}
                                      </p>
                                    )}
                                    <div className="bg-white border border-gray-200 text-gray-800 rounded-2xl rounded-tl-md px-4 py-2.5 shadow-sm">
                                      <p className="text-sm break-words whitespace-pre-wrap leading-relaxed">
                                        {message.content}
                                      </p>
                                      <div className="flex items-center justify-end mt-1">
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
                    {isOtherUserTyping && otherParticipant && (
                      <div className="mt-4">
                        <TypingIndicator username={otherParticipant.user_id?.username} />
                      </div>
                    )}
                    
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {/* Input Area */}
              <div className="p-4 bg-white border-t border-gray-200 rounded-b-2xl shrink-0">
                <div className="flex items-end space-x-2">
                  <button
                    onClick={handleFileUpload}
                    disabled={!connected || isLoading}
                    className="p-2 text-gray-500 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50 self-end mb-0.5"
                    aria-label="Attach file"
                    title="Attach file"
                  >
                    <Paperclip className="w-5 h-5" />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleFileChange}
                    accept="image/*,application/pdf,.doc,.docx"
                  />
                  
                  <div className="flex-1 relative">
                    <textarea
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Type a message..."
                      disabled={!connected || isLoading}
                      rows={1}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:bg-gray-100 text-sm resize-none max-h-32"
                      style={{
                        minHeight: '42px',
                        height: 'auto',
                      }}
                      onInput={(e) => {
                        const target = e.target as HTMLTextAreaElement;
                        target.style.height = 'auto';
                        target.style.height = Math.min(target.scrollHeight, 96) + 'px';
                      }}
                    />
                  </div>
                  
                  <button
                    onClick={handleSendMessage}
                    disabled={!messageInput.trim() || !connected || isLoading}
                    className="p-2.5 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95 self-end mb-0.5"
                    aria-label="Send message"
                  >
                    {isLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                  </button>
                </div>
                
                <div className="flex items-center justify-center mt-2">
                  <p className="text-xs text-gray-400">
                    {connected ? (
                      <span className="flex items-center">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5"></span>
                        Connected
                      </span>
                    ) : (
                      <span className="flex items-center">
                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full mr-1.5"></span>
                        Connecting...
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      )}

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
          width: 6px;
        }

        .overflow-y-auto::-webkit-scrollbar-track {
          background: transparent;
        }

        .overflow-y-auto::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 3px;
        }

        .overflow-y-auto::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </>
  );
}
