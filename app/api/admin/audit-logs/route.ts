import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { connectToDatabase } from '@/app/lib/mongoose';
import { AdminAuditLog } from '@/app/lib/models';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    // Check if user is admin (you might need to adjust this based on your user model)
    const User = (await import('@/app/lib/models')).User || (await import('@/app/lib/models')).Profile;
    const user = await User.findOne({ email: session.user.email });
    
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search');
    const action = searchParams.get('action');
    const status = searchParams.get('status');

    // Build filter
    const filter: any = {};

    if (search) {
      filter.$or = [
        { 'actor_id.username': { $regex: search, $options: 'i' } },
        { 'actor_id.email': { $regex: search, $options: 'i' } },
        { action: { $regex: search, $options: 'i' } },
        { action_type: { $regex: search, $options: 'i' } },
      ];
    }

    if (action && action !== 'all') {
      filter.action = action;
    }

    if (status && status !== 'all') {
      filter.status = status;
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Fetch logs with population
    const logs = await (AdminAuditLog as any)
      .find(filter)
      .populate('actor_id', 'username email')
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Get total count
    const total = await (AdminAuditLog as any).countDocuments(filter);

    return NextResponse.json({
      logs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
