// app/api/mpesa/payment-status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase, Transaction, MpesaTransaction, Profile, ActivationPayment } from '@/app/lib/models';
import { queryStkPushStatus } from '@/app/lib/mpesa';

export async function POST(request: NextRequest) {
  try {
    const { checkoutRequestId } = await request.json();

    if (!checkoutRequestId) {
      return NextResponse.json({ 
        success: false, 
        message: 'CheckoutRequestID is required' 
      }, { status: 400 });
    }

    await connectToDatabase();

    console.log('🔍 Checking payment status for:', { checkoutRequestId });

    // 1. First, try to query M-Pesa directly for the latest status
    const mpesaStatus = await queryStkPushStatus(checkoutRequestId);
    
    if (mpesaStatus.success && mpesaStatus.data) {
      console.log('📡 M-Pesa API Status Response:', mpesaStatus.data);

      // If M-Pesa returns a definitive status, use that
      if (mpesaStatus.data.status !== 'pending') {
        return NextResponse.json({
          success: true,
          data: {
            status: mpesaStatus.data.status,
            ResultCode: mpesaStatus.data.resultCode,
            ResultDesc: mpesaStatus.data.resultDesc,
            source: 'mpesa_api'
          }
        });
      }
    }

    // 2. If M-Pesa API returns pending or fails, check our database
    // Find M-Pesa transaction
    const mpesaTransaction = await MpesaTransaction.findOne({
      checkout_request_id: checkoutRequestId
    });

    if (!mpesaTransaction) {
      console.log('❌ M-Pesa transaction not found:', checkoutRequestId);
      return NextResponse.json({ 
        success: false, 
        message: 'Transaction not found' 
      }, { status: 404 });
    }

    console.log('💾 Database M-Pesa Transaction:', {
      transactionId: mpesaTransaction._id,
      status: mpesaTransaction.status,
      resultCode: mpesaTransaction.result_code,
      resultDesc: mpesaTransaction.result_desc,
      source: mpesaTransaction.source,
      isActivationPayment: mpesaTransaction.is_activation_payment
    });

    // 3. Find associated transaction
    const transaction = await Transaction.findOne({
      $or: [
        { mpesa_transaction_id: mpesaTransaction._id },
        { 'metadata.checkoutRequestID': checkoutRequestId }
      ]
    });

    let transactionStatus = mpesaTransaction.status;
    let resultCode = mpesaTransaction.result_code?.toString();
    let resultDesc = mpesaTransaction.result_desc;

    // If we have a database transaction, use its status as primary
    if (transaction) {
      console.log('🔗 Associated Transaction:', {
        transactionId: transaction._id,
        type: transaction.type,
        status: transaction.status,
        isActivationFee: transaction.is_activation_fee
      });

      // Prefer transaction status over M-Pesa transaction status
      transactionStatus = transaction.status;
      
      // If transaction is completed but M-Pesa doesn't know yet, trust our database
      if (transaction.status === 'completed' && mpesaTransaction.status !== 'completed') {
        resultCode = '0';
        resultDesc = 'The service request is processed successfully.';
      } else if (transaction.status === 'failed') {
        resultCode = mpesaTransaction.result_code?.toString() || '1';
        resultDesc = transaction.metadata?.failureReason || mpesaTransaction.result_desc || 'Payment failed';
      }
    }

    // 4. For activation payments, check if user is already activated
    let userActivated = false;
    if (mpesaTransaction.is_activation_payment || transaction?.is_activation_fee) {
      const user = await Profile.findById(mpesaTransaction.user_id);
      userActivated = !!user?.activation_paid_at;
      
      if (userActivated) {
        console.log('✅ User already activated, forcing completed status');
        transactionStatus = 'completed';
        resultCode = '0';
        resultDesc = 'Account activated successfully';
      }
    }

    // 5. Determine final status
    const finalStatus = determineFinalStatus(transactionStatus, resultCode);
    
    console.log('📊 Final Payment Status:', {
      checkoutRequestId,
      finalStatus,
      resultCode,
      resultDesc,
      isActivation: mpesaTransaction.is_activation_payment,
      userActivated
    });

    return NextResponse.json({
      success: true,
      data: {
        status: finalStatus,
        ResultCode: resultCode,
        ResultDesc: resultDesc,
        mpesaReceiptNumber: mpesaTransaction.mpesa_receipt_number,
        isActivationPayment: mpesaTransaction.is_activation_payment,
        userActivated: userActivated,
        source: 'database'
      }
    });

  } catch (error) {
    console.error('❌ Payment status check error:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Failed to check payment status',
      error: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : undefined
    }, { status: 500 });
  }
}

/**
 * Determine final status based on transaction status and result code
 */
function determineFinalStatus(transactionStatus: string, resultCode?: string): string {
  // If we have a result code, use that as primary
  if (resultCode === '0') {
    return 'completed';
  } else if (resultCode && resultCode !== '0') {
    const failureStatus = getStatusFromResultCode(resultCode);
    if (failureStatus !== 'pending') {
      return failureStatus;
    }
  }

  // Fall back to transaction status
  switch (transactionStatus) {
    case 'completed':
      return 'completed';
    case 'failed':
    case 'cancelled':
      return transactionStatus;
    case 'timeout':
      return 'timeout';
    default:
      return 'processing';
  }
}

/**
 * Map M-Pesa result codes to status
 */
function getStatusFromResultCode(resultCode: string): string {
  const statusMap: { [key: string]: string } = {
    '0': 'completed',
    '1032': 'cancelled',
    '1037': 'timeout',
    '1': 'failed',
    '2001': 'failed'
  };

  return statusMap[resultCode] || 'pending';
}

/**
 * GET endpoint for debugging (development only)
 */
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ 
      success: false, 
      message: 'Method not allowed in production' 
    }, { status: 405 });
  }

  try {
    await connectToDatabase();
    
    const { searchParams } = new URL(request.url);
    const checkoutRequestId = searchParams.get('checkoutRequestId');
    const userId = searchParams.get('userId');
    
    if (checkoutRequestId) {
      // Get detailed status for a specific transaction
      const mpesaTransaction = await MpesaTransaction.findOne({
        checkout_request_id: checkoutRequestId
      });

      if (!mpesaTransaction) {
        return NextResponse.json({ 
          success: false, 
          message: 'M-Pesa transaction not found' 
        }, { status: 404 });
      }

      const transaction = await Transaction.findOne({
        $or: [
          { mpesa_transaction_id: mpesaTransaction._id },
          { 'metadata.checkoutRequestID': checkoutRequestId }
        ]
      });

      const user = await Profile.findById(mpesaTransaction.user_id);
      const activationPayment = await ActivationPayment.findOne({
        checkout_request_id: checkoutRequestId
      });

      return NextResponse.json({
        success: true,
        data: {
          mpesaTransaction: {
            _id: mpesaTransaction._id,
            status: mpesaTransaction.status,
            result_code: mpesaTransaction.result_code,
            result_desc: mpesaTransaction.result_desc,
            source: mpesaTransaction.source,
            is_activation_payment: mpesaTransaction.is_activation_payment,
            created_at: mpesaTransaction.created_at
          },
          transaction: transaction ? {
            _id: transaction._id,
            type: transaction.type,
            status: transaction.status,
            is_activation_fee: transaction.is_activation_fee,
            source: transaction.source,
            metadata: transaction.metadata
          } : null,
          user: user ? {
            _id: user._id,
            activation_paid_at: user.activation_paid_at,
            status: user.status,
            is_active: user.is_active
          } : null,
          activationPayment: activationPayment ? {
            _id: activationPayment._id,
            status: activationPayment.status,
            paid_at: activationPayment.paid_at
          } : null
        }
      });
    } else if (userId) {
      // Get user's recent payment attempts
      const mpesaTransactions = await MpesaTransaction.find({
        user_id: userId
      })
      .sort({ created_at: -1 })
      .limit(10)
      .lean();

      const transactions = await Transaction.find({
        user_id: userId,
        type: { $in: ['DEPOSIT', 'ACTIVATION_FEE'] }
      })
      .sort({ created_at: -1 })
      .limit(10)
      .lean();

      return NextResponse.json({
        success: true,
        data: {
          mpesaTransactions,
          transactions
        }
      });
    } else {
      return NextResponse.json({ 
        success: false, 
        message: 'checkoutRequestId or userId parameter required' 
      }, { status: 400 });
    }
  } catch (error) {
    console.error('Debug payment status error:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Debug failed' 
    }, { status: 500 });
  }
}
