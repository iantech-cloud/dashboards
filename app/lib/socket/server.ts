// app/lib/socket/server.ts
import { Server } from 'socket.io';
import { createServer } from 'http';
import { NextApiRequest, NextApiResponse } from 'next';

interface SocketAuth {
  userId: string;
  userRole: string;
}

interface SendMessageData {
  conversationId: string;
  content: string;
  messageType?: string;
  tempId?: string;
}

let io: Server;

export const initializeSocket = (server: ReturnType<typeof createServer>) => {
  io = new Server(server, {
    path: '/api/socket',
    cors: {
      origin: process.env.NODE_ENV === 'production' 
        ? process.env.NEXTAUTH_URL 
        : ['http://localhost:5000', 'http://localhost:3000'],
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    console.log('✅ User connected:', socket.id);
    
    const { userId, userRole } = socket.handshake.auth as SocketAuth;
    console.log('🔗 User authenticated:', { userId, userRole });

    // Join user to their personal room
    if (userId) {
      socket.join(`user:${userId}`);
    }

    // Join admin to admin room if applicable
    if (userRole === 'admin') {
      socket.join('admin:room');
    }

    // Handle conversation events
    socket.on('conversations:list', () => {
      console.log('📋 Client requested conversations list');
      // Implement your logic to fetch conversations
      socket.emit('conversations:list', { conversations: [] });
    });

    socket.on('conversation:join', (conversationId: string) => {
      console.log('🚪 User joining conversation:', conversationId);
      socket.join(`conversation:${conversationId}`);
      socket.emit('conversation:joined', { conversationId });
    });

    socket.on('message:send', (data: SendMessageData) => {
      console.log('📤 Message received:', data);
      
      // Create a mock message (replace with your database logic)
      const mockMessage = {
        _id: Date.now().toString(),
        conversation_id: data.conversationId,
        sender_id: userId,
        sender_role: userRole,
        message_type: data.messageType || 'text',
        content: data.content,
        status: 'sent',
        created_at: new Date().toISOString(),
      };

      // Broadcast to conversation room
      socket.to(`conversation:${data.conversationId}`).emit('message:new', {
        message: mockMessage,
        conversationId: data.conversationId
      });
      
      // Confirm to sender
      socket.emit('message:sent', { 
        messageId: mockMessage._id, 
        tempId: data.tempId 
      });
    });

    socket.on('typing:start', (conversationId: string) => {
      socket.to(`conversation:${conversationId}`).emit('typing:start', {
        conversationId,
        userId
      });
    });

    socket.on('typing:stop', (conversationId: string) => {
      socket.to(`conversation:${conversationId}`).emit('typing:stop', {
        conversationId,
        userId
      });
    });

    socket.on('disconnect', (reason: string) => {
      console.log('❌ User disconnected:', socket.id, reason);
    });

    socket.on('error', (error: Error) => {
      console.error('❌ Socket error:', error);
    });
  });

  return io;
};

export const getIO = (): Server => {
  if (!io) {
    throw new Error('Socket.IO not initialized!');
  }
  return io;
};
