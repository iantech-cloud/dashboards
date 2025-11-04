import { NextRequest, NextResponse } from 'next/server';
// Use the new `auth` function from NextAuth.js v5 (Auth.js)
// NOTE: You must ensure this path points to your configured NextAuth export file.
import { auth } from '@/auth'; 
import { connectToDatabase } from '@/app/lib/mongoose';
import { Conversation, Message } from '@/app/lib/models/chats';

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
    const body = await request.json();

    const { conversationId, messageIds } = body;

    if (!conversationId || !messageIds || !Array.isArray(messageIds)) {
      return NextResponse.json(
        { success: false, message: 'Invalid request data' },
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

    // Mark messages as read
    await Message.updateMany(
      {
        _id: { $in: messageIds },
        conversation_id: conversationId,
        sender_id: { $ne: userId } // Only mark messages from others as read
      },
      {
        status: 'read',
        $addToSet: {
          read_by: {
            user_id: userId,
            read_at: new Date()
          }
        }
      }
    );

    // Reset unread count for this user in this conversation
    conversation.unread_counts.set(userId, 0);
    await conversation.save();

    return NextResponse.json({
      success: true,
      message: 'Messages marked as read'
    });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

