// app/lib/models/chats.ts
import mongoose, { Schema, model, models } from 'mongoose';

// =============================================================================
// ENUMS & TYPES
// =============================================================================

export const MessageStatuses = ['sent', 'delivered', 'read'] as const;
export const MessageTypes = ['text', 'file', 'image', 'document', 'system'] as const;
export const ConversationStatuses = ['active', 'archived', 'closed'] as const;
export const ParticipantRoles = ['user', 'admin', 'support'] as const;

// =============================================================================
// CONVERSATION SCHEMA
// =============================================================================

const ConversationSchema = new Schema({
  participants: [{
    user_id: { 
      type: String, 
      ref: 'Profile', // ✅ FIXED: References Profile model
      required: true 
    },
    role: { 
      type: String, 
      enum: ParticipantRoles, 
      required: true 
    },
    joined_at: { 
      type: Date, 
      default: Date.now 
    },
    left_at: { 
      type: Date 
    },
    is_active: { 
      type: Boolean, 
      default: true 
    }
  }],
  
  status: { 
    type: String, 
    enum: ConversationStatuses, 
    default: 'active'
  },
  
  last_message: {
    text: { type: String },
    sender_id: { type: String, ref: 'Profile' }, // ✅ FIXED: References Profile
    sent_at: { type: Date },
    message_type: { type: String, enum: MessageTypes }
  },
  
  unread_counts: {
    type: Map,
    of: Number,
    default: new Map()
  },
  
  // For admin to organize conversations
  priority: { 
    type: String, 
    enum: ['low', 'medium', 'high', 'urgent'], 
    default: 'medium'
  },
  
  tags: [{ type: String }],
  
  assigned_to: { 
    type: String, 
    ref: 'Profile'
  },
  
  resolved: { 
    type: Boolean, 
    default: false
  },
  
  resolved_at: { 
    type: Date 
  },
  
  resolved_by: { 
    type: String, 
    ref: 'Profile' // ✅ FIXED: References Profile
  },
  
  resolution_notes: { 
    type: String 
  },
  
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Indexes
ConversationSchema.index({ 'participants.user_id': 1 });
ConversationSchema.index({ status: 1, created_at: -1 });
ConversationSchema.index({ assigned_to: 1, status: 1 });
ConversationSchema.index({ resolved: 1 });
ConversationSchema.index({ priority: 1 });
ConversationSchema.index({ 'last_message.sent_at': -1 });
ConversationSchema.index({ tags: 1 });

// Virtual to get active participants
ConversationSchema.virtual('active_participants').get(function() {
  return this.participants.filter((p: any) => p.is_active);
});

// Method to get unread count for a user
ConversationSchema.methods.getUnreadCount = function(userId: string) {
  return this.unread_counts.get(userId) || 0;
};

// Method to increment unread count
ConversationSchema.methods.incrementUnreadCount = function(userId: string) {
  const currentCount = this.unread_counts.get(userId) || 0;
  this.unread_counts.set(userId, currentCount + 1);
  return this.save();
};

// Method to reset unread count
ConversationSchema.methods.resetUnreadCount = function(userId: string) {
  this.unread_counts.set(userId, 0);
  return this.save();
};

// Method to check if user is participant
ConversationSchema.methods.isParticipant = function(userId: string) {
  return this.participants.some((p: any) => p.user_id === userId && p.is_active);
};

// Static method to find conversation between users
ConversationSchema.statics.findBetweenUsers = function(userId1: string, userId2: string) {
  return this.findOne({
    'participants.user_id': { $all: [userId1, userId2] },
    status: 'active'
  });
};

// Static method to find user's active conversations
ConversationSchema.statics.findUserConversations = function(userId: string) {
  return this.find({
    'participants.user_id': userId,
    'participants.is_active': true,
    status: 'active'
  }).sort({ 'last_message.sent_at': -1 });
};

// =============================================================================
// MESSAGE SCHEMA
// =============================================================================

const MessageSchema = new Schema({
  conversation_id: { 
    type: Schema.Types.ObjectId, 
    ref: 'Conversation', 
    required: true
  },
  
  sender_id: { 
    type: String, 
    ref: 'Profile', // ✅ FIXED: Changed from 'User' to 'Profile'
    required: true
  },
  
  sender_role: { 
    type: String, 
    enum: ParticipantRoles, 
    required: true 
  },
  
  message_type: { 
    type: String, 
    enum: MessageTypes, 
    default: 'text',
    required: true 
  },
  
  content: { 
    type: String, 
    required: function() {
      return this.message_type === 'text' || this.message_type === 'system';
    }
  },
  
  // For file attachments
  attachments: [{
    file_name: { type: String, required: true },
    file_url: { type: String, required: true },
    file_type: { type: String, required: true },
    file_size: { type: Number },
    mime_type: { type: String },
    uploaded_at: { type: Date, default: Date.now }
  }],
  
  status: { 
    type: String, 
    enum: MessageStatuses, 
    default: 'sent'
  },
  
  read_by: [{
    user_id: { type: String, ref: 'Profile' }, // ✅ FIXED: References Profile
    read_at: { type: Date, default: Date.now }
  }],
  
  // For replied messages
  reply_to: { 
    type: Schema.Types.ObjectId, 
    ref: 'Message' 
  },
  
  // Soft delete
  deleted: { 
    type: Boolean, 
    default: false
  },
  
  deleted_at: { 
    type: Date 
  },
  
  deleted_by: { 
    type: String, 
    ref: 'Profile' // ✅ FIXED: References Profile
  },
  
  // Edited
  edited: { 
    type: Boolean, 
    default: false 
  },
  
  edited_at: { 
    type: Date 
  },
  
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Indexes
MessageSchema.index({ conversation_id: 1, created_at: -1 });
MessageSchema.index({ sender_id: 1 });
MessageSchema.index({ status: 1 });
MessageSchema.index({ deleted: 1 });
MessageSchema.index({ message_type: 1 });

// Virtual to check if message is read
MessageSchema.virtual('is_read').get(function() {
  return this.status === 'read';
});

// Method to mark as delivered
MessageSchema.methods.markAsDelivered = function() {
  this.status = 'delivered';
  return this.save();
};

// Method to mark as read
MessageSchema.methods.markAsRead = function(userId: string) {
  this.status = 'read';
  
  // Add to read_by array if not already there
  if (!this.read_by.some((r: any) => r.user_id === userId)) {
    this.read_by.push({ user_id: userId, read_at: new Date() });
  }
  
  return this.save();
};

// Static method to get conversation messages
MessageSchema.statics.getConversationMessages = function(
  conversationId: string, 
  limit: number = 50, 
  before?: Date
) {
  const query: any = { 
    conversation_id: conversationId,
    deleted: false 
  };
  
  if (before) {
    query.created_at = { $lt: before };
  }
  
  return this.find(query)
    .sort({ created_at: -1 })
    .limit(limit)
    .populate('sender_id', 'username email role') // ✅ This now correctly populates from Profile
    .populate('reply_to');
};

// Static method to get unread messages
MessageSchema.statics.getUnreadMessages = function(conversationId: string, userId: string) {
  return this.find({
    conversation_id: conversationId,
    sender_id: { $ne: userId },
    status: { $in: ['sent', 'delivered'] },
    deleted: false
  });
};

// =============================================================================
// TYPING INDICATOR SCHEMA
// =============================================================================

const TypingIndicatorSchema = new Schema({
  conversation_id: { 
    type: Schema.Types.ObjectId, 
    ref: 'Conversation', 
    required: true
  },
  
  user_id: { 
    type: String, 
    ref: 'Profile', // ✅ FIXED: References Profile
    required: true
  },
  
  is_typing: { 
    type: Boolean, 
    default: true 
  },
  
  started_at: { 
    type: Date, 
    default: Date.now 
  },
  
  expires_at: { 
    type: Date, 
    required: true
  }
}, {
  timestamps: { createdAt: 'created_at' }
});

// TTL index to auto-delete expired typing indicators
TypingIndicatorSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });
// Indexes for queries
TypingIndicatorSchema.index({ conversation_id: 1 });
TypingIndicatorSchema.index({ user_id: 1 });

// Static method to set typing status
TypingIndicatorSchema.statics.setTyping = function(
  conversationId: string, 
  userId: string, 
  isTyping: boolean = true
) {
  const expiresAt = new Date(Date.now() + 5000); // 5 seconds
  
  return this.findOneAndUpdate(
    { conversation_id: conversationId, user_id: userId },
    { 
      is_typing: isTyping,
      started_at: new Date(),
      expires_at: expiresAt
    },
    { upsert: true, new: true }
  );
};

// Static method to get typing users
TypingIndicatorSchema.statics.getTypingUsers = function(conversationId: string) {
  return this.find({
    conversation_id: conversationId,
    is_typing: true,
    expires_at: { $gt: new Date() }
  }).populate('user_id', 'username');
};

// =============================================================================
// ONLINE STATUS SCHEMA
// =============================================================================

const OnlineStatusSchema = new Schema({
  user_id: { 
    type: String, 
    ref: 'Profile', // ✅ FIXED: References Profile
    required: true,
    unique: true
  },
  
  is_online: { 
    type: Boolean, 
    default: false 
  },
  
  last_seen: { 
    type: Date, 
    default: Date.now 
  },
  
  socket_id: { 
    type: String 
  },
  
  device_info: {
    type: String
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Method to update online status
OnlineStatusSchema.statics.setOnline = function(userId: string, socketId: string, deviceInfo?: string) {
  return this.findOneAndUpdate(
    { user_id: userId },
    { 
      is_online: true,
      last_seen: new Date(),
      socket_id: socketId,
      device_info: deviceInfo
    },
    { upsert: true, new: true }
  );
};

// Method to set offline
OnlineStatusSchema.statics.setOffline = function(userId: string) {
  return this.findOneAndUpdate(
    { user_id: userId },
    { 
      is_online: false,
      last_seen: new Date(),
      socket_id: null
    },
    { new: true }
  );
};

// Method to check if user is online
OnlineStatusSchema.statics.isUserOnline = function(userId: string) {
  return this.findOne({ user_id: userId, is_online: true });
};

// =============================================================================
// CHAT NOTIFICATION SCHEMA
// =============================================================================

const ChatNotificationSchema = new Schema({
  user_id: { 
    type: String, 
    ref: 'Profile', // ✅ FIXED: References Profile
    required: true
  },
  
  conversation_id: { 
    type: Schema.Types.ObjectId, 
    ref: 'Conversation', 
    required: true
  },
  
  message_id: { 
    type: Schema.Types.ObjectId, 
    ref: 'Message', 
    required: true 
  },
  
  type: {
    type: String,
    enum: ['new_message', 'mention', 'assignment'],
    default: 'new_message'
  },
  
  is_read: { 
    type: Boolean, 
    default: false
  },
  
  read_at: { 
    type: Date 
  },
  
  sound_played: { 
    type: Boolean, 
    default: false 
  }
}, {
  timestamps: { createdAt: 'created_at' }
});

// Indexes
ChatNotificationSchema.index({ user_id: 1, is_read: 1 });
ChatNotificationSchema.index({ conversation_id: 1 });

// Static method to mark notifications as read
ChatNotificationSchema.statics.markAsRead = function(userId: string, conversationId?: string) {
  const query: any = { user_id: userId, is_read: false };
  
  if (conversationId) {
    query.conversation_id = conversationId;
  }
  
  return this.updateMany(query, { 
    is_read: true, 
    read_at: new Date() 
  });
};

// Static method to get unread count
ChatNotificationSchema.statics.getUnreadCount = function(userId: string) {
  return this.countDocuments({ user_id: userId, is_read: false });
};

// =============================================================================
// FILE UPLOAD SCHEMA
// =============================================================================

const ChatFileSchema = new Schema({
  conversation_id: { 
    type: Schema.Types.ObjectId, 
    ref: 'Conversation', 
    required: true
  },
  
  message_id: { 
    type: Schema.Types.ObjectId, 
    ref: 'Message', 
    required: true 
  },
  
  uploaded_by: { 
    type: String, 
    ref: 'Profile', // ✅ FIXED: References Profile
    required: true
  },
  
  file_name: { 
    type: String, 
    required: true 
  },
  
  original_name: { 
    type: String, 
    required: true 
  },
  
  file_path: { 
    type: String, 
    required: true 
  },
  
  file_url: { 
    type: String, 
    required: true 
  },
  
  file_type: { 
    type: String, 
    required: true 
  },
  
  mime_type: { 
    type: String, 
    required: true 
  },
  
  file_size: { 
    type: Number, 
    required: true 
  },
  
  thumbnail_url: { 
    type: String 
  },
  
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: { createdAt: 'created_at' }
});

// Indexes for ChatFileSchema
ChatFileSchema.index({ conversation_id: 1 });
ChatFileSchema.index({ uploaded_by: 1 });

// =============================================================================
// EXPORT MODELS
// =============================================================================

export const Conversation = models.Conversation || model('Conversation', ConversationSchema);
export const Message = models.Message || model('Message', MessageSchema);
export const TypingIndicator = models.TypingIndicator || model('TypingIndicator', TypingIndicatorSchema);
export const OnlineStatus = models.OnlineStatus || model('OnlineStatus', OnlineStatusSchema);
export const ChatNotification = models.ChatNotification || model('ChatNotification', ChatNotificationSchema);
export const ChatFile = models.ChatFile || model('ChatFile', ChatFileSchema);
