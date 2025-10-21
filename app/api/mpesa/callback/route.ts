// app/api/mpesa/callback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase, Transaction, Profile, MpesaTransaction, ActivationPayment, MpesaCallbackLog } from '@/app/lib/models';
import mongoose from 'mongoose';
import { completeActivationAfterPayment } from '@/app/actions/activation';

export async function POST(request: NextRequest) {
  let callbackData: any = null;
  let session: mongoose.ClientSession | null = null;
  
  try {
    const body = await request.json();
    console.log('🔔 M-Pesa Callback received:', JSON.stringify(body, null, 2));

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

    // Update M-Pesa transaction with callback data
    mpesaTransaction.result_code = resultCode;
    mpesaTransaction.result_desc = resultDesc;
    mpesaTransaction.callback_payload = body;
    mpesaTransaction.callback_received_at = new Date();
    
    if (resultCode === 0) {
      // Payment successful
      const callbackMetadata = callbackData.CallbackMetadata;
      const items = callbackMetadata?.Item || [];

      console.log('✅ Payment Successful - Extracting metadata...');

      // Extract payment details with validation
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
          
          // Generate a unique receipt number for this transaction
          mpesaReceiptNumber = `${mpesaReceiptNumber}_DUP_${Date.now()}`;
          console.log('🔄 Using duplicate-safe receipt number:', mpesaReceiptNumber);
        }
      }

      // Update M-Pesa transaction with success details
      mpesaTransaction.mpesa_receipt_number = mpesaReceiptNumber;
      mpesaTransaction.phone_number = phoneNumber || mpesaTransaction.phone_number;
      mpesaTransaction.transaction_date = transactionDate;
      mpesaTransaction.status = 'completed';
      mpesaTransaction.completed_at = new Date();
      
      console.log('💰 Payment Details:', {
        mpesaReceiptNumber: mpesaTransaction.mpesa_receipt_number,
        amount,
        phoneNumber,
        transactionDate
      });
      
    } else {
      // Payment failed/cancelled
      mpesaTransaction.status = 'failed';
      mpesaTransaction.failed_at = new Date();
      
      console.log('❌ Payment Failed:', {
        resultCode,
        resultDesc,
        failureType: getFailureType(resultCode)
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
      if (resultCode === 0) {
        activationPayment.status = 'completed';
        activationPayment.paid_at = new Date();
        activationPayment.mpesa_receipt_number = mpesaTransaction.mpesa_receipt_number;
        activationPayment.mpesa_transaction_id = mpesaTransaction._id;
        
        console.log('✅ Activation payment marked as completed');
      } else {
        activationPayment.status = 'failed';
        activationPayment.error_message = resultDesc;
        
        console.log('❌ Activation payment marked as failed');
      }

      await activationPayment.save({ session });

      // If payment successful, use server action to complete activation
      if (resultCode === 0) {
        console.log('🎯 Using server action to complete activation...');
        
        // Commit transaction first since server action will create its own connection
        await session.commitTransaction();
        session = null; // Prevent double commit
        
        // Use server action to complete activation
        const activationResult = await completeActivationAfterPayment(activationPayment._id.toString());
        
        if (activationResult.success) {
          console.log('✅ Account activated successfully via server action:', {
            activationPaymentId: activationPayment._id,
            userId: activationPayment.user_id
          });
        } else {
          console.error('❌ Server action failed to activate account:', activationResult.message);
          // Don't throw error - we'll retry via frontend polling
        }
      }
    } else {
      console.warn('⚠️ No activation payment found for M-Pesa transaction:', mpesaTransaction._id);
    }

    // Find and update associated transaction record
    const transaction = await Transaction.findOne({
      $or: [
        { mpesa_transaction_id: mpesaTransaction._id },
        { activation_payment_id: activationPayment?._id },
        { 'metadata.checkoutRequestID': checkoutRequestID }
      ]
    }).session(session);

    if (transaction) {
      console.log('🔗 Found Associated Transaction:', {
        transactionId: transaction._id,
        type: transaction.type,
        amount: transaction.amount_cents / 100,
        previousStatus: transaction.status
      });

      if (resultCode === 0) {
        // Payment successful - update transaction
        transaction.status = 'completed';
        transaction.transaction_code = mpesaTransaction.mpesa_receipt_number;
        transaction.metadata = {
          ...transaction.metadata,
          mpesaReceiptNumber: mpesaTransaction.mpesa_receipt_number,
          phoneNumber: mpesaTransaction.phone_number,
          transactionDate: mpesaTransaction.transaction_date,
          callbackProcessedAt: new Date().toISOString()
        };

        console.log('✅ Transaction marked as completed');
      } else {
        // Payment failed/cancelled
        transaction.status = 'failed';
        transaction.metadata = {
          ...transaction.metadata,
          failureReason: resultDesc,
          resultCode: resultCode,
          failureType: getFailureType(resultCode),
          callbackProcessedAt: new Date().toISOString()
        };

        console.log('❌ Transaction marked as failed');
      }

      await transaction.save({ session });
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
      processing_duration_ms: Date.now() - new Date(callbackLog.created_at).getTime()
    });

    // Return success response to M-Pesa
    return NextResponse.json({ ResultCode: 0, ResultDesc: 'Success' });

  } catch (error) {
    console.error('❌ M-Pesa callback processing error:', {
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

/**
 * Handle activation payment using server action (fallback method)
 * This is used when we need to process activation within the same transaction
 */
async function handleActivationPaymentWithServerAction(activationPaymentId: string, mpesaTransaction: any) {
  try {
    console.log('🎯 Using server action to complete activation for:', activationPaymentId);
    
    // Use the server action to complete activation
    const result = await completeActivationAfterPayment(activationPaymentId);
    
    if (result.success) {
      console.log('✅ Server action completed activation successfully:', {
        activationPaymentId,
        message: result.message
      });
      
      // Update M-Pesa transaction to mark as processed
      await MpesaTransaction.findByIdAndUpdate(mpesaTransaction._id, {
        activation_processed: true,
        activation_processed_at: new Date(),
        reconciled: true,
        reconciled_at: new Date()
      });
      
      return true;
    } else {
      console.error('❌ Server action failed to complete activation:', {
        activationPaymentId,
        error: result.message
      });
      return false;
    }
  } catch (error) {
    console.error('💥 Error in server action activation:', error);
    return false;
  }
}

/**
 * Handle direct activation without server action (within transaction)
 */
async function handleDirectActivation(userId: string, activationPaymentId: string, mpesaTransaction: any, session: mongoose.ClientSession) {
  try {
    console.log('🔧 Using direct activation for user:', userId);
    
    // Update user activation status
    const userUpdate = await Profile.findByIdAndUpdate(
      userId,
      {
        $set: {
          activation_paid_at: new Date(),
          status: 'active',
          is_active: true,
          is_verified: true,
          is_approved: true,
          approval_status: 'approved',
          level: 1,
          rank: 'Activated Member',
          activation_method: 'mpesa',
          activation_transaction_id: mpesaTransaction._id,
          updated_at: new Date()
        },
        $inc: {
          mpesa_transactions_count: 1,
          successful_mpesa_deposits: 1
        },
        last_mpesa_deposit_date: new Date()
      },
      { session, new: true }
    );

    console.log('✅ User account activated directly:', {
      userId,
      activationDate: new Date(),
      previousStatus: userUpdate?.status,
      newStatus: 'active'
    });

    // Create transaction record for activation fee
    const transaction = new Transaction({
      user_id: userId,
      amount_cents: mpesaTransaction.amount_cents,
      type: 'ACTIVATION_FEE',
      description: 'Account activation fee payment',
      status: 'completed',
      transaction_code: mpesaTransaction.mpesa_receipt_number,
      mpesa_transaction_id: mpesaTransaction._id,
      activation_payment_id: activationPaymentId,
      source: 'activation',
      is_activation_fee: true,
      metadata: {
        phone_number: mpesaTransaction.phone_number,
        mpesaReceiptNumber: mpesaTransaction.mpesa_receipt_number,
        transactionDate: mpesaTransaction.transaction_date,
        activated_via: 'callback'
      }
    });
    await transaction.save({ session });

    // Update activation payment as processed
    await ActivationPayment.findByIdAndUpdate(
      activationPaymentId,
      {
        $set: {
          processed_by_system: true,
          processed_at: new Date(),
          mpesa_receipt_number: mpesaTransaction.mpesa_receipt_number,
          mpesa_transaction_id: mpesaTransaction._id
        }
      },
      { session }
    );

    // Update M-Pesa transaction
    await MpesaTransaction.findByIdAndUpdate(
      mpesaTransaction._id,
      {
        $set: {
          activation_processed: true,
          activation_processed_at: new Date(),
          reconciled: true,
          reconciled_at: new Date()
        }
      },
      { session }
    );

    console.log('🎉 Direct activation completed successfully');
    return true;

  } catch (error) {
    console.error('❌ Error in direct activation:', error);
    throw error;
  }
}

// Helper function to categorize failure types
function getFailureType(resultCode: number): string {
  const failureTypes: { [key: number]: string } = {
    1: 'INSUFFICIENT_FUNDS',
    1032: 'USER_CANCELLED',
    1037: 'TIMEOUT_NO_RESPONSE',
    2001: 'INVALID_PHONE_NUMBER'
  };

  return failureTypes[resultCode] || 'UNKNOWN_FAILURE';
}

// Optional: Add GET method for debugging callbacks (remove in production)
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
      // Get specific transaction
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
      // Get user's recent transactions
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
      // Get recent callbacks for debugging
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
