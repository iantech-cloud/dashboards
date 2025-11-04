'use server';

import { revalidatePath } from 'next/cache';
import { connectToDatabase } from '@/app/lib/mongoose';
import { Ticket } from '@/app/lib/models/Ticket';
import { Profile } from '@/app/lib/models/Profile';
import { auth } from '@/auth';
import mongoose from 'mongoose';

// ============ TYPES ============

interface TicketFilters {
  status?: string;
  category?: string;
  priority?: string;
  assignedTo?: string;
  dateFrom?: string;
  dateTo?: string;
  searchTerm?: string;
  department?: string;
  isOverdue?: boolean;
}

interface AssignTicketData {
  ticketId: string;
  agentId: string;
}

interface UpdateTicketStatusData {
  ticketId: string;
  status: string;
}

interface AddInternalNoteData {
  ticketId: string;
  note: string;
}

interface MergeTicketsData {
  sourceTicketIds: string[];
  targetTicketId: string;
}

// ============ HELPER FUNCTIONS ============

async function getAdminFromSession() {
  const session = await auth(); 
  if (!session?.user?.email) {
    throw new Error('Unauthorized');
  }
  
  await connectToDatabase();
  const user = await Profile.findOne({ email: session.user.email });
  
  if (!user || (user.role !== 'admin' && user.role !== 'support')) {
    throw new Error('Unauthorized: Admin or Support role required');
  }
  
  // Return user with _id as string for UUID compatibility
  const userObj = user.toObject();
  return {
    ...userObj,
    _id: userObj._id.toString(),
  };
}

// ============ GET ALL TICKETS ============

export async function getAllTickets(filters: TicketFilters = {}) {
  try {
    const admin = await getAdminFromSession();
    await connectToDatabase();
    
    // Build query
    const query: any = { is_draft: false };
    
    if (filters.status) {
      query.status = filters.status;
    }
    
    if (filters.category) {
      query.category = filters.category;
    }
    
    if (filters.priority) {
      query.priority = filters.priority;
    }
    
    if (filters.department) {
      query.department = filters.department;
    }
    
    if (filters.assignedTo) {
      if (filters.assignedTo === 'unassigned') {
        query.assigned_to = null;
      } else {
        // For UUID, we can use the string directly
        query.assigned_to = filters.assignedTo;
      }
    }
    
    if (filters.dateFrom || filters.dateTo) {
      query.created_at = {};
      if (filters.dateFrom) {
        query.created_at.$gte = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        query.created_at.$lte = new Date(filters.dateTo);
      }
    }
    
    if (filters.isOverdue) {
      const now = new Date();
      query.status = { $nin: ['Closed', 'Resolved'] };
      query.$or = [
        { 'sla.first_response_due': { $lt: now }, 'sla.first_response_at': null },
        { 'sla.resolution_due': { $lt: now }, 'sla.resolved_at': null }
      ];
    }
    
    if (filters.searchTerm) {
      query.$or = [
        { ticket_number: { $regex: filters.searchTerm, $options: 'i' } },
        { subject: { $regex: filters.searchTerm, $options: 'i' } },
        { description: { $regex: filters.searchTerm, $options: 'i' } },
        { user_email: { $regex: filters.searchTerm, $options: 'i' } },
        { user_name: { $regex: filters.searchTerm, $options: 'i' } },
      ];
    }
    
    console.log('Querying tickets with filters:', JSON.stringify(query, null, 2));
    
    // Get tickets without populate first to debug
    const tickets = await Ticket.find(query)
      .sort({ created_at: -1 })
      .lean();
    
    console.log(`Found ${tickets.length} tickets`);
    
    // Get user and agent details separately
    const enhancedTickets = await Promise.all(
      tickets.map(async (ticket) => {
        // Get user info
        const user = await Profile.findById(ticket.user_id).select('username email phone_number').lean();
        
        // Get assigned agent info if exists
        let assignedTo = null;
        if (ticket.assigned_to) {
          assignedTo = await Profile.findById(ticket.assigned_to).select('username email role').lean();
        }
        
        return {
          ...ticket,
          user_id: user || { _id: ticket.user_id, username: 'Unknown User', email: ticket.user_email, phone_number: null },
          assigned_to: assignedTo,
        };
      })
    );
    
    return {
      success: true,
      tickets: enhancedTickets.map(ticket => ({
        id: ticket._id.toString(),
        ticketNumber: ticket.ticket_number,
        subject: ticket.subject,
        status: ticket.status,
        priority: ticket.priority,
        category: ticket.category,
        department: ticket.department,
        user: {
          id: ticket.user_id._id.toString(),
          name: ticket.user_id.username || 'Unknown User',
          email: ticket.user_id.email || ticket.user_email,
          phone: ticket.user_id.phone_number,
        },
        assignedTo: ticket.assigned_to ? {
          id: ticket.assigned_to._id.toString(),
          name: ticket.assigned_to.username,
          email: ticket.assigned_to.email,
          role: ticket.assigned_to.role,
        } : null,
        messageCount: ticket.messages?.length || 0,
        createdAt: ticket.created_at,
        updatedAt: ticket.updated_at,
        lastMessageAt: ticket.last_message_at,
        sla: {
          firstResponseDue: ticket.sla.first_response_due,
          firstResponseAt: ticket.sla.first_response_at,
          resolutionDue: ticket.sla.resolution_due,
          isOverdue: 
            (ticket.status !== 'Closed' && ticket.status !== 'Resolved') &&
            ((!ticket.sla.first_response_at && ticket.sla.first_response_due < new Date()) ||
             (!ticket.sla.resolved_at && ticket.sla.resolution_due < new Date()))
        }
      }))
    };
  } catch (error: any) {
    console.error('Error fetching all tickets:', error);
    return { success: false, error: error.message || 'Failed to fetch tickets' };
  }
}

// ============ GET SINGLE TICKET (ADMIN VIEW) ============

export async function getTicketByIdAdmin(ticketId: string) {
  try {
    await getAdminFromSession();
    await connectToDatabase();
    
    if (!mongoose.Types.ObjectId.isValid(ticketId)) {
      return { success: false, error: 'Invalid ticket ID' };
    }
    
    const ticket = await Ticket.findById(ticketId).lean();
    
    if (!ticket) {
      return { success: false, error: 'Ticket not found' };
    }
    
    // Get user and agent details separately
    const user = await Profile.findById(ticket.user_id).select('username email phone_number role status').lean();
    let assignedTo = null;
    if (ticket.assigned_to) {
      assignedTo = await Profile.findById(ticket.assigned_to).select('username email role').lean();
    }
    
    return {
      success: true,
      ticket: {
        id: ticket._id.toString(),
        ticketNumber: ticket.ticket_number,
        subject: ticket.subject,
        description: ticket.description,
        status: ticket.status,
        priority: ticket.priority,
        category: ticket.category,
        department: ticket.department,
        relatedOrderId: ticket.related_order_id,
        relatedProduct: ticket.related_product,
        tags: ticket.tags,
        ccEmails: ticket.cc_emails,
        attachments: ticket.attachments,
        user: {
          id: user?._id.toString() || ticket.user_id,
          name: user?.username || 'Unknown User',
          email: user?.email || ticket.user_email,
          phone: user?.phone_number,
          role: user?.role,
          status: user?.status,
        },
        messages: (ticket.messages || []).map(msg => ({
          id: msg._id.toString(),
          senderId: msg.sender_id.toString(),
          senderName: msg.sender_name,
          senderRole: msg.sender_role,
          message: msg.message,
          isInternalNote: msg.is_internal_note,
          attachments: msg.attachments,
          createdAt: msg.created_at,
          isEdited: msg.is_edited,
          editedAt: msg.edited_at,
        })),
        assignedTo: assignedTo ? {
          id: assignedTo._id.toString(),
          name: assignedTo.username,
          email: assignedTo.email,
          role: assignedTo.role,
        } : null,
        assignedAt: ticket.assigned_at,
        activityLog: (ticket.activity_log || []).map(log => ({
          id: log._id.toString(),
          action: log.action,
          performedBy: log.performed_by_name,
          performedByRole: log.performed_by_role,
          description: log.description,
          oldValue: log.old_value,
          newValue: log.new_value,
          timestamp: log.timestamp,
        })),
        sla: {
          firstResponseDue: ticket.sla.first_response_due,
          firstResponseAt: ticket.sla.first_response_at,
          firstResponseBreached: ticket.sla.first_response_breached,
          resolutionDue: ticket.sla.resolution_due,
          resolvedAt: ticket.sla.resolved_at,
          resolutionBreached: ticket.sla.resolution_breached,
        },
        satisfaction: ticket.satisfaction,
        mergedInto: ticket.merged_into?.toString(),
        mergedTickets: ticket.merged_tickets?.map(id => id.toString()) || [],
        createdAt: ticket.created_at,
        updatedAt: ticket.updated_at,
        lastMessageAt: ticket.last_message_at,
        closedAt: ticket.closed_at,
        reopenedAt: ticket.reopened_at,
      }
    };
  } catch (error: any) {
    console.error('Error fetching ticket:', error);
    return { success: false, error: error.message || 'Failed to fetch ticket' };
  }
}

// ============ ASSIGN TICKET ============

export async function assignTicket(data: AssignTicketData) {
  try {
    const admin = await getAdminFromSession();
    await connectToDatabase();
    
    if (!mongoose.Types.ObjectId.isValid(data.ticketId)) {
      return { success: false, error: 'Invalid ticket ID' };
    }
    
    const ticket = await Ticket.findById(data.ticketId);
    if (!ticket) {
      return { success: false, error: 'Ticket not found' };
    }
    
    const agent = await Profile.findById(data.agentId);
    if (!agent || (agent.role !== 'admin' && agent.role !== 'support')) {
      return { success: false, error: 'Invalid agent or agent does not have support role' };
    }
    
    await ticket.assignTo(
      agent._id.toString(), // Use string UUID
      agent.username,
      admin._id,
      admin.username,
      admin.role
    );
    
    revalidatePath('/admin/support');
    revalidatePath(`/admin/support/${data.ticketId}`);
    
    return { success: true, message: `Ticket assigned to ${agent.username}` };
  } catch (error: any) {
    console.error('Error assigning ticket:', error);
    return { success: false, error: error.message || 'Failed to assign ticket' };
  }
}

// ============ UPDATE TICKET STATUS ============

export async function updateTicketStatus(data: UpdateTicketStatusData) {
  try {
    const admin = await getAdminFromSession();
    await connectToDatabase();
    
    if (!mongoose.Types.ObjectId.isValid(data.ticketId)) {
      return { success: false, error: 'Invalid ticket ID' };
    }
    
    const ticket = await Ticket.findById(data.ticketId);
    if (!ticket) {
      return { success: false, error: 'Ticket not found' };
    }
    
    const validStatuses = ['Open', 'In Progress', 'Waiting for Customer', 'Resolved', 'Closed', 'Reopened'];
    if (!validStatuses.includes(data.status)) {
      return { success: false, error: 'Invalid status' };
    }
    
    if (data.status === 'Closed') {
      await ticket.closeTicket(admin._id, admin.username, admin.role);
    } else if (data.status === 'Reopened' && (ticket.status === 'Closed' || ticket.status === 'Resolved')) {
      await ticket.reopenTicket(admin._id, admin.username, admin.role);
    } else {
      await ticket.changeStatus(data.status, admin._id, admin.username, admin.role);
    }
    
    revalidatePath('/admin/support');
    revalidatePath(`/admin/support/${data.ticketId}`);
    
    return { success: true, message: `Ticket status updated to ${data.status}` };
  } catch (error: any) {
    console.error('Error updating ticket status:', error);
    return { success: false, error: error.message || 'Failed to update status' };
  }
}

// ============ ADD MESSAGE (ADMIN/SUPPORT) ============

export async function addAdminMessage(ticketId: string, message: string, attachments: any[] = []) {
  try {
    const admin = await getAdminFromSession();
    await connectToDatabase();
    
    if (!mongoose.Types.ObjectId.isValid(ticketId)) {
      return { success: false, error: 'Invalid ticket ID' };
    }
    
    if (!message || message.trim().length === 0) {
      return { success: false, error: 'Message cannot be empty' };
    }
    
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return { success: false, error: 'Ticket not found' };
    }
    
    await ticket.addMessage(
      admin._id,
      admin.role,
      admin.username,
      message.trim(),
      false,
      attachments
    );
    
    await ticket.addActivityLog(
      'message_added',
      admin._id,
      admin.username,
      admin.role,
      'Support agent added a message'
    );
    
    // Auto-update status if it was "Open"
    if (ticket.status === 'Open') {
      ticket.status = 'In Progress';
      await ticket.save();
    }
    
    revalidatePath('/admin/support');
    revalidatePath(`/admin/support/${ticketId}`);
    
    return { success: true, message: 'Message sent successfully' };
  } catch (error: any) {
    console.error('Error adding admin message:', error);
    return { success: false, error: error.message || 'Failed to send message' };
  }
}

// ============ ADD INTERNAL NOTE ============

export async function addInternalNote(data: AddInternalNoteData) {
  try {
    const admin = await getAdminFromSession();
    await connectToDatabase();
    
    if (!mongoose.Types.ObjectId.isValid(data.ticketId)) {
      return { success: false, error: 'Invalid ticket ID' };
    }
    
    if (!data.note || data.note.trim().length === 0) {
      return { success: false, error: 'Note cannot be empty' };
    }
    
    const ticket = await Ticket.findById(data.ticketId);
    if (!ticket) {
      return { success: false, error: 'Ticket not found' };
    }
    
    await ticket.addMessage(
      admin._id,
      admin.role,
      admin.username,
      data.note.trim(),
      true, // Internal note
      []
    );
    
    revalidatePath('/admin/support');
    revalidatePath(`/admin/support/${data.ticketId}`);
    
    return { success: true, message: 'Internal note added successfully' };
  } catch (error: any) {
    console.error('Error adding internal note:', error);
    return { success: false, error: error.message || 'Failed to add note' };
  }
}

// ============ UPDATE TICKET PRIORITY ============

export async function updateTicketPriority(ticketId: string, priority: string) {
  try {
    const admin = await getAdminFromSession();
    await connectToDatabase();
    
    if (!mongoose.Types.ObjectId.isValid(ticketId)) {
      return { success: false, error: 'Invalid ticket ID' };
    }
    
    const validPriorities = ['Low', 'Medium', 'High', 'Urgent'];
    if (!validPriorities.includes(priority)) {
      return { success: false, error: 'Invalid priority' };
    }
    
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return { success: false, error: 'Ticket not found' };
    }
    
    const oldPriority = ticket.priority;
    ticket.priority = priority;
    
    await ticket.addActivityLog(
      'priority_changed',
      admin._id,
      admin.username,
      admin.role,
      `Priority changed from ${oldPriority} to ${priority}`,
      oldPriority,
      priority
    );
    
    await ticket.save();
    
    revalidatePath('/admin/support');
    revalidatePath(`/admin/support/${ticketId}`);
    
    return { success: true, message: `Priority updated to ${priority}` };
  } catch (error: any) {
    console.error('Error updating priority:', error);
    return { success: false, error: error.message || 'Failed to update priority' };
  }
}

// ============ UPDATE TICKET CATEGORY ============

export async function updateTicketCategory(ticketId: string, category: string) {
  try {
    const admin = await getAdminFromSession();
    await connectToDatabase();
    
    if (!mongoose.Types.ObjectId.isValid(ticketId)) {
      return { success: false, error: 'Invalid ticket ID' };
    }
    
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return { success: false, error: 'Ticket not found' };
    }
    
    const oldCategory = ticket.category;
    ticket.category = category;
    
    await ticket.addActivityLog(
      'category_changed',
      admin._id,
      admin.username,
      admin.role,
      `Category changed from ${oldCategory} to ${category}`,
      oldCategory,
      category
    );
    
    await ticket.save();
    
    revalidatePath('/admin/support');
    revalidatePath(`/admin/support/${ticketId}`);
    
    return { success: true, message: `Category updated to ${category}` };
  } catch (error: any) {
    console.error('Error updating category:', error);
    return { success: false, error: error.message || 'Failed to update category' };
  }
}

// ============ MERGE TICKETS ============

export async function mergeTickets(data: MergeTicketsData) {
  try {
    const admin = await getAdminFromSession();
    await connectToDatabase();
    
    if (!mongoose.Types.ObjectId.isValid(data.targetTicketId)) {
      return { success: false, error: 'Invalid target ticket ID' };
    }
    
    if (data.sourceTicketIds.length === 0) {
      return { success: false, error: 'No source tickets provided' };
    }
    
    const targetTicket = await Ticket.findById(data.targetTicketId);
    if (!targetTicket) {
      return { success: false, error: 'Target ticket not found' };
    }
    
    // Merge each source ticket
    for (const sourceId of data.sourceTicketIds) {
      if (!mongoose.Types.ObjectId.isValid(sourceId)) continue;
      if (sourceId === data.targetTicketId) continue; // Skip if same as target
      
      const sourceTicket = await Ticket.findById(sourceId);
      if (!sourceTicket) continue;
      
      // Copy messages from source to target
      sourceTicket.messages.forEach(msg => {
        targetTicket.messages.push(msg);
      });
      
      // Mark source ticket as merged
      sourceTicket.merged_into = targetTicket._id;
      sourceTicket.status = 'Closed';
      await sourceTicket.save();
      
      // Add to merged tickets array
      targetTicket.merged_tickets.push(sourceTicket._id);
    }
    
    // Add activity log
    await targetTicket.addActivityLog(
      'merged',
      admin._id,
      admin.username,
      admin.role,
      `Merged ${data.sourceTicketIds.length} ticket(s) into this ticket`
    );
    
    await targetTicket.save();
    
    revalidatePath('/admin/support');
    revalidatePath(`/admin/support/${data.targetTicketId}`);
    
    return { success: true, message: 'Tickets merged successfully' };
  } catch (error: any) {
    console.error('Error merging tickets:', error);
    return { success: false, error: error.message || 'Failed to merge tickets' };
  }
}

// ============ GET TICKET STATISTICS ============

export async function getTicketStatistics() {
  try {
    await getAdminFromSession();
    await connectToDatabase();
    
    const stats = await Ticket.getTicketStats();
    
    // Additional stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayTickets = await Ticket.countDocuments({
      created_at: { $gte: today },
      is_draft: false
    });
    
    const thisWeek = new Date();
    thisWeek.setDate(thisWeek.getDate() - 7);
    
    const weeklyTickets = await Ticket.countDocuments({
      created_at: { $gte: thisWeek },
      is_draft: false
    });
    
    // Get priority breakdown
    const priorityBreakdown = await Ticket.aggregate([
      { $match: { is_draft: false, status: { $nin: ['Closed', 'Resolved'] } } },
      { $group: { _id: '$priority', count: { $sum: 1 } } }
    ]);
    
    // Get category breakdown
    const categoryBreakdown = await Ticket.aggregate([
      { $match: { is_draft: false } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    
    return {
      success: true,
      stats: {
        ...stats,
        todayTickets,
        weeklyTickets,
        priorityBreakdown: priorityBreakdown.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {} as Record<string, number>),
        categoryBreakdown: categoryBreakdown.map(item => ({
          category: item._id,
          count: item.count
        }))
      }
    };
  } catch (error: any) {
    console.error('Error fetching ticket statistics:', error);
    return { success: false, error: error.message || 'Failed to fetch statistics' };
  }
}

// ============ GET SUPPORT AGENTS ============

export async function getSupportAgents() {
  try {
    await getAdminFromSession();
    await connectToDatabase();
    
    const agents = await Profile.find({
      role: { $in: ['admin', 'support'] },
      is_active: true
    })
      .select('username email role')
      .lean();
    
    // Get ticket counts for each agent
    const agentsWithCounts = await Promise.all(
      agents.map(async (agent) => {
        const assignedCount = await Ticket.countDocuments({
          assigned_to: agent._id.toString(), // Use string UUID
          status: { $nin: ['Closed', 'Resolved'] },
          is_draft: false
        });
        
        return {
          id: agent._id.toString(),
          name: agent.username,
          email: agent.email,
          role: agent.role,
          assignedTickets: assignedCount
        };
      })
    );
    
    return {
      success: true,
      agents: agentsWithCounts
    };
  } catch (error: any) {
    console.error('Error fetching support agents:', error);
    return { success: false, error: error.message || 'Failed to fetch agents' };
  }
}

// ============ GET ASSIGNED TICKETS (FOR CURRENT AGENT) ============

export async function getMyAssignedTickets() {
  try {
    const admin = await getAdminFromSession();
    await connectToDatabase();
    
    const tickets = await Ticket.find({
      assigned_to: admin._id, // Use string UUID directly
      is_draft: false,
      status: { $nin: ['Closed', 'Resolved'] }
    })
      .sort({ priority: -1, created_at: -1 })
      .lean();
    
    // Get user details for each ticket
    const enhancedTickets = await Promise.all(
      tickets.map(async (ticket) => {
        const user = await Profile.findById(ticket.user_id).select('username email phone_number').lean();
        return {
          ...ticket,
          user_id: user || { _id: ticket.user_id, username: 'Unknown User', email: ticket.user_email, phone_number: null },
        };
      })
    );
    
    return {
      success: true,
      tickets: enhancedTickets.map(ticket => ({
        id: ticket._id.toString(),
        ticketNumber: ticket.ticket_number,
        subject: ticket.subject,
        status: ticket.status,
        priority: ticket.priority,
        category: ticket.category,
        user: {
          name: ticket.user_id.username || 'Unknown User',
          email: ticket.user_id.email || ticket.user_email,
        },
        messageCount: ticket.messages?.length || 0,
        createdAt: ticket.created_at,
        lastMessageAt: ticket.last_message_at,
      }))
    };
  } catch (error: any) {
    console.error('Error fetching assigned tickets:', error);
    return { success: false, error: error.message || 'Failed to fetch assigned tickets' };
  }
}

// ============ BULK UPDATE STATUS ============

export async function bulkUpdateStatus(ticketIds: string[], status: string) {
  try {
    const admin = await getAdminFromSession();
    await connectToDatabase();
    
    const validStatuses = ['Open', 'In Progress', 'Waiting for Customer', 'Resolved', 'Closed'];
    if (!validStatuses.includes(status)) {
      return { success: false, error: 'Invalid status' };
    }
    
    let updated = 0;
    
    for (const ticketId of ticketIds) {
      if (!mongoose.Types.ObjectId.isValid(ticketId)) continue;
      
      const ticket = await Ticket.findById(ticketId);
      if (!ticket) continue;
      
      if (status === 'Closed') {
        await ticket.closeTicket(admin._id, admin.username, admin.role);
      } else {
        await ticket.changeStatus(status, admin._id, admin.username, admin.role);
      }
      
      updated++;
    }
    
    revalidatePath('/admin/support');
    
    return { 
      success: true, 
      message: `${updated} ticket${updated !== 1 ? 's' : ''} updated successfully` 
    };
  } catch (error: any) {
    console.error('Error bulk updating tickets:', error);
    return { success: false, error: error.message || 'Failed to update tickets' };
  }
}

// ============ BULK ASSIGN ============

export async function bulkAssignTickets(ticketIds: string[], agentId: string) {
  try {
    const admin = await getAdminFromSession();
    await connectToDatabase();
    
    const agent = await Profile.findById(agentId);
    if (!agent || (agent.role !== 'admin' && agent.role !== 'support')) {
      return { success: false, error: 'Invalid agent' };
    }
    
    let assigned = 0;
    
    for (const ticketId of ticketIds) {
      if (!mongoose.Types.ObjectId.isValid(ticketId)) continue;
      
      const ticket = await Ticket.findById(ticketId);
      if (!ticket) continue;
      
      await ticket.assignTo(
        agent._id.toString(), // Use string UUID
        agent.username,
        admin._id,
        admin.username,
        admin.role
      );
      
      assigned++;
    }
    
    revalidatePath('/admin/support');
    
    return { 
      success: true, 
      message: `${assigned} ticket${assigned !== 1 ? 's' : ''} assigned to ${agent.username}` 
    };
  } catch (error: any) {
    console.error('Error bulk assigning tickets:', error);
    return { success: false, error: error.message || 'Failed to assign tickets' };
  }
}
