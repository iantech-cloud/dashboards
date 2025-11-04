import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/app/lib/mongoose';
import { Profile } from '@/app/lib/models/Profile';
import bcrypt from 'bcryptjs';
import { auth } from '@/auth';
import speakeasy from 'speakeasy';
import { encrypt } from '@/app/lib/encryption';

/**
 * GET /api/auth/anti-phishing - Check if user has anti-phishing code set
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userEmail = session.user.email;

    await connectToDatabase();
    
    const user = await Profile.findOne({ email: userEmail });
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Initialize the field if it doesn't exist (for existing users created before this feature)
    if (user.antiPhishingCodeSet === undefined || user.antiPhishingCodeSet === null) {
      console.log('Initializing antiPhishingCodeSet field for user:', userEmail);
      user.antiPhishingCodeSet = false;
      await user.save();
    }
    
    console.log('GET anti-phishing status:', {
      email: userEmail,
      userFound: !!user,
      antiPhishingCodeSet: user.antiPhishingCodeSet,
      typeOf: typeof user.antiPhishingCodeSet
    });

    return NextResponse.json({
      success: true,
      hasAntiPhishingCode: user.antiPhishingCodeSet === true
    });

  } catch (error) {
    console.error('Error checking anti-phishing code:', error);
    return NextResponse.json(
      { error: 'Failed to check anti-phishing code status' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/auth/anti-phishing - Set or update anti-phishing code
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userEmail = session.user.email;

    const body = await request.json();
    const { code, currentPassword, verificationCode } = body; 

    // Validate anti-phishing code
    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { error: 'Anti-phishing code is required' },
        { status: 400 }
      );
    }

    // Validate code format (alphanumeric, 6-20 characters)
    const codeRegex = /^[a-zA-Z0-9]{6,20}$/;
    if (!codeRegex.test(code)) {
      return NextResponse.json(
        { 
          error: 'Anti-phishing code must be 6-20 alphanumeric characters (letters and numbers only, no spaces or special characters)' 
        },
        { status: 400 }
      );
    }

    // Prevent common weak codes
    const weakCodes = ['123456', 'password', 'qwerty', 'abcdef', '111111', '000000'];
    if (weakCodes.includes(code.toLowerCase())) {
      return NextResponse.json(
        { error: 'This code is too common. Please choose a more unique code.' },
        { status: 400 }
      );
    }

    await connectToDatabase();
    
    // Find the user by email
    const user = await Profile.findOne({ email: userEmail }).select('+password +twoFASecret');
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    console.log('POST anti-phishing - User found:', {
      email: userEmail,
      has2FA: !!user.twoFASecret,
      currentAntiPhishingCodeSet: user.antiPhishingCodeSet
    });

    // If user has 2FA enabled, require verification
    if (user.twoFASecret) {
      if (!verificationCode) {
        return NextResponse.json({
          needsVerification: true,
          verificationMethod: '2fa',
          message: 'Please enter your 2FA code to set anti-phishing code'
        });
      }

      // Verify 2FA code
      const verified = speakeasy.totp.verify({
        secret: user.twoFASecret,
        encoding: 'base32',
        token: verificationCode,
        window: 2
      });

      if (!verified) {
        return NextResponse.json(
          { error: 'Invalid 2FA code' },
          { status: 400 }
        );
      }
    } else {
      // Require password verification if no 2FA
      if (!currentPassword) {
        return NextResponse.json({
          needsVerification: true,
          verificationMethod: 'password',
          message: 'Please enter your password to set anti-phishing code'
        });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(currentPassword, user.password);
      if (!isValidPassword) {
        return NextResponse.json(
          { error: 'Invalid password' },
          { status: 400 }
        );
      }
    }

    // Hash the anti-phishing code for verification
    const hashedCode = await bcrypt.hash(code, 12);
    
    // Encrypt the code for email display
    const encryptedCode = encrypt(code);

    console.log('🔐 Encryption results:', {
      originalCode: code,
      hashedCodeLength: hashedCode.length,
      encryptedCodeLength: encryptedCode.length,
      encryptedCodePreview: encryptedCode.substring(0, 30) + '...'
    });

    console.log('🔄 Using direct MongoDB update for reliable field saving...');
    const mongoose = await import('mongoose');
    
    // Prepare update data
    const updateData: any = {
      antiPhishingCode: hashedCode,
      antiPhishingEncryptedCode: encryptedCode,
      antiPhishingCodeSet: true,
      antiPhishingLastUpdated: new Date()
    };

    // Only set antiPhishingSetAt if it's the first time setting the code
    if (!user.antiPhishingSetAt) {
      updateData.antiPhishingSetAt = new Date();
    }

    // Use direct MongoDB update for reliable field saving
    const directUpdate = await mongoose.default.connection.db.collection('profiles')
      .updateOne(
        { email: userEmail },
        { $set: updateData }
      );

    console.log('📝 Direct MongoDB update result:', {
      matchedCount: directUpdate.matchedCount,
      modifiedCount: directUpdate.modifiedCount,
      acknowledged: directUpdate.acknowledged
    });

    if (directUpdate.matchedCount === 0) {
      console.error('❌ No user found to update');
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (directUpdate.modifiedCount === 0) {
      console.error('❌ No changes made to user profile');
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      );
    }

    // Verify the update with direct MongoDB query
    const directResult = await mongoose.default.connection.db.collection('profiles')
      .findOne({ email: userEmail });

    console.log('✅ Update verification:', {
      hasEncryptedCode: !!directResult?.antiPhishingEncryptedCode,
      encryptedCodeLength: directResult?.antiPhishingEncryptedCode?.length,
      antiPhishingCodeSet: directResult?.antiPhishingCodeSet
    });

    // Also verify with Mongoose for consistency
    const verifyUser = await Profile.findOne({ email: userEmail });
    console.log('🔍 Mongoose verification:', {
      antiPhishingCodeSet: verifyUser?.antiPhishingCodeSet,
      hasEncryptedCode: !!verifyUser?.antiPhishingEncryptedCode
    });

    return NextResponse.json({
      success: true,
      message: 'Anti-phishing code set successfully! This code will appear in all future emails from HustleHub Africa.',
      hasAntiPhishingCode: true, // Explicitly return the new status
      debug: {
        mongoDBUpdate: {
          matchedCount: directUpdate.matchedCount,
          modifiedCount: directUpdate.modifiedCount
        },
        verification: {
          hasEncryptedCode: !!directResult?.antiPhishingEncryptedCode,
          antiPhishingCodeSet: directResult?.antiPhishingCodeSet
        }
      }
    });

  } catch (error) {
    console.error('Error setting anti-phishing code:', error);
    return NextResponse.json(
      { error: 'Failed to set anti-phishing code' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/auth/anti-phishing - Remove anti-phishing code
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userEmail = session.user.email;

    const body = await request.json();
    const { currentPassword, verificationCode } = body;

    await connectToDatabase();
    
    const user = await Profile.findOne({ email: userEmail }).select('+password +twoFASecret');
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (!user.antiPhishingCodeSet) {
      return NextResponse.json(
        { error: 'No anti-phishing code is set' },
        { status: 400 }
      );
    }

    // If user has 2FA enabled, require verification
    if (user.twoFASecret) {
      if (!verificationCode) {
        return NextResponse.json({
          needsVerification: true,
          verificationMethod: '2fa',
          message: 'Please enter your 2FA code to remove anti-phishing code'
        });
      }

      // Verify 2FA code
      const verified = speakeasy.totp.verify({
        secret: user.twoFASecret,
        encoding: 'base32',
        token: verificationCode,
        window: 2
      });

      if (!verified) {
        return NextResponse.json(
          { error: 'Invalid 2FA code' },
          { status: 400 }
        );
      }
    } else {
      // Require password verification if no 2FA
      if (!currentPassword) {
        return NextResponse.json({
          needsVerification: true,
          verificationMethod: 'password',
          message: 'Please enter your password to remove anti-phishing code'
        });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(currentPassword, user.password);
      if (!isValidPassword) {
        return NextResponse.json(
          { error: 'Invalid password' },
          { status: 400 }
        );
      }
    }

    console.log('🔄 Using direct MongoDB update for reliable removal...');
    const mongoose = await import('mongoose');
    
    // Use direct MongoDB update for reliable removal
    const directUpdate = await mongoose.default.connection.db.collection('profiles')
      .updateOne(
        { email: userEmail },
        {
          $set: {
            antiPhishingCode: null,
            antiPhishingEncryptedCode: null,
            antiPhishingCodeSet: false,
            antiPhishingLastUpdated: new Date()
          }
        }
      );

    console.log('📝 Direct MongoDB removal result:', {
      matchedCount: directUpdate.matchedCount,
      modifiedCount: directUpdate.modifiedCount,
      acknowledged: directUpdate.acknowledged
    });

    if (directUpdate.matchedCount === 0) {
      console.error('❌ No user found to update');
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Verify the removal with direct MongoDB query
    const directResult = await mongoose.default.connection.db.collection('profiles')
      .findOne({ email: userEmail });

    console.log('✅ Removal verification:', {
      hasEncryptedCode: !!directResult?.antiPhishingEncryptedCode,
      antiPhishingCodeSet: directResult?.antiPhishingCodeSet
    });

    // Also verify with Mongoose for consistency
    const verifyUser = await Profile.findOne({ email: userEmail });
    console.log('🔍 Mongoose removal verification:', {
      antiPhishingCodeSet: verifyUser?.antiPhishingCodeSet,
      hasEncryptedCode: !!verifyUser?.antiPhishingEncryptedCode
    });

    return NextResponse.json({
      success: true,
      message: 'Anti-phishing code removed successfully. Future emails will not include a security code.',
      hasAntiPhishingCode: false, // Explicitly return the new status
      debug: {
        mongoDBUpdate: {
          matchedCount: directUpdate.matchedCount,
          modifiedCount: directUpdate.modifiedCount
        },
        verification: {
          hasEncryptedCode: !!directResult?.antiPhishingEncryptedCode,
          antiPhishingCodeSet: directResult?.antiPhishingCodeSet
        }
      }
    });

  } catch (error) {
    console.error('Error removing anti-phishing code:', error);
    return NextResponse.json(
      { error: 'Failed to remove anti-phishing code' },
      { status: 500 }
    );
  }
}
