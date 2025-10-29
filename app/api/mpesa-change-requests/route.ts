import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/app/lib/mongoose';
import { Profile, MpesaChangeRequest, AdminAuditLog, VerificationToken } from '@/app/lib/models';
// --- NextAuth v5/Auth.js change: Import the 'auth' utility directly ---
import { auth } from '@/auth'; // Assuming '@/auth' exports the Auth.js instance
// --- Removed: import { getServerSession } from 'next-auth';
// --- Removed: import { authOptions } from '@/auth';
import { sendVerificationCodeEmail } from '@/app/actions/email';
import speakeasy from 'speakeasy';
import { randomInt } from 'crypto';

/**
 * Normalize and standardize phone numbers
 */
function normalizePhone(phone: string): string {
  // Remove spaces, dashes, parentheses, and plus signs
  return phone.replace(/[\s\-\(\)\+]/g, '');
}

function standardizePhone(phone: string): string {
  const normalized = normalizePhone(phone);
  // Already in 254 format
  if (normalized.startsWith('254')) return normalized;
  // Starts with 0 (e.g., 0712345678)
  if (normalized.startsWith('0')) return '254' + normalized.substring(1);
  // Starts with 7 or 1 (e.g., 712345678 or 112345678)
  if (normalized.startsWith('7') || normalized.startsWith('1')) return '254' + normalized;
  return normalized;
}

function validatePhoneFormat(phone: string): boolean {
  const normalized = normalizePhone(phone);
  // Accept: 254XXXXXXXXX, 07XXXXXXXX, 7XXXXXXXX, 01XXXXXXXX, 1XXXXXXXX, +254XXXXXXXXX
  const phoneRegex = /^(254[0-9]{9}|0[0-9]{9}|[17][0-9]{8})$/;
  return phoneRegex.test(normalized);
}

function formatPhoneDisplay(phone: string): string {
  const standardized = standardizePhone(phone);
  // Format as: +254 7XX XXX XXX
  if (standardized.startsWith('254')) {
    return `+254 ${standardized.substring(3, 6)} ${standardized.substring(6, 9)} ${standardized.substring(9)}`;
  }
  return standardized;
}

/**
 * GET - Fetch user's M-Pesa change requests
 */
export async function GET(request: NextRequest) {
  try {
    // --- NextAuth v5/Auth.js change: Use auth() to get the session ---
    const session = await auth();

    if (!session || !session.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in.' },
        { status: 401 }
      );
    }

    await connectToDatabase();

    const profile = await Profile.findOne({ email: session.user.email });

    if (!profile) {
      return NextResponse.json(
        { error: 'User profile not found.' },
        { status: 404 }
      );
    }

    // Fetch all change requests for this user
    const requests = await MpesaChangeRequest.find({ user_id: profile._id })
      .sort({ createdAt: -1 })
      .lean();

    // Format the response
    const formattedRequests = requests.map(req => ({
      id: req._id.toString(),
      old_mpesa_number: formatPhoneDisplay(req.old_number),
      new_mpesa_number: formatPhoneDisplay(req.new_number),
      reason: req.reason,
      status: req.approval_status,
      admin_feedback: req.approval_notes,
      request_date: req.createdAt,
      processed_date: req.approval_at,
    }));

    return NextResponse.json(formattedRequests, { status: 200 });
  } catch (error) {
    console.error('Error fetching M-Pesa change requests:', error);
    return NextResponse.json(
      { error: 'An error occurred while fetching change requests.' },
      { status: 500 }
    );
  }
}

/**
 * POST - Create new M-Pesa change request with 2FA verification
 */
export async function POST(request: NextRequest) {
  try {
    // --- NextAuth v5/Auth.js change: Use auth() to get the session ---
    const session = await auth();

    if (!session || !session.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in.' },
        { status: 401 }
      );
    }

    const { oldNumber, newNumber, reason, verificationCode, verificationMethod } = await request.json();

    // Validate input
    if (!oldNumber || !newNumber || !reason) {
      return NextResponse.json(
        { error: 'All fields are required.' },
        { status: 400 }
      );
    }

    // Validate phone formats
    if (!validatePhoneFormat(oldNumber) || !validatePhoneFormat(newNumber)) {
      return NextResponse.json(
        { error: 'Invalid phone number format. Use 254XXXXXXXXX, 07XXXXXXXX, or 7XXXXXXXX.' },
        { status: 400 }
      );
    }

    const standardizedOld = standardizePhone(oldNumber);
    const standardizedNew = standardizePhone(newNumber);

    if (standardizedOld === standardizedNew) {
      return NextResponse.json(
        { error: 'New M-Pesa number cannot be the same as the old one.' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const profile = await Profile.findOne({ email: session.user.email });

    if (!profile) {
      return NextResponse.json(
        { error: 'User profile not found.' },
        { status: 404 }
      );
    }

    // Verify old number matches user's registered number
    const userPhone = standardizePhone(profile.phone_number);
    if (standardizedOld !== userPhone) {
      return NextResponse.json(
        { error: 'Old M-Pesa number does not match your registered number.' },
        { status: 400 }
      );
    }

    // Check if verification is needed
    if (!verificationCode) {
      // First request - need to send verification
      if (profile.twoFAEnabled && profile.twoFASecret) {
        // User has 2FA enabled - they should use Google Authenticator
        return NextResponse.json(
          {
            needsVerification: true,
            verificationMethod: '2fa',
            message: 'Please enter your 6-digit code from Google Authenticator.',
          },
          { status: 200 }
        );
      } else {
        // Send email verification code
        const code = randomInt(100000, 999999).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Delete any existing verification tokens for this user and purpose
        await VerificationToken.deleteMany({
          user_id: profile._id,
          purpose: 'mpesa_change',
        });

        // Create new verification token with metadata
        await VerificationToken.create({
          token: code,
          user_id: profile._id,
          expires: expiresAt,
          purpose: 'mpesa_change',
          metadata: {
            oldNumber: standardizedOld,
            newNumber: standardizedNew,
            reason,
            attempts: 0,
          },
        });

        // Send email
        const emailResult = await sendVerificationCodeEmail(session.user.email, code, 'M-Pesa Number Change');

        if (!emailResult.success) {
          return NextResponse.json(
            { error: 'Failed to send verification email. Please try again.' },
            { status: 500 }
          );
        }

        return NextResponse.json(
          {
            needsVerification: true,
            verificationMethod: 'email',
            message: 'A verification code has been sent to your email. It will expire in 10 minutes.',
          },
          { status: 200 }
        );
      }
    }

    // Verify the code
    let isVerified = false;

    if (verificationMethod === '2fa') {
      // Verify 2FA code
      if (!profile.twoFAEnabled || !profile.twoFASecret) {
        return NextResponse.json(
          { error: '2FA is not enabled for this account.' },
          { status: 400 }
        );
      }

      isVerified = speakeasy.totp.verify({
        secret: profile.twoFASecret,
        encoding: 'base32',
        token: verificationCode,
        window: 2,
        step: 30,
      });

      if (!isVerified) {
        return NextResponse.json(
          { error: 'Invalid 2FA code. Please try again.' },
          { status: 400 }
        );
      }

      // Update last used
      profile.twoFALastUsed = new Date();
      await profile.save();
    } else if (verificationMethod === 'email') {
      // Verify email code
      const verificationToken = await VerificationToken.findOne({
        user_id: profile._id,
        purpose: 'mpesa_change',
        token: verificationCode,
        expires: { $gt: new Date() },
      });

      if (!verificationToken) {
        // Check if token exists but expired
        const expiredToken = await VerificationToken.findOne({
          user_id: profile._id,
          purpose: 'mpesa_change',
          token: verificationCode,
        });

        if (expiredToken && expiredToken.expires < new Date()) {
          return NextResponse.json(
            { error: 'Verification code expired. Please request a new one.' },
            { status: 400 }
          );
        }

        // Increment attempts if token exists (and not expired)
        const existingToken = await VerificationToken.findOne({
          user_id: profile._id,
          purpose: 'mpesa_change',
          expires: { $gt: new Date() },
        });

        if (existingToken) {
          existingToken.metadata = existingToken.metadata || {};
          existingToken.metadata.attempts = (existingToken.metadata.attempts || 0) + 1;

          // Lock after 5 failed attempts
          if (existingToken.metadata.attempts >= 5) {
            await VerificationToken.deleteMany({
              user_id: profile._id,
              purpose: 'mpesa_change',
            });
            return NextResponse.json(
              { error: 'Too many failed attempts. Please request a new verification code.' },
              { status: 429 }
            );
          }

          await existingToken.save();
        }

        return NextResponse.json(
          { error: 'Invalid verification code. Please try again.' },
          { status: 400 }
        );
      }

      // Verify the data matches
      const tokenData = verificationToken.metadata;
      if (
        tokenData.oldNumber !== standardizedOld ||
        tokenData.newNumber !== standardizedNew ||
        tokenData.reason !== reason
      ) {
        // This is a security check, if the data in the token doesn't match the request, something is wrong
        return NextResponse.json(
          { error: 'Request data does not match. Please start over.' },
          { status: 400 }
        );
      }

      isVerified = true;

      // Delete the used verification token
      await VerificationToken.deleteOne({ _id: verificationToken._id });
    } else {
      return NextResponse.json(
        { error: 'Invalid verification method.' },
        { status: 400 }
      );
    }

    if (!isVerified) {
      return NextResponse.json(
        { error: 'Verification failed.' },
        { status: 400 }
      );
    }

    // Check for pending requests
    const pendingRequest = await MpesaChangeRequest.findOne({
      user_id: profile._id,
      approval_status: 'pending',
    });

    if (pendingRequest) {
      return NextResponse.json(
        { error: 'You already have a pending M-Pesa change request. Please wait for admin review.' },
        { status: 400 }
      );
    }

    // Check if new number is already in use
    const existingUser = await Profile.findOne({
      phone_number: standardizedNew,
      _id: { $ne: profile._id },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'This M-Pesa number is already registered to another account.' },
        { status: 400 }
      );
    }

    // Create the change request
    const changeRequest = await MpesaChangeRequest.create({
      user_id: profile._id,
      old_number: standardizedOld,
      new_number: standardizedNew,
      reason: reason.trim(),
      approval_status: 'pending',
    });

    // Create audit log
    await AdminAuditLog.create({
      actor_id: profile._id,
      action: 'CREATE_MPESA_CHANGE_REQUEST',
      target_type: 'mpesa_change_request',
      target_id: changeRequest._id.toString(),
      resource_type: 'user',
      resource_id: profile._id,
      action_type: 'create',
      changes: {
        old_number: standardizedOld,
        new_number: standardizedNew,
        reason: reason.trim(),
      },
      metadata: {
        verification_method: verificationMethod,
        user_email: profile.email,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: 'M-Pesa number change request submitted successfully. Please wait for admin approval.',
        requestId: changeRequest._id.toString(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating M-Pesa change request:', error);
    return NextResponse.json(
      { error: 'An error occurred while processing your request. Please try again.' },
      { status: 500 }
    );
  }
}

