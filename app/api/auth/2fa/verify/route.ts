import { NextRequest, NextResponse } from 'next/server';
import speakeasy from 'speakeasy';
import { connectToDatabase } from '@/app/lib/mongoose';
import { Profile } from '@/app/lib/models/Profile';
// --- NextAuth v5/Auth.js change: Import the 'auth' utility directly ---
import { auth } from '@/auth'; // Assuming '@/auth' exports the Auth.js instance
// --- Removed: import { getServerSession } from 'next-auth';
// --- Removed: import { authOptions } from '@/auth';

/**
 * POST - Verify 2FA token during initial setup (when enabling 2FA)
 * This enables 2FA after user scans QR code and enters first code
 */
export async function POST(request: NextRequest) {
  try {
    // Get the authenticated user's session
    // --- NextAuth v5/Auth.js change: Use auth() to get the session ---
    const session = await auth();

    if (!session || !session.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in.' },
        { status: 401 }
      );
    }

    const userEmail = session.user.email;

    // Parse the request body
    let token;
    try {
      const body = await request.text();
      if (!body) {
        return NextResponse.json(
          { error: 'Request body is empty.' },
          { status: 400 }
        );
      }
      const parsedBody = JSON.parse(body);
      token = parsedBody.token;
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return NextResponse.json(
        { error: 'Invalid JSON in request body.' },
        { status: 400 }
      );
    }

    // Validate the token
    if (!token || typeof token !== 'string' || token.length !== 6 || !/^\d+$/.test(token)) {
      return NextResponse.json(
        { error: 'Valid 6-digit numeric token is required.' },
        { status: 400 }
      );
    }

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

    console.log('=== 2FA VERIFY DEBUG ===');
    console.log('User:', userEmail);
    console.log('twoFAEnabled:', profile.twoFAEnabled);
    console.log('twoFASecret exists:', !!profile.twoFASecret);
    console.log('Token received:', token);

    // Check if 2FA secret exists
    if (!profile.twoFASecret) {
      console.log('ERROR: No twoFASecret found for user');
      return NextResponse.json(
        { error: '2FA is not set up for this account. Please enable 2FA first.' },
        { status: 400 }
      );
    }

    // Check if 2FA is already enabled
    if (profile.twoFAEnabled) {
      console.log('ERROR: 2FA already enabled for user');
      return NextResponse.json(
        { error: '2FA is already enabled for this account.' },
        { status: 400 }
      );
    }

    // Verify the token against the stored secret
    const verified = speakeasy.totp.verify({
      secret: profile.twoFASecret,
      encoding: 'base32',
      token: token,
      window: 2, // Allow 2 time steps (60 seconds) tolerance
      step: 30, // 30-second steps (standard)
    });

    console.log('Token verification result:', verified);

    if (!verified) {
      return NextResponse.json(
        { 
          error: 'Invalid verification code. Please try again. Make sure your device time is synchronized.',
          success: false 
        },
        { status: 400 }
      );
    }

    // Token is valid - enable 2FA
    profile.twoFAEnabled = true;
    profile.twoFASetupDate = new Date();
    profile.twoFALastUsed = new Date();
    await profile.save();

    console.log('2FA successfully enabled for user:', userEmail);

    return NextResponse.json(
      {
        success: true,
        message: 'Two-factor authentication has been successfully enabled for your account.',
        twoFAEnabled: true,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error verifying 2FA token:', error);
    return NextResponse.json(
      { error: 'An error occurred while verifying the 2FA token.' },
      { status: 500 }
    );
  }
}

/**
 * PUT - Verify 2FA token during login (after password verification)
 * This is used when user logs in with 2FA enabled
 */
export async function PUT(request: NextRequest) {
  try {
    // Parse the request body
    let email, token;
    try {
      const body = await request.text();
      if (!body) {
        return NextResponse.json(
          { error: 'Request body is empty.' },
          { status: 400 }
        );
      }
      const parsedBody = JSON.parse(body);
      email = parsedBody.email;
      token = parsedBody.token;
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return NextResponse.json(
        { error: 'Invalid JSON in request body.' },
        { status: 400 }
      );
    }

    // Validate input
    if (!email || !token) {
      return NextResponse.json(
        { error: 'Email and token are required.' },
        { status: 400 }
      );
    }

    if (typeof token !== 'string' || token.length !== 6 || !/^\d+$/.test(token)) {
      return NextResponse.json(
        { error: 'Valid 6-digit numeric token is required.' },
        { status: 400 }
      );
    }

    // Connect to database
    await connectToDatabase();

    // Find the user's profile
    const profile = await Profile.findOne({ email: email });

    if (!profile) {
      return NextResponse.json(
        { error: 'User profile not found.' },
        { status: 404 }
      );
    }

    // Check if 2FA is enabled
    if (!profile.twoFAEnabled || !profile.twoFASecret) {
      return NextResponse.json(
        { error: '2FA is not enabled for this account.' },
        { status: 400 }
      );
    }

    console.log('Verifying 2FA during login for:', email);

    // Verify the token
    const verified = speakeasy.totp.verify({
      secret: profile.twoFASecret,
      encoding: 'base32',
      token: token,
      window: 2,
      step: 30,
    });

    console.log('Login 2FA verification result:', verified);

    if (!verified) {
      return NextResponse.json(
        { 
          error: 'Invalid verification code. Please try again.',
          success: false 
        },
        { status: 400 }
      );
    }

    // Update last used timestamp
    profile.twoFALastUsed = new Date();
    await profile.save();

    // Token is valid
    return NextResponse.json(
      {
        success: true,
        message: '2FA verification successful.',
        twoFAVerified: true,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error verifying 2FA during login:', error);
    return NextResponse.json(
      { error: 'An error occurred during 2FA verification.' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Disable 2FA (requires authentication)
 */
export async function DELETE(request: NextRequest) {
  try {
    // Get the authenticated user's session
    // --- NextAuth v5/Auth.js change: Use auth() to get the session ---
    const session = await auth();

    if (!session || !session.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in.' },
        { status: 401 }
      );
    }

    const userEmail = session.user.email;

    // Connect to database
    await connectToDatabase();

    // Find and update the profile
    const profile = await Profile.findOne({ email: userEmail });
    
    if (!profile) {
      return NextResponse.json(
        { error: 'User profile not found.' },
        { status: 404 }
      );
    }

    // Disable 2FA
    profile.twoFAEnabled = false;
    profile.twoFASecret = null;
    profile.twoFASetupDate = null;
    profile.twoFABackupCodes = [];
    await profile.save();

    console.log('2FA disabled successfully for user:', userEmail);

    return NextResponse.json(
      {
        success: true,
        message: 'Two-factor authentication has been successfully disabled for your account.',
        twoFAEnabled: false,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error disabling 2FA:', error);
    return NextResponse.json(
      { error: 'An error occurred while disabling 2FA.' },
      { status: 500 }
    );
  }
}

