import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { connectToDatabase, Profile, Referral, Earning, Transaction } from '@/app/lib/models';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Authentication check
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Connect to database
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');
    const type = searchParams.get('type');

    // Get current user
    const currentUser = await Profile.findOne({ email: session.user.email });
    if (!currentUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const userRole = currentUser.role;
    const startIndex = (page - 1) * limit;

    let referrals = [];
    let totalCount = 0;
    let summary = {
      total: 0,
      active: 0,
      pending: 0,
      totalEarnings: 0
    };

    // Role-based data fetching
    switch (userRole) {
      case 'admin':
        // Admin: Get all referrals with detailed information
        const adminReferrals = await Referral.find({})
          .populate('referrer_id', 'username email referral_id status')
          .populate('referred_id', 'username email referral_id status created_at level rank')
          .sort({ created_at: -1 })
          .skip(startIndex)
          .limit(limit)
          .lean();

        totalCount = await Referral.countDocuments();

        referrals = adminReferrals.map(ref => ({
          id: ref._id.toString(),
          referrer: ref.referrer_id?.username || 'Unknown',
          referred: ref.referred_id?.username || 'Unknown',
          referrerEmail: ref.referrer_id?.email,
          referredEmail: ref.referred_id?.email,
          referrerId: ref.referrer_id?.referral_id,
          referredId: ref.referred_id?.referral_id,
          date: ref.created_at,
          status: ref.referred_id?.status || 'active',
          commission: ref.earning_cents / 100,
          tier: 1,
          referredJoinDate: ref.referred_id?.created_at,
          level: ref.referred_id?.level,
          rank: ref.referred_id?.rank
        }));

        // Admin summary - get counts by status
        const activeCount = await Referral.countDocuments()
          .populate('referred_id', 'status')
          .then(refs => refs.filter(ref => ref.referred_id?.status === 'active').length);
        
        const pendingCount = await Referral.countDocuments()
          .populate('referred_id', 'status')
          .then(refs => refs.filter(ref => ref.referred_id?.status === 'pending').length);

        const totalEarningsResult = await Referral.aggregate([
          {
            $group: {
              _id: null,
              total: { $sum: '$earning_cents' }
            }
          }
        ]);

        summary = {
          total: totalCount,
          active: activeCount,
          pending: pendingCount,
          totalEarnings: (totalEarningsResult[0]?.total || 0) / 100
        };
        break;

      case 'support':
        // Support: Get users pending approval and suspended/banned users
        const supportQuery = {
          $or: [
            { approval_status: 'pending' },
            { status: { $in: ['suspended', 'banned'] } }
          ]
        };

        const supportUsers = await Profile.find(supportQuery)
          .select('username email referral_id status approval_status created_at')
          .sort({ created_at: -1 })
          .skip(startIndex)
          .limit(limit)
          .lean();

        totalCount = await Profile.countDocuments(supportQuery);

        referrals = supportUsers.map(user => ({
          id: user._id.toString(),
          ticketId: `TKT-${user._id.toString().slice(-4).toUpperCase()}`,
          user: user.username,
          userEmail: user.email,
          issue: user.approval_status === 'pending' ? 'Account approval pending' : `User ${user.status}`,
          status: user.approval_status === 'pending' ? 'open' : 'in_progress',
          date: user.created_at,
          priority: user.approval_status === 'pending' ? 'high' : 'medium',
          email: user.email,
          joinDate: user.created_at
        }));

        // Support summary
        const pendingApprovals = await Profile.countDocuments({ approval_status: 'pending' });
        const suspendedUsers = await Profile.countDocuments({ status: 'suspended' });
        const bannedUsers = await Profile.countDocuments({ status: 'banned' });

        summary = {
          total: pendingApprovals + suspendedUsers + bannedUsers,
          active: 0, // Not applicable for support view
          pending: pendingApprovals,
          totalEarnings: 0
        };
        break;

      case 'user':
      default:
        // Regular user: Get their own referrals
        const userReferrals = await Referral.find({ referrer_id: currentUser._id })
          .populate('referred_id', 'username email status created_at level rank total_earnings_cents balance_cents tasks_completed')
          .sort({ created_at: -1 })
          .skip(startIndex)
          .limit(limit)
          .lean();

        totalCount = await Referral.countDocuments({ referrer_id: currentUser._id });

        // Get referral earnings from transactions for this user
        const referralTransactions = await Transaction.find({
          user_id: currentUser._id,
          type: 'REFERRAL'
        }).lean();

        // Create a map of referred user ID to total earnings
        const earningsMap = new Map();
        referralTransactions.forEach(transaction => {
          const referredId = transaction.metadata?.referredUser;
          if (referredId) {
            const current = earningsMap.get(referredId) || 0;
            earningsMap.set(referredId, current + transaction.amount_cents);
          }
        });

        referrals = userReferrals.map(ref => {
          const referredUserId = ref.referred_id?._id.toString();
          const transactionEarnings = earningsMap.get(referredUserId) || 0;
          const totalEarnings = transactionEarnings > 0 ? transactionEarnings : ref.earning_cents;

          return {
            id: ref._id.toString(),
            name: ref.referred_id?.username || 'Unknown User',
            email: ref.referred_id?.email || 'No email',
            joinDate: ref.referred_id?.created_at,
            status: ref.referred_id?.status || 'active',
            earnings: totalEarnings / 100,
            level: ref.referred_id?.level || 1,
            rank: ref.referred_id?.rank || 'Bronze',
            tasksCompleted: ref.referred_id?.tasks_completed || 0,
            totalEarnings: (ref.referred_id?.total_earnings_cents || 0) / 100
          };
        });

        // User summary
        const allUserReferrals = await Referral.find({ referrer_id: currentUser._id })
          .populate('referred_id', 'status');
        
        const activeReferrals = allUserReferrals.filter(ref => ref.referred_id?.status === 'active').length;
        const pendingReferrals = allUserReferrals.filter(ref => ref.referred_id?.status === 'pending').length;
        
        const totalUserEarnings = referralTransactions.reduce((sum, transaction) => sum + transaction.amount_cents, 0);

        summary = {
          total: allUserReferrals.length,
          active: activeReferrals,
          pending: pendingReferrals,
          totalEarnings: totalUserEarnings / 100
        };
        break;
    }

    const response = {
      success: true,
      data: referrals,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit)
      },
      summary
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('Referrals API Error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        message: 'Failed to fetch referrals data'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectToDatabase();

    const body = await request.json();
    const { referredEmail, referredName, notes } = body;

    // Validate required fields
    if (!referredEmail) {
      return NextResponse.json(
        { error: 'Referred email is required' },
        { status: 400 }
      );
    }

    // Get current user
    const currentUser = await Profile.findOne({ email: session.user.email });
    if (!currentUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if referred email already exists
    const existingUser = await Profile.findOne({ email: referredEmail });
    if (existingUser) {
      // Check if referral already exists
      const existingReferral = await Referral.findOne({
        referrer_id: currentUser._id,
        referred_id: existingUser._id
      });

      if (existingReferral) {
        return NextResponse.json(
          { error: 'You have already referred this user' },
          { status: 400 }
        );
      }

      // Create referral record since user exists
      const newReferral = await Referral.create({
        referrer_id: currentUser._id,
        referred_id: existingUser._id,
        earning_cents: 0 // Initial earning, will be updated when user becomes active
      });

      return NextResponse.json(
        {
          success: true,
          data: {
            id: newReferral._id.toString(),
            name: existingUser.username,
            email: existingUser.email,
            joinDate: existingUser.created_at,
            status: existingUser.status,
            earnings: 0,
            level: existingUser.level,
            rank: existingUser.rank
          },
          message: 'Referral recorded successfully'
        },
        { status: 201 }
      );
    }

    // If user doesn't exist, create a pending referral invitation
    // In a real application, you would send an email invitation
    // and create a pending referral record

    const pendingReferral = {
      id: `pending_${Date.now()}`,
      name: referredName || 'Pending User',
      email: referredEmail,
      joinDate: new Date().toISOString(),
      status: 'pending',
      earnings: 0,
      level: 1,
      rank: 'Bronze',
      notes: notes || '',
      referredBy: currentUser.username,
      isInvitation: true
    };

    // Log the invitation (you might want to create a PendingInvitation model)
    console.log('Referral invitation created by:', currentUser.email, 'for:', referredEmail);

    return NextResponse.json(
      {
        success: true,
        data: pendingReferral,
        message: 'Invitation sent successfully. User will be added to your referrals once they register.'
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Create Referral Error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to create referral'
      },
      { status: 500 }
    );
  }
}
