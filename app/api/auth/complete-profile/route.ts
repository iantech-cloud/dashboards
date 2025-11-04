// app/api/auth/complete-profile/route.ts
// API endpoint to update phone number for OAuth users

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { connectToDatabase, Profile } from '@/app/lib/models';

export async function POST(request: NextRequest) {
  try {
    // Get authenticated session
    const session = await auth();

    if (!session || !session.user?.id) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized. Please log in.' },
        { status: 401 }
      );
    }

    const { phone_number } = await request.json();

    // Validate phone number
    if (!phone_number) {
      return NextResponse.json(
        { success: false, message: 'Phone number is required.' },
        { status: 400 }
      );
    }

    // Validate Kenyan phone format (+254XXXXXXXXX)
    const phoneRegex = /^\+254[0-9]{9}$/;
    if (!phoneRegex.test(phone_number)) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Invalid phone number format. Must be +254XXXXXXXXX' 
        },
        { status: 400 }
      );
    }

    // Connect to database
    await connectToDatabase();

    // Check if phone number already exists
    const existingPhone = await Profile.findOne({ 
      phone_number,
      _id: { $ne: session.user.id } // Exclude current user
    });

    if (existingPhone) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'This phone number is already registered to another account.' 
        },
        { status: 409 }
      );
    }

    // Update user profile
    const updatedProfile = await Profile.findByIdAndUpdate(
      session.user.id,
      {
        phone_number,
        profile_completed: true,
        updated_at: new Date(),
      },
      { new: true, runValidators: true }
    );

    if (!updatedProfile) {
      return NextResponse.json(
        { success: false, message: 'User profile not found.' },
        { status: 404 }
      );
    }

    console.log(`Profile completed for user ${session.user.id}: phone=${phone_number}`);

    return NextResponse.json({
      success: true,
      message: 'Profile completed successfully!',
      data: {
        phone_number: updatedProfile.phone_number,
        profile_completed: updatedProfile.profile_completed,
      },
    });

  } catch (error: any) {
    console.error('Complete profile API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || 'An error occurred while updating your profile.' 
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check if profile is complete
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session || !session.user?.id) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectToDatabase();

    const profile = await Profile.findById(session.user.id).select(
      'phone_number profile_completed oauth_provider'
    );

    if (!profile) {
      return NextResponse.json(
        { success: false, message: 'Profile not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        phone_number: profile.phone_number,
        profile_completed: profile.profile_completed || false,
        needs_phone: !profile.phone_number,
        oauth_provider: profile.oauth_provider,
      },
    });

  } catch (error: any) {
    console.error('Check profile API error:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
}
