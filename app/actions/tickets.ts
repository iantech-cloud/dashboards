'use server';

import { revalidatePath } from 'next/cache';
import { connectToDatabase } from '@/app/lib/mongoose';
import { Ticket } from '@/app/lib/models/Ticket';
import { Profile } from '@/app/lib/models/Profile';
import { auth } from '@/auth';
import mongoose from 'mongoose';

// ============ TYPES ============

interface CreateTicketData {
  subject: string;
  description: string;
  category: string;
  priority: string;
  relatedOrderId?: string;
  relatedProduct?: string;
  tags?: string[];
  ccEmails?: string[];
  attachments?: any[];
  isDraft?: boolean;
}

interface UpdateTicketData {
  subject?: string;
  description?: string;
  category?: string;
  priority?: string;
  tags?: string[];
}

interface AddMessageData {
  ticketId: string;
  message: string;
  attachments?: any[];
}

interface TicketFilters {
  status?: string;
  category?: string;
  priority?: string;
  dateFrom?: string;
  dateTo?: string;
  searchTerm?: string;
}

// ============ HELPER FUNCTIONS ============

/**
 * Retrieves the authenticated user profile from the database using the session.
 * NOTE: This function uses the NextAuth v5 'auth()' function directly.
 */
async function getUserFromSession() {
  // NEXTAUTH V5 CHANGE: Call auth() directly without passing authOptions
  const session = await auth();
  
  // Ensure the user is authenticated and has an email in the session
  if (!session?.user?.email) {
    throw new Error('Unauthorized');
  }
  
  await connectToDatabase();
  const user = await Profile.findOne({ email: session.user.email });
  
  if (!user) {
    throw new Error('User not found');
  }
  
  // Return the user object with _id as string (UUID)
  const userObj = user.toObject();
  return {
    ...userObj,
    _id: userObj._id.toString(), // Convert to string for UUID compatibility
  };
}

function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// ============ TICKET CREATION ============

export async function createTicket(data: CreateTicketData) {
  try {
    const user = await getUserFromSession();
    
    // Validate required fields
    if (!data.subject || data.subject.trim().length === 0) {
      return { success: false, error: 'Subject is required' };
    }
    
    if (!data.description || data.description.trim().length === 0) {
      return { success: false, error: 'Description is required' };
    }
    
    if (!data.category) {
      return { success: false, error: 'Category is required' };
    }
    
    // Validate CC emails if provided
    if (data.ccEmails && data.ccEmails.length > 0) {
      const invalidEmails = data.ccEmails.filter(email => !validateEmail(email));
      if (invalidEmails.length > 0) {
        return { success: false, error: `Invalid email addresses: ${invalidEmails.join(', ')}` };
      }
    }
    
    // Create ticket
    const ticket = new Ticket({
      user_id: user._id, // Now using string UUID
      user_email: user.email,
      user_name: user.username,
      subject: data.subject.trim(),
      description: data.description.trim(),
      category: data.category,
      priority: data.priority || 'Medium',
      related_order_id: data.relatedOrderId || null,
      related_product: data.relatedProduct || null,
      tags: data.tags || [],
      cc_emails: data.ccEmails || [],
      attachments: data.attachments || [],
      is_draft: data.isDraft || false,
    });
    
    // Add creation activity log
    ticket.activity_log.push({
      action: 'created',
      performed_by: user._id, // Now using string UUID
      performed_by_name: user.username,
      performed_by_role: user.role,
      description: 'Ticket created',
      timestamp: new Date(),
    });
    
    await ticket.save();
    
    revalidatePath('/dashboard/support');
    
    return {
      success: true,
      ticket: {
        id: ticket._id.toString(),
        ticketNumber: ticket.ticket_number,
        subject: ticket.subject,
        status: ticket.status,
        priority: ticket.priority,
        createdAt: ticket.created_at,
      }
    };
  } catch (error: any) {
    console.error('Error creating ticket:', error);
    return { success: false, error: error.message || 'Failed to create ticket' };
  }
}

// ============ GET USER TICKETS ============

export async function getUserTickets(filters: TicketFilters = {}) {
  try {
    const user = await getUserFromSession();
    await connectToDatabase();
    
    // Build query - user._id is now string UUID
    const query: any = {
      user_id: user._id,
      is_draft: false,
    };
    
    if (filters.status) {
      query.status = filters.status;
    }
    
    if (filters.category) {
      query.category = filters.category;
    }
    
    if (filters.priority) {
      query.priority = filters.priority;
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
    
    if (filters.searchTerm) {
      query.$or = [
        { ticket_number: { $regex: filters.searchTerm, $options: 'i' } },
        { subject: { $regex: filters.searchTerm, $options: 'i' } },
        { description: { $regex: filters.searchTerm, $options: 'i' } },
      ];
    }
    
    const tickets = await Ticket.find(query)
      .sort({ created_at: -1 })
      .lean();
    
    return {
      success: true,
      tickets: tickets.map(ticket => ({
        id: ticket._id.toString(),
        ticketNumber: ticket.ticket_number,
        subject: ticket.subject,
        status: ticket.status,
        priority: ticket.priority,
        category: ticket.category,
        createdAt: ticket.created_at,
        updatedAt: ticket.updated_at,
        lastMessageAt: ticket.last_message_at,
        assignedTo: ticket.assigned_to_name ? {
          name: ticket.assigned_to_name,
        } : null,
        messageCount: ticket.messages?.length || 0,
      }))
    };
  } catch (error: any) {
    console.error('Error fetching user tickets:', error);
    return { success: false, error: error.message || 'Failed to fetch tickets' };
  }
}

// ============ GET SINGLE TICKET ============

export async function getTicketById(ticketId: string) {
  try {
    const user = await getUserFromSession();
    await connectToDatabase();
    
    if (!mongoose.Types.ObjectId.isValid(ticketId)) {
      // NOTE: We check if ticketId is a valid ObjectId only for existing tickets,
      // assuming ticket IDs are still ObjectIds, but user IDs are UUID strings.
      return { success: false, error: 'Invalid ticket ID' };
    }
    
    const ticket = await Ticket.findOne({
      _id: ticketId,
      user_id: user._id, // Ensure user can only view their own tickets (using string UUID)
    }).lean();
    
    if (!ticket) {
      return { success: false, error: 'Ticket not found' };
    }
    
    // Filter out internal notes from messages (users shouldn't see them)
    const publicMessages = (ticket.messages as any[]).filter(msg => !msg.is_internal_note);
    
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
        messages: publicMessages.map(msg => ({
          id: msg._id.toString(),
          senderName: msg.sender_name,
          senderRole: msg.sender_role,
          message: msg.message,
          attachments: msg.attachments,
          createdAt: msg.created_at,
          isEdited: msg.is_edited,
          editedAt: msg.edited_at,
        })),
        assignedTo: ticket.assigned_to_name ? {
          name: ticket.assigned_to_name,
        } : null,
        sla: {
          firstResponseDue: ticket.sla.first_response_due,
          firstResponseAt: ticket.sla.first_response_at,
          resolutionDue: ticket.sla.resolution_due,
          resolvedAt: ticket.sla.resolved_at,
        },
        satisfaction: ticket.satisfaction,
        createdAt: ticket.created_at,
        updatedAt: ticket.updated_at,
        lastMessageAt: ticket.last_message_at,
        closedAt: ticket.closed_at,
      }
    };
  } catch (error: any) {
    console.error('Error fetching ticket:', error);
    return { success: false, error: error.message || 'Failed to fetch ticket' };
  }
}

// ============ ADD MESSAGE TO TICKET ============

export async function addMessageToTicket(data: AddMessageData) {
  try {
    const user = await getUserFromSession();
    await connectToDatabase();
    
    if (!mongoose.Types.ObjectId.isValid(data.ticketId)) {
      return { success: false, error: 'Invalid ticket ID' };
    }
    
    if (!data.message || data.message.trim().length === 0) {
      return { success: false, error: 'Message cannot be empty' };
    }
    
    const ticket = await Ticket.findOne({
      _id: data.ticketId,
      user_id: user._id,
    });
    
    if (!ticket) {
      return { success: false, error: 'Ticket not found' };
    }
    
    // Don't allow messages on closed tickets
    if (ticket.status === 'Closed') {
      return { success: false, error: 'Cannot add messages to closed tickets. Please reopen the ticket first.' };
    }
    
    // Add message using the instance method
    await ticket.addMessage(
      user._id, // Now string UUID
      user.role,
      user.username,
      data.message.trim(),
      false, // Not an internal note
      data.attachments || []
    );
    
    // Add activity log
    await ticket.addActivityLog(
      'message_added',
      user._id, // Now string UUID
      user.username,
      user.role,
      'User added a message'
    );
    
    // If ticket was waiting for customer, change status to Open
    if (ticket.status === 'Waiting for Customer') {
      ticket.status = 'Open';
      await ticket.save();
    }
    
    revalidatePath('/dashboard/support');
    revalidatePath(`/dashboard/support/${data.ticketId}`);
    
    return { success: true, message: 'Message added successfully' };
  } catch (error: any) {
    console.error('Error adding message:', error);
    return { success: false, error: error.message || 'Failed to add message' };
  }
}

// ============ UPDATE TICKET ============

export async function updateTicket(ticketId: string, data: UpdateTicketData) {
  try {
    const user = await getUserFromSession();
    await connectToDatabase();
    
    if (!mongoose.Types.ObjectId.isValid(ticketId)) {
      return { success: false, error: 'Invalid ticket ID' };
    }
    
    const ticket = await Ticket.findOne({
      _id: ticketId,
      user_id: user._id,
    });
    
    if (!ticket) {
      return { success: false, error: 'Ticket not found' };
    }
    
    // Only allow updating if ticket is not closed
    if (ticket.status === 'Closed') {
      return { success: false, error: 'Cannot update closed tickets' };
    }
    
    // Update fields
    if (data.subject) {
      ticket.subject = data.subject.trim();
    }
    
    if (data.description) {
      ticket.description = data.description.trim();
    }
    
    if (data.category) {
      const oldCategory = ticket.category;
      ticket.category = data.category;
      
      await ticket.addActivityLog(
        'category_changed',
        user._id, // Now string UUID
        user.username,
        user.role,
        `Category changed from ${oldCategory} to ${data.category}`,
        oldCategory,
        data.category
      );
    }
    
    if (data.priority) {
      const oldPriority = ticket.priority;
      ticket.priority = data.priority;
      
      await ticket.addActivityLog(
        'priority_changed',
        user._id, // Now string UUID
        user.username,
        user.role,
        `Priority changed from ${oldPriority} to ${data.priority}`,
        oldPriority,
        data.priority
      );
    }
    
    if (data.tags) {
      ticket.tags = data.tags;
    }
    
    await ticket.save();
    
    revalidatePath('/dashboard/support');
    revalidatePath(`/dashboard/support/${ticketId}`);
    
    return { success: true, message: 'Ticket updated successfully' };
  } catch (error: any) {
    console.error('Error updating ticket:', error);
    return { success: false, error: error.message || 'Failed to update ticket' };
  }
}

// ============ CLOSE TICKET ============

export async function closeTicket(ticketId: string) {
  try {
    const user = await getUserFromSession();
    await connectToDatabase();
    
    if (!mongoose.Types.ObjectId.isValid(ticketId)) {
      return { success: false, error: 'Invalid ticket ID' };
    }
    
    const ticket = await Ticket.findOne({
      _id: ticketId,
      user_id: user._id,
    });
    
    if (!ticket) {
      return { success: false, error: 'Ticket not found' };
    }
    
    if (ticket.status === 'Closed') {
      return { success: false, error: 'Ticket is already closed' };
    }
    
    await ticket.closeTicket(user._id, user.username, user.role);
    
    revalidatePath('/dashboard/support');
    revalidatePath(`/dashboard/support/${ticketId}`);
    
    return { success: true, message: 'Ticket closed successfully' };
  } catch (error: any) {
    console.error('Error closing ticket:', error);
    return { success: false, error: error.message || 'Failed to close ticket' };
  }
}

// ============ REOPEN TICKET ============

export async function reopenTicket(ticketId: string) {
  try {
    const user = await getUserFromSession();
    await connectToDatabase();
    
    if (!mongoose.Types.ObjectId.isValid(ticketId)) {
      return { success: false, error: 'Invalid ticket ID' };
    }
    
    const ticket = await Ticket.findOne({
      _id: ticketId,
      user_id: user._id,
    });
    
    if (!ticket) {
      return { success: false, error: 'Ticket not found' };
    }
    
    if (ticket.status !== 'Closed' && ticket.status !== 'Resolved') {
      return { success: false, error: 'Only closed or resolved tickets can be reopened' };
    }
    
    await ticket.reopenTicket(user._id, user.username, user.role);
    
    revalidatePath('/dashboard/support');
    revalidatePath(`/dashboard/support/${ticketId}`);
    
    return { success: true, message: 'Ticket reopened successfully' };
  } catch (error: any) {
    console.error('Error reopening ticket:', error);
    return { success: false, error: error.message || 'Failed to reopen ticket' };
  }
}

// ============ RATE SATISFACTION ============

export async function rateTicket(ticketId: string, rating: number, feedback?: string) {
  try {
    const user = await getUserFromSession();
    await connectToDatabase();
    
    if (!mongoose.Types.ObjectId.isValid(ticketId)) {
      return { success: false, error: 'Invalid ticket ID' };
    }
    
    if (rating < 1 || rating > 5) {
      return { success: false, error: 'Rating must be between 1 and 5' };
    }
    
    const ticket = await Ticket.findOne({
      _id: ticketId,
      user_id: user._id,
    });
    
    if (!ticket) {
      return { success: false, error: 'Ticket not found' };
    }
    
    if (ticket.status !== 'Closed' && ticket.status !== 'Resolved') {
      return { success: false, error: 'Can only rate closed or resolved tickets' };
    }
    
    await ticket.rateSatisfaction(rating, feedback);
    
    revalidatePath(`/dashboard/support/${ticketId}`);
    
    return { success: true, message: 'Thank you for your feedback!' };
  } catch (error: any) {
    console.error('Error rating ticket:', error);
    return { success: false, error: error.message || 'Failed to rate ticket' };
  }
}

// ============ GET USER TICKET STATS ============

export async function getUserTicketStats() {
  try {
    const user = await getUserFromSession();
    await connectToDatabase();
    
    // user._id is now a string UUID. If this still fails, the underlying Ticket model 
    // schema needs to have user_id defined as String instead of ObjectId.
    const userId = user._id;
    
    const total = await Ticket.countDocuments({ user_id: userId, is_draft: false });
    const open = await Ticket.countDocuments({ user_id: userId, status: 'Open', is_draft: false });
    const inProgress = await Ticket.countDocuments({ user_id: userId, status: 'In Progress', is_draft: false });
    const resolved = await Ticket.countDocuments({ user_id: userId, status: 'Resolved', is_draft: false });
    const closed = await Ticket.countDocuments({ user_id: userId, status: 'Closed', is_draft: false });
    
    return {
      success: true,
      stats: {
        total,
        open,
        inProgress,
        resolved,
        closed,
      }
    };
  } catch (error: any) {
    console.error('Error fetching user ticket stats:', error);
    return { success: false, error: error.message || 'Failed to fetch stats' };
  }
}

// ============ SAVE DRAFT ============

export async function saveDraft(data: CreateTicketData) {
  try {
    const user = await getUserFromSession();
    await connectToDatabase();
    
    // Create draft ticket
    const ticket = new Ticket({
      user_id: user._id, // Now string UUID
      user_email: user.email,
      user_name: user.username,
      subject: data.subject?.trim() || 'Untitled Draft',
      description: data.description?.trim() || '',
      category: data.category || 'General Inquiry',
      priority: data.priority || 'Medium',
      is_draft: true,
    });
    
    await ticket.save();
    
    return {
      success: true,
      draftId: ticket._id.toString(),
      message: 'Draft saved successfully'
    };
  } catch (error: any) {
    console.error('Error saving draft:', error);
    return { success: false, error: error.message || 'Failed to save draft' };
  }
}

// ============ GET DRAFTS ============

export async function getUserDrafts() {
  try {
    const user = await getUserFromSession();
    await connectToDatabase();
    
    // user._id is now string UUID
    const userId = user._id;
    
    const drafts = await Ticket.find({
      user_id: userId,
      is_draft: true,
    })
      .sort({ updated_at: -1 })
      .lean();
    
    return {
      success: true,
      drafts: drafts.map(draft => ({
        id: draft._id.toString(),
        subject: draft.subject,
        description: draft.description,
        category: draft.category,
        priority: draft.priority,
        updatedAt: draft.updated_at,
      }))
    };
  } catch (error: any) {
    console.error('Error fetching drafts:', error);
    return { success: false, error: error.message || 'Failed to fetch drafts' };
  }
}

// ============ DELETE DRAFT ============

export async function deleteDraft(draftId: string) {
  try {
    const user = await getUserFromSession();
    await connectToDatabase();
    
    if (!mongoose.Types.ObjectId.isValid(draftId)) {
      return { success: false, error: 'Invalid draft ID' };
    }
    
    // user._id is now string UUID
    const userId = user._id;
    
    const result = await Ticket.deleteOne({
      _id: draftId,
      user_id: userId,
      is_draft: true,
    });
    
    if (result.deletedCount === 0) {
      return { success: false, error: 'Draft not found' };
    }
    
    revalidatePath('/dashboard/support');
    
    return { success: true, message: 'Draft deleted successfully' };
  } catch (error: any) {
    console.error('Error deleting draft:', error);
    return { success: false, error: error.message || 'Failed to delete draft' };
  }
}

// ============ PUBLISH DRAFT ============

export async function publishDraft(draftId: string, finalData?: Partial<CreateTicketData>) {
  try {
    const user = await getUserFromSession();
    await connectToDatabase();
    
    if (!mongoose.Types.ObjectId.isValid(draftId)) {
      return { success: false, error: 'Invalid draft ID' };
    }
    
    // user._id is now string UUID
    const userId = user._id;
    
    const draft = await Ticket.findOne({
      _id: draftId,
      user_id: userId,
      is_draft: true,
    });
    
    if (!draft) {
      return { success: false, error: 'Draft not found' };
    }
    
    // Update draft with final data and publish it
    if (finalData?.subject) draft.subject = finalData.subject.trim();
    if (finalData?.description) draft.description = finalData.description.trim();
    if (finalData?.category) draft.category = finalData.category;
    if (finalData?.priority) draft.priority = finalData.priority;
    if (finalData?.relatedOrderId) draft.related_order_id = finalData.relatedOrderId;
    if (finalData?.relatedProduct) draft.related_product = finalData.relatedProduct;
    if (finalData?.tags) draft.tags = finalData.tags;
    if (finalData?.ccEmails) draft.cc_emails = finalData.ccEmails;
    if (finalData?.attachments) draft.attachments = finalData.attachments;
    
    draft.is_draft = false;
    
    // Add creation activity log
    draft.activity_log.push({
      action: 'created',
      performed_by: user._id, // Now string UUID
      performed_by_name: user.username,
      performed_by_role: user.role,
      description: 'Ticket published from draft',
      timestamp: new Date(),
    });
    
    await draft.save();
    
    revalidatePath('/dashboard/support');
    
    return {
      success: true,
      ticket: {
        id: draft._id.toString(),
        ticketNumber: draft.ticket_number,
        subject: draft.subject,
        status: draft.status,
        priority: draft.priority,
        createdAt: draft.created_at,
      },
      message: 'Ticket published successfully'
    };
  } catch (error: any) {
    console.error('Error publishing draft:', error);
    return { success: false, error: error.message || 'Failed to publish draft' };
  }
}

