// app/api/mpesa/callback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase, Transaction, Profile, MpesaTransaction, ActivationPayment, MpesaCallbackLog } from '@/app/lib/models';
import mongoose from 'mongoose';
import { completeActivationAfterPayment } from '@/app/actions/activation';

/**
 * Map M-Pesa result codes to VALID database enum values
 * CRITICAL: Only use codes that exist in MpesaTransaction schema
 */
function mapMpesaResultCode(resultCode: number): number {
  const validSchemaCodes = [
    0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15, 17, 20, 26,
    1032, 1037, 2001
  ];
  
  if (validSchemaCodes.includes(resultCode)) {
    return resultCode;
  }
  
  // Map unknown codes to safe defaults that exist in schema
  if (resultCode === 0) return 0;
  if (resultCode > 0 && resultCode < 1000) return 11; // Internal error
  if (resultCode >= 1000 && resultCode <= 1999) return 1032; // User cancellation
  if (resultCode >= 2000 && resultCode <= 2999) return 2001; // Configuration error
  
  return 11; // Default to internal error
}

/**
 * Map M-Pesa result codes to VALID database status enum values
 * CRITICAL: Only use status values that exist in MpesaTransaction schema
 */
function mapMpesaStatus(resultCode: number): 'initiated' | 'pending' | 'completed' | 'failed' | 'cancelled' | 'timeout' {
  // User cancelled
  if (resultCode === 1032) return 'cancelled';
  
  // Request timeout
  if (resultCode === 1037) return 'timeout';
  
  // Success
  if (resultCode === 0) return 'completed';
  
  // Everything else is failed
  return 'failed';
}

/**
 * Categorize failure types for better reporting
 */
function getFailureType(resultCode: number): string {
  const failureTypes: { [key: number]: string } = {
    1: 'INSUFFICIENT_FUNDS',
    2: 'LESS_THAN_MINIMUM',
    3: 'MORE_THAN_MAXIMUM',
    4: 'EXCEEDS_DAILY_LIMIT',
    5: 'EXCEEDS_MINIMUM_BALANCE',
    6: 'UNRESOLVED_PRIMARY_PARTY',
    7: 'SUSPENDED',
    8: 'INACTIVE',
    10: 'INVALID_SHORTCODE',
    11: 'INVALID_SECURITY_CREDENTIALS',
    12: 'INVALID_INITIATOR',
    13: 'INVALID_SENDER',
    14: 'INVALID_RECEIVER',
    15: 'INVALID_AMOUNT',
    17: 'INVALID_TRANSACTION',
    20: 'INVALID_ARGUMENTS',
    26: 'INVALID_REFERENCE',
    1032: 'USER_CANCELLED',
    1037: 'TIMEOUT_NO_RESPONSE',
    2001: 'INVALID_PHONE_NUMBER'
  };

  return failureTypes[resultCode] || 'UNKNOWN_FAILURE';
}

/**
 * Determine if transaction is credit (money in) or debit (money out)
 */
function getTransactionFlow(type: string): 'credit' | 'debit' {
  const creditTypes = ['DEPOSIT', 'BONUS', 'TASK_PAYMENT', 'SPIN_WIN', 'REFERRAL', 'SURVEY'];
  return creditTypes.includes(type) ? 'credit' : 'debit';
}

export async function POST(request: NextRequest) {
  let callbackData: any = null;
  let session: mongoose.ClientSession | null = null;
  
  try {
    const body = await request.json();
    console.log('📞 M-Pesa Callback received:', JSON.stringify(body, null, 2));

    // Connect to database FIRST
    await connectToDatabase();

    callbackData = body.Body?.stkCallback;
    
    if (!callbackData) {
      console.error('❌ Invalid callback structure:', body);
      return NextResponse.json({ ResultCode: 1, ResultDesc: 'Invalid callback' });
    }

    const checkoutRequestID = callbackData.CheckoutRequestID;
    const resultCode = callbackData.ResultCode;
    const resultDesc = callbackData.ResultDesc;

    console.log('📋 Callback Details:', {
      checkoutRequestID,
      resultCode,
      resultDesc,
      timestamp: new Date().toISOString()
    });

    // Log the callback for auditing
    const callbackLog = new MpesaCallbackLog({
      checkout_request_id: checkoutRequestID,
      merchant_request_id: callbackData.MerchantRequestID,
      result_code: resultCode,
      result_desc: resultDesc,
      payload: body,
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('remote-addr'),
      user_agent: request.headers.get('user-agent'),
      is_activation_callback: true,
      processed: false
    });
    await callbackLog.save();

    // Start a database transaction for data consistency
    session = await mongoose.startSession();
    session.startTransaction();

    // Find the M-Pesa transaction WITH session
    const mpesaTransaction = await MpesaTransaction.findOne({
      checkout_request_id: checkoutRequestID
    }).session(session);

    if (!mpesaTransaction) {
      console.error('❌ M-Pesa transaction not found for CheckoutRequestID:', checkoutRequestID);
      await session.abortTransaction();
      
      // Update callback log
      await MpesaCallbackLog.findByIdAndUpdate(callbackLog._id, {
        processed: true,
        processing_error: 'Transaction not found'
      });
      
      return NextResponse.json({ ResultCode: 1, ResultDesc: 'Transaction not found' });
    }

    console.log('🔍 Found M-Pesa Transaction:', {
      transactionId: mpesaTransaction._id,
      userId: mpesaTransaction.user_id,
      amount: mpesaTransaction.amount_cents / 100,
      previousStatus: mpesaTransaction.status,
      source: mpesaTransaction.source,
      isActivationPayment: mpesaTransaction.is_activation_payment
    });

    // Map to VALID enum values
    const safeResultCode = mapMpesaResultCode(resultCode);
    const safeStatus = mapMpesaStatus(resultCode);
    const failureType = getFailureType(resultCode);

    console.log('📊 Status Mapping:', {
      originalCode: resultCode,
      safeResultCode,
      safeStatus,
      failureType,
      resultDesc
    });

    // Update M-Pesa transaction with callback data
    mpesaTransaction.result_code = safeResultCode;
    mpesaTransaction.result_desc = resultDesc;
    mpesaTransaction.callback_payload = body;
    mpesaTransaction.callback_received_at = new Date();
    mpesaTransaction.status = safeStatus;
    
    if (safeStatus === 'completed') {
      // Payment successful
      const callbackMetadata = callbackData.CallbackMetadata;
      const items = callbackMetadata?.Item || [];

      console.log('✅ Payment Successful - Extracting metadata...');

      // Extract payment details
      const amount = items.find((item: any) => item.Name === 'Amount')?.Value;
      let mpesaReceiptNumber = items.find((item: any) => item.Name === 'MpesaReceiptNumber')?.Value;
      const phoneNumber = items.find((item: any) => item.Name === 'PhoneNumber')?.Value;
      const transactionDate = items.find((item: any) => item.Name === 'TransactionDate')?.Value;

      // Handle duplicate receipt numbers
      if (mpesaReceiptNumber) {
        const existingTransaction = await MpesaTransaction.findOne({
          mpesa_receipt_number: mpesaReceiptNumber,
          _id: { $ne: mpesaTransaction._id }
        }).session(session);

        if (existingTransaction) {
          console.warn('⚠️ Duplicate M-Pesa receipt number detected:', {
            receiptNumber: mpesaReceiptNumber,
            existingTransactionId: existingTransaction._id,
            currentTransactionId: mpesaTransaction._id
          });
          
          mpesaReceiptNumber = `${mpesaReceiptNumber}_DUP_${Date.now()}`;
          console.log('🔄 Using duplicate-safe receipt number:', mpesaReceiptNumber);
        }
      }

      // Update M-Pesa transaction with success details
      mpesaTransaction.mpesa_receipt_number = mpesaReceiptNumber;
      mpesaTransaction.phone_number = phoneNumber || mpesaTransaction.phone_number;
      mpesaTransaction.transaction_date = transactionDate;
      mpesaTransaction.completed_at = new Date();
      
      console.log('💰 Payment Details:', {
        mpesaReceiptNumber: mpesaTransaction.mpesa_receipt_number,
        amount,
        phoneNumber,
        transactionDate
      });
      
    } else if (['failed', 'cancelled', 'timeout'].includes(safeStatus)) {
      // Payment failed/cancelled/timeout
      mpesaTransaction.failed_at = new Date();
      mpesaTransaction.failure_reason = failureType;
      
      console.log('❌ Payment Not Successful:', {
        status: safeStatus,
        resultCode: safeResultCode,
        resultDesc,
        failureType
      });
    }

    await mpesaTransaction.save({ session });

    // Find associated activation payment WITH session
    const activationPayment = await ActivationPayment.findOne({
      $or: [
        { checkout_request_id: checkoutRequestID },
        { mpesa_transaction_id: mpesaTransaction._id },
        { provider_reference: mpesaTransaction.merchant_request_id }
      ]
    }).session(session);

    if (activationPayment) {
      console.log('🔗 Found Activation Payment:', {
        activationPaymentId: activationPayment._id,
        userId: activationPayment.user_id,
        amount: activationPayment.amount_cents / 100,
        previousStatus: activationPayment.status
      });

      // Update activation payment status
      if (safeStatus === 'completed') {
        activationPayment.status = 'completed';
        activationPayment.paid_at = new Date();
        activationPayment.mpesa_receipt_number = mpesaTransaction.mpesa_receipt_number;
        activationPayment.mpesa_transaction_id = mpesaTransaction._id;
        
        console.log('✅ Activation payment marked as completed');
      } else {
        activationPayment.status = 'failed';
        activationPayment.error_message = `${resultDesc} (${failureType})`;
        
        console.log('❌ Activation payment marked as failed');
      }

      await activationPayment.save({ session });

      // If payment successful, complete activation
      if (safeStatus === 'completed') {
        console.log('🎯 Committing transaction before activation...');
        
        // Commit transaction first
        await session.commitTransaction();
        session = null;
        
        // Use server action to complete activation
        const activationResult = await completeActivationAfterPayment(activationPayment._id.toString());
        
        if (activationResult.success) {
          console.log('✅ Account activated successfully:', {
            activationPaymentId: activationPayment._id,
            userId: activationPayment.user_id
          });
        } else {
          console.error('❌ Activation failed:', activationResult.message);
        }
      }
    }

    // Find and update associated transaction record
    const transaction = await Transaction.findOne({
      $or: [
        { mpesa_transaction_id: mpesaTransaction._id },
        { activation_payment_id: activationPayment?._id },
        { 'metadata.checkoutRequestID': checkoutRequestID }
      ]
    }).session(session || undefined);

    if (transaction) {
      console.log('🔗 Found Associated Transaction:', {
        transactionId: transaction._id,
        type: transaction.type,
        amount: transaction.amount_cents / 100,
        previousStatus: transaction.status
      });

      const transactionFlow = getTransactionFlow(transaction.type);

      if (safeStatus === 'completed') {
        // Payment successful - update transaction
        transaction.status = 'completed';
        transaction.transaction_code = mpesaTransaction.mpesa_receipt_number;
        transaction.metadata = {
          ...transaction.metadata,
          mpesaReceiptNumber: mpesaTransaction.mpesa_receipt_number,
          phoneNumber: mpesaTransaction.phone_number,
          transactionDate: mpesaTransaction.transaction_date,
          transactionFlow,
          callbackProcessedAt: new Date().toISOString()
        };

        console.log(`✅ Transaction marked as completed (${transactionFlow})`);

        // Update user balance for completed transactions
        if (!transaction.balance_updated) {
          const user = await Profile.findById(transaction.user_id).session(session || undefined);
          
          if (user) {
            if (transactionFlow === 'credit') {
              // Money coming in
              user.balance_cents += transaction.amount_cents;
              user.total_earnings_cents = (user.total_earnings_cents || 0) + transaction.amount_cents;
              console.log(`💰 Added ${transaction.amount_cents / 100} KES to user balance (CREDIT)`);
            } else {
              // Money going out (this shouldn't happen in callback, but handle it)
              user.balance_cents -= transaction.amount_cents;
              user.total_withdrawals_cents = (user.total_withdrawals_cents || 0) + transaction.amount_cents;
              console.log(`💸 Deducted ${transaction.amount_cents / 100} KES from user balance (DEBIT)`);
            }
            
            await user.save({ session: session || undefined });
            transaction.balance_updated = true;
          }
        }
      } else if (['failed', 'cancelled', 'timeout'].includes(safeStatus)) {
        // Payment failed/cancelled/timeout
        transaction.status = 'failed';
        transaction.metadata = {
          ...transaction.metadata,
          failureReason: resultDesc,
          resultCode: safeResultCode,
          failureType,
          transactionFlow,
          callbackProcessedAt: new Date().toISOString()
        };

        console.log(`❌ Transaction marked as failed (${failureType})`);
      }

      await transaction.save({ session: session || undefined });
    }

    // Commit the transaction if not already committed
    if (session) {
      await session.commitTransaction();
      console.log('💾 Database transaction committed successfully');
    }

    // Update callback log as processed
    await MpesaCallbackLog.findByIdAndUpdate(callbackLog._id, {
      processed: true,
      processed_at: new Date(),
      processing_duration_ms: Date.now() - new Date(callbackLog.created_at).getTime(),
      final_status: safeStatus,
      failure_type: safeStatus !== 'completed' ? failureType : undefined
    });

    console.log('✅ Callback processed successfully');

    // Return success response to M-Pesa
    return NextResponse.json({ ResultCode: 0, ResultDesc: 'Success' });

  } catch (error) {
    console.error('💥 M-Pesa callback processing error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      checkoutRequestID: callbackData?.CheckoutRequestID,
      timestamp: new Date().toISOString()
    });

    // Update callback log with error
    if (callbackData?.CheckoutRequestID) {
      await MpesaCallbackLog.findOneAndUpdate(
        { checkout_request_id: callbackData.CheckoutRequestID },
        {
          processed: true,
          processing_error: error instanceof Error ? error.message : 'Unknown error',
          processed_at: new Date()
        }
      );
    }

    // Abort transaction if it exists
    if (session) {
      try {
        await session.abortTransaction();
        console.log('🔄 Database transaction aborted due to error');
      } catch (abortError) {
        console.error('❌ Failed to abort transaction:', abortError);
      }
    }

    // Still return success to M-Pesa to prevent retries
    return NextResponse.json({ 
      ResultCode: 0, 
      ResultDesc: 'Callback received' 
    });
  } finally {
    // Always end the session
    if (session) {
      await session.endSession();
    }
  }
}

// Optional: GET method for debugging (remove in production)
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
    const limit = parseInt(searchParams.get('limit') || '10');
    
    if (checkoutRequestId) {
      const transaction = await MpesaTransaction.findOne({
        checkout_request_id: checkoutRequestId
      });
      
      if (!transaction) {
        return NextResponse.json({ 
          success: false, 
          message: 'Transaction not found' 
        }, { status: 404 });
      }
      
      return NextResponse.json({
        success: true,
        data: transaction
      });
    } else if (userId) {
      const transactions = await MpesaTransaction.find({
        user_id: userId
      })
      .sort({ created_at: -1 })
      .limit(limit)
      .lean();
      
      return NextResponse.json({
        success: true,
        data: transactions
      });
    } else {
      const recentCallbacks = await MpesaCallbackLog.find()
        .sort({ created_at: -1 })
        .limit(limit)
        .lean();
      
      return NextResponse.json({
        success: true,
        data: recentCallbacks
      });
    }
  } catch (error) {
    console.error('Debug callback error:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Debug failed' 
    }, { status: 500 });
  }
}
