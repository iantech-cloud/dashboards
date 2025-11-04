// app/lib/mpesa.ts
import crypto from 'crypto';

// Validate environment variables on import
function validateEnvironment() {
  const requiredEnvVars = [
    'MPESA_CONSUMER_KEY',
    'MPESA_CONSUMER_SECRET',
    'MPESA_SHORTCODE',
    'MPESA_PASSKEY',
    'MPESA_CALLBACK_URL'
  ];

  const missing = requiredEnvVars.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  console.log('✅ M-Pesa environment variables validated');
}

// Run validation immediately
validateEnvironment();

// M-Pesa configuration - matching your .env exactly
const MPESA_CONFIG = {
  businessShortCode: process.env.MPESA_SHORTCODE!, // Using MPESA_SHORTCODE from your .env
  passKey: process.env.MPESA_PASSKEY!,
  consumerKey: process.env.MPESA_CONSUMER_KEY!,
  consumerSecret: process.env.MPESA_CONSUMER_SECRET!,
  callbackUrl: process.env.MPESA_CALLBACK_URL!,
  environment: process.env.MPESA_ENVIRONMENT || 'sandbox',
};

// M-Pesa API URLs
const MPESA_URLS = {
  sandbox: {
    auth: 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
    stkPush: 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
    query: 'https://sandbox.safaricom.co.ke/mpesa/stkpushquery/v1/query',
  },
  production: {
    auth: 'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
    stkPush: 'https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
    query: 'https://api.safaricom.co.ke/mpesa/stkpushquery/v1/query',
  }
};

function getMpesaUrls() {
  return MPESA_URLS[MPESA_CONFIG.environment as keyof typeof MPESA_URLS] || MPESA_URLS.sandbox;
}

/**
 * Generate M-Pesa password
 */
function generatePassword(): { password: string; timestamp: string } {
  const timestamp = new Date()
    .toISOString()
    .replace(/[-:T]/g, '')
    .split('.')[0]
    .slice(0, 14);

  const password = Buffer.from(
    `${MPESA_CONFIG.businessShortCode}${MPESA_CONFIG.passKey}${timestamp}`
  ).toString('base64');

  return { password, timestamp };
}

/**
 * Get M-Pesa access token
 */
export async function getAccessToken(): Promise<string> {
  const urls = getMpesaUrls();
  
  try {
    console.log('🔐 Getting access token from:', urls.auth);

    const auth = Buffer.from(`${MPESA_CONFIG.consumerKey}:${MPESA_CONFIG.consumerSecret}`).toString('base64');

    const response = await fetch(urls.auth, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
    });

    console.log(`🔐 Auth response: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('🔐 Auth error details:', errorText);
      throw new Error(`M-Pesa authentication failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.access_token) {
      console.error('🔐 No access token in response:', data);
      throw new Error('No access token received from M-Pesa');
    }

    console.log('✅ M-Pesa access token obtained successfully');
    return data.access_token;

  } catch (error) {
    console.error('❌ M-Pesa access token error:', error);
    throw new Error(`Failed to get M-Pesa access token: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Initiate STK Push (Lipa Na M-Pesa)
 */
export async function initiateStkPush({
  amount,
  phoneNumber,
  accountReference,
  transactionDesc = 'Payment'
}: {
  amount: number;
  phoneNumber: string;
  accountReference: string;
  transactionDesc?: string;
}) {
  try {
    // Validate inputs
    if (!amount || amount <= 0) {
      throw new Error('Invalid amount');
    }
    if (!phoneNumber) {
      throw new Error('Phone number is required');
    }
    if (!accountReference) {
      throw new Error('Account reference is required');
    }

    // Clean phone number
    const cleanPhone = phoneNumber.replace(/\s/g, '');
    
    // Get access token
    const accessToken = await getAccessToken();
    
    // Generate password and timestamp
    const { password, timestamp } = generatePassword();

    // Prepare STK Push payload
    const payload = {
      BusinessShortCode: MPESA_CONFIG.businessShortCode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: Math.floor(amount),
      PartyA: cleanPhone,
      PartyB: MPESA_CONFIG.businessShortCode,
      PhoneNumber: cleanPhone,
      CallBackURL: MPESA_CONFIG.callbackUrl,
      AccountReference: accountReference,
      TransactionDesc: transactionDesc,
    };

    console.log('📤 STK Push Payload:', {
      ...payload,
      Password: '***', // Hide password in logs
      BusinessShortCode: MPESA_CONFIG.businessShortCode,
      CallBackURL: MPESA_CONFIG.callbackUrl
    });

    const urls = getMpesaUrls();
    const response = await fetch(urls.stkPush, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    let data;

    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('❌ Failed to parse M-Pesa response:', responseText);
      throw new Error(`Invalid response from M-Pesa: ${responseText}`);
    }

    console.log('📤 STK Push Response:', {
      status: response.status,
      statusText: response.statusText,
      data
    });

    if (!response.ok) {
      console.error('❌ M-Pesa STK Push failed:', {
        status: response.status,
        statusText: response.statusText,
        data
      });
      
      throw new Error(data.errorMessage || `M-Pesa request failed: ${response.status} ${response.statusText}`);
    }

    if (data.ResponseCode === '0') {
      console.log('✅ STK Push initiated successfully:', {
        checkoutRequestID: data.CheckoutRequestID,
        merchantRequestID: data.MerchantRequestID,
        customerMessage: data.CustomerMessage,
        accountReference
      });

      return {
        success: true,
        checkoutRequestID: data.CheckoutRequestID,
        merchantRequestID: data.MerchantRequestID,
        customerMessage: data.CustomerMessage,
        responseCode: data.ResponseCode,
        responseDescription: data.ResponseDescription,
        accountReference: accountReference
      };
    } else {
      console.error('❌ M-Pesa STK Push failed with response code:', data.ResponseCode);
      
      throw new Error(data.errorMessage || data.ResponseDescription || 'Failed to initiate payment');
    }

  } catch (error) {
    console.error('❌ STK Push initiation error:', error);
    throw error;
  }
}

/**
 * Query STK Push status with retry logic
 */
export async function queryStkPushStatus(checkoutRequestId: string, retryCount = 0): Promise<any> {
  const maxRetries = 3;
  const baseDelay = 2000; // 2 seconds

  try {
    if (!checkoutRequestId) {
      throw new Error('CheckoutRequestID is required');
    }

    console.log('🔍 Querying STK Push status:', { checkoutRequestId, retryCount });

    const accessToken = await getAccessToken();
    const { password, timestamp } = generatePassword();

    const payload = {
      BusinessShortCode: MPESA_CONFIG.businessShortCode,
      Password: password,
      Timestamp: timestamp,
      CheckoutRequestID: checkoutRequestId,
    };

    const urls = getMpesaUrls();
    const response = await fetch(urls.query, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    console.log(`🔍 Query Response Status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      // Handle rate limiting with retry
      if (response.status === 429 && retryCount < maxRetries) {
        const delay = baseDelay * Math.pow(2, retryCount);
        console.log(`⏳ Rate limited (429), retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return queryStkPushStatus(checkoutRequestId, retryCount + 1);
      }

      let errorDetails = '';
      try {
        const errorText = await response.text();
        errorDetails = errorText;
      } catch (textError) {
        errorDetails = 'Could not read error response';
      }

      throw new Error(`Query request failed: ${response.status} ${response.statusText} - ${errorDetails}`);
    }

    const data = await response.json();
    console.log('📋 STK Push Query Response:', data);

    if (data.ResponseCode === '0') {
      const resultCode = data.ResultCode?.toString();
      const resultDesc = data.ResultDesc;

      // Map M-Pesa result codes to our status
      let status: 'pending' | 'completed' | 'failed' | 'cancelled' | 'timeout' = 'pending';
      
      if (resultCode === '0') {
        status = 'completed';
      } else if (resultCode === '1032') {
        status = 'cancelled';
      } else if (resultCode === '1037') {
        status = 'timeout';
      } else if (['1', '2001'].includes(resultCode)) {
        status = 'failed';
      }

      return {
        success: true,
        status,
        resultCode,
        resultDesc,
        checkoutRequestId,
        merchantRequestId: data.MerchantRequestID,
        responseDescription: data.ResponseDescription
      };
    } else {
      throw new Error(data.ResponseDescription || 'Failed to query payment status');
    }

  } catch (error) {
    console.error('❌ STK Push query error:', error);
    
    // Retry on network errorMessage (but not auth errorMessage)
    if (retryCount < maxRetries && 
        error instanceof Error && 
        !error.message.includes('403') && 
        !error.message.includes('401')) {
      const delay = baseDelay * Math.pow(2, retryCount);
      console.log(`🔄 Retrying query after error, attempt ${retryCount + 1} in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return queryStkPushStatus(checkoutRequestId, retryCount + 1);
    }
    
    throw error;
  }
}

/**
 * Validate M-Pesa callback signature
 */
export function validateCallbackSignature(payload: any, signature: string): boolean {
  try {
    const payloadString = JSON.stringify(payload);
    const expectedSignature = crypto
      .createHmac('sha256', MPESA_CONFIG.passKey)
      .update(payloadString)
      .digest('hex');
    
    return expectedSignature === signature;
  } catch (error) {
    console.error('❌ Callback signature validation error:', error);
    return false;
  }
}

/**
 * Format phone number for M-Pesa (254 format)
 */
export function formatPhoneForMpesa(phone: string): string {
  const cleanPhone = phone.replace(/\s/g, '');
  
  if (cleanPhone.startsWith('254')) {
    return cleanPhone;
  } else if (cleanPhone.startsWith('0')) {
    return `254${cleanPhone.substring(1)}`;
  } else if (cleanPhone.startsWith('+254')) {
    return cleanPhone.substring(1);
  }
  
  return `254${cleanPhone}`;
}

/**
 * Parse M-Pesa callback data
 */
export function parseCallbackData(callbackData: any) {
  try {
    const stkCallback = callbackData.Body?.stkCallback;
    
    if (!stkCallback) {
      throw new Error('Invalid callback structure');
    }

    const result = {
      merchantRequestID: stkCallback.MerchantRequestID,
      checkoutRequestID: stkCallback.CheckoutRequestID,
      resultCode: stkCallback.ResultCode,
      resultDesc: stkCallback.ResultDesc,
      callbackMetadata: null as any
    };

    // Extract callback metadata if payment was successful
    if (stkCallback.ResultCode === 0 && stkCallback.CallbackMetadata) {
      const items = stkCallback.CallbackMetadata.Item || [];
      result.callbackMetadata = {
        amount: items.find((item: any) => item.Name === 'Amount')?.Value,
        mpesaReceiptNumber: items.find((item: any) => item.Name === 'MpesaReceiptNumber')?.Value,
        transactionDate: items.find((item: any) => item.Name === 'TransactionDate')?.Value,
        phoneNumber: items.find((item: any) => item.Name === 'PhoneNumber')?.Value,
      };
    }

    return result;
  } catch (error) {
    console.error('❌ Error parsing callback data:', error);
    throw new Error('Failed to parse callback data');
  }
}

/**
 * Test M-Pesa connectivity
 */
export async function testMpesaConnectivity() {
  try {
    console.log('🧪 Testing M-Pesa connectivity...');
    console.log('🔧 Configuration:', {
      environment: MPESA_CONFIG.environment,
      businessShortCode: MPESA_CONFIG.businessShortCode,
      callbackUrl: MPESA_CONFIG.callbackUrl,
      hasConsumerKey: !!MPESA_CONFIG.consumerKey,
      hasConsumerSecret: !!MPESA_CONFIG.consumerSecret,
      hasPassKey: !!MPESA_CONFIG.passKey
    });
    
    const accessToken = await getAccessToken();
    
    console.log('✅ M-Pesa connectivity test passed');
    
    return {
      success: true,
      message: 'M-Pesa connectivity test passed',
      accessToken: accessToken.substring(0, 20) + '...' // Partial token for security
    };
  } catch (error) {
    console.error('❌ M-Pesa connectivity test failed:', error);
    
    return {
      success: false,
      message: `M-Pesa connectivity test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Export configuration
export { MPESA_CONFIG };

export default {
  getAccessToken,
  initiateStkPush,
  queryStkPushStatus,
  validateCallbackSignature,
  formatPhoneForMpesa,
  parseCallbackData,
  testMpesaConnectivity,
  MPESA_CONFIG
};
