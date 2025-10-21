import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../lib/supabaseClient';

// Define the full set of fields to select from the profiles table
const PROFILE_FIELDS = 'username, phone_number, referral_id, email, is_verified, is_active, is_approved, status, ban_reason, banned_at, suspension_reason, suspended_at';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  const token = authHeader?.split(' ')[1];

  if (!token) {
    return NextResponse.json({ success: false, message: 'Authentication required. Missing token.' }, { status: 401 });
  }

  // 1. Authenticate user using admin privileges
  const { data: userData, error: authError } = await supabaseAdmin.auth.getUser(token);

  if (authError || !userData?.user) {
    return NextResponse.json({ success: false, message: 'Unauthorized. Invalid session or token expired.' }, { status: 401 });
  }

  const userId = userData.user.id;

  let profileData: any;
  let profileError;

  // 2. Fetch all profile data matching the schema
  ({ data: profileData, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select(PROFILE_FIELDS)
    .eq('id', userId)
    .single());

  if (profileError || !profileData) {
    // 3. If profile doesn't exist, create a new one with defaults
    const { data: newProfile, error: insertError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: userId,
        username: `user_${userId.slice(0, 8)}`, // Use a truncated ID for brevity
        phone_number: '',
        email: userData.user.email || '',
        referral_id: null,
        // Set defaults based on schema
        is_verified: false,
        is_active: false,
        is_approved: false,
        status: 'active',
        // Optional fields default to null/undefined
      })
      .select(PROFILE_FIELDS)
      .single();

    if (insertError || !newProfile) {
      console.error('Profile Insert Error:', insertError);
      return NextResponse.json({ success: false, message: 'Failed to create user profile.' }, { status: 500 });
    }
    profileData = newProfile;
  }

  // 4. Map database data and placeholder data to the required User object structure
  const user = {
    id: userId,
    name: profileData.username,
    phone: profileData.phone_number,
    // Placeholder/Default values for fields not in the profile table (e.g., balance, stats)
    balance: 0, 
    totalEarnings: 0,
    tasksCompleted: 0,
    level: 1,
    rank: 'beginner',
    availableSpins: 0,
    lastWithdrawalDate: undefined,
    // Fields mapped from the profile table
    referralCode: profileData.referral_id || '',
    isVerified: profileData.is_verified,
    isActive: profileData.is_active,
    isApproved: profileData.is_approved,
    role: 'user', // Assuming all users fetched here are 'user' role by default
    status: profileData.status,
    banReason: profileData.ban_reason,
    bannedAt: profileData.banned_at,
    suspensionReason: profileData.suspension_reason,
    suspendedAt: profileData.suspended_at,
    email: profileData.email,
  };

  return NextResponse.json({
    success: true,
    message: 'User profile fetched successfully.',
    data: user,
  }, { status: 200 });
}

export async function POST() {
  return NextResponse.json({ success: false, message: 'Method Not Allowed' }, { status: 405 });
}

