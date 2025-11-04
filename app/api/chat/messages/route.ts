import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth'; 
import { connectToDatabase } from '@/app/lib/mongoose';
import { Conversation, Message } from '@/app/lib/models/chats';
import { Profile } from '@/app/lib/models/Profile';

export async function GET(request: NextRequest) {
  try {
    // Get the session using the new auth() function
    const session = await auth();

    if (!session || !session.user?.id) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectToDatabase();

    const searchParams = request.nextUrl.searchParams;
    const conversationId = searchParams.get('conversationId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const after = searchParams.get('after'); // ISO timestamp for polling

    if (!conversationId) {
      return NextResponse.json(
        { success: false, message: 'Conversation ID is required' },
        { status: 400 }
      );
    }

    // Verify user has access to this conversation
    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      return NextResponse.json(
        { success: false, message: 'Conversation not found' },
        { status: 404 }
      );
    }

    const userId = session.user.id;
    const userRole = (session.user as any).role || 'user';

    // Check if user is participant or admin
    const isParticipant = conversation.participants.some(
      (p: any) => p.user_id === userId && p.is_active
    );
    const isAdmin = userRole === 'admin' || userRole === 'support';

    if (!isParticipant && !isAdmin) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized to view this conversation' },
        { status: 403 }
      );
    }

    // Build query
    const query: any = {
      conversation_id: conversationId,
      deleted: false
    };

    // If 'after' timestamp provided, only get messages after that time (for polling)
    if (after) {
      query.created_at = { $gt: new Date(after) };
    }

    const messages = await Message.find(query)
      .sort({ created_at: after ? 1 : -1 }) // Ascending for new messages, descending for history
      .limit(limit)
      .lean();

    // Manually populate sender info from Profile model
    // Since sender_id is a String (user's _id), we need to fetch profiles separately
    const senderIds = [...new Set(messages.map(m => m.sender_id))];
    const profiles = await Profile.find({ _id: { $in: senderIds } })
      .select('_id username email role')
      .lean();

    // Create a map for quick lookup
    const profileMap = new Map(profiles.map(p => [p._id.toString(), p]));

    // Attach sender info to messages
    const messagesWithSender = messages.map(msg => ({
      ...msg,
      sender: profileMap.get(msg.sender_id) || null
    }));

    // If not polling (no 'after'), reverse to show oldest first
    const finalMessages = after ? messagesWithSender : messagesWithSender.reverse();

    return NextResponse.json({
      success: true,
      messages: finalMessages
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get the session using the new auth() function
    const session = await auth();

    if (!session || !session.user?.id) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectToDatabase();

    const userId = session.user.id;
    const userRole = (session.user as any).role || 'user';
    const body = await request.json();

    const {
      conversationId,
      content,
      messageType = 'text',
      attachments = []
    } = body;

    if (!conversationId) {
      return NextResponse.json(
        { success: false, message: 'Conversation ID is required' },
        { status: 400 }
      );
    }

    if (!content || !content.trim()) {
      return NextResponse.json(
        { success: false, message: 'Message content is required' },
        { status: 400 }
      );
    }

    // Verify conversation exists and user has access
    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      return NextResponse.json(
        { success: false, message: 'Conversation not found' },
        { status: 404 }
      );
    }

    const isParticipant = conversation.participants.some(
      (p: any) => p.user_id === userId && p.is_active
    );
    const isAdmin = userRole === 'admin' || userRole === 'support';

    if (!isParticipant && !isAdmin) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized to send messages in this conversation' },
        { status: 403 }
      );
    }

    // If admin is replying and not yet a participant, add them
    if (isAdmin && !isParticipant) {
      conversation.participants.push({
        user_id: userId,
        role: userRole,
        joined_at: new Date(),
        is_active: true
      });

      // Assign conversation to this admin
      conversation.assigned_to = userId;
    }

    // Create message
    const message = await Message.create({
      conversation_id: conversationId,
      sender_id: userId,
      sender_role: userRole,
      message_type: messageType,
      content: content,
      attachments: attachments,
      status: 'sent'
    });

    // Update conversation's last message
    conversation.last_message = {
      text: content,
      sender_id: userId,
      sent_at: new Date(),
      message_type: messageType
    };

    // Increment unread count for other participants
    const otherParticipants = conversation.participants.filter(
      (p: any) => p.user_id !== userId && p.is_active
    );

    for (const participant of otherParticipants) {
      const currentCount = conversation.unread_counts?.get?.(participant.user_id) || 0;
      conversation.unread_counts.set(participant.user_id, currentCount + 1);
    }

    await conversation.save();

    // Manually fetch sender profile info
    const senderProfile = await Profile.findById(userId)
      .select('_id username email role')
      .lean();

    // Create response with sender info
    const messageWithSender = {
      ...message.toObject(),
      sender: senderProfile
    };

    return NextResponse.json({
      success: true,
      message: messageWithSender
    });
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
