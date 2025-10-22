'use server';

import { getServerSession } from 'next-auth';
import { revalidatePath } from 'next/cache';
import { connectToDatabase } from '@/app/lib/mongoose';
import { Profile } from '@/app/lib/models';
import { MpesaTransaction } from '@/app/lib/models';
import { ActivationPayment } from '@/app/lib/models';
import { Transaction } from '@/app/lib/models';
import { ActivationLog } from '@/app/lib/models';

/**
 * Check user activation status
 */
export async function checkActivationStatus() {
  try {
    await connectToDatabase();
    
    const session = await getServerSession();
    if (!session?.user?.email) {
      return { success: false, message: 'User not authenticated' };
    }

    const userProfile = await Profile.findOne({ email: session.user.email });
    if (!userProfile) {
      return { success: false, message: 'User profile not found' };
    }

    return {
      success: true,
      data: {
        activation_paid: !!userProfile.activation_paid_at,
        activation_paid_at: userProfile.activation_paid_at,
        is_active: userProfile.is_active,
        status: userProfile.status,
        username: userProfile.username,
        email: userProfile.email
      }
    };
  } catch (error) {
    console.error('Error checking activation status:', error);
    return { success: false, message: 'Failed to check activation status' };
  }
}

/**
 * Get M-Pesa Access Token
 */
async function getMpesaAccessToken() {
  try {
    const consumerKey = process.env.MPESA_CONSUMER_KEY;
    const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
    
    if (!consumerKey || !consumerSecret) {
      throw new Error('MPESA_CONSUMER_KEY or MPESA_CONSUMER_SECRET not found');
    }

    const credentials = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
    
    const response = await fetch(
      process.env.MPESA_ENVIRONMENT === 'production' 
        ? 'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials'
        : 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
      {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${credentials}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to get access token: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error('Error getting M-Pesa access token:', error);
    throw error;
  }
}

/**
 * Register C2B URLs with M-Pesa (for complete URL registration)
 */
export async function registerMpesaUrls() {
  try {
    console.log('🔗 Registering M-Pesa URLs...');

    const BusinessShortCode = process.env.MPESA_SHORTCODE;
    const Environment = process.env.MPESA_ENVIRONMENT || 'sandbox';
    const baseUrl = process.env.NEXTAUTH_URL || process.env.MPESA_CALLBACK_URL?.replace('/api/mpesa/callback', '') || 'https://70f15f56538a.ngrok-free.app';

    if (!BusinessShortCode) {
      throw new Error('MPESA_SHORTCODE not found');
    }

    const accessToken = await getMpesaAccessToken();

    const c2bPayload = {
      ShortCode: BusinessShortCode,
      ResponseType: 'Completed',
      ConfirmationURL: `${baseUrl}/api/mpesa/confirmation`,
      ValidationURL: `${baseUrl}/api/mpesa/validation`
    };

    console.log('📦 C2B URL Registration Payload:', JSON.stringify(c2bPayload, null, 2));

    const c2bApiUrl = Environment === 'production' 
      ? 'https://api.safaricom.co.ke/mpesa/c2b/v1/registerurl'
      : 'https://sandbox.safaricom.co.ke/mpesa/c2b/v1/registerurl';

    const response = await fetch(c2bApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify(c2bPayload)
    });

    const data = await response.json();

    if (data.ResponseCode === '0') {
      console.log('✅ M-Pesa URLs registered successfully');
      console.log('🌐 Confirmation URL:', c2bPayload.ConfirmationURL);
      console.log('🌐 Validation URL:', c2bPayload.ValidationURL);
      console.log('🌐 Callback URL (for STK):', `${baseUrl}/api/mpesa/callback`);
      
      return { 
        success: true, 
        message: 'URLs registered successfully',
        data: {
          confirmationUrl: c2bPayload.ConfirmationURL,
          validationUrl: c2bPayload.ValidationURL,
          callbackUrl: `${baseUrl}/api/mpesa/callback`
        }
      };
    } else {
      console.error('❌ M-Pesa URL registration failed:', data.ResponseDescription);
      return { 
        success: false, 
        error: data.ResponseDescription || 'Failed to register URLs' 
      };
    }
  } catch (error) {
    console.error('💥 M-Pesa URL registration error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to register M-Pesa URLs' 
    };
  }
}

/**
 * Initiate activation payment via M-Pesa with proper URL registration
 */
export async function initiateActivationPayment(phoneNumber: string) {
  try {
    await connectToDatabase();

    const session = await getServerSession();
    if (!session?.user?.email) {
      return { success: false, message: 'User not authenticated' };
    }

    // Validate user exists
    const userProfile = await Profile.findOne({ email: session.user.email });
    if (!userProfile) {
      return { success: false, message: 'User profile not found' };
    }

    // Check if already activated
    if (userProfile.activation_paid_at) {
      return { success: false, message: 'Account is already activated' };
    }

    // Validate phone number
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    let formattedPhone = cleanPhone;
    
    if (cleanPhone.startsWith('0') && cleanPhone.length === 10) {
      formattedPhone = `254${cleanPhone.substring(1)}`;
    } else if (cleanPhone.startsWith('254') && cleanPhone.length === 12) {
      formattedPhone = cleanPhone;
    } else {
      return { success: false, message: 'Invalid phone number format. Use 07XXXXXXXX or 2547XXXXXXXX' };
    }

    const activationAmount = userProfile.activation_amount_cents || 100000; // KES 1000 in cents

    console.log('🎯 Starting activation payment process:');
    console.log('👤 User:', userProfile.username);
    console.log('📱 Phone:', formattedPhone);
    console.log('💰 Amount:', activationAmount, 'cents');

    // Create activation payment record
    const activationPayment = new ActivationPayment({
      user_id: userProfile._id,
      amount_cents: activationAmount,
      provider: 'mpesa',
      phone_number: formattedPhone,
      status: 'pending',
      metadata: {
        activation_type: 'account_activation',
        auto_approved: false,
        requires_manual_review: false,
        initiated_at: new Date().toISOString()
      }
    });

    await activationPayment.save();
    console.log('💾 Activation payment record created:', activationPayment._id);

    // Log activation attempt
    const activationLog = new ActivationLog({
      user_id: userProfile._id,
      action: 'initiated',
      amount_cents: activationAmount,
      phone_number: formattedPhone,
      status: 'pending',
      metadata: {
        activation_payment_id: activationPayment._id
      }
    });
    await activationLog.save();

    // Initiate M-Pesa STK Push with proper URL registration
    const mpesaResult = await initiateMpesaSTKPush(
      formattedPhone,
      activationAmount,
      `Activation fee for ${userProfile.username}`,
      `ACTIVATION-${userProfile._id}`,
      activationPayment._id.toString()
    );

    console.log('📡 M-Pesa STK Push Result:', mpesaResult);

    if (mpesaResult.success) {
      // Update activation payment with M-Pesa details
      activationPayment.checkout_request_id = mpesaResult.checkoutRequestId;
      activationPayment.provider_reference = mpesaResult.merchantRequestId;
      activationPayment.metadata = {
        ...activationPayment.metadata,
        callback_url: mpesaResult.callbackUrl,
        stk_push_initiated_at: new Date().toISOString()
      };
      await activationPayment.save();

      // Create M-Pesa transaction record
      const mpesaTransaction = new MpesaTransaction({
        user_id: userProfile._id,
        amount_cents: activationAmount,
        phone_number: formattedPhone,
        account_reference: `ACTIVATION-${userProfile._id}`,
        transaction_desc: `Account activation fee for ${userProfile.username}`,
        checkout_request_id: mpesaResult.checkoutRequestId,
        merchant_request_id: mpesaResult.merchantRequestId,
        status: 'pending',
        is_activation_payment: true,
        source: 'activation',
        metadata: {
          activation_payment_id: activationPayment._id,
          callback_url: mpesaResult.callbackUrl,
          user_username: userProfile.username
        }
      });
      await mpesaTransaction.save();

      // Update activation payment with M-Pesa transaction reference
      activationPayment.mpesa_transaction_id = mpesaTransaction._id;
      await activationPayment.save();

      // Update activation log
      activationLog.metadata = {
        ...activationLog.metadata,
        checkout_request_id: mpesaResult.checkoutRequestId,
        merchant_request_id: mpesaResult.merchantRequestId,
        mpesa_transaction_id: mpesaTransaction._id
      };
      await activationLog.save();

      console.log('✅ M-Pesa STK Push initiated successfully');
      console.log('🔗 CheckoutRequestID:', mpesaResult.checkoutRequestId);
      console.log('🌐 Callback URL Registered:', mpesaResult.callbackUrl);

      return {
        success: true,
        data: {
          checkoutRequestId: mpesaResult.checkoutRequestId,
          amount: activationAmount,
          phoneNumber: formattedPhone,
          activationPaymentId: activationPayment._id.toString(),
          callbackUrl: mpesaResult.callbackUrl,
          merchantRequestId: mpesaResult.merchantRequestId
        }
      };
    } else {
      // Update activation payment as failed
      activationPayment.status = 'failed';
      activationPayment.error_message = mpesaResult.error;
      activationPayment.metadata = {
        ...activationPayment.metadata,
        failed_at: new Date().toISOString(),
        error_details: mpesaResult.error
      };
      await activationPayment.save();

      // Update activation log
      activationLog.status = 'failed';
      activationLog.error_message = mpesaResult.error;
      activationLog.metadata = {
        ...activationLog.metadata,
        failed_at: new Date().toISOString()
      };
      await activationLog.save();

      console.error('❌ M-Pesa STK Push failed:', mpesaResult.error);

      return { 
        success: false, 
        message: mpesaResult.error || 'Failed to initiate M-Pesa payment' 
      };
    }
  } catch (error) {
    console.error('💥 Activation payment error:', error);
    return { success: false, message: 'An error occurred during payment processing' };
  }
}

/**
 * M-Pesa STK Push initiation with proper URL registration and enhanced metadata
 */
async function initiateMpesaSTKPush(
  phoneNumber: string, 
  amount: number, 
  description: string,
  reference: string,
  activationPaymentId: string
) {
  try {
    console.log('🔍 M-Pesa STK Push Initiation Started');
    console.log('📱 Phone:', phoneNumber);
    console.log('💰 Amount (cents):', amount, '| Amount (KES):', Math.floor(amount / 100));
    console.log('📝 Description:', description);
    console.log('🏷️ Reference:', reference);
    console.log('🎯 Activation Payment ID:', activationPaymentId);

    // Validate environment variables
    const BusinessShortCode = process.env.MPESA_SHORTCODE;
    const PassKey = process.env.MPESA_PASSKEY;
    const CallbackUrl = process.env.MPESA_CALLBACK_URL;
    const Environment = process.env.MPESA_ENVIRONMENT || 'sandbox';

    console.log('🔍 Environment Variables Check:');
    console.log('  BusinessShortCode:', BusinessShortCode ? '✅ Set' : '❌ Missing');
    console.log('  PassKey:', PassKey ? '✅ Set' : '❌ Missing');
    console.log('  CallbackUrl:', CallbackUrl ? '✅ Set' : '❌ Missing');
    console.log('  Environment:', Environment);

    if (!BusinessShortCode || !PassKey || !CallbackUrl) {
      const missingVars = [];
      if (!BusinessShortCode) missingVars.push('MPESA_SHORTCODE');
      if (!PassKey) missingVars.push('MPESA_PASSKEY');
      if (!CallbackUrl) missingVars.push('MPESA_CALLBACK_URL');
      
      const errorMsg = `Missing environment variables: ${missingVars.join(', ')}`;
      console.error('❌', errorMsg);
      return {
        success: false,
        error: errorMsg
      };
    }

    // Get access token first
    console.log('🔑 Getting M-Pesa access token...');
    const accessToken = await getMpesaAccessToken();
    console.log('✅ Access token obtained');

    // Generate timestamp and password
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
    const password = Buffer.from(`${BusinessShortCode}${PassKey}${timestamp}`).toString('base64');

    console.log('⏰ Timestamp:', timestamp);
    console.log('🔐 Password (base64):', password.substring(0, 20) + '...');

    // Prepare STK Push payload with enhanced metadata and proper URL registration
    const amountInShillings = Math.floor(amount / 100);
    
    const stkPushPayload = {
      // Required STK Push fields
      BusinessShortCode: BusinessShortCode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: amountInShillings,
      PartyA: phoneNumber,
      PartyB: BusinessShortCode,
      PhoneNumber: phoneNumber,
      
      // CRITICAL: Callback URL registration for this transaction
      CallBackURL: CallbackUrl,
      
      // Transaction identification
      AccountReference: reference,
      TransactionDesc: description.substring(0, 13), // Max 13 chars for M-Pesa
    };

    console.log('📦 STK Push Payload with URL Registration:', JSON.stringify(stkPushPayload, null, 2));
    console.log('🌐 Callback URL Being Registered:', CallbackUrl);
    console.log('⚙️ Environment:', Environment);

    // Determine API URL based on environment
    const mpesaApiUrl = Environment === 'production' 
      ? 'https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest'
      : 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest';

    console.log('🌐 M-Pesa API Endpoint:', mpesaApiUrl);
    console.log('🔑 Access Token (first 20 chars):', accessToken.substring(0, 20) + '...');

    // Make API request to M-Pesa
    const startTime = Date.now();
    const response = await fetch(mpesaApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify(stkPushPayload)
    });

    const responseTime = Date.now() - startTime;
    console.log('📡 M-Pesa API Response Time:', responseTime, 'ms');
    console.log('📡 M-Pesa Response Status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ M-Pesa API Error Response:', errorText);
      
      let errorMessage = `M-Pesa API error: ${response.status} ${response.statusText}`;
      
      // Try to parse error response
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.errorMessage) {
          errorMessage = errorData.errorMessage;
        } else if (errorData.error) {
          errorMessage = errorData.error;
        } else if (errorData.responseDescription) {
          errorMessage = errorData.responseDescription;
        } else if (errorData.ResultDesc) {
          errorMessage = errorData.ResultDesc;
        }
        
        // Log additional error details
        console.error('🔍 Error Details:', {
          requestId: errorData.requestId,
          errorCode: errorData.errorCode,
          conversationId: errorData.conversationId
        });
      } catch (e) {
        // If JSON parsing fails, use the raw text
        errorMessage = errorText || errorMessage;
      }
      
      return {
        success: false,
        error: errorMessage,
        responseTime
      };
    }

    const data = await response.json();
    console.log('📨 M-Pesa API Success Response:', JSON.stringify(data, null, 2));
    console.log('⏱️ Total Request Time:', responseTime, 'ms');

    if (data.ResponseCode === '0') {
      console.log('✅ M-Pesa STK Push initiated successfully');
      console.log('🔗 CheckoutRequestID:', data.CheckoutRequestID);
      console.log('🔗 MerchantRequestID:', data.MerchantRequestID);
      console.log('📝 ResponseDescription:', data.ResponseDescription);
      console.log('👤 CustomerMessage:', data.CustomerMessage);
      console.log('🌐 Callback URL Successfully Registered:', CallbackUrl);
      console.log('🎯 Activation Payment ID:', activationPaymentId);

      return {
        success: true,
        checkoutRequestId: data.CheckoutRequestID,
        merchantRequestId: data.MerchantRequestID,
        responseDescription: data.ResponseDescription,
        customerMessage: data.CustomerMessage,
        callbackUrl: CallbackUrl,
        responseTime
      };
    } else {
      console.error('❌ M-Pesa STK Push failed with code:', data.ResponseCode);
      console.error('📝 Error Description:', data.ResponseDescription);
      
      let errorMessage = data.ResponseDescription || 'M-Pesa request failed';
      
      // Enhanced error mapping with specific M-Pesa error codes
      const errorMap: { [key: string]: string } = {
        '1': 'Insufficient balance - Customer has insufficient funds',
        '1032': 'Request cancelled by user - Customer cancelled the STK prompt',
        '1037': 'Request timeout - No response from customer',
        '2001': 'Invalid phone number format',
        '2006': 'Callback URL not accessible - check MPESA_CALLBACK_URL',
        '2007': 'Callback URL not responding - ensure endpoint is live',
        '2008': 'Invalid callback URL format',
        '2009': 'Callback URL SSL certificate issue',
        '1019': 'Transaction has expired',
        '1001': 'Unable to lock subscriber - transaction already in process',
        '1025': 'Error sending push request - system error',
        '9999': 'Error sending push request'
      };
      
      if (errorMap[data.ResponseCode]) {
        errorMessage = `${errorMessage} - ${errorMap[data.ResponseCode]}`;
      }
      
      return {
        success: false,
        error: errorMessage,
        responseTime
      };
    }
  } catch (error) {
    console.error('💥 M-Pesa STK Push network error:', error);
    
    let errorMessage = 'Failed to connect to M-Pesa service';
    
    if (error instanceof Error) {
      if (error.message.includes('fetch failed') || error.message.includes('ENOTFOUND')) {
        errorMessage = 'Cannot connect to M-Pesa service. Please check your internet connection and API endpoints.';
      } else if (error.message.includes('Unexpected token')) {
        errorMessage = 'Invalid response from M-Pesa service. Possible API endpoint issue.';
      } else if (error.message.includes('SSL')) {
        errorMessage = 'SSL certificate issue. Ensure your callback URL uses valid HTTPS.';
      } else {
        errorMessage = error.message;
      }
    }
    
    return {
      success: false,
      error: errorMessage
    };
  }
}

/**
 * Enhanced M-Pesa payment status check with proper enum mapping and duplicate handling
 */
export async function checkMpesaPaymentStatus(checkoutRequestId: string) {
  try {
    await connectToDatabase();

    const session = await getServerSession();
    if (!session?.user?.email) {
      return { success: false, message: 'User not authenticated' };
    }

    // First, check the database
    const mpesaTransaction = await MpesaTransaction.findOne({
      checkout_request_id: checkoutRequestId
    });

    // If transaction is already completed/failed in database, return that status
    if (mpesaTransaction && ['completed', 'failed'].includes(mpesaTransaction.status)) {
      console.log('📊 Using database status:', mpesaTransaction.status);
      return {
        success: true,
        data: {
          status: mpesaTransaction.status,
          resultCode: mpesaTransaction.result_code?.toString(),
          resultDesc: mpesaTransaction.result_desc,
          mpesaReceiptNumber: mpesaTransaction.mpesa_receipt_number,
          amount: mpesaTransaction.amount_cents,
          isActivationPayment: mpesaTransaction.is_activation_payment,
          completedAt: mpesaTransaction.completed_at,
          failedAt: mpesaTransaction.failed_at,
          source: 'database',
          callbackUrl: mpesaTransaction.metadata?.callback_url
        }
      };
    }

    // If transaction is still pending or doesn't exist, query M-Pesa API directly
    console.log('🔍 Querying M-Pesa API directly for status...');
    const apiStatus = await queryMpesaTransactionStatus(checkoutRequestId);
    
    if (apiStatus.success && apiStatus.data) {
      console.log('📡 M-Pesa API returned status:', apiStatus.data.status);
      
      // Update the database with the API response (with proper enum values)
      if (mpesaTransaction) {
        try {
          // Use safe update to avoid unique constraint issues with mpesa_receipt_number
          const updateData: any = {
            status: apiStatus.data.status,
            result_code: apiStatus.data.resultCode,
            result_desc: apiStatus.data.resultDesc,
          };

          // Only set mpesa_receipt_number for completed transactions with valid receipt
          if (apiStatus.data.status === 'completed' && apiStatus.data.mpesaReceiptNumber && apiStatus.data.mpesaReceiptNumber !== 'N/A') {
            updateData.mpesa_receipt_number = apiStatus.data.mpesaReceiptNumber;
            updateData.completed_at = new Date();
          } else if (apiStatus.data.status === 'failed') {
            updateData.failed_at = new Date();
          }

          await MpesaTransaction.updateOne(
            { _id: mpesaTransaction._id },
            { $set: updateData }
          );
          console.log('💾 Updated database with M-Pesa API status');
        } catch (saveError) {
          console.error('❌ Failed to save M-Pesa transaction:', saveError);
          // If save fails, log the error but continue
        }
      }

      return {
        success: true,
        data: {
          ...apiStatus.data,
          source: 'api',
          callbackUrl: mpesaTransaction?.metadata?.callback_url
        }
      };
    } else {
      console.log('❌ M-Pesa API query failed, using database status');
    }

    // If API query fails, return database status or default to processing
    if (mpesaTransaction) {
      return {
        success: true,
        data: {
          status: mpesaTransaction.status,
          resultCode: mpesaTransaction.result_code?.toString(),
          resultDesc: mpesaTransaction.result_desc,
          mpesaReceiptNumber: mpesaTransaction.mpesa_receipt_number,
          amount: mpesaTransaction.amount_cents,
          isActivationPayment: mpesaTransaction.is_activation_payment,
          completedAt: mpesaTransaction.completed_at,
          failedAt: mpesaTransaction.failed_at,
          source: 'database_fallback',
          callbackUrl: mpesaTransaction.metadata?.callback_url
        }
      };
    }

    // No transaction found at all
    return { 
      success: false, 
      message: 'Transaction not found' 
    };

  } catch (error) {
    console.error('Error checking payment status:', error);
    return { success: false, message: 'Failed to check payment status' };
  }
}

/**
 * Query M-Pesa transaction status directly from API with proper enum mapping
 */
async function queryMpesaTransactionStatus(checkoutRequestId: string) {
  try {
    console.log('📡 Querying M-Pesa API for transaction status:', checkoutRequestId);

    // Get access token
    const accessToken = await getMpesaAccessToken();
    
    const BusinessShortCode = process.env.MPESA_SHORTCODE;
    const PassKey = process.env.MPESA_PASSKEY;
    const Environment = process.env.MPESA_ENVIRONMENT || 'sandbox';

    if (!BusinessShortCode || !PassKey) {
      throw new Error('MPESA_SHORTCODE or MPESA_PASSKEY not found');
    }

    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
    const password = Buffer.from(`${BusinessShortCode}${PassKey}${timestamp}`).toString('base64');

    const queryPayload = {
      BusinessShortCode: BusinessShortCode,
      Password: password,
      Timestamp: timestamp,
      CheckoutRequestID: checkoutRequestId
    };

    console.log('📦 M-Pesa Query Payload:', JSON.stringify(queryPayload, null, 2));

    const mpesaApiUrl = Environment === 'production' 
      ? 'https://api.safaricom.co.ke/mpesa/stkpushquery/v1/query'
      : 'https://sandbox.safaricom.co.ke/mpesa/stkpushquery/v1/query';

    const response = await fetch(mpesaApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify(queryPayload)
    });

    console.log('📡 M-Pesa Query Response Status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ M-Pesa Query API Error:', errorText);
      return { success: false, error: `API error: ${response.status}` };
    }

    const data = await response.json();
    console.log('📨 M-Pesa Query API Response:', JSON.stringify(data, null, 2));

    // Map M-Pesa API status to our database enum values
    const mappedStatus = mapMpesaStatusToDatabase(data.ResultCode, data.ResultDesc);
    const mappedResultCode = mapMpesaResultCodeToDatabase(data.ResultCode);

    console.log('🔄 Status Mapping:', {
      originalCode: data.ResultCode,
      originalDesc: data.ResultDesc,
      mappedStatus: mappedStatus.status,
      mappedResultCode: mappedResultCode
    });

    return {
      success: true,
      data: {
        status: mappedStatus.status,
        resultCode: mappedResultCode,
        resultDesc: mappedStatus.description || data.ResultDesc,
        mpesaReceiptNumber: data.MpesaReceiptNumber || null,
        amount: 0,
        isActivationPayment: true
      }
    };

  } catch (error) {
    console.error('💥 M-Pesa query API error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to query transaction status' 
    };
  }
}

/**
 * Map M-Pesa API status codes to valid database enum values
 */
function mapMpesaStatusToDatabase(resultCode: string, resultDesc: string = '') {
  const statusMap: { [key: string]: { status: string, description: string } } = {
    '0': { 
      status: 'completed', 
      description: 'Payment completed successfully' 
    },
    '1': { status: 'failed', description: 'Insufficient balance' },
    '1032': { status: 'cancelled', description: 'Request cancelled by user' },
    '1037': { status: 'timeout', description: 'Request timeout - no response from user' },
    '2001': { status: 'failed', description: 'Invalid phone number format' },
    '1019': { status: 'failed', description: 'Transaction has expired' },
    '1001': { status: 'failed', description: 'Unable to lock subscriber - transaction in process' },
    '1025': { status: 'failed', description: 'Error sending push request' },
    '9999': { status: 'failed', description: 'Error sending push request' },
    '4999': { status: 'pending', description: 'Transaction in progress' }
  };

  // Default to pending for unknown codes that start with 0 or are not error codes
  if (!statusMap[resultCode]) {
    if (resultCode === '0' || parseInt(resultCode) < 1000) {
      return { status: 'pending', description: resultDesc || 'Transaction in progress' };
    }
    return { status: 'failed', description: resultDesc || 'Transaction failed' };
  }

  return statusMap[resultCode];
}

/**
 * Map M-Pesa result codes to valid database enum values
 */
function mapMpesaResultCodeToDatabase(resultCode: string): number {
  // Convert string result code to number and ensure it's a valid enum value
  const code = parseInt(resultCode);
  
  // Valid MpesaResultCodes from your schema
  const validCodes = [0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15, 17, 20, 26, 1032, 1037, 2001];
  
  if (validCodes.includes(code)) {
    return code;
  }
  
  // For unknown codes, map to the closest valid code
  if (code >= 1000 && code <= 1999) {
    return 1032; // Use 1032 for user cancellation/timeout type errors
  }
  
  if (code >= 2000 && code <= 2999) {
    return 2001; // Use 2001 for configuration errors
  }
  
  // Default to 11 (Internal error) for unknown codes
  return 11;
}

/**
 * Complete activation after successful payment
 * This is used by the frontend after payment is confirmed via status check.
 */
export async function completeActivationAfterPayment(activationPaymentId: string) {
  try {
    await connectToDatabase();

    const session = await getServerSession();
    if (!session?.user?.email) {
      return { success: false, message: 'User not authenticated' };
    }

    const userProfile = await Profile.findOne({ email: session.user.email });
    const activationPayment = await ActivationPayment.findById(activationPaymentId);

    if (!userProfile || !activationPayment) {
      return { success: false, message: 'User or activation payment not found' };
    }

    // Check if already activated
    if (userProfile.activation_paid_at) {
      // The account is already activated, return success to indicate no further action needed
      return { success: true, message: 'Account already activated' };
    }

    // Check if payment is completed (status should have been updated by M-Pesa callback)
    if (activationPayment.status !== 'completed') {
      return { success: false, message: 'Payment not completed yet' };
    }

    // Update user activation status
    userProfile.activation_paid_at = new Date();
    userProfile.is_active = true;
    userProfile.status = 'active';
    userProfile.is_verified = true;
    userProfile.level = 1;
    userProfile.rank = 'Activated Member';
    await userProfile.save();

    // Create transaction record
    const transaction = new Transaction({
      user_id: userProfile._id,
      amount_cents: activationPayment.amount_cents,
      type: 'ACTIVATION_FEE',
      description: 'Account activation fee payment',
      status: 'completed',
      source: 'activation',
      is_activation_fee: true,
      activation_payment_id: activationPayment._id,
      balance_before_cents: userProfile.balance_cents,
      balance_after_cents: userProfile.balance_cents
    });
    await transaction.save();

    // Update user with transaction reference
    userProfile.activation_transaction_id = transaction._id;
    await userProfile.save();

    // Update activation payment as processed (by the frontend-initiated flow)
    activationPayment.processed_by_system = true;
    activationPayment.processed_at = new Date();
    await activationPayment.save();

    // Log successful activation
    const activationLog = new ActivationLog({
      user_id: userProfile._id,
      action: 'activated',
      amount_cents: activationPayment.amount_cents,
      phone_number: activationPayment.phone_number,
      status: 'success',
      metadata: {
        activation_payment_id: activationPayment._id,
        transaction_id: transaction._id,
        mpesa_receipt_number: activationPayment.mpesa_receipt_number
      }
    });
    await activationLog.save();

    revalidatePath('/dashboard');
    return { 
      success: true, 
      message: 'Account activated successfully',
      data: {
        username: userProfile.username,
        activationDate: userProfile.activation_paid_at
      }
    };
  } catch (error) {
    console.error('Complete activation error:', error);
    return { success: false, message: 'Failed to complete activation' };
  }
}

/**
 * Verify URL registration status (utility function)
 */
export async function verifyUrlRegistration() {
  try {
    console.log('🔍 Verifying M-Pesa URL registration...');
    
    const result = await registerMpesaUrls();
    
    if (result.success) {
      return {
        success: true,
        message: 'URL registration verified successfully',
        data: result.data
      };
    } else {
      return {
        success: false,
        message: 'URL registration verification failed',
        error: result.error
      };
    }
  } catch (error) {
    console.error('❌ URL registration verification error:', error);
    return {
      success: false,
      message: 'Failed to verify URL registration',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
