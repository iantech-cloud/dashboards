// app/api/auth/verify-email/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase, Profile, VerificationToken } from '@/app/lib/models';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;

    console.log('Email verification attempt for token:', token ? `${token.substring(0, 10)}...` : 'none');

    if (!token) {
      return NextResponse.json(
        { 
          success: false,
          message: 'Verification token is required' 
        },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Find the verification token
    const verificationToken = await VerificationToken.findOne({
      token,
      expires: { $gt: new Date() }
    });

    if (!verificationToken) {
      console.log('Invalid or expired verification token:', token);
      return NextResponse.json(
        { 
          success: false,
          message: 'Invalid or expired verification token. Please request a new verification email.' 
        },
        { status: 400 }
      );
    }

    console.log('Found verification token for user:', verificationToken.user_id);

    // Check if user exists
    const existingUser = await Profile.findById(verificationToken.user_id);
    if (!existingUser) {
      console.log('User not found for token:', verificationToken.user_id);
      // Clean up orphaned token
      await VerificationToken.deleteOne({ _id: verificationToken._id });
      return NextResponse.json(
        { 
          success: false,
          message: 'User account not found. Please register again.' 
        },
        { status: 404 }
      );
    }

    // Check if user is already verified
    if (existingUser.is_verified) {
      console.log('User already verified:', existingUser.email);
      // Clean up the token since it's already used
      await VerificationToken.deleteOne({ _id: verificationToken._id });
      return NextResponse.json({
        success: true,
        message: 'Email is already verified. You can proceed to login.',
        user: {
          id: existingUser._id,
          email: existingUser.email,
          is_verified: existingUser.is_verified,
          username: existingUser.username,
        }
      });
    }

    // Update user verification status
    const user = await Profile.findByIdAndUpdate(
      verificationToken.user_id,
      {
        is_verified: true,
        email_verified_at: new Date(),
        status: 'inactive', // Ready for activation payment
        // Note: Keep approval_status as 'pending' until admin approval
        // Note: Keep is_active as false until activation payment
      },
      { new: true }
    );

    if (!user) {
      console.error('User update failed for:', verificationToken.user_id);
      return NextResponse.json(
        { 
          success: false,
          message: 'Failed to verify email. Please try again.' 
        },
        { status: 500 }
      );
    }

    console.log('Email verified successfully for user:', user.email);

    // Delete the used verification token
    await VerificationToken.deleteOne({ _id: verificationToken._id });

    return NextResponse.json({
      success: true,
      message: 'Email verified successfully! You can now log in to your account.',
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        is_verified: user.is_verified,
        status: user.status,
        approval_status: user.approval_status,
        referral_id: user.referral_id,
      }
    });

  } catch (error) {
    console.error('Email verification error:', error);
    
    // Handle specific MongoDB errorMessage
    if (error instanceof Error) {
      if (error.name === 'MongoNetworkError') {
        return NextResponse.json(
          { 
            success: false,
            message: 'Database connection error. Please try again.' 
          },
          { status: 503 }
        );
      }
      
      if (error.name === 'MongoTimeoutError') {
        return NextResponse.json(
          { 
            success: false,
            message: 'Request timeout. Please try again.' 
          },
          { status: 408 }
        );
      }
    }

    return NextResponse.json(
      { 
        success: false,
        message: 'Internal server error during email verification. Please try again.' 
      },
      { status: 500 }
    );
  }
}

// Add OPTIONS handler for CORS preflight requests
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
