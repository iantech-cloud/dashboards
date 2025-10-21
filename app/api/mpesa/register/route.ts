'use server';

import { NextResponse } from 'next/server';

/**
 * Registers M-Pesa confirmation, validation, and callback URLs manually
 * Run this once (e.g., via POST request in Postman)
 */
export async function POST() {
  try {
    const consumerKey = process.env.MPESA_CONSUMER_KEY!;
    const consumerSecret = process.env.MPESA_CONSUMER_SECRET!;
    const shortCode = process.env.MPESA_SHORTCODE!;
    const environment = process.env.MPESA_ENVIRONMENT || 'sandbox';

    if (!consumerKey || !consumerSecret || !shortCode) {
      throw new Error('Missing one or more required M-PESA environment variables');
    }

    // Encode consumer credentials
    const credentials = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');

    // Step 1: Get Access Token
    const tokenRes = await fetch(
      environment === 'production'
        ? 'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials'
        : 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
      {
        method: 'GET',
        headers: {
          Authorization: `Basic ${credentials}`,
        },
      }
    );

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      throw new Error(`Failed to get token: ${err}`);
    }

    const { access_token } = await tokenRes.json();

    // Step 2: Define URLs
    const confirmationUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/api/mpesa/confirmation`;
    const validationUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/api/mpesa/validation`;
    const callbackUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/api/mpesa/callback`;

    const registerUrlPayload = {
      ShortCode: shortCode,
      ResponseType: 'Completed',
      ConfirmationURL: confirmationUrl,
      ValidationURL: validationUrl,
    };

    // Step 3: Register URLs
    const registerRes = await fetch(
      environment === 'production'
        ? 'https://api.safaricom.co.ke/mpesa/c2b/v1/registerurl'
        : 'https://sandbox.safaricom.co.ke/mpesa/c2b/v1/registerurl',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${access_token}`,
        },
        body: JSON.stringify(registerUrlPayload),
      }
    );

    const registerData = await registerRes.json();

    if (!registerRes.ok) {
      throw new Error(`Failed to register URLs: ${JSON.stringify(registerData)}`);
    }

    return NextResponse.json({
      success: true,
      message: 'M-Pesa URLs registered successfully',
      confirmationUrl,
      validationUrl,
      callbackUrl,
      safaricomResponse: registerData,
    });
  } catch (error: any) {
    console.error('M-Pesa URL registration error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
