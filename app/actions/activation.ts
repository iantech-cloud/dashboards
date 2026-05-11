// app/actions/activation.ts - UPDATED FOR NEXTAUTH V5 AND CORRECT SCHEMA
'use server';

import { auth } from '@/auth'; // NextAuth v5 auth import
import { revalidatePath } from 'next/cache';
import { connectToDatabase } from '@/app/lib/mongoose';
import { 
  Profile, 
  MpesaTransaction, 
  ActivationPayment, 
  Transaction, 
  ActivationLog,
  Referral,
  Earning,
  AdminAuditLog,
  Company
} from '@/app/lib/models';

// Import email function for payment confirmation
import { sendPaymentConfirmationInvoice } from '@/app/actions/email';

// Import company helper function
import { createCompanyRevenueTransaction } from './company';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

interface ApiResponse<T = void> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

interface ActivationStatusData {
  activation_paid: boolean;
  approval_status: string;
  rank: string;
  is_active: boolean;
  status: string;
  username: string;
  email: string;
}

interface UrlRegistrationData {
  confirmationUrl: string;
  validationUrl: string;
  callbackUrl: string;
}

interface ActivationPaymentData {
  checkoutRequestId: string;
  amount: number;
  phoneNumber: string;
  activationPaymentId: string;
  callbackUrl: string;
  merchantRequestId: string;
}

interface MpesaStatusData {
  status: string;
  resultCode?: string;
  resultDesc?: string;
  mpesaReceiptNumber?: string | null;
  amount?: number;
  isActivationPayment?: boolean;
  completedAt?: Date;
  failedAt?: Date;
  source?: string;
  callbackUrl?: string;
}

interface MpesaSTKPushResult {
  success: boolean;
  checkoutRequestId?: string;
  merchantRequestId?: string;
  responseDescription?: string;
  customerMessage?: string;
  callbackUrl?: string;
  responseTime?: number;
  error?: string;
}

interface StatusMapping {
  status: string;
  description: string;
}

interface ActivationCompletionData {
  username: string;
  activationDate: Date;
  rank: string;
  approval_status: string;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get M-Pesa Access Token
 */
async function getMpesaAccessToken(): Promise<string> {
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
 * Map M-Pesa API status codes to valid database enum values
 */
function mapMpesaStatusToDatabase(resultCode: string, resultDesc: string = ''): StatusMapping {
  const statusMap: { [key: string]: StatusMapping } = {
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
  const code = parseInt(resultCode);
  const validCodes = [0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15, 17, 20, 26, 1032, 1037, 2001];
  
  if (validCodes.includes(code)) {
    return code;
  }
  
  if (code >= 1000 && code <= 1999) {
    return 1032;
  }
  
  if (code >= 2000 && code <= 2999) {
    return 2001;
  }
  
  return 11;
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
): Promise<MpesaSTKPushResult> {
  try {
    console.log('🔍 M-Pesa STK Push Initiation Started');
    console.log('📱 Phone:', phoneNumber);
    console.log('💰 Amount (cents):', amount, '| Amount (KES):', Math.floor(amount / 100));
    console.log('📝 Description:', description);
    console.log('🏷️ Reference:', reference);
    console.log('🎯 Activation Payment ID:', activationPaymentId);

    const BusinessShortCode = process.env.MPESA_SHORTCODE;
    const PassKey = process.env.MPESA_PASSKEY;
    const CallbackUrl = process.env.MPESA_CALLBACK_URL;
    const Environment = process.env.MPESA_ENVIRONMENT || 'sandbox';

    console.log('🔧 Environment Variables Check:');
    console.log('  BusinessShortCode:', BusinessShortCode ? '✅ Set' : '❌ Missing');
    console.log('  PassKey:', PassKey ? '✅ Set' : '❌ Missing');
    console.log('  CallbackUrl:', CallbackUrl ? '✅ Set' : '❌ Missing');
    console.log('  Environment:', Environment);

    if (!BusinessShortCode || !PassKey || !CallbackUrl) {
      const missingVars: string[] = [];
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

    console.log('🔑 Getting M-Pesa access token...');
    const accessToken = await getMpesaAccessToken();
    console.log('✅ Access token obtained');

    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
    const password = Buffer.from(`${BusinessShortCode}${PassKey}${timestamp}`).toString('base64');

    console.log('⏰ Timestamp:', timestamp);
    console.log('🔐 Password (base64):', password.substring(0, 20) + '...');

    const amountInShillings = Math.floor(amount / 100);
    
    const stkPushPayload = {
      BusinessShortCode: BusinessShortCode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: amountInShillings,
      PartyA: phoneNumber,
      PartyB: BusinessShortCode,
      PhoneNumber: phoneNumber,
      CallBackURL: CallbackUrl,
      AccountReference: reference,
      TransactionDesc: description.substring(0, 13),
    };

    console.log('📦 STK Push Payload:', JSON.stringify(stkPushPayload, null, 2));
    console.log('🌐 Callback URL Being Registered:', CallbackUrl);
    console.log('⚙️ Environment:', Environment);

    const mpesaApiUrl = Environment === 'production' 
      ? 'https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest'
      : 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest';

    console.log('🌐 M-Pesa API Endpoint:', mpesaApiUrl);

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
      } catch (e) {
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

    if (data.ResponseCode === '0') {
      console.log('✅ M-Pesa STK Push initiated successfully');
      console.log('🔗 CheckoutRequestID:', data.CheckoutRequestID);
      console.log('🔗 MerchantRequestID:', data.MerchantRequestID);

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
      
      return {
        success: false,
        error: data.ResponseDescription || 'M-Pesa request failed',
        responseTime
      };
    }
  } catch (error) {
    console.error('💥 M-Pesa STK Push network error:', error);
    
    let errorMessage = 'Failed to connect to M-Pesa service';
    
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    return {
      success: false,
      error: errorMessage
    };
  }
}

/**
 * Query M-Pesa transaction status directly from API
 */
async function queryMpesaTransactionStatus(checkoutRequestId: string): Promise<ApiResponse<MpesaStatusData>> {
  try {
    console.log('📡 Querying M-Pesa API for transaction status:', checkoutRequestId);

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

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ M-Pesa Query API Error:', errorText);
      return { success: false, error: `API error: ${response.status}` };
    }

    const data = await response.json();
    console.log('📨 M-Pesa Query API Response:', JSON.stringify(data, null, 2));

    const mappedStatus = mapMpesaStatusToDatabase(data.ResultCode, data.ResultDesc);
    const mappedResultCode = mapMpesaResultCodeToDatabase(data.ResultCode);

    return {
      success: true,
      data: {
        status: mappedStatus.status,
        resultCode: mappedResultCode.toString(),
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
 * Get or create company profile
 */
async function getOrCreateCompany() {
  let company = await Company.findOne({ email: 'company@hustlehubafrica.com' });
  
  if (!company) {
    company = await Company.create({
      name: 'HustleHub Africa Ltd',
      email: 'company@hustlehubafrica.com',
      phone_number: '+254700000000',
      wallet_balance_cents: 0,
      total_revenue_cents: 0,
      total_expenses_cents: 0,
      activation_revenue_cents: 0,
      unclaimed_referral_revenue_cents: 0,
      content_payment_revenue_cents: 0,
      other_revenue_cents: 0,
      is_active: true
    });
    
    console.log('✅ Company profile created:', company._id);
  }
  
  return company;
}

/**
 * Send payment confirmation invoice after successful activation
 */
async function sendActivationConfirmationInvoice(
  userProfile: any,
  activationPayment: any,
  transactionId: string
): Promise<void> {
  try {
    console.log('📧 Sending payment confirmation invoice for activation');
    
    const invoiceData = {
      invoiceNumber: `CONF-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      originalInvoiceNumber: `INV-${activationPayment._id}`,
      amount: activationPayment.amount_cents / 100, // Convert cents to KSH
      paymentDate: new Date().toLocaleDateString(),
      transactionId: transactionId,
      paymentMethod: 'mpesa' as const,
      user: {
        name: userProfile.name || userProfile.username,
        email: userProfile.email
      },
      business: {
        name: 'HustleHub Africa',
        address: 'Nairobi, Kenya',
        phone: '+254 748 264 231',
        email: 'support@hustlehub.africa'
      },
      activationDate: new Date().toLocaleDateString()
    };

    const result = await sendPaymentConfirmationInvoice(
      userProfile.email,
      userProfile.name || userProfile.username,
      invoiceData
    );

    if (result.success) {
      console.log('✅ Payment confirmation invoice sent successfully');
    } else {
      console.error('��� Failed to send payment confirmation invoice:', result.error);
    }
  } catch (error) {
    console.error('❌ Error sending payment confirmation invoice:', error);
    // Don't throw error - activation should continue even if email fails
  }
}

// =============================================================================
// EXPORTED ACTIONS
// =============================================================================

/**
 * ✅ FIXED: Check user activation status using correct schema fields
 */
export async function checkActivationStatus(): Promise<ApiResponse<ActivationStatusData>> {
  try {
    await connectToDatabase();
    
    const session = await auth();
    if (!session?.user?.email) {
      return { success: false, message: 'User not authenticated' };
    }

    const userProfile = await (Profile as any).findOne({ email: session.user.email });
    if (!userProfile) {
      return { success: false, message: 'User profile not found' };
    }

    // ✅ FIXED: Check activation based on approval_status and rank
    const isActivationPaid = userProfile.approval_status !== 'pending' || userProfile.rank !== 'Unactivated';

    return {
      success: true,
      data: {
        activation_paid: isActivationPaid,
        approval_status: userProfile.approval_status || 'pending',
        rank: userProfile.rank || 'Unactivated',
        is_active: userProfile.is_active || false,
        status: userProfile.status || 'inactive',
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
 * Register C2B URLs with M-Pesa
 */
export async function registerMpesaUrls(): Promise<ApiResponse<UrlRegistrationData>> {
  try {
    console.log('🔗 Registering M-Pesa URLs...');

    const BusinessShortCode = process.env.MPESA_SHORTCODE;
    const Environment = process.env.MPESA_ENVIRONMENT || 'sandbox';
    const baseUrl = process.env.NEXTAUTH_URL || process.env.MPESA_CALLBACK_URL?.replace('/api/mpesa/callback', '');

    if (!BusinessShortCode || !baseUrl) {
      throw new Error('MPESA_SHORTCODE or base URL not found');
    }

    const accessToken = await getMpesaAccessToken();

    const c2bPayload = {
      ShortCode: BusinessShortCode,
      ResponseType: 'Completed',
      ConfirmationURL: `${baseUrl}/api/mpesa/confirmation`,
      ValidationURL: `${baseUrl}/api/mpesa/validation`
    };

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
 * ✅ FIXED: Initiate activation payment - check correct fields
 */
export async function initiateActivationPayment(phoneNumber: string): Promise<ApiResponse<ActivationPaymentData>> {
  try {
    await connectToDatabase();

    const session = await auth();
    if (!session?.user?.email) {
      return { success: false, message: 'User not authenticated' };
    }

    const userProfile = await (Profile as any).findOne({ email: session.user.email });
    if (!userProfile) {
      return { success: false, message: 'User profile not found' };
    }

    // ✅ FIXED: Check if already activated using correct fields
    const isActivationPaid = userProfile.approval_status !== 'pending' || userProfile.rank !== 'Unactivated';
    if (isActivationPaid) {
      return { success: false, message: 'Account is already activated' };
    }

    const cleanPhone = phoneNumber.replace(/\D/g, '');
    let formattedPhone = cleanPhone;
    
    if (cleanPhone.startsWith('0') && cleanPhone.length === 10) {
      formattedPhone = `254${cleanPhone.substring(1)}`;
    } else if (cleanPhone.startsWith('254') && cleanPhone.length === 12) {
      formattedPhone = cleanPhone;
    } else {
      return { success: false, message: 'Invalid phone number format. Use 07XXXXXXXX or 2547XXXXXXXX' };
    }

    const activationAmount = userProfile.activation_amount_cents || 100000;

    console.log('🎯 Starting activation payment process:');
    console.log('👤 User:', userProfile.username);
    console.log('📱 Phone:', formattedPhone);
    console.log('💰 Amount:', activationAmount, 'cents');

    const activationPayment = new (ActivationPayment as any)({
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

    const activationLog = new (ActivationLog as any)({
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

    const mpesaResult = await initiateMpesaSTKPush(
      formattedPhone,
      activationAmount,
      `Activation fee for ${userProfile.username}`,
      `ACTIVATION-${userProfile._id}`,
      activationPayment._id.toString()
    );

    if (mpesaResult.success && mpesaResult.checkoutRequestId && mpesaResult.merchantRequestId) {
      activationPayment.checkout_request_id = mpesaResult.checkoutRequestId;
      activationPayment.provider_reference = mpesaResult.merchantRequestId;
      activationPayment.metadata = {
        ...activationPayment.metadata,
        callback_url: mpesaResult.callbackUrl,
        stk_push_initiated_at: new Date().toISOString()
      };
      await activationPayment.save();

      const mpesaTransaction = new (MpesaTransaction as any)({
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

      activationPayment.mpesa_transaction_id = mpesaTransaction._id;
      await activationPayment.save();

      activationLog.metadata = {
        ...activationLog.metadata,
        checkout_request_id: mpesaResult.checkoutRequestId,
        merchant_request_id: mpesaResult.merchantRequestId,
        mpesa_transaction_id: mpesaTransaction._id
      };
      await activationLog.save();

      console.log('✅ M-Pesa STK Push initiated successfully');

      return {
        success: true,
        data: {
          checkoutRequestId: mpesaResult.checkoutRequestId,
          amount: activationAmount,
          phoneNumber: formattedPhone,
          activationPaymentId: activationPayment._id.toString(),
          callbackUrl: mpesaResult.callbackUrl || '',
          merchantRequestId: mpesaResult.merchantRequestId
        }
      };
    } else {
      activationPayment.status = 'failed';
      activationPayment.error_message = mpesaResult.error;
      await activationPayment.save();

      activationLog.status = 'failed';
      activationLog.error_message = mpesaResult.error;
      await activationLog.save();

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
 * Enhanced M-Pesa payment status check
 */
export async function checkMpesaPaymentStatus(checkoutRequestId: string): Promise<ApiResponse<MpesaStatusData>> {
  try {
    await connectToDatabase();

    const session = await auth();
    if (!session?.user?.email) {
      return { success: false, message: 'User not authenticated' };
    }

    const mpesaTransaction = await (MpesaTransaction as any).findOne({
      checkout_request_id: checkoutRequestId
    });

    // ✅ FAST PATH: If payment is already completed/failed in DB, return immediately
    if (mpesaTransaction && ['completed', 'failed', 'cancelled', 'timeout'].includes(mpesaTransaction.status)) {
      console.log('✅ Payment status in database (final state):', mpesaTransaction.status);
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
          source: 'database'
        }
      };
    }

    // ✅ OPTIMIZED: Query M-Pesa API first for real-time status (faster callback detection)
    console.log('🔍 Querying M-Pesa API for latest status...');
    const apiStatus = await queryMpesaTransactionStatus(checkoutRequestId);
    
    if (apiStatus.success && apiStatus.data) {
      // Update database with API response for future queries
      if (mpesaTransaction) {
        const updateData: any = {
          status: apiStatus.data.status,
          result_code: apiStatus.data.resultCode,
          result_desc: apiStatus.data.resultDesc,
        };

        if (apiStatus.data.status === 'completed' && apiStatus.data.mpesaReceiptNumber && apiStatus.data.mpesaReceiptNumber !== 'N/A') {
          updateData.mpesa_receipt_number = apiStatus.data.mpesaReceiptNumber;
          updateData.completed_at = new Date();
        } else if (apiStatus.data.status === 'failed') {
          updateData.failed_at = new Date();
        }

        await (MpesaTransaction as any).updateOne(
          { _id: mpesaTransaction._id },
          { $set: updateData }
        );
      }

      return {
        success: true,
        data: {
          ...apiStatus.data,
          source: 'api'
        }
      };
    }

    // ✅ FALLBACK: Use database if API query fails
    if (mpesaTransaction) {
      console.log('📦 Using database fallback for status:', mpesaTransaction.status);
      return {
        success: true,
        data: {
          status: mpesaTransaction.status,
          resultCode: mpesaTransaction.result_code?.toString(),
          resultDesc: mpesaTransaction.result_desc,
          mpesaReceiptNumber: mpesaTransaction.mpesa_receipt_number,
          amount: mpesaTransaction.amount_cents,
          isActivationPayment: mpesaTransaction.is_activation_payment,
          source: 'database_fallback'
        }
      };
    }

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
 * ✅ FIXED: Complete activation after successful payment - Update correct schema fields
 */
export async function completeActivationAfterPayment(activationPaymentId: string): Promise<ApiResponse<ActivationCompletionData>> {
  try {
    await connectToDatabase();

    const session = await auth();
    if (!session?.user?.email) {
      return { success: false, message: 'User not authenticated' };
    }

    const userProfile = await (Profile as any).findOne({ email: session.user.email });
    const activationPayment = await (ActivationPayment as any).findById(activationPaymentId);

    if (!userProfile || !activationPayment) {
      return { success: false, message: 'User or activation payment not found' };
    }

    // ✅ FIXED: Check if already activated using correct fields
    const isActivationPaid = userProfile.approval_status !== 'pending' || userProfile.rank !== 'Unactivated';
    if (isActivationPaid) {
      return { 
        success: true, 
        message: 'Account already activated',
        data: {
          username: userProfile.username,
          activationDate: new Date(),
          rank: userProfile.rank,
          approval_status: userProfile.approval_status
        }
      };
    }

    if (activationPayment.status !== 'completed') {
      return { success: false, message: 'Payment not completed yet' };
    }

    const company = await getOrCreateCompany();

    // =============================================================================
    // STEP 1: Record User's Activation Fee Payment
    // =============================================================================
    const activationFeeTransaction = new (Transaction as any)({
      target_type: 'user',
      target_id: userProfile._id.toString(),
      user_id: userProfile._id,
      amount_cents: activationPayment.amount_cents,
      type: 'ACTIVATION_FEE',
      description: 'Account activation fee payment',
      status: 'completed',
      source: 'activation',
      is_activation_fee: true,
      activation_payment_id: activationPayment._id,
      balance_before_cents: userProfile.balance_cents,
      balance_after_cents: userProfile.balance_cents,
      metadata: {
        payment_method: 'mpesa',
        mpesa_receipt: activationPayment.mpesa_receipt_number,
        phone_number: activationPayment.phone_number
      }
    });
    await activationFeeTransaction.save();

    // =============================================================================
    // STEP 2: Process Referral Bonus with Tiered Structure
    // =============================================================================
    let referralBonus = null;

    if (userProfile.referred_by) {
      try {
        const referrer = await (Profile as any).findById(userProfile.referred_by);
        
        if (referrer) {
          const referralRecord = await (Referral as any).findOne({
            referrer_id: referrer._id,
            referred_id: userProfile._id
          });

          if (referralRecord && !referralRecord.referral_bonus_paid) {
            // Count how many direct referrals have been activated by this referrer
            const activatedDirectReferrals = await (Referral as any).countDocuments({
              referrer_id: referrer._id,
              referral_bonus_paid: true,
              'metadata.level': 0 // Direct referrals only
            });

            // Determine bonus amount: First 2 get 60,000 cents (KES 600), subsequent get 70,000 cents (KES 700)
            const REFERRAL_BONUS_CENTS = activatedDirectReferrals < 2 ? 60000 : 70000;
            const referralLevel = 0; // Direct referral

            // Create transaction for direct referral bonus
            const referralTransaction = new (Transaction as any)({
              target_type: 'user',
              target_id: referrer._id.toString(),
              user_id: referrer._id,
              amount_cents: REFERRAL_BONUS_CENTS,
              type: 'REFERRAL',
              description: `Referral bonus for ${userProfile.username}'s activation (${activatedDirectReferrals < 2 ? 'First 2' : 'Subsequent'})`,
              status: 'completed',
              source: 'activation',
              balance_before_cents: referrer.balance_cents,
              balance_after_cents: referrer.balance_cents + REFERRAL_BONUS_CENTS,
              metadata: {
                referred_user_id: userProfile._id,
                referred_username: userProfile.username,
                activation_payment_id: activationPayment._id,
                referral_id: referralRecord._id,
                level: referralLevel,
                bonus_tier: activatedDirectReferrals < 2 ? 'first_2' : 'subsequent',
                referrer_activated_count: activatedDirectReferrals
              }
            });
            await referralTransaction.save();

            // Update referrer balance
            referrer.balance_cents += REFERRAL_BONUS_CENTS;
            referrer.total_earnings_cents += REFERRAL_BONUS_CENTS;
            await referrer.save();

            // Update referral record
            referralRecord.referral_bonus_paid = true;
            referralRecord.referral_bonus_amount_cents = REFERRAL_BONUS_CENTS;
            referralRecord.bonus_paid_at = new Date();
            referralRecord.status = 'bonus_paid';
            referralRecord.referred_user_activated = true;
            referralRecord.referred_user_activated_at = new Date();
            referralRecord.metadata = {
              level: referralLevel,
              bonus_tier: activatedDirectReferrals < 2 ? 'first_2' : 'subsequent'
            };
            await referralRecord.save();

            // Create earning record
            const earning = new (Earning as any)({
              user_id: referrer._id,
              amount_cents: REFERRAL_BONUS_CENTS,
              type: 'REFERRAL',
              description: `Referral bonus for ${userProfile.username}`,
              source_id: referralRecord._id,
              source_type: 'referral',
              transaction_id: referralTransaction._id,
              processed: true,
              processed_at: new Date(),
              metadata: {
                level: referralLevel,
                bonus_tier: activatedDirectReferrals < 2 ? 'first_2' : 'subsequent'
              }
            });
            await earning.save();

            referralBonus = {
              referrer_id: referrer._id,
              referrer_username: referrer.username,
              amount_cents: REFERRAL_BONUS_CENTS,
              transaction_id: referralTransaction._id,
              level: referralLevel,
              bonus_tier: activatedDirectReferrals < 2 ? 'first_2' : 'subsequent'
            };

            console.log(`✅ Direct referral bonus paid: KES ${REFERRAL_BONUS_CENTS / 100} (${activatedDirectReferrals < 2 ? 'First 2' : 'Subsequent'})`);

            // =============================================================================
            // STEP 2.1: Process Level 1 Bonus (If referrer has a referrer)
            // =============================================================================
            if (referrer.referred_by) {
              try {
                const level1Referrer = await (Profile as any).findById(referrer.referred_by);
                
                if (level1Referrer) {
                  const LEVEL1_BONUS_CENTS = 10000; // KES 100 for level 1
                  const level1ReferralLevel = 1;

                  // Create transaction for level 1 bonus
                  const level1Transaction = new (Transaction as any)({
                    target_type: 'user',
                    target_id: level1Referrer._id.toString(),
                    user_id: level1Referrer._id,
                    amount_cents: LEVEL1_BONUS_CENTS,
                    type: 'REFERRAL',
                    description: `Level 1 downline bonus for ${userProfile.username}'s activation (via ${referrer.username})`,
                    status: 'completed',
                    source: 'activation',
                    balance_before_cents: level1Referrer.balance_cents,
                    balance_after_cents: level1Referrer.balance_cents + LEVEL1_BONUS_CENTS,
                    metadata: {
                      referred_user_id: userProfile._id,
                      referred_username: userProfile.username,
                      direct_referrer_id: referrer._id,
                      direct_referrer_username: referrer.username,
                      activation_payment_id: activationPayment._id,
                      level: level1ReferralLevel
                    }
                  });
                  await level1Transaction.save();

                  // Update level 1 referrer balance
                  level1Referrer.balance_cents += LEVEL1_BONUS_CENTS;
                  level1Referrer.total_earnings_cents += LEVEL1_BONUS_CENTS;
                  await level1Referrer.save();

                  // Create earning record for level 1
                  const level1Earning = new (Earning as any)({
                    user_id: level1Referrer._id,
                    amount_cents: LEVEL1_BONUS_CENTS,
                    type: 'REFERRAL',
                    description: `Level 1 downline bonus for ${userProfile.username}`,
                    source_id: referralRecord._id,
                    source_type: 'referral_downline',
                    transaction_id: level1Transaction._id,
                    processed: true,
                    processed_at: new Date(),
                    metadata: {
                      level: level1ReferralLevel,
                      direct_referrer_id: referrer._id
                    }
                  });
                  await level1Earning.save();

                  console.log('✅ Level 1 downline bonus paid: KES 100');
                }
              } catch (level1Error) {
                console.error('⚠️ Error processing level 1 bonus:', level1Error);
              }
            }
          }
        }
      } catch (referralError) {
        console.error('⚠️ Error processing referral bonus:', referralError);
      }
    }

    // =============================================================================
    // STEP 3: Record Company Revenue (Updated calculation)
    // =============================================================================
    let companyRevenueCents;

    if (userProfile.referred_by) {
      // User has referrer - check if they are among first 2 or subsequent
      const activatedDirectReferrals = await (Referral as any).countDocuments({
        referrer_id: userProfile.referred_by,
        referral_bonus_paid: true,
        'metadata.level': 0
      });
      
      const directBonus = activatedDirectReferrals < 2 ? 60000 : 70000;
      const level1Bonus = 10000; // KES 100 for level 1
      
      // Total activation fee (100000) - direct bonus - level 1 bonus
      companyRevenueCents = 100000 - directBonus - level1Bonus;
    } else {
      // No referrer - company gets full amount
      companyRevenueCents = 100000;
    }

    const companyRevenueResult = await createCompanyRevenueTransaction(
      companyRevenueCents,
      'COMPANY_REVENUE',
      userProfile.referred_by 
        ? `Company revenue from ${userProfile.username}'s activation (after bonuses)`
        : `Company revenue from ${userProfile.username}'s activation (no referrer)`,
      {
        total_activation_fee: activationPayment.amount_cents,
        referral_bonus_paid: referralBonus ? referralBonus.amount_cents : 0,
        level1_bonus_paid: referralBonus && userProfile.referred_by ? 10000 : 0,
        net_company_revenue: companyRevenueCents,
        has_referrer: !!userProfile.referred_by,
        activation_payment_id: activationPayment._id,
        user_id: userProfile._id
      },
      userProfile._id.toString()
    );

    if (!companyRevenueResult.success) {
      console.error('❌ Failed to create company revenue transaction');
      return { success: false, message: 'Failed to record company revenue' };
    }

    // =============================================================================
    // STEP 4: Record Unclaimed Referral Revenue (if no referrer)
    // =============================================================================
    if (!userProfile.referred_by) {
      // If no referrer, the potential bonuses go to company
      await createCompanyRevenueTransaction(
        70000, // Maximum potential direct bonus
        'UNCLAIMED_REFERRAL',
        `Unclaimed referral bonus from ${userProfile.username}'s activation (no referrer)`,
        {
          activation_payment_id: activationPayment._id,
          user_id: userProfile._id,
          reason: 'no_referrer'
        },
        userProfile._id.toString()
      );
    }

    // =============================================================================
    // STEP 5: ✅ FIXED - Activate User Account with Correct Fields
    // =============================================================================
    userProfile.is_active = true;
    userProfile.status = 'active';
    userProfile.is_verified = true;
    userProfile.approval_status = 'approved'; // ✅ FIXED: Set approval_status to 'approved'
    userProfile.is_approved = true;
    userProfile.level = 1;
    userProfile.rank = 'Bronze'; // ✅ FIXED: Change rank from 'Unactivated' to 'Bronze'
    userProfile.activation_transaction_id = activationFeeTransaction._id;
    await userProfile.save();

    // =============================================================================
    // STEP 6: Update Activation Payment Record
    // =============================================================================
    activationPayment.processed_by_system = true;
    activationPayment.processed_at = new Date();
    activationPayment.metadata = {
      ...activationPayment.metadata,
      activation_transaction_id: activationFeeTransaction._id,
      company_revenue_transaction_id: companyRevenueResult.data?.transaction_id,
      referral_bonus_paid: !!referralBonus
    };
    await activationPayment.save();

    // =============================================================================
    // STEP 7: Send Payment Confirmation Invoice
    // =============================================================================
    await sendActivationConfirmationInvoice(
      userProfile,
      activationPayment,
      activationPayment.mpesa_receipt_number || activationPayment._id.toString()
    );

    // =============================================================================
    // STEP 8: Log Successful Activation
    // =============================================================================
    const activationLog = new (ActivationLog as any)({
      user_id: userProfile._id,
      action: 'activated',
      amount_cents: activationPayment.amount_cents,
      phone_number: activationPayment.phone_number,
      status: 'success',
      metadata: {
        activation_payment_id: activationPayment._id,
        rank: 'Bronze',
        approval_status: 'approved',
        confirmation_invoice_sent: true
      }
    });
    await activationLog.save();

    // =============================================================================
    // STEP 9: Create Admin Audit Log
    // =============================================================================
    const auditLog = new (AdminAuditLog as any)({
      actor_id: userProfile._id,
      action: 'ACTIVATE_USER',
      target_type: 'user',
      target_id: userProfile._id,
      resource_type: 'user',
      resource_id: userProfile._id,
      action_type: 'activate',
      changes: {
        approval_status: 'approved',
        rank: 'Bronze',
        is_active: true,
        status: 'active'
      },
      metadata: {
        activation_payment_id: activationPayment._id,
        has_referrer: !!userProfile.referred_by,
        confirmation_invoice_sent: true
      }
    });
    await auditLog.save();

    revalidatePath('/dashboard');
    revalidatePath('/admin/users');
    revalidatePath('/admin/transactions');

    console.log('🎉 Activation completed successfully');

    return { 
      success: true, 
      message: 'Account activated successfully',
      data: {
        username: userProfile.username,
        activationDate: new Date(),
        rank: 'Bronze',
        approval_status: 'approved'
      }
    };

  } catch (error) {
    console.error('💥 Complete activation error:', error);
    return { success: false, message: 'Failed to complete activation' };
  }
}

/**
 * Verify URL registration status
 */
export async function verifyUrlRegistration(): Promise<ApiResponse<UrlRegistrationData>> {
  try {
    const result = await registerMpesaUrls();
    
    if (result.success && result.data) {
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
