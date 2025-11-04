// app/api/spin/tasks/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getUserTaskStatus } from '@/app/actions/spin';
import { connectToDatabase, Profile } from '@/app/lib/models';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectToDatabase();
    const user = await Profile.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    const result = await getUserTaskStatus(user._id.toString());
    return NextResponse.json(result);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
