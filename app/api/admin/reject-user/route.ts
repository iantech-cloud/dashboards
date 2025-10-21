import { createClient } from '@/app/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized. Please log in.' },
        { status: 401 }
      );
    }

    const { data: adminProfile, error: adminError } = await supabase
      .from('profiles')
      .select('role, is_approved')
      .eq('id', user.id)
      .single();

    if (adminError || !adminProfile || adminProfile.role !== 'admin') {
      return NextResponse.json(
        { success: false, message: 'Unauthorized. Admin access required.' },
        { status: 403 }
      );
    }

    const { userId, reason } = await req.json();

    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'User ID is required.' },
        { status: 400 }
      );
    }

    const { data: userProfile, error: userError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();

    if (userError || !userProfile) {
      return NextResponse.json(
        { success: false, message: 'User not found.' },
        { status: 404 }
      );
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        approval_status: 'rejected',
        is_approved: false,
        approval_by: user.id,
        approval_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (updateError) {
      console.error('Profile update error:', updateError);
      return NextResponse.json(
        { success: false, message: 'Failed to reject user.' },
        { status: 500 }
      );
    }

    await supabase
      .from('admin_audit_logs')
      .insert([
        {
          actor_id: user.id,
          action: 'reject_user',
          target_type: 'profile',
          target_id: userId,
          changes: { 
            status: 'rejected',
            reason: reason || 'No reason provided'
          },
        },
      ]);

    return NextResponse.json({
      success: true,
      message: 'User rejected successfully.',
    }, { status: 200 });

  } catch (error) {
    console.error('Rejection error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error.' },
      { status: 500 }
    );
  }
}
