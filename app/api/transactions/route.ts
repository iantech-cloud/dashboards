import { NextRequest, NextResponse } from 'next/server';
import { Transaction, MpesaTransaction, Profile, connectToDatabase } from '@/app/lib/models';
import { auth } from '@/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectToDatabase();

    const currentUser = await Profile.findOne({ email: session.user.email });
    if (!currentUser) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const includeMpesaDetails = searchParams.get('includeMpesaDetails') === 'true';

    // Get user's transactions with backward compatibility
    const filter: any = { 
      user_id: currentUser._id.toString(),
      // CRITICAL FIX: Support both old (no target_type) and new (with target_type) transactions
      $or: [
        { target_type: 'user' },
        { target_type: { $exists: false } } // Include old transactions without target_type
      ]
    };

    if (type) {
      filter.type = type;
    }

    if (status) {
      filter.status = status;
    }

    if (startDate || endDate) {
      filter.created_at = {};
      if (startDate) {
        filter.created_at.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.created_at.$lte = new Date(endDate);
      }
    }

    const skip = (page - 1) * limit;

    let transactionsQuery = Transaction.find(filter)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit);

    if (includeMpesaDetails) {
      transactionsQuery = transactionsQuery.populate('mpesa_transaction_id');
    }

    const transactions = await transactionsQuery.lean();
    const totalCount = await Transaction.countDocuments(filter);
    const totalPages = Math.ceil(totalCount / limit);

    const formattedTransactions = await Promise.all(
      transactions.map(async (transaction) => {
        let mpesaDetails = null;
        
        if (transaction.mpesa_transaction_id && includeMpesaDetails) {
          const mpesaTransaction = await MpesaTransaction.findById(transaction.mpesa_transaction_id).lean();
          if (mpesaTransaction) {
            mpesaDetails = {
              checkoutRequestId: mpesaTransaction.checkout_request_id,
              mpesaReceiptNumber: mpesaTransaction.mpesa_receipt_number,
              phoneNumber: mpesaTransaction.phone_number,
              status: mpesaTransaction.status,
              resultCode: mpesaTransaction.result_code,
              resultDesc: mpesaTransaction.result_desc,
              initiatedAt: mpesaTransaction.initiated_at,
              completedAt: mpesaTransaction.completed_at
            };
          }
        }

        const mpesaReceiptNumber = transaction.metadata?.mpesaReceiptNumber || 
                                     transaction.transaction_code;

        return {
          id: transaction._id?.toString(),
          amount: transaction.amount_cents / 100,
          type: transaction.type,
          description: transaction.description,
          status: transaction.status,
          date: transaction.created_at,
          transaction_code: transaction.transaction_code,
          mpesa_receipt_number: mpesaReceiptNumber,
          user_id: transaction.user_id,
          // FIXED: Provide default for old transactions
          target_type: transaction.target_type || 'user',
          target_id: transaction.target_id?.toString() || transaction.user_id?.toString(),
          metadata: transaction.metadata || {},
          mpesaDetails,
          source: transaction.source || 'wallet',
          reconciled: transaction.reconciled || false
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: {
        transactions: formattedTransactions,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount,
          hasNext: page < totalPages,
          hasPrev: page > 1,
          limit
        }
      },
      message: 'Transactions fetched successfully'
    });

  } catch (error) {
    console.error('Transactions API Error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Internal Server Error while fetching transactions.' 
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectToDatabase();

    const currentUser = await Profile.findOne({ email: session.user.email });
    if (!currentUser) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { 
      amount, 
      type, 
      description, 
      status = 'pending',
      metadata = {},
      mpesaTransactionId = null,
      source = 'api'
    } = body;

    // Validation
    if (!amount || !type || !description) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields: amount, type, description' },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        { success: false, message: 'Amount must be greater than 0' },
        { status: 400 }
      );
    }

    const validTypes = [
      'DEPOSIT', 'WITHDRAWAL', 'BONUS', 'TASK_PAYMENT', 'SPIN_WIN', 
      'REFERRAL', 'SURVEY', 'ACTIVATION_FEE', 'SPIN_COST', 'SPIN_PRIZE'
    ];
    
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { success: false, message: `Invalid transaction type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    const validStatuses = ['pending', 'completed', 'failed', 'cancelled', 'timeout'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate M-Pesa transaction if provided
    if (mpesaTransactionId) {
      const mpesaTransaction = await MpesaTransaction.findById(mpesaTransactionId);
      if (!mpesaTransaction) {
        return NextResponse.json(
          { success: false, message: 'Referenced M-Pesa transaction not found' },
          { status: 400 }
        );
      }
      
      if (mpesaTransaction.user_id.toString() !== currentUser._id.toString()) {
        return NextResponse.json(
          { success: false, message: 'M-Pesa transaction does not belong to current user' },
          { status: 403 }
        );
      }
    }

    const transactionCode = `TX${Date.now()}${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    const amountCents = Math.round(amount * 100);

    // Get current balance for tracking
    const balanceBeforeCents = currentUser.balance_cents || 0;
    let balanceAfterCents = balanceBeforeCents;

    // Calculate balance after based on transaction type
    if (status === 'completed') {
      switch (type) {
        case 'DEPOSIT':
        case 'BONUS':
        case 'TASK_PAYMENT':
        case 'SPIN_WIN':
        case 'REFERRAL':
        case 'SURVEY':
        case 'SPIN_PRIZE':
          balanceAfterCents = balanceBeforeCents + amountCents;
          break;
        case 'WITHDRAWAL':
        case 'ACTIVATION_FEE':
        case 'SPIN_COST':
          balanceAfterCents = balanceBeforeCents - amountCents;
          break;
      }
    }

    // CRITICAL FIX: Add target_type and target_id
    const newTransaction = await Transaction.create({
      target_type: 'user', // FIXED: Always 'user' for API-created transactions
      target_id: currentUser._id.toString(), // FIXED: Set target_id
      user_id: currentUser._id.toString(),
      amount_cents: amountCents,
      type,
      description,
      status,
      transaction_code: transactionCode,
      balance_before_cents: balanceBeforeCents,
      balance_after_cents: balanceAfterCents,
      metadata: {
        ...metadata,
        createdVia: 'api',
        userEmail: currentUser.email,
        userPhone: currentUser.phone_number,
        apiCreatedAt: new Date().toISOString()
      },
      mpesa_transaction_id: mpesaTransactionId,
      source,
      created_at: new Date()
    });

    console.log('✅ Transaction created via API:', {
      id: newTransaction._id.toString(),
      type,
      amount: amount,
      status,
      target_type: 'user',
      target_id: currentUser._id.toString()
    });

    // Update user balance if transaction is completed
    if (status === 'completed') {
      await updateUserBalance(currentUser._id.toString(), type, amountCents);
    }

    const formattedTransaction = {
      id: newTransaction._id.toString(),
      amount: newTransaction.amount_cents / 100,
      type: newTransaction.type,
      description: newTransaction.description,
      status: newTransaction.status,
      date: newTransaction.created_at,
      transaction_code: newTransaction.transaction_code,
      mpesa_receipt_number: newTransaction.metadata?.mpesaReceiptNumber || newTransaction.transaction_code,
      user_id: newTransaction.user_id,
      target_type: newTransaction.target_type,
      target_id: newTransaction.target_id,
      balance_before: newTransaction.balance_before_cents / 100,
      balance_after: newTransaction.balance_after_cents / 100,
      metadata: newTransaction.metadata,
      source: newTransaction.source,
      mpesaTransactionId: newTransaction.mpesa_transaction_id
    };

    return NextResponse.json(
      {
        success: true,
        data: formattedTransaction,
        message: 'Transaction created successfully'
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Create Transaction API Error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Internal Server Error while creating transaction.',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * FIXED: Update user balance helper with proper error handling
 */
async function updateUserBalance(userId: string, type: string, amountCents: number) {
  try {
    const updateQuery: any = {};
    
    switch (type) {
      case 'DEPOSIT':
      case 'BONUS':
      case 'TASK_PAYMENT':
      case 'SPIN_WIN':
      case 'REFERRAL':
      case 'SURVEY':
      case 'SPIN_PRIZE':
        updateQuery.$inc = { 
          balance_cents: amountCents,
          total_earnings_cents: amountCents
        };
        break;
        
      case 'WITHDRAWAL':
      case 'ACTIVATION_FEE':
      case 'SPIN_COST':
        updateQuery.$inc = { 
          balance_cents: -amountCents,
          total_withdrawals_cents: amountCents
        };
        break;
        
      default:
        console.log(`ℹ️ No balance update needed for transaction type: ${type}`);
        return;
    }

    const updatedUser = await Profile.findByIdAndUpdate(userId, updateQuery, { new: true });
    
    if (updatedUser) {
      console.log('✅ User balance updated:', {
        userId,
        type,
        amountCents,
        newBalance: updatedUser.balance_cents / 100
      });
    } else {
      console.error('❌ Failed to update user balance - user not found:', userId);
    }
  } catch (error) {
    console.error('❌ Error updating user balance:', error);
    throw error;
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectToDatabase();

    const body = await request.json();
    const { transactionId, status, metadata } = body;

    if (!transactionId || !status) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields: transactionId, status' },
        { status: 400 }
      );
    }

    const validStatuses = ['pending', 'completed', 'failed', 'cancelled', 'timeout'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    const transaction = await Transaction.findById(transactionId);
    if (!transaction) {
      return NextResponse.json(
        { success: false, message: 'Transaction not found' },
        { status: 404 }
      );
    }

    const currentUser = await Profile.findOne({ email: session.user.email });
    if (!currentUser || transaction.user_id.toString() !== currentUser._id.toString()) {
      return NextResponse.json(
        { success: false, message: 'Access denied' },
        { status: 403 }
      );
    }

    const previousStatus = transaction.status;

    const updateData: any = { 
      status,
      updated_at: new Date()
    };

    if (metadata) {
      updateData.metadata = { ...transaction.metadata, ...metadata };
    }

    // FIXED: Ensure target fields are preserved if missing
    if (!transaction.target_type) {
      updateData.target_type = 'user';
    }
    if (!transaction.target_id) {
      updateData.target_id = transaction.user_id.toString();
    }

    const updatedTransaction = await Transaction.findByIdAndUpdate(
      transactionId,
      updateData,
      { new: true }
    ).lean();

    console.log('✅ Transaction updated:', {
      id: transactionId,
      previousStatus,
      newStatus: status,
      type: updatedTransaction.type
    });

    // Update user balance if status changed to completed
    if (status === 'completed' && previousStatus !== 'completed') {
      await updateUserBalance(
        currentUser._id.toString(), 
        transaction.type, 
        transaction.amount_cents
      );
    }

    // Revert balance if status changed from completed to failed/cancelled
    if (previousStatus === 'completed' && ['failed', 'cancelled'].includes(status)) {
      // Reverse the transaction
      const reverseAmountCents = -transaction.amount_cents;
      await updateUserBalance(
        currentUser._id.toString(), 
        transaction.type, 
        reverseAmountCents
      );
    }

    const formattedTransaction = {
      id: updatedTransaction._id.toString(),
      amount: updatedTransaction.amount_cents / 100,
      type: updatedTransaction.type,
      description: updatedTransaction.description,
      status: updatedTransaction.status,
      date: updatedTransaction.created_at,
      transaction_code: updatedTransaction.transaction_code,
      mpesa_receipt_number: updatedTransaction.metadata?.mpesaReceiptNumber || updatedTransaction.transaction_code,
      user_id: updatedTransaction.user_id,
      target_type: updatedTransaction.target_type || 'user',
      target_id: updatedTransaction.target_id?.toString() || updatedTransaction.user_id?.toString(),
      balance_before: updatedTransaction.balance_before_cents / 100,
      balance_after: updatedTransaction.balance_after_cents / 100,
      metadata: updatedTransaction.metadata
    };

    return NextResponse.json({
      success: true,
      data: formattedTransaction,
      message: 'Transaction updated successfully'
    });

  } catch (error) {
    console.error('Update Transaction API Error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Internal Server Error while updating transaction.',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

