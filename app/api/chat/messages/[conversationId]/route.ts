import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { connectToDatabase } from '@/app/lib/mongoose';
import { Conversation, Message } from '@/app/lib/models/chats';
import { Profile } from '@/app/lib/models/Profile';

interface RouteParams {
  params: {
    conversationId: string;
  };
}

// GET: Fetch messages for a conversation
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    // Get the session using the new auth() function
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectToDatabase();

    const { conversationId } = params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const before = searchParams.get('before');

    // Check if user is participant
    const conversation = await Conversation.findById(conversationId);
    
    if (!conversation) {
      return NextResponse.json(
        { success: false, message: 'Conversation not found' },
        { status: 404 }
      );
    }

    const userId = session.user.id;
    const userRole = (session.user as any).role;

    // Check authorization
    if (userRole !== 'admin' && userRole !== 'support') {
      // Check if user is participant
      if (!conversation.isParticipant(userId)) {
        return NextResponse.json(
          { success: false, message: 'Not authorized to view this conversation' },
          { status: 403 }
        );
      }
    }

    // Fetch messages
    const query: any = {
      conversation_id: conversationId,
      deleted: false
    };

    if (before) {
      query.created_at = { $lt: new Date(before) };
    }

    const messages = await Message.find(query)
      .sort({ created_at: -1 })
      .limit(limit)
      .lean();

    // Manually populate sender info from Profile model
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

    return NextResponse.json({
      success: true,
      data: messagesWithSender.reverse()
    });

  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

// POST: Send a new message
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    // Get the session using the new auth() function
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectToDatabase();

    const { conversationId } = params;
    const { content, messageType = 'text', replyTo, attachments } = await request.json();

    if (!content) {
      return NextResponse.json(
        { success: false, message: 'Content is required' },
        { status: 400 }
      );
    }

    // Check if user is participant
    const conversation = await Conversation.findById(conversationId);
    
    if (!conversation) {
      return NextResponse.json(
        { success: false, message: 'Conversation not found' },
        { status: 404 }
      );
    }

    const userId = session.user.id;
    const userRole = (session.user as any).role;

    // Check authorization
    if (userRole !== 'admin' && userRole !== 'support') {
      // Check if user is participant
      if (!conversation.isParticipant(userId)) {
        return NextResponse.json(
          { success: false, message: 'Not authorized to send messages' },
          { status: 403 }
        );
      }
    }

    // Create message
    const message = new Message({
      conversation_id: conversationId,
      sender_id: userId,
      sender_role: userRole,
      message_type: messageType,
      content: content,
      attachments: attachments || [],
      reply_to: replyTo || null,
      status: 'sent'
    });

    await message.save();

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
      await conversation.incrementUnreadCount(participant.user_id);
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
      data: messageWithSender
    });

  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to send message' },
      { status: 500 }
    );
  }
}
