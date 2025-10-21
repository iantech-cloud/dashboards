import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/auth';
import { connectToDatabase, MpesaChangeRequest } from '@/app/lib/models';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    // Fetch M-Pesa change requests for the current user
    const requests = await MpesaChangeRequest.find({ 
      userId: session.user.id 
    }).sort({ createdAt: -1 });

    return NextResponse.json({ 
      success: true, 
      data: requests.map(request => ({
        id: request._id.toString(),
        phoneNumber: request.phoneNumber,
        reason: request.reason,
        status: request.status,
        admin_feedback: request.adminFeedback,
        processed_date: request.processedDate,
        createdAt: request.createdAt,
      }))
    });

  } catch (error) {
    console.error('Error fetching M-Pesa change requests:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { phoneNumber, reason } = await request.json();

    if (!phoneNumber || !reason) {
      return NextResponse.json(
        { error: 'Phone number and reason are required' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Create new M-Pesa change request
    const newRequest = new MpesaChangeRequest({
      userId: session.user.id,
      phoneNumber,
      reason,
      status: 'pending',
      createdAt: new Date(),
    });

    await newRequest.save();

    return NextResponse.json({ 
      success: true, 
      data: {
        id: newRequest._id.toString(),
        phoneNumber: newRequest.phoneNumber,
        reason: newRequest.reason,
        status: newRequest.status,
        createdAt: newRequest.createdAt,
      }
    });

  } catch (error) {
    console.error('Error creating M-Pesa change request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
