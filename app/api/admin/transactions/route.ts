// app/api/admin/transactions/route.ts - COMPLETE FIXED VERSION
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { connectToDatabase, Profile, Transaction } from '@/app/lib/models';

export async function GET(request: NextRequest) {
  try {
    // 1. Check admin authentication
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectToDatabase();

    // 2. Verify admin role
    const user = await Profile.findOne({ email: session.user.email });
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { success: false, message: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    // 3. Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '1000');
    const type = searchParams.get('type') || 'all';
    const status = searchParams.get('status') || 'all';
    const dateFrom = searchParams.get('dateFrom') || '';
    const dateTo = searchParams.get('dateTo') || '';

    // 4. Build query
    let query: any = {};
    
    if (type && type !== 'all') {
      query.type = type;
    }
    
    if (status && status !== 'all') {
      query.status = status;
    }
    
    if (dateFrom || dateTo) {
      query.created_at = {};
      if (dateFrom) {
        query.created_at.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        query.created_at.$lte = new Date(dateTo + 'T23:59:59.999Z');
      }
    }

    // 5. Fetch transactions with user and M-Pesa details
    const transactions = await Transaction.find(query)
      .populate('user_id', 'username email')
      .populate('mpesa_transaction_id', 'mpesa_receipt_number phone_number')
      .sort({ created_at: -1 })
      .limit(limit)
      .lean();

    // 6. Transform transactions - CRITICAL: Include target_type and target_id
    const transformedTransactions = transactions.map((txn: any) => ({
      id: txn._id.toString(),
      user_id: txn.user_id?._id?.toString() || null,
      user_email: txn.user_id?.email || 'System',
      user_username: txn.user_id?.username || 'System',
      amount: txn.amount_cents / 100,
      type: txn.type,
      status: txn.status,
      description: txn.description,
      date: txn.created_at,
      transaction_code: txn.transaction_code,
      mpesa_receipt_number: txn.mpesa_transaction_id?.mpesa_receipt_number,
      phone_number: txn.mpesa_transaction_id?.phone_number,
      metadata: txn.metadata,
      
      // CRITICAL: These fields are required for proper company/user separation
      target_type: txn.target_type || 'user', // Default to 'user' for backward compatibility
      target_id: txn.target_id?.toString() || txn.user_id?._id?.toString() || null,
      
      // Additional fields
      source: txn.source || 'wallet',
      reconciled: txn.reconciled || false
    }));

    // 7. Return response
    return NextResponse.json({
      success: true,
      data: { 
        transactions: transformedTransactions,
        count: transformedTransactions.length
      },
      message: 'Transactions fetched successfully'
    });

  } catch (error) {
    console.error('Admin transactions API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
