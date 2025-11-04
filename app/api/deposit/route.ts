import { NextRequest, NextResponse } from 'next/server';
import { Transaction, Profile, connectToDatabase } from '@/app/lib/models';
import { auth } from '@/auth';

// M-Pesa Daraja API configuration
const MPESA_CONFIG = {
  businessShortCode: process.env.MPESA_BUSINESS_SHORTCODE!,
  passkey: process.env.MPESA_PASSKEY!,
  consumerKey: process.env.MPESA_CONSUMER_KEY!,
  consumerSecret: process.env.MPESA_CONSUMER_SECRET!,
  callbackURL: process.env.MPESA_CALLBACK_URL! || `${process.env.NEXTAUTH_URL}/api/deposit/callback`,
};

/**
 * Generate M-Pesa password
 */
function generatePassword(): string {
  const timestamp = new Date().toISOString().replace(/[-:.]/g, '').slice(0, -4);
  const password = Buffer.from(`${MPESA_CONFIG.businessShortCode}${MPESA_CONFIG.passkey}${timestamp}`).toString('base64');
  return password;
}

/**
 * Get M-Pesa access token
 */
async function getAccessToken(): Promise<string> {
  const auth = Buffer.from(`${MPESA_CONFIG.consumerKey}:${MPESA_CONFIG.consumerSecret}`).toString('base64');
  
  const response = await fetch('https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials', {
    method: 'GET',
    headers: {
      'Authorization': `Basic ${auth}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to get M-Pesa access token');
  }

  const data = await response.json();
  return data.access_token;
}

/**
 * Initiate STK Push
 */
async function initiateSTKPush(phoneNumber: string, amount: number, accountReference: string, transactionDesc: string): Promise<any> {
  const accessToken = await getAccessToken();
  const timestamp = new Date().toISOString().replace(/[-:.]/g, '').slice(0, -4);
  
  const stkPushPayload = {
    BusinessShortCode: MPESA_CONFIG.businessShortCode,
    Password: generatePassword(),
    Timestamp: timestamp,
    TransactionType: 'CustomerPayBillOnline',
    Amount: amount,
    PartyA: phoneNumber,
    PartyB: MPESA_CONFIG.businessShortCode,
    PhoneNumber: phoneNumber,
    CallBackURL: MPESA_CONFIG.callbackURL,
    AccountReference: accountReference,
    TransactionDesc: transactionDesc,
  };

  const response = await fetch('https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(stkPushPayload),
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`STK Push failed: ${errorData}`);
  }

  return await response.json();
}

/**
 * POST handler for initiating deposit via STK Push
 */
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    // Get the current user session
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized. Please log in.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { amount, phoneNumber } = body;

    // Use the authenticated user's ID
    const userId = session.user.id;

    // Input validation
    if (!amount || !phoneNumber) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields: amount, phoneNumber' },
        { status: 400 }
      );
    }

    if (amount < 10 || amount > 70000) {
      return NextResponse.json(
        { success: false, message: 'Amount must be between KES 10 and KES 70,000' },
        { status: 400 }
      );
    }

    // Normalize phone number to standard Kenyan format
    let formattedPhone = phoneNumber;
    if (phoneNumber.startsWith('254')) {
      formattedPhone = phoneNumber; // Already in the correct format
    } else if (phoneNumber.startsWith('0')) {
      formattedPhone = `254${phoneNumber.substring(1)}`; // Replace leading 0 with 254
    } else if (phoneNumber.startsWith('+254')) {
      formattedPhone = phoneNumber.substring(1); // Remove the '+' and keep '254'
    } else if (phoneNumber.startsWith('01')) {
      formattedPhone = `254${phoneNumber.substring(1)}`; // Normalize 01 to 254
    } else {
      formattedPhone = `254${phoneNumber}`; // Fallback for other formats
    }

    // Validate phone number format (Kenyan format)
    if (!/^254[17]\d{8}$/.test(formattedPhone)) {
      return NextResponse.json(
        { success: false, message: 'Invalid phone number format. Use Kenyan format (07... or 2547...)' },
        { status: 400 }
      );
    }

    // Get user profile
    const user = await Profile.findById(userId);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    // Generate unique transaction reference
    const transactionRef = `DP${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    // Initiate STK Push
    const stkResponse = await initiateSTKPush(
      formattedPhone,
      Math.floor(amount), // M-Pesa expects whole numbers
      `HustleHub-${user.username.substring(0, 8)}`,
      'Deposit to Hustle Hub Africa'
    );

    if (stkResponse.ResponseCode !== '0') {
      return NextResponse.json(
        { success: false, message: `STK Push failed: ${stkResponse.ResponseDescription}` },
        { status: 400 }
      );
    }

    // Create pending transaction record
    const pendingTransaction = await Transaction.create({
      user_id: userId,
      amount_cents: Math.round(amount * 100),
      type: 'DEPOSIT',
      description: `M-Pesa Deposit - Pending`,
      status: 'pending',
      transaction_code: transactionRef,
      metadata: {
        mpesa_request_id: stkResponse.CheckoutRequestID,
        merchant_request_id: stkResponse.MerchantRequestID,
        customer_message: stkResponse.CustomerMessage,
        phone_number: formattedPhone,
        stk_push_response: stkResponse
      },
      created_at: new Date(),
    });

    return NextResponse.json({
      success: true,
      data: {
        checkoutRequestId: stkResponse.CheckoutRequestID,
        merchantRequestId: stkResponse.MerchantRequestID,
        customerMessage: stkResponse.CustomerMessage,
        transactionId: pendingTransaction._id.toString(),
        transactionRef: transactionRef,
      },
      message: 'STK Push initiated successfully. Please check your phone to complete the payment.'
    });

  } catch (error) {
    console.error('Deposit API Error:', error);
    
    let errorMessage = 'Internal Server Error while processing deposit';
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    );
  }
}
