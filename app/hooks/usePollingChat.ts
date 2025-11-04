// app/hooks/usePollingChat.ts
'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';

interface Conversation {
  _id: string;
  participants: Array<{
    user_id: any;
    role: string;
    joined_at: Date;
    is_active: boolean;
  }>;
  status: string;
  last_message?: {
    text: string;
    sender_id: string;
    sent_at: Date;
    message_type: string;
  };
  unread_count?: number;
  priority: string;
  assigned_to?: string;
  resolved: boolean;
  created_at: Date;
  updated_at: Date;
}

interface Message {
  _id: string;
  conversation_id: string;
  sender_id: string;
  sender_role: string;
  message_type: string;
  content: string;
  status: string;
  attachments?: any[];
  created_at: string;
  sender?: {
    _id: string;
    username: string;
    email: string;
    role: string;
    avatar?: string;
  };
}

export function usePollingChat() {
  const { data: session, status } = useSession();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [unreadCount, setUnreadCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Record<string, string[]>>({});
  
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const conversationPollRef = useRef<NodeJS.Timeout | null>(null);
  const activeConversationRef = useRef<string | null>(null);
  const lastMessageTimestamps = useRef<Record<string, string>>({});
  const hasMarkedAsReadRef = useRef<Set<string>>(new Set());
  const typingTimeoutRef = useRef<Record<string, NodeJS.Timeout>>({});

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    if (status !== 'authenticated') return;

    try {
      const response = await fetch('/api/chat/conversations');
      const data = await response.json();

      if (data.success) {
        setConversations(data.conversations || []);
        
        // Calculate total unread count
        const total = (data.conversations || []).reduce(
          (sum: number, conv: Conversation) => sum + (conv.unread_count || 0),
          0
        );
        setUnreadCount(total);
      } else {
        setError(data.message);
      }
    } catch (err) {
      console.error('Error fetching conversations:', err);
      setError('Failed to fetch conversations');
    }
  }, [status]);

  // Fetch messages for a conversation
  const fetchMessages = useCallback(async (conversationId: string, limit: number = 50) => {
    if (status !== 'authenticated') return;

    try {
      const response = await fetch(
        `/api/chat/messages?conversationId=${conversationId}&limit=${limit}`
      );
      const data = await response.json();

      if (data.success) {
        setMessages(prev => ({
          ...prev,
          [conversationId]: data.messages || []
        }));

        // Update last message timestamp
        if (data.messages && data.messages.length > 0) {
          lastMessageTimestamps.current[conversationId] = 
            data.messages[data.messages.length - 1].created_at;
        }
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
    }
  }, [status]);

  // Poll for new messages in active conversation
  const pollNewMessages = useCallback(async () => {
    const conversationId = activeConversationRef.current;
    if (!conversationId || status !== 'authenticated') return;

    try {
      const lastTimestamp = lastMessageTimestamps.current[conversationId];
      const url = lastTimestamp
        ? `/api/chat/messages?conversationId=${conversationId}&after=${lastTimestamp}`
        : `/api/chat/messages?conversationId=${conversationId}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.success && data.messages && data.messages.length > 0) {
        setMessages(prev => ({
          ...prev,
          [conversationId]: [
            ...(prev[conversationId] || []),
            ...data.messages
          ]
        }));

        // Update last timestamp
        lastMessageTimestamps.current[conversationId] = 
          data.messages[data.messages.length - 1].created_at;

        // Mark as read - only mark messages that haven't been marked yet
        const newMessageIds = data.messages
          .filter((m: Message) => !hasMarkedAsReadRef.current.has(m._id))
          .map((m: Message) => m._id);

        if (newMessageIds.length > 0) {
          await markMessagesAsRead(conversationId, newMessageIds);
        }
      }
    } catch (err) {
      console.error('Error polling messages:', err);
    }
  }, [status]);

  // Mark messages as read
  const markMessagesAsRead = useCallback(async (
    conversationId: string,
    messageIds: string[]
  ) => {
    if (status !== 'authenticated' || messageIds.length === 0) return;

    try {
      // Add to tracking set before making the API call
      messageIds.forEach(id => hasMarkedAsReadRef.current.add(id));

      await fetch('/api/chat/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, messageIds })
      });

      // Update local state
      setMessages(prev => ({
        ...prev,
        [conversationId]: (prev[conversationId] || []).map(msg =>
          messageIds.includes(msg._id) && msg.sender_id !== session?.user?.id
            ? { ...msg, status: 'read' }
            : msg
        )
      }));

      // Update unread count locally
      setConversations(prev => prev.map(conv => 
        conv._id === conversationId
          ? {
              ...conv,
              unread_count: Math.max(0, (conv.unread_count || 0) - messageIds.length)
            }
          : conv
      ));

      setUnreadCount(prev => Math.max(0, prev - messageIds.length));
    } catch (err) {
      console.error('Error marking messages as read:', err);
      // Remove from tracking set if failed
      messageIds.forEach(id => hasMarkedAsReadRef.current.delete(id));
    }
  }, [status, session]);

  // Send message
  const sendMessage = useCallback(async (data: {
    conversationId?: string;
    content: string;
    messageType?: string;
    priority?: string;
  }) => {
    if (status !== 'authenticated' || !data.content.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const endpoint = data.conversationId 
        ? '/api/chat/messages'
        : '/api/chat/conversations';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: data.conversationId,
          content: data.content,
          messageType: data.messageType || 'text',
          priority: data.priority || 'medium'
        })
      });

      const result = await response.json();

      if (result.success) {
        if (result.conversation) {
          // New conversation created
          setConversations(prev => [result.conversation, ...prev]);
          activeConversationRef.current = result.conversation._id;
          await fetchMessages(result.conversation._id);
        } else if (result.message && data.conversationId) {
          // Message sent in existing conversation
          setMessages(prev => ({
            ...prev,
            [data.conversationId!]: [
              ...(prev[data.conversationId!] || []),
              result.message
            ]
          }));

          // Update last timestamp
          lastMessageTimestamps.current[data.conversationId] = result.message.created_at;
        }

        // Refresh conversations to update last message
        if (!data.conversationId) {
          await fetchConversations();
        }
      } else {
        setError(result.message || 'Failed to send message');
      }
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message');
    } finally {
      setIsLoading(false);
    }
  }, [status, fetchMessages, fetchConversations]);

  // Typing indicator - simulate typing detection
  const startTyping = useCallback((conversationId: string) => {
    if (!session?.user?.id) return;
    
    // Clear existing timeout
    if (typingTimeoutRef.current[conversationId]) {
      clearTimeout(typingTimeoutRef.current[conversationId]);
    }

    // Set typing state
    setTypingUsers(prev => ({
      ...prev,
      [conversationId]: [session.user.id]
    }));

    // Auto-clear after 3 seconds
    typingTimeoutRef.current[conversationId] = setTimeout(() => {
      setTypingUsers(prev => {
        const newState = { ...prev };
        delete newState[conversationId];
        return newState;
      });
    }, 3000);
  }, [session]);

  const stopTyping = useCallback((conversationId: string) => {
    if (typingTimeoutRef.current[conversationId]) {
      clearTimeout(typingTimeoutRef.current[conversationId]);
    }
    
    setTypingUsers(prev => {
      const newState = { ...prev };
      delete newState[conversationId];
      return newState;
    });
  }, []);

  // Set active conversation for polling
  const joinConversation = useCallback((conversationId: string) => {
    activeConversationRef.current = conversationId;
    fetchMessages(conversationId);
  }, [fetchMessages]);

  // Leave conversation
  const leaveConversation = useCallback(() => {
    const prevConversation = activeConversationRef.current;
    activeConversationRef.current = null;
    
    // Clear marked messages tracking when leaving conversation
    hasMarkedAsReadRef.current.clear();
    
    // Clear typing indicators
    if (prevConversation) {
      stopTyping(prevConversation);
    }
  }, [stopTyping]);

  // Create conversation
  const createConversation = useCallback(async (
    message: string,
    priority: string = 'medium'
  ) => {
    await sendMessage({ content: message, priority });
  }, [sendMessage]);

  // Initialize - fetch conversations on mount
  useEffect(() => {
    if (status === 'authenticated') {
      fetchConversations();
    }
  }, [status, fetchConversations]);

  // Poll for new messages when conversation is active
  useEffect(() => {
    if (status === 'authenticated' && activeConversationRef.current) {
      // Clear any existing interval
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }

      // Poll every 3 seconds
      pollIntervalRef.current = setInterval(pollNewMessages, 3000);

      return () => {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
      };
    }
  }, [status, pollNewMessages]);

  // Poll for conversation updates every 10 seconds
  useEffect(() => {
    if (status === 'authenticated') {
      // Clear any existing interval
      if (conversationPollRef.current) {
        clearInterval(conversationPollRef.current);
      }

      conversationPollRef.current = setInterval(fetchConversations, 10000);

      return () => {
        if (conversationPollRef.current) {
          clearInterval(conversationPollRef.current);
          conversationPollRef.current = null;
        }
      };
    }
  }, [status, fetchConversations]);

  // Cleanup all intervals on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      if (conversationPollRef.current) {
        clearInterval(conversationPollRef.current);
        conversationPollRef.current = null;
      }
      // Clear all typing timeouts
      Object.values(typingTimeoutRef.current).forEach(timeout => {
        clearTimeout(timeout);
      });
      typingTimeoutRef.current = {};
    };
  }, []);

  return {
    connected: status === 'authenticated',
    conversations,
    messages,
    unreadCount,
    error,
    isLoading,
    sendMessage,
    joinConversation,
    leaveConversation,
    fetchConversations,
    fetchMessages: (convId: string) => fetchMessages(convId),
    createConversation,
    markMessagesAsRead,
    typingUsers,
    startTyping,
    stopTyping
  };
}
