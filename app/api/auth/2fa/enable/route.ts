// app/api/auth/2fa/enable/route.ts
import { NextRequest, NextResponse } from 'next/server';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { connectToDatabase } from '@/app/lib/mongoose';
import { Profile } from '@/app/lib/models/Profile';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';

export async function POST(request: NextRequest) {
  try {
    // Get the authenticated user's session
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
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

    console.log('=== 2FA ENABLE DEBUG ===');
    console.log('User:', userEmail);
    console.log('Current twoFAEnabled:', profile.twoFAEnabled);
    console.log('Current twoFASecret exists:', !!profile.twoFASecret);

    // Check if 2FA is already enabled
    if (profile.twoFAEnabled) {
      return NextResponse.json(
        { error: '2FA is already enabled for this account.' },
        { status: 400 }
      );
    }

    // Check if 2FA setup is already in progress
    if (profile.twoFASecret && !profile.twoFAEnabled) {
      console.log('2FA setup already in progress, generating QR from existing secret');
      
      // Generate QR code from existing secret
      const otpauthUrl = speakeasy.otpauthURL({
        secret: profile.twoFASecret,
        label: encodeURIComponent(userEmail),
        issuer: 'HustleHub Africa',
        encoding: 'base32',
      });

      const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

      return NextResponse.json(
        {
          success: true,
          qrCode: qrCodeDataUrl,
          message: '2FA setup is already in progress. Scan the QR code with Google Authenticator and verify the code to enable 2FA.',
          setupInProgress: true,
        },
        { status: 200 }
      );
    }

    // Generate a unique secret for this user
    const secret = speakeasy.generateSecret({
      name: `HustleHub Africa (${userEmail})`,
      issuer: 'HustleHub Africa',
      length: 32,
    });

    console.log('Generated new secret for user');

    // Generate the OTPAuth URL for QR code
    const otpauthUrl = secret.otpauth_url;

    if (!otpauthUrl) {
      return NextResponse.json(
        { error: 'Failed to generate OTPAuth URL.' },
        { status: 500 }
      );
    }

    // Generate QR code as data URL
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

    // Save the secret to the profile
    profile.twoFASecret = secret.base32;
    profile.twoFAEnabled = false; // Not enabled until verified
    await profile.save();

    console.log('Secret saved successfully to profile');

    // Verify the secret was saved
    const updatedProfile = await Profile.findOne({ email: userEmail });
    console.log('After save - twoFASecret exists:', !!updatedProfile?.twoFASecret);

    // Return the QR code to the frontend
    return NextResponse.json(
      {
        success: true,
        qrCode: qrCodeDataUrl,
        message: 'Scan the QR code with Google Authenticator and verify the code to enable 2FA.',
        setupInProgress: true,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error enabling 2FA:', error);
    return NextResponse.json(
      { error: 'An error occurred while enabling 2FA.' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get the authenticated user's session
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
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

// DELETE method to disable 2FA or reset setup
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

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

    // Reset 2FA settings
    profile.twoFASecret = null;
    profile.twoFAEnabled = false;
    profile.twoFASetupDate = null;
    profile.twoFABackupCodes = [];
    await profile.save();

    console.log('2FA reset successfully for user:', userEmail);

    return NextResponse.json(
      {
        success: true,
        message: '2FA setup has been reset. You can now set up 2FA again.',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error resetting 2FA:', error);
    return NextResponse.json(
      { error: 'An error occurred while resetting 2FA.' },
      { status: 500 }
    );
  }
}
