// app/api/admin/spin/logs/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { connectToDatabase, Profile, SpinLog } from '@/app/lib/models';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const adminUser = await Profile.findOne({ email: session.user.email });
    
    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json({ success: false, message: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      SpinLog.find({})
        .populate('user_id', 'username email')
        .populate('prize_id', 'display_name value_cents')
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      SpinLog.countDocuments({})
    ]);

    return NextResponse.json({
      success: true,
      data: logs.map(log => ({
        ...log,
        _id: log._id.toString(),
        user_id: log.user_id ? {
          ...(log.user_id as any),
          _id: (log.user_id as any)._id.toString()
        } : null,
        prize_id: log.prize_id ? {
          ...(log.prize_id as any),
          _id: (log.prize_id as any)._id.toString()
        } : null
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get logs error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
