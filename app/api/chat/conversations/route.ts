import { NextRequest, NextResponse } from 'next/server';
// Use the new `auth` function from NextAuth.js v5 (Auth.js)
// NOTE: You must ensure this path points to your configured NextAuth export file.
import { auth } from '@/auth'; 
import { connectToDatabase } from '@/app/lib/mongoose';
import { Conversation } from '@/app/lib/models/chats';

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

    const userId = session.user.id;
    // Note: TypeScript might require updating your Session type definition for `role`
    const userRole = (session.user as any).role || 'user';

    let conversations;

    if (userRole === 'admin' || userRole === 'support') {
      // Admin gets all conversations
      conversations = await Conversation.find({ status: 'active' })
        .sort({ 'last_message.sent_at': -1 })
        .populate('participants.user_id', 'username email role')
        .limit(50)
        .lean();
    } else {
      // User gets their conversations
      conversations = await Conversation.find({
        'participants.user_id': userId,
        'participants.is_active': true,
        status: 'active'
      })
        .sort({ 'last_message.sent_at': -1 })
        .populate('participants.user_id', 'username email role')
        .limit(50)
        .lean();
    }

    // Convert Map to object for unread_counts and add unread_count field
    const conversationsWithUnread = conversations.map(conv => ({
      ...conv,
      // Access Map data using `.get(key)`
      unread_count: conv.unread_counts?.get?.(userId) || 0,
      unread_counts: undefined // Remove the Map
    }));

    return NextResponse.json({
      success: true,
      conversations: conversationsWithUnread
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
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

    const { content, priority = 'medium' } = body;

    if (!content || !content.trim()) {
      return NextResponse.json(
        { success: false, message: 'Message content is required' },
        { status: 400 }
      );
    }

    // Check if user already has an active conversation
    let conversation = await Conversation.findOne({
      'participants.user_id': userId,
      status: 'active'
    });

    if (!conversation) {
      // Create new conversation
      conversation = await Conversation.create({
        participants: [
          { user_id: userId, role: userRole, is_active: true }
        ],
        status: 'active',
        priority: priority,
        unread_counts: new Map()
      });
    }

    // Create the message (we'll handle this in the messages route)
    const { Message } = await import('@/app/lib/models/chats');
    
    const message = await Message.create({
      conversation_id: conversation._id,
      sender_id: userId,
      sender_role: userRole,
      message_type: 'text',
      content: content,
      status: 'sent'
    });

    // Update conversation's last message
    conversation.last_message = {
      text: content,
      sender_id: userId,
      sent_at: new Date(),
      message_type: 'text'
    };

    await conversation.save();

    // Populate sender info
    await message.populate('sender_id', 'username email role');

    return NextResponse.json({
      success: true,
      conversation: conversation.toObject(),
      message: message.toObject()
    });
  } catch (error) {
    console.error('Error creating conversation:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

