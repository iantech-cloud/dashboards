// app/api/transactions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Transaction, MpesaTransaction, Profile, connectToDatabase } from '@/app/lib/models';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';

/**
 * GET handler for fetching transactions
 * Enhanced with M-Pesa integration support and better filtering
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate user
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Establish MongoDB Connection
    await connectToDatabase();

    // 3. Get current user
    const currentUser = await Profile.findOne({ email: session.user.email });
    if (!currentUser) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    // 4. Get query parameters from URL
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const includeMpesaDetails = searchParams.get('includeMpesaDetails') === 'true';

    // 5. Build filter object - Only show current user's transactions
    const filter: any = { user_id: currentUser._id.toString() };

    if (type) {
      filter.type = type;
    }

    if (status) {
      filter.status = status;
    }

    // Date range filtering
    if (startDate || endDate) {
      filter.created_at = {};
      if (startDate) {
        filter.created_at.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.created_at.$lte = new Date(endDate);
      }
    }

    // 6. Calculate pagination
    const skip = (page - 1) * limit;

    // 7. Fetch transactions from database with M-Pesa population if requested
    let transactionsQuery = Transaction.find(filter)
      .sort({ created_at: -1 }) // Most recent first
      .skip(skip)
      .limit(limit);

    // Populate M-Pesa transaction details if requested
    if (includeMpesaDetails) {
      transactionsQuery = transactionsQuery.populate('mpesa_transaction_id');
    }

    const transactions = await transactionsQuery.lean();

    // 8. Get total count for pagination info
    const totalCount = await Transaction.countDocuments(filter);
    const totalPages = Math.ceil(totalCount / limit);

    // 9. Format the response data with enhanced M-Pesa support
    const formattedTransactions = await Promise.all(
      transactions.map(async (transaction) => {
        let mpesaDetails = null;
        
        // Fetch M-Pesa transaction details if available
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

        // Extract M-Pesa receipt number from metadata or transaction_code
        const mpesaReceiptNumber = transaction.metadata?.mpesaReceiptNumber || 
                                    transaction.metadata?.mpesaReceiptNumber || 
                                    transaction.transaction_code;

        return {
          id: transaction._id?.toString(),
          amount: transaction.amount_cents / 100, // Convert cents to currency units
          type: transaction.type,
          description: transaction.description,
          status: transaction.status,
          date: transaction.created_at,
          transaction_code: transaction.transaction_code, // Fixed: snake_case to match component
          mpesa_receipt_number: mpesaReceiptNumber, // Fixed: Added M-Pesa receipt number
          user_id: transaction.user_id,
          metadata: transaction.metadata || {},
          mpesaDetails,
          source: transaction.source || 'wallet',
          reconciled: transaction.reconciled || false
        };
      })
    );

    // 10. Success Response
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

/**
 * POST handler for creating new transactions
 * Enhanced with M-Pesa integration and better validation
 */
export async function POST(request: NextRequest) {
  let session;
  
  try {
    // 1. Authenticate user
    session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Establish MongoDB Connection
    await connectToDatabase();

    // 3. Get current user
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

    // 4. Input Validation
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
      'REFERRAL', 'SURVEY', 'ACTIVATION_FEE', 'COMPANY_REVENUE', 'ACCOUNT_ACTIVATION'
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

    const validSources = ['wallet', 'dashboard', 'api'];
    if (!validSources.includes(source)) {
      return NextResponse.json(
        { success: false, message: `Invalid source. Must be one of: ${validSources.join(', ')}` },
        { status: 400 }
      );
    }

    // 5. Validate M-Pesa transaction reference if provided
    if (mpesaTransactionId) {
      const mpesaTransaction = await MpesaTransaction.findById(mpesaTransactionId);
      if (!mpesaTransaction) {
        return NextResponse.json(
          { success: false, message: 'Referenced M-Pesa transaction not found' },
          { status: 400 }
        );
      }
      
      // Ensure M-Pesa transaction belongs to current user
      if (mpesaTransaction.user_id.toString() !== currentUser._id.toString()) {
        return NextResponse.json(
          { success: false, message: 'M-Pesa transaction does not belong to current user' },
          { status: 403 }
        );
      }
    }

    // 6. Generate unique transaction code
    const transactionCode = `TX${Date.now()}${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // 7. Convert amount to cents for storage (to avoid floating point issues)
    const amountCents = Math.round(amount * 100);

    // 8. Create new transaction
    const newTransaction = await Transaction.create({
      user_id: currentUser._id.toString(),
      amount_cents: amountCents,
      type,
      description,
      status,
      transaction_code: transactionCode,
      metadata: {
        ...metadata,
        createdVia: 'api',
        userEmail: currentUser.email,
        userPhone: currentUser.phone_number
      },
      mpesa_transaction_id: mpesaTransactionId,
      source,
      created_at: new Date()
    });

    // 9. Update user balance if transaction is completed
    if (status === 'completed') {
      await updateUserBalance(currentUser._id.toString(), type, amountCents);
    }

    // 10. Format response with enhanced details (snake_case for consistency)
    const formattedTransaction = {
      id: newTransaction._id.toString(),
      amount: newTransaction.amount_cents / 100,
      type: newTransaction.type,
      description: newTransaction.description,
      status: newTransaction.status,
      date: newTransaction.created_at,
      transaction_code: newTransaction.transaction_code, // Fixed: snake_case
      mpesa_receipt_number: newTransaction.metadata?.mpesaReceiptNumber || newTransaction.transaction_code, // Fixed: Added
      user_id: newTransaction.user_id,
      metadata: newTransaction.metadata,
      source: newTransaction.source,
      mpesaTransactionId: newTransaction.mpesa_transaction_id
    };

    // 11. Success Response
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
        message: 'Internal Server Error while creating transaction.' 
      },
      { status: 500 }
    );
  }
}

/**
 * Helper function to update user balance based on transaction type
 */
async function updateUserBalance(userId: string, type: string, amountCents: number) {
  const updateQuery: any = {};
  
  switch (type) {
    case 'DEPOSIT':
    case 'BONUS':
    case 'TASK_PAYMENT':
    case 'SPIN_WIN':
    case 'REFERRAL':
    case 'SURVEY':
      // Add to balance
      updateQuery.$inc = { 
        balance_cents: amountCents,
        total_earnings_cents: amountCents
      };
      break;
      
    case 'WITHDRAWAL':
    case 'ACTIVATION_FEE':
      // Subtract from balance
      updateQuery.$inc = { 
        balance_cents: -amountCents,
        total_withdrawals_cents: amountCents
      };
      break;
      
    default:
      console.log(`No balance update needed for transaction type: ${type}`);
      return;
  }

  await Profile.findByIdAndUpdate(userId, updateQuery);
}

/**
 * PATCH handler for updating transaction status
 * Useful for updating pending transactions (like M-Pesa deposits)
 */
export async function PATCH(request: NextRequest) {
  try {
    // 1. Authenticate user
    const session = await getServerSession(authOptions);
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

    // 2. Find transaction and verify ownership
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

    // 3. Update transaction
    const updateData: any = { 
      status,
      updated_at: new Date()
    };

    if (metadata) {
      updateData.metadata = { ...transaction.metadata, ...metadata };
    }

    const updatedTransaction = await Transaction.findByIdAndUpdate(
      transactionId,
      updateData,
      { new: true }
    ).lean();

    // 4. Update user balance if status changed to completed
    if (status === 'completed' && transaction.status !== 'completed') {
      await updateUserBalance(
        currentUser._id.toString(), 
        transaction.type, 
        transaction.amount_cents
      );
    }

    // 5. Format response (snake_case for consistency)
    const formattedTransaction = {
      id: updatedTransaction._id.toString(),
      amount: updatedTransaction.amount_cents / 100,
      type: updatedTransaction.type,
      description: updatedTransaction.description,
      status: updatedTransaction.status,
      date: updatedTransaction.created_at,
      transaction_code: updatedTransaction.transaction_code, // Fixed: snake_case
      mpesa_receipt_number: updatedTransaction.metadata?.mpesaReceiptNumber || updatedTransaction.transaction_code, // Fixed: Added
      user_id: updatedTransaction.user_id,
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
        message: 'Internal Server Error while updating transaction.' 
      },
      { status: 500 }
    );
  }
}
