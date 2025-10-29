// app/api/auth/2fa/status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/app/lib/mongoose';
import { Profile } from '@/app/lib/models/Profile';
import { auth } from '@/auth';

/**
 * GET - Check 2FA status for authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    // Get the authenticated user's session
    const session = await auth();

    // In NextAuth v5, auth() returns null in Route Handlers if not authenticated
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in.' },
        { status: 401 }
      );
    }

    const userEmail = session.user.email;

    // Connect to database
    await connectToDatabase();

    // Find the user's profile
    const profile = await Profile.findOne({ email: userEmail });

    if (!profile) {
      return NextResponse.json(
        { error: 'User profile not found.' },
        { status: 404 }
      );
    }

    // Return current 2FA status
    return NextResponse.json(
      {
        twoFAEnabled: profile.twoFAEnabled || false,
        hasSecret: !!profile.twoFASecret,
        setupInProgress: !profile.twoFAEnabled && !!profile.twoFASecret,
        setupDate: profile.twoFASetupDate || null,
        lastUsed: profile.twoFALastUsed || null,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching 2FA status:', error);
    return NextResponse.json(
      { error: 'An error occurred while fetching 2FA status.' },
      { status: 500 }
    );
  }
}

/**
 * POST - Check 2FA status by email (for login page use)
 * This doesn't require authentication since it's used before login
 */
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required.' },
        { status: 400 }
      );
    }

    // Connect to database
    await connectToDatabase();

    // Find the user's profile
    const profile = await Profile.findOne({ email: email });

    if (!profile) {
      // Don't reveal if user exists or not for security
      return NextResponse.json(
        {
          twoFAEnabled: false,
          hasSecret: false,
        },
        { status: 200 }
      );
    }

    // Return current 2FA status (for login page)
    return NextResponse.json(
      {
        twoFAEnabled: profile.twoFAEnabled || false,
        hasSecret: !!profile.twoFASecret,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching 2FA status:', error);
    return NextResponse.json(
      { error: 'An error occurred while fetching 2FA status.' },
      { status: 500 }
    );
  }
}
