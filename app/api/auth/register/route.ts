// This API Route handles user registration (POST /api/auth/register)
// It uses Mongoose models and connects to MongoDB.

import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

// Import Mongoose models and the connection utility
import { Profile, Referral, DownlineUser, VerificationToken, connectToDatabase } from '@/app/lib/models'; 
import { CommissionService } from '@/app/lib/services/commissionService';
import { sendVerificationEmail } from '@/app/actions/email';

// Configuration for generating new referral IDs
const REFERRAL_ID_LENGTH = 8;
const REFERRAL_ID_CHARACTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

/**
 * Helper function to generate a unique referral ID.
 * In a real app, this would loop and check the DB for uniqueness until a match is not found.
 */
function generateReferralId(): string {
  let result = '';
  for (let i = 0; i < REFERRAL_ID_LENGTH; i++) {
    result += REFERRAL_ID_CHARACTERS.charAt(
      Math.floor(Math.random() * REFERRAL_ID_CHARACTERS.length)
    );
  }
  return result;
}

/**
 * POST handler for user registration.
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Establish MongoDB Connection
    await connectToDatabase();

    const body = await request.json();
    const { username, email, phone, password, referralId: rawReferralId } = body;

    console.log('Registration attempt for:', { username, email, phone });

    // Basic Input Validation
    if (!username || !email || !phone || !password) {
      return NextResponse.json({ message: 'Missing required fields.' }, { status: 400 });
    }

    // Validate password strength
    if (password.length < 6) {
      return NextResponse.json({ message: 'Password must be at least 6 characters long.' }, { status: 400 });
    }

    const referralId = rawReferralId ? rawReferralId.toUpperCase() : null;

    // 2. Check for existing users (Uniqueness check)
    const existingUser = await Profile.findOne({ $or: [{ username }, { email }] });

    if (existingUser) {
      if (existingUser.username === username) {
        return NextResponse.json({ message: 'Username already taken.' }, { status: 409 });
      }
      if (existingUser.email === email) {
        return NextResponse.json({ message: 'Email already registered.' }, { status: 409 });
      }
    }

    // 3. Handle Referral ID lookup
    let referrerProfile = null;
    if (referralId) {
      referrerProfile = await Profile.findOne({ referral_id: referralId });

      if (!referrerProfile) {
        return NextResponse.json({ message: 'Invalid referral ID.' }, { status: 400 });
      }

      // Check if referrer is approved and active
      if (referrerProfile.approval_status !== 'approved' || referrerProfile.status !== 'active') {
        return NextResponse.json({ 
          message: 'Referrer account is not active or approved. Please use a different referral code.' 
        }, { status: 400 });
      }
    }

    // 4. Create New User Profile
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUserId = randomUUID();
    const newUserReferralId = await generateUniqueReferralId();

    const newProfileData = {
      _id: newUserId,
      username,
      email,
      phone_number: phone,
      password: hashedPassword, 
      referral_id: newUserReferralId,
      // Set initial status as pending approval
      approval_status: 'pending',
      status: 'pending',
      is_approved: false,
      is_active: false,
      is_verified: false,
    };

    console.log('Creating user with data:', {
      email: newProfileData.email,
      username: newProfileData.username,
      referral_id: newUserReferralId,
      hasReferrer: !!referrerProfile
    });

    const newUser = await Profile.create(newProfileData);

    // Verify the user was created
    const createdUser = await Profile.findById(newUser._id);
    console.log('User created successfully:', {
      id: createdUser._id,
      username: createdUser.username,
      referral_id: createdUser.referral_id
    });

    // 5. Generate verification token and send email
    let emailSent = false;
    try {
      const verificationToken = randomUUID();
      const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Delete any existing tokens for this user
      await VerificationToken.deleteMany({ user_id: newUser._id });

      // Create new verification token
      await VerificationToken.create({
        token: verificationToken,
        user_id: newUser._id,
        expires: tokenExpiry,
      });

      console.log('Verification token created for user:', newUser._id);

      // Send verification email using your existing function
      const emailResult = await sendVerificationEmail(newUser.email, verificationToken);
      
      if (emailResult.success) {
        emailSent = true;
        console.log('Verification email sent to:', newUser.email);
      } else {
        console.log('Failed to send verification email to:', newUser.email);
        console.log('Email error:', emailResult.error);
      }
    } catch (emailError) {
      console.error('Error sending verification email:', emailError);
      // Don't fail registration if email fails
    }

    // 6. Create Referral, Downline entries and build network structure if applicable
    if (referrerProfile) {
      try {
        // Create referral record
        const referralRecord = await Referral.create({
          referrer_id: referrerProfile._id,
          referred_id: newUser._id,
          earning_cents: 0, // Will be updated when user pays activation and gets approved
        });

        console.log('Referral record created:', referralRecord._id);

        // Build the complete downline structure for multi-level commissions
        await CommissionService.buildDownlineStructure(newUser._id, referrerProfile._id);

        console.log('Downline structure built for user:', newUser._id);
        console.log('Downline structure built successfully');

        // Send notification to referrer (you can implement this later)
        // await sendReferralNotification(referrerProfile, newUser);

      } catch (referralError) {
        console.error('Error creating referral structure:', referralError);
        // Don't fail registration if referral creation fails, just log it
        // The user should still be able to register
      }
    }

    // 7. Success Response
    return NextResponse.json(
      {
        message: 'Registration successful! Your profile is pending approval.', 
        user_id: newUser._id,
        referral_id: newUserReferralId,
        email_sent: emailSent,
        requires_approval: true,
        requires_activation_payment: true,
        next_steps: emailSent 
          ? [
              'Check your email to verify your account',
              'Wait for admin approval',
              'Pay KSH 1000 activation fee to activate your account',
              'Start earning from referrals once approved'
            ]
          : [
              'Please contact support to verify your email',
              'Wait for admin approval',
              'Pay KSH 1000 activation fee to activate your account',
              'Start earning from referrals once approved'
            ]
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration API Error:', error);

    if (error instanceof Error && (error as any).code === 11000) {
      const key = Object.keys((error as any).keyValue)[0];
      return NextResponse.json(
        { message: `${key} is already registered.` },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { message: 'Internal Server Error during registration. Please check server logs.' },
      { status: 500 }
    );
  }
}

/**
 * Generate a unique referral ID with collision check
 */
async function generateUniqueReferralId(): Promise<string> {
  let attempts = 0;
  const maxAttempts = 5;

  while (attempts < maxAttempts) {
    const referralId = generateReferralId();
    const existingProfile = await Profile.findOne({ referral_id: referralId });
    
    if (!existingProfile) {
      return referralId;
    }
    
    attempts++;
    console.log(`Referral ID collision detected, generating new one. Attempt: ${attempts}`);
  }

  // If we still have collisions after max attempts, use a different approach
  const fallbackId = `U${Date.now().toString().slice(-7)}`;
  console.log(`Using fallback referral ID: ${fallbackId}`);
  return fallbackId;
}
