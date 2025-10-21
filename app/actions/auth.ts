// app/actions/auth.ts
'use server';

import { redirect } from 'next/navigation';
import { connectToDatabase, Profile, VerificationToken, Referral, DownlineUser } from '../lib/models';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { sendVerificationEmail } from './email';

export async function registerUser(userData: {
  username: string;
  email: string;
  phone: string;
  password: string;
  referralId?: string;
}): Promise<{ 
  success: boolean; 
  data?: any; 
  message: string 
}> {
  try {
    await connectToDatabase();

    const { username, email, phone, password, referralId } = userData;

    // Check for existing users
    const existingUser = await Profile.findOne({ 
      $or: [{ username }, { email }] 
    });

    if (existingUser) {
      if (existingUser.username === username) {
        return { success: false, message: 'Username already taken' };
      }
      if (existingUser.email === email) {
        return { success: false, message: 'Email already registered' };
      }
    }

    // Handle referral
    let referrerProfile = null;
    if (referralId) {
      referrerProfile = await Profile.findOne({ 
        referral_id: referralId.toUpperCase(),
        approval_status: 'approved',
        status: 'active'
      });

      if (!referrerProfile) {
        return { success: false, message: 'Invalid referral ID' };
      }
    }

    // Create user
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUserId = randomUUID();
    const newUserReferralId = generateReferralId();

    const newUser = await Profile.create({
      _id: newUserId,
      username,
      email,
      phone_number: phone,
      password: hashedPassword,
      referral_id: newUserReferralId,
      approval_status: 'pending',
      status: 'pending',
      is_approved: false,
      is_active: false,
      is_verified: false,
    });

    // Handle referral creation
    if (referrerProfile) {
      await createReferralStructure(referrerProfile._id, newUserId);
    }

    // Generate verification token and send email
    const verificationResult = await generateVerificationToken(newUserId);
    if (!verificationResult.success) {
      // If email fails, we still create the user but they need to request verification
      return {
        success: true,
        data: {
          user_id: newUser._id,
          referral_id: newUserReferralId,
          email_sent: false,
        },
        message: 'Registration successful! Please check your email for verification instructions.'
      };
    }

    return {
      success: true,
      data: {
        user_id: newUser._id,
        referral_id: newUserReferralId,
        email_sent: true,
      },
      message: 'Registration successful! Please check your email to verify your account.'
    };

  } catch (error) {
    console.error('Registration error:', error);
    return { success: false, message: 'Registration failed. Please try again.' };
  }
}

// Generate verification token and send email
async function generateVerificationToken(userId: string): Promise<{ success: boolean; token?: string }> {
  try {
    const verificationToken = randomUUID();
    const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Delete any existing tokens for this user
    await VerificationToken.deleteMany({ user_id: userId });

    // Create new verification token
    await VerificationToken.create({
      token: verificationToken,
      user_id: userId,
      expires: tokenExpiry,
    });

    // Get user email for sending verification
    const user = await Profile.findById(userId);
    if (!user) {
      return { success: false };
    }

    // Send verification email
    const emailResult = await sendVerificationEmail(user.email, verificationToken);
    
    return { 
      success: emailResult.success, 
      token: verificationToken 
    };

  } catch (error) {
    console.error('Error generating verification token:', error);
    return { success: false };
  }
}

// Verify email token
export async function verifyEmailToken(token: string): Promise<{ 
  success: boolean; 
  data?: any; 
  message: string 
}> {
  try {
    await connectToDatabase();

    if (!token) {
      return { success: false, message: 'Verification token is required' };
    }

    // Find the verification token
    const verificationToken = await VerificationToken.findOne({
      token,
      expires: { $gt: new Date() }
    });

    if (!verificationToken) {
      return { success: false, message: 'Invalid or expired verification token' };
    }

    // Update user verification status
    const user = await Profile.findByIdAndUpdate(
      verificationToken.user_id,
      {
        is_verified: true,
        email_verified_at: new Date(),
        status: 'inactive', // Ready for activation payment
      },
      { new: true }
    );

    if (!user) {
      return { success: false, message: 'User not found' };
    }

    // Delete the used verification token
    await VerificationToken.deleteOne({ _id: verificationToken._id });

    return {
      success: true,
      data: {
        user_id: user._id,
        email: user.email,
        is_verified: user.is_verified,
      },
      message: 'Email verified successfully! Please proceed to account activation.'
    };

  } catch (error) {
    console.error('Email verification error:', error);
    return { success: false, message: 'Email verification failed. Please try again.' };
  }
}

// Resend verification email
export async function resendVerificationEmail(email: string): Promise<{ 
  success: boolean; 
  message: string 
}> {
  try {
    await connectToDatabase();

    const user = await Profile.findOne({ email });
    if (!user) {
      return { success: false, message: 'User not found' };
    }

    if (user.is_verified) {
      return { success: false, message: 'Email is already verified' };
    }

    // Generate new verification token
    const verificationResult = await generateVerificationToken(user._id);
    
    if (verificationResult.success) {
      return { 
        success: true, 
        message: 'Verification email sent! Please check your inbox.' 
      };
    } else {
      return { 
        success: false, 
        message: 'Failed to send verification email. Please try again.' 
      };
    }

  } catch (error) {
    console.error('Resend verification error:', error);
    return { success: false, message: 'Failed to resend verification email.' };
  }
}

// Check user authentication status
export async function checkUserStatus(userId: string): Promise<{ 
  success: boolean; 
  data?: any; 
  message: string 
}> {
  try {
    await connectToDatabase();

    const user = await Profile.findById(userId).select('-password');
    if (!user) {
      return { success: false, message: 'User not found' };
    }

    const status = {
      is_verified: user.is_verified,
      is_active: user.is_active,
      is_approved: user.is_approved,
      approval_status: user.approval_status,
      status: user.status,
      role: user.role,
    };

    // Determine next step for user
    let nextStep = '';
    let redirectPath = '';

    if (!user.is_verified) {
      nextStep = 'email_verification';
      redirectPath = '/auth/confirm';
    } else if (!user.is_active) {
      nextStep = 'activation_payment';
      redirectPath = '/auth/activate';
    } else if (!user.is_approved) {
      nextStep = 'admin_approval';
      redirectPath = '/auth/pending-approval';
    } else {
      nextStep = 'complete';
      redirectPath = user.role === 'admin' ? '/admin' : '/dashboard';
    }

    return {
      success: true,
      data: {
        user: status,
        next_step: nextStep,
        redirect_path: redirectPath,
      },
      message: 'User status retrieved successfully'
    };

  } catch (error) {
    console.error('Check user status error:', error);
    return { success: false, message: 'Failed to check user status' };
  }
}

// Activate user account (after payment)
export async function activateUserAccount(userId: string, transactionData?: any): Promise<{ 
  success: boolean; 
  data?: any; 
  message: string 
}> {
  try {
    await connectToDatabase();

    const user = await Profile.findByIdAndUpdate(
      userId,
      {
        is_active: true,
        status: 'pending', // Now waiting for admin approval
        activation_paid_at: new Date(),
      },
      { new: true }
    );

    if (!user) {
      return { success: false, message: 'User not found' };
    }

    // You can add transaction recording here if needed
    if (transactionData) {
      // Record the activation transaction
      // await Transaction.create({ ... })
    }

    return {
      success: true,
      data: {
        user_id: user._id,
        is_active: user.is_active,
        status: user.status,
      },
      message: 'Account activated successfully! Waiting for admin approval.'
    };

  } catch (error) {
    console.error('Account activation error:', error);
    return { success: false, message: 'Account activation failed' };
  }
}

// Helper function to create referral structure
async function createReferralStructure(referrerId: string, referredId: string): Promise<void> {
  try {
    // Create referral record
    await Referral.create({
      referrer_id: referrerId,
      referred_id: referredId,
      earning_cents: 0,
    });

    // Build downline structure
    // Level 1 - direct referral
    await DownlineUser.create({
      main_user_id: referrerId,
      downline_user_id: referredId,
      level: 1,
    });

    // Find upline for level 2+ referrals
    const uplineReferrals = await DownlineUser.find({ 
      downline_user_id: referrerId 
    }).sort({ level: 1 });

    for (const upline of uplineReferrals) {
      if (upline.level < 10) { // Limit to 10 levels
        await DownlineUser.create({
          main_user_id: upline.main_user_id,
          downline_user_id: referredId,
          level: upline.level + 1,
        });
      }
    }

  } catch (error) {
    console.error('Error creating referral structure:', error);
    // Don't throw error - referral failure shouldn't block registration
  }
}

// Get user by email (for login)
export async function getUserByEmail(email: string): Promise<{ 
  success: boolean; 
  data?: any; 
  message: string 
}> {
  try {
    await connectToDatabase();

    const user = await Profile.findOne({ email }).select('+password');
    if (!user) {
      return { success: false, message: 'User not found' };
    }

    return {
      success: true,
      data: user,
      message: 'User retrieved successfully'
    };

  } catch (error) {
    console.error('Get user error:', error);
    return { success: false, message: 'Failed to retrieve user' };
  }
}

// Validate user credentials
export async function validateUserCredentials(email: string, password: string): Promise<{ 
  success: boolean; 
  data?: any; 
  message: string 
}> {
  try {
    const userResult = await getUserByEmail(email);
    
    if (!userResult.success || !userResult.data) {
      return { success: false, message: 'Invalid email or password' };
    }

    const user = userResult.data;

    // Check if user is verified
    if (!user.is_verified) {
      return { 
        success: false, 
        message: 'Please verify your email before logging in.' 
      };
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return { success: false, message: 'Invalid email or password' };
    }

    // Return user without password
    const { password: _, ...userWithoutPassword } = user.toObject();

    return {
      success: true,
      data: userWithoutPassword,
      message: 'Credentials validated successfully'
    };

  } catch (error) {
    console.error('Validate credentials error:', error);
    return { success: false, message: 'Authentication failed' };
  }
}

// Update user password
export async function updateUserPassword(userId: string, newPassword: string): Promise<{ 
  success: boolean; 
  message: string 
}> {
  try {
    await connectToDatabase();

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    await Profile.findByIdAndUpdate(userId, {
      password: hashedPassword,
    });

    return { success: true, message: 'Password updated successfully' };

  } catch (error) {
    console.error('Update password error:', error);
    return { success: false, message: 'Failed to update password' };
  }
}

// Request password reset
export async function requestPasswordReset(email: string): Promise<{ 
  success: boolean; 
  message: string 
}> {
  try {
    await connectToDatabase();

    const user = await Profile.findOne({ email });
    if (!user) {
      // Don't reveal if email exists or not
      return { 
        success: true, 
        message: 'If an account with that email exists, a reset link has been sent.' 
      };
    }

    // Generate reset token (similar to verification token)
    const resetToken = randomUUID();
    const tokenExpiry = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour

    // Store reset token (you might want a separate ResetToken model)
    await VerificationToken.create({
      token: resetToken,
      user_id: user._id,
      expires: tokenExpiry,
      type: 'password_reset', // Differentiate from email verification
    });

    // Send reset email (you'll need to implement this)
    // await sendPasswordResetEmail(user.email, resetToken);

    return { 
      success: true, 
      message: 'If an account with that email exists, a reset link has been sent.' 
    };

  } catch (error) {
    console.error('Password reset request error:', error);
    return { success: false, message: 'Failed to process password reset request' };
  }
}

function generateReferralId(): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}
