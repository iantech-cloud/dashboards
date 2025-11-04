import mongoose from 'mongoose';

// Message/Reply Schema for ticket thread
const MessageSchema = new mongoose.Schema({
  sender_id: {
    type: String,
    required: true,
  },
  sender_role: {
    type: String,
    enum: ['user', 'admin', 'support'],
    required: true,
  },
  sender_name: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  is_internal_note: {
    type: Boolean,
    default: false,
  },
  attachments: [{
    filename: String,
    url: String,
    size: Number,
    mime_type: String,
    uploaded_at: {
      type: Date,
      default: Date.now,
    }
  }],
  created_at: {
    type: Date,
    default: Date.now,
  },
  edited_at: {
    type: Date,
    default: null,
  },
  is_edited: {
    type: Boolean,
    default: false,
  }
});

// Activity Log Schema for tracking ticket changes
const ActivityLogSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true,
    enum: [
      'created',
      'status_changed',
      'priority_changed',
      'assigned',
      'reassigned',
      'category_changed',
      'message_added',
      'attachment_added',
      'closed',
      'reopened',
      'merged',
      'tagged'
    ],
  },
  performed_by: {
    type: String,
    required: true,
  },
  performed_by_name: {
    type: String,
    required: true,
  },
  performed_by_role: {
    type: String,
    enum: ['user', 'admin', 'support'],
    required: true,
  },
  old_value: {
    type: String,
    default: null,
  },
  new_value: {
    type: String,
    default: null,
  },
  description: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  }
});

// Main Ticket Schema
const TicketSchema = new mongoose.Schema({
  // Ticket Identification
  ticket_number: {
    type: String,
    unique: true,
    required: true,
  },
  
  // User Information
  user_id: {
    type: String,
    required: true,
  },
  user_email: {
    type: String,
    required: true,
  },
  user_name: {
    type: String,
    required: true,
  },
  
  // Ticket Details
  subject: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
  },
  description: {
    type: String,
    required: true,
  },
  
  // Categorization
  category: {
    type: String,
    required: true,
    enum: [
      'Technical Issue',
      'Billing',
      'Account',
      'Feature Request',
      'Bug Report',
      'General Inquiry',
      'Password Reset',
      'Payment Issue',
      'Verification',
      'Other'
    ],
  },
  department: {
    type: String,
    enum: ['Technical', 'Billing', 'Customer Service', 'Management'],
    default: 'Customer Service',
  },
  
  // Priority & Status
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Urgent'],
    default: 'Medium',
  },
  status: {
    type: String,
    enum: ['Open', 'In Progress', 'Waiting for Customer', 'Resolved', 'Closed', 'Reopened'],
    default: 'Open',
  },
  
  // Assignment
  assigned_to: {
    type: String,
    default: null,
  },
  assigned_to_name: {
    type: String,
    default: null,
  },
  assigned_at: {
    type: Date,
    default: null,
  },
  
  // Related Information
  related_order_id: {
    type: String,
    default: null,
  },
  related_product: {
    type: String,
    default: null,
  },
  
  // Tags
  tags: [{
    type: String,
    trim: true,
  }],
  
  // CC Emails
  cc_emails: [{
    type: String,
    lowercase: true,
    trim: true,
  }],
  
  // Attachments
  attachments: [{
    filename: String,
    url: String,
    size: Number,
    mime_type: String,
    uploaded_at: {
      type: Date,
      default: Date.now,
    }
  }],
  
  // Conversation Thread
  messages: [MessageSchema],
  
  // Activity History
  activity_log: [ActivityLogSchema],
  
  // SLA Tracking
  sla: {
    first_response_due: {
      type: Date,
      default: null,
    },
    first_response_at: {
      type: Date,
      default: null,
    },
    first_response_breached: {
      type: Boolean,
      default: false,
    },
    resolution_due: {
      type: Date,
      default: null,
    },
    resolved_at: {
      type: Date,
      default: null,
    },
    resolution_breached: {
      type: Boolean,
      default: false,
    },
  },
  
  // Customer Satisfaction
  satisfaction: {
    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: null,
    },
    feedback: {
      type: String,
      default: null,
    },
    rated_at: {
      type: Date,
      default: null,
    }
  },
  
  // Draft Status
  is_draft: {
    type: Boolean,
    default: false,
  },
  
  // Merge Information
  merged_into: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ticket',
    default: null,
  },
  merged_tickets: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ticket',
  }],
  
  // Timestamps
  created_at: {
    type: Date,
    default: Date.now,
  },
  updated_at: {
    type: Date,
    default: Date.now,
  },
  last_message_at: {
    type: Date,
    default: Date.now,
  },
  closed_at: {
    type: Date,
    default: null,
  },
  reopened_at: {
    type: Date,
    default: null,
  },
}, {
  timestamps: false,
});

// ============ PRE-VALIDATE MIDDLEWARE ============

TicketSchema.pre('validate', function(next) {
  if (this.isNew && !this.ticket_number) {
    const timestampPart = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase(); 
    this.ticket_number = `TKT-${timestampPart}-${randomPart}`;
  }
  next();
});

// ============ PRE-SAVE MIDDLEWARE ============

TicketSchema.pre('save', function(next) {
  this.updated_at = new Date();
  
  if (this.isNew && !this.sla.first_response_due) {
    const now = new Date();
    switch (this.priority) {
      case 'Urgent':
        this.sla.first_response_due = new Date(now.getTime() + 1 * 60 * 60 * 1000);
        this.sla.resolution_due = new Date(now.getTime() + 4 * 60 * 60 * 1000);
        break;
      case 'High':
        this.sla.first_response_due = new Date(now.getTime() + 4 * 60 * 60 * 1000);
        this.sla.resolution_due = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        break;
      case 'Medium':
        this.sla.first_response_due = new Date(now.getTime() + 8 * 60 * 60 * 1000);
        this.sla.resolution_due = new Date(now.getTime() + 48 * 60 * 60 * 1000);
        break;
      case 'Low':
        this.sla.first_response_due = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        this.sla.resolution_due = new Date(now.getTime() + 72 * 60 * 60 * 1000);
        break;
    }
  }
  
  if (this.messages && this.messages.length > 0 && this.isModified('messages')) {
    this.last_message_at = this.messages[this.messages.length - 1].created_at;
  }
  
  if (this.isModified('status')) {
    if (this.status === 'Closed' || this.status === 'Resolved') {
      if (!this.closed_at) this.closed_at = new Date();
      if (!this.sla.resolved_at) this.sla.resolved_at = new Date();
      this.reopened_at = null;
    } else if (this.status === 'Reopened') {
      if (!this.reopened_at) this.reopened_at = new Date();
      this.closed_at = null;
      this.sla.resolved_at = null;
    } else {
      this.closed_at = null;
      this.reopened_at = null;
      this.sla.resolved_at = null;
    }
  }
  
  next();
});

// ============ INSTANCE METHODS ============

// Add a message to the ticket
TicketSchema.methods.addMessage = function(
  senderId: string,
  senderRole: string,
  senderName: string,
  message: string,
  isInternalNote: boolean = false,
  attachments: any[] = []
) {
  const newMessage = {
    sender_id: senderId,
    sender_role: senderRole,
    sender_name: senderName,
    message: message,
    is_internal_note: isInternalNote,
    attachments: attachments,
    created_at: new Date(),
  };
  
  this.messages.push(newMessage);
  this.last_message_at = new Date();
  
  if ((senderRole === 'admin' || senderRole === 'support') && !this.sla.first_response_at) {
    this.sla.first_response_at = new Date();
    if (this.sla.first_response_due && this.sla.first_response_at > this.sla.first_response_due) {
      this.sla.first_response_breached = true;
    }
  }
  
  return this.save();
};

// Add activity log entry (MODIFIED: No save call)
TicketSchema.methods.addActivityLog = function(
  action: string,
  performedBy: string,
  performedByName: string,
  performedByRole: string,
  description: string,
  oldValue: string = null,
  newValue: string = null
) {
  this.activity_log.push({
    action,
    performed_by: performedBy,
    performed_by_name: performedByName,
    performed_by_role: performedByRole,
    old_value: oldValue,
    new_value: newValue,
    description,
    timestamp: new Date(),
  });
  
  // Just add to activity log, let the calling method handle saving
};

// Change ticket status (MODIFIED: Single save call)
TicketSchema.methods.changeStatus = function(
  newStatus: string,
  performedBy: string,
  performedByName: string,
  performedByRole: string
) {
  const oldStatus = this.status;
  this.status = newStatus;
  
  // Add activity log without saving
  this.addActivityLog(
    'status_changed',
    performedBy,
    performedByName,
    performedByRole,
    `Status changed from ${oldStatus} to ${newStatus}`,
    oldStatus,
    newStatus
  );
  
  // Single save call at the end
  return this.save();
};

// Assign ticket (MODIFIED: Single save call)
TicketSchema.methods.assignTo = function(
  agentId: string,
  agentName: string,
  performedBy: string,
  performedByName: string,
  performedByRole: string
) {
  const wasAssigned = !!this.assigned_to;
  const oldAssignee = this.assigned_to_name || 'Unassigned';
  
  this.assigned_to = agentId;
  this.assigned_to_name = agentName;
  this.assigned_at = new Date();
  
  // Add activity log without saving
  this.addActivityLog(
    wasAssigned ? 'reassigned' : 'assigned',
    performedBy,
    performedByName,
    performedByRole,
    wasAssigned 
      ? `Ticket reassigned from ${oldAssignee} to ${agentName}`
      : `Ticket assigned to ${agentName}`,
    oldAssignee,
    agentName
  );
  
  // Single save call at the end
  return this.save();
};

// Close ticket (MODIFIED: Single save call)
TicketSchema.methods.closeTicket = function(
  performedBy: string,
  performedByName: string,
  performedByRole: string
) {
  this.status = 'Closed';
  
  // Add activity log without saving
  this.addActivityLog(
    'closed',
    performedBy,
    performedByName,
    performedByRole,
    'Ticket closed'
  );
  
  // Single save call at the end
  return this.save();
};

// Reopen ticket (MODIFIED: Single save call)
TicketSchema.methods.reopenTicket = function(
  performedBy: string,
  performedByName: string,
  performedByRole: string
) {
  this.status = 'Reopened';
  
  // Add activity log without saving
  this.addActivityLog(
    'reopened',
    performedBy,
    performedByName,
    performedByRole,
    'Ticket reopened'
  );
  
  // Single save call at the end
  return this.save();
};

// Add satisfaction rating
TicketSchema.methods.rateSatisfaction = function(
  rating: number,
  feedback: string = null
) {
  this.satisfaction.rating = rating;
  this.satisfaction.feedback = feedback;
  this.satisfaction.rated_at = new Date();
  
  return this.save();
};

// ============ STATIC METHODS ============

// Get tickets for a specific user
TicketSchema.statics.getUserTickets = function(userId: string, filters: any = {}) {
  return this.find({ user_id: userId, is_draft: false, ...filters })
    .sort({ created_at: -1 });
};

// Get all tickets (for admin/support)
TicketSchema.statics.getAllTickets = function(filters: any = {}) {
  return this.find({ is_draft: false, ...filters })
    .sort({ created_at: -1 });
};

// Get tickets by status
TicketSchema.statics.getTicketsByStatus = function(status: string) {
  return this.find({ status, is_draft: false })
    .sort({ created_at: -1 });
};

// Get assigned tickets for an agent
TicketSchema.statics.getAssignedTickets = function(agentId: string) {
  return this.find({ assigned_to: agentId, is_draft: false })
    .sort({ priority: -1, created_at: -1 });
};

// Get unassigned tickets
TicketSchema.statics.getUnassignedTickets = function() {
  return this.find({ assigned_to: null, is_draft: false, status: { $in: ['Open', 'In Progress', 'Waiting for Customer'] } })
    .sort({ priority: -1, created_at: -1 });
};

// Get overdue tickets (SLA breached)
TicketSchema.statics.getOverdueTickets = function() {
  const now = new Date();
  return this.find({
    is_draft: false,
    status: { $nin: ['Closed', 'Resolved'] },
    $or: [
      { 'sla.first_response_due': { $lt: now }, 'sla.first_response_at': null },
      { 'sla.resolution_due': { $lt: now }, 'sla.resolved_at': null }
    ]
  })
    .sort({ 'sla.first_response_due': 1 });
};

// Search tickets
TicketSchema.statics.searchTickets = function(searchTerm: string, role: string, userId?: string) {
  const query: any = {
    is_draft: false,
    $or: [
      { $text: { $search: searchTerm } }, 
      { ticket_number: { $regex: searchTerm, $options: 'i' } },
    ]
  };
  
  // If user role, only show their tickets
  if (role === 'user' && userId) {
    query.user_id = userId;
  }
  
  return this.find(query)
    .sort({ created_at: -1 });
};

// Get ticket statistics
TicketSchema.statics.getTicketStats = async function() {
  const total = await this.countDocuments({ is_draft: false });
  const open = await this.countDocuments({ status: 'Open', is_draft: false });
  const inProgress = await this.countDocuments({ status: 'In Progress', is_draft: false });
  const resolved = await this.countDocuments({ status: 'Resolved', is_draft: false });
  const closed = await this.countDocuments({ status: 'Closed', is_draft: false });
  const unassigned = await this.countDocuments({ assigned_to: null, is_draft: false, status: { $nin: ['Closed', 'Resolved'] } });
  
  const now = new Date();
  const overdue = await this.countDocuments({
    is_draft: false,
    status: { $nin: ['Closed', 'Resolved'] },
    $or: [
      { 'sla.first_response_due': { $lt: now }, 'sla.first_response_at': null },
      { 'sla.resolution_due': { $lt: now }, 'sla.resolved_at': null }
    ]
  });
  
  // Average satisfaction rating
  const satisfactionResult = await this.aggregate([
    { $match: { 'satisfaction.rating': { $ne: null } } },
    { $group: { _id: null, avgRating: { $avg: '$satisfaction.rating' } } }
  ]);
  
  const avgSatisfaction = satisfactionResult.length > 0 ? satisfactionResult[0].avgRating : 0;
  
  return {
    total,
    open,
    inProgress,
    resolved,
    closed,
    unassigned,
    overdue,
    avgSatisfaction: avgSatisfaction.toFixed(2)
  };
};

// ============ INDEXES ============

TicketSchema.index({ user_id: 1, created_at: -1 });
TicketSchema.index({ status: 1, priority: -1 });
TicketSchema.index({ assigned_to: 1, status: 1 });
TicketSchema.index({ category: 1, status: 1 });
TicketSchema.index({ created_at: -1 });
TicketSchema.index({ last_message_at: -1 });
TicketSchema.index({ 'sla.first_response_due': 1 });
TicketSchema.index({ 'sla.resolution_due': 1 });
TicketSchema.index({ is_draft: 1 });

// Text index for search
TicketSchema.index({ 
  subject: 'text', 
  description: 'text',
  user_email: 'text'
});

// ============ VIRTUALS ============

TicketSchema.virtual('message_count').get(function() {
  return this.messages.length;
});

TicketSchema.virtual('is_overdue').get(function() {
  const now = new Date();
  if (this.status === 'Closed' || this.status === 'Resolved') return false;
  
  // Check if first response is due and not provided
  const firstResponseOverdue = !this.sla.first_response_at && this.sla.first_response_due && this.sla.first_response_due < now;
  // Check if resolution is due and not provided
  const resolutionOverdue = !this.sla.resolved_at && this.sla.resolution_due && this.sla.resolution_due < now;
  
  return firstResponseOverdue || resolutionOverdue;
});

TicketSchema.virtual('time_since_last_message').get(function() {
  if (!this.last_message_at) return null;
  const now = new Date();
  const diff = now.getTime() - this.last_message_at.getTime();
  const minutes = Math.floor(diff / (1000 * 60));
  
  if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days !== 1 ? 's' : ''} ago`;
});

// Ensure virtuals are included in JSON
TicketSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.__v;
    return ret;
  }
});

TicketSchema.set('toObject', {
  virtuals: true
});

// Check if model exists before creating it
const Ticket = mongoose.models.Ticket || mongoose.model('Ticket', TicketSchema);

export { Ticket };
