// app/api/activate/initiate/route.ts
// Sessionless endpoint — initiates M-Pesa STK push for account activation by email.
// No NextAuth session required so newly verified users can pay before logging in.
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/app/lib/mongoose';
import {
  Profile,
  ActivationPayment,
  ActivationLog,
  MpesaTransaction,
} from '@/app/lib/models';
import { initiateStkPush } from '@/app/lib/mpesa';

export async function POST(request: NextRequest) {
  try {
    const { email, phoneNumber } = await request.json();

    if (!email || !phoneNumber) {
      return NextResponse.json(
        { success: false, message: 'Email and phone number are required' },
        { status: 400 },
      );
    }

    await connectToDatabase();

    const userProfile = await (Profile as any).findOne({
      email: email.toLowerCase().trim(),
    });

    if (!userProfile) {
      return NextResponse.json({ success: false, message: 'User profile not found' }, { status: 404 });
    }

    if (!userProfile.is_verified) {
      return NextResponse.json({ success: false, message: 'Email not verified' }, { status: 403 });
    }

    const isActivationPaid =
      userProfile.approval_status !== 'pending' || userProfile.rank !== 'Unactivated';
    if (isActivationPaid) {
      return NextResponse.json({ success: false, message: 'Account is already activated' }, { status: 409 });
    }

    // Format phone number
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    let formattedPhone = cleanPhone;
    if (cleanPhone.startsWith('0') && cleanPhone.length === 10) {
      formattedPhone = `254${cleanPhone.substring(1)}`;
    } else if (cleanPhone.startsWith('254') && cleanPhone.length === 12) {
      formattedPhone = cleanPhone;
    } else {
      return NextResponse.json(
        { success: false, message: 'Invalid phone number format. Use 07XXXXXXXX or 2547XXXXXXXX' },
        { status: 400 },
      );
    }

    const activationAmount = userProfile.activation_amount_cents || 100000; // 1000 KES in cents

    // Create activation payment record
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
        initiated_at: new Date().toISOString(),
        initiated_without_session: true,
      },
    });
    await activationPayment.save();

    // Create activation log
    const activationLog = new (ActivationLog as any)({
      user_id: userProfile._id,
      action: 'initiated',
      amount_cents: activationAmount,
      phone_number: formattedPhone,
      status: 'pending',
      metadata: { activation_payment_id: activationPayment._id },
    });
    await activationLog.save();

    // Initiate M-Pesa STK Push (callbackUrl comes from MPESA_CONFIG in mpesa.ts)
    const baseUrl =
      process.env.NEXTAUTH_URL ||
      process.env.AUTH_URL ||
      `https://${request.headers.get('host')}`;

    let mpesaResult: Awaited<ReturnType<typeof initiateStkPush>>;
    try {
      mpesaResult = await initiateStkPush({
        amount: Math.ceil(activationAmount / 100), // convert cents to KES whole units
        phoneNumber: formattedPhone,
        accountReference: `ACTIVATION-${userProfile._id}`,
        transactionDesc: `Activation fee for ${userProfile.username}`,
      });
    } catch (stkError: any) {
      activationPayment.status = 'failed';
      activationPayment.error_message = stkError?.message || 'STK push failed';
      await activationPayment.save();
      activationLog.status = 'failed';
      activationLog.error_message = stkError?.message || 'STK push failed';
      await activationLog.save();
      return NextResponse.json(
        { success: false, message: stkError?.message || 'Failed to initiate M-Pesa payment' },
        { status: 502 },
      );
    }

    // initiateStkPush returns { success, checkoutRequestID, merchantRequestID, ... }
    activationPayment.checkout_request_id = mpesaResult.checkoutRequestID;
    activationPayment.provider_reference = mpesaResult.merchantRequestID;
    activationPayment.metadata = {
      ...activationPayment.metadata,
      callback_url: `${baseUrl}/api/mpesa/callback`,
      stk_push_initiated_at: new Date().toISOString(),
    };
    await activationPayment.save();

    const mpesaTransaction = new (MpesaTransaction as any)({
      user_id: userProfile._id,
      amount_cents: activationAmount,
      phone_number: formattedPhone,
      account_reference: `ACTIVATION-${userProfile._id}`,
      transaction_desc: `Account activation fee for ${userProfile.username}`,
      checkout_request_id: mpesaResult.checkoutRequestID,
      merchant_request_id: mpesaResult.merchantRequestID,
      status: 'pending',
      is_activation_payment: true,
      source: 'activation',
      metadata: {
        activation_payment_id: activationPayment._id,
        callback_url: `${baseUrl}/api/mpesa/callback`,
        user_username: userProfile.username,
      },
    });
    await mpesaTransaction.save();

    activationPayment.mpesa_transaction_id = mpesaTransaction._id;
    await activationPayment.save();

    activationLog.metadata = {
      ...activationLog.metadata,
      checkout_request_id: mpesaResult.checkoutRequestID,
      merchant_request_id: mpesaResult.merchantRequestID,
      mpesa_transaction_id: mpesaTransaction._id,
    };
    await activationLog.save();

    return NextResponse.json({
      success: true,
      data: {
        checkoutRequestId: mpesaResult.checkoutRequestID,
        amount: activationAmount,
        phoneNumber: formattedPhone,
        activationPaymentId: activationPayment._id.toString(),
        merchantRequestId: mpesaResult.merchantRequestID,
      },
    });
  } catch (error) {
    console.error('Activate initiate error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
