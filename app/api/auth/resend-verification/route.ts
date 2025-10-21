// app/api/auth/resend-verification/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase, Profile, VerificationToken } from '@/app/lib/models';
import { sendVerificationEmail } from '@/app/actions/email';
import { randomUUID } from 'crypto';

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ message: 'Email is required' }, { status: 400 });
    }

    // Find user by email
    const user = await Profile.findOne({ email });
    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    if (user.is_verified) {
      return NextResponse.json({ message: 'Email is already verified' }, { status: 400 });
    }

    // Delete any existing verification tokens
    await VerificationToken.deleteMany({ user_id: user._id });

    // Create new verification token
    const verificationToken = randomUUID();
    const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await VerificationToken.create({
      token: verificationToken,
      user_id: user._id,
      expires: tokenExpiry,
    });

    // Send verification email
    const emailResult = await sendVerificationEmail(user.email, verificationToken);

    if (emailResult.success) {
      return NextResponse.json({ 
        message: 'Verification email sent successfully! Please check your inbox.' 
      });
    } else {
      return NextResponse.json({ 
        message: 'Failed to send verification email. Please try again later.' 
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Resend verification error:', error);
    return NextResponse.json(
      { message: 'Failed to resend verification email' },
      { status: 500 }
    );
  }
}
