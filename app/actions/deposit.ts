// app/actions/deposit.ts
'use server';

import { getServerSession } from 'next-auth';
import { revalidatePath } from 'next/cache';
import { connectToDatabase, Profile, MpesaTransaction, Transaction } from '../lib/models';
import { authOptions } from '@/auth';

// M-Pesa configuration matching transactions.ts
const MPESA_CONFIG = {
    consumerKey: process.env.MPESA_CONSUMER_KEY!,
    consumerSecret: process.env.MPESA_CONSUMER_SECRET!,
    shortCode: process.env.MPESA_SHORTCODE!,
    passkey: process.env.MPESA_PASSKEY!,
    callbackURL: process.env.MPESA_CALLBACK_URL!,
    environment: process.env.MPESA_ENVIRONMENT || 'sandbox',
};

// Type definitions for M-Pesa responses
interface MpesaSTKPushResponse {
    ResponseCode: string;
    ResponseDescription: string;
    CustomerMessage: string;
    CheckoutRequestID?: string;
    MerchantRequestID?: string;
}

interface MpesaQueryResponse {
    ResultCode: string;
    ResultDesc: string;
    MpesaReceiptNumber?: string;
}

interface DepositHistoryItem {
    id: string;
    type: string;
    amount: number;
    description: string;
    date: string;
    status: string;
    mpesaReceiptNumber?: string;
}

interface UserBalance {
    balance: number;
    balance_cents: number;
}

interface ValidationResult {
    valid: boolean;
    message: string;
    data?: { formattedPhone: string };
}

interface ProcessDepositResponse {
    success: boolean;
    data?: any;
    message: string;
}

interface PaymentStatusResponse {
    success: boolean;
    data?: any;
    message: string;
}

interface DepositHistoryResponse {
    success: boolean;
    data?: DepositHistoryItem[];
    message: string;
    pagination?: {
        page: number;
        limit: number;
        total: number;
        pages: number;
    };
}

interface BalanceResponse {
    success: boolean;
    data?: UserBalance;
    message: string;
}

// Session type guard
interface SessionWithUser {
    user: {
        email?: string | null;
        name?: string | null;
        image?: string | null;
    };
    expires: string;
}

function isValidSession(session: unknown): session is SessionWithUser {
    return (
        session !== null &&
        typeof session === 'object' &&
        'user' in session &&
        session.user !== null &&
        typeof session.user === 'object' &&
        'email' in session.user &&
        typeof session.user.email === 'string' &&
        session.user.email.length > 0
    );
}

/**
 * Generate M-Pesa access token
 */
async function getMpesaAccessToken(): Promise<string> {
    const auth = Buffer.from(`${MPESA_CONFIG.consumerKey}:${MPESA_CONFIG.consumerSecret}`).toString('base64');
    
    const response = await fetch(
        MPESA_CONFIG.environment === 'sandbox'    
            ? 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials'
            : 'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
        {
            method: 'GET',
            headers: {
                'Authorization': `Basic ${auth}`,
            },
        }
    );

    if (!response.ok) {
        throw new Error('Failed to get M-Pesa access token');
    }

    const data = await response.json();
    return data.access_token;
}

/**
 * Generate correct M-Pesa timestamp
 */
function generateMpesaTimestamp(): string {
    const now = new Date();
    
    // Format: YYYYMMDDHHmmss (M-Pesa required format)
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    return `${year}${month}${day}${hours}${minutes}${seconds}`;
}

/**
 * Generate M-Pesa password
 */
function generateMpesaPassword(timestamp: string): string {
    const password = Buffer.from(`${MPESA_CONFIG.shortCode}${MPESA_CONFIG.passkey}${timestamp}`).toString('base64');
    return password;
}

/**
 * Validate deposit parameters
 */
async function validateDeposit(
    userId: string, 
    amount: number, 
    phoneNumber: string
): Promise<ValidationResult> {
    if (amount < 10 || amount > 70000) {
        return { valid: false, message: 'Amount must be between KES 10 and KES 70,000' };
    }

    // Format phone number to 254 format if needed
    let formattedPhone = phoneNumber;
    if (phoneNumber.startsWith('0') && phoneNumber.length === 10) {
        formattedPhone = `254${phoneNumber.substring(1)}`;
    } else if (phoneNumber.startsWith('+254')) {
        formattedPhone = phoneNumber.substring(1);
    }

    if (!formattedPhone.match(/^254[0-9]{9}$/)) {
        return { valid: false, message: 'Invalid phone number format. Use 07XXXXXXXX, 2547XXXXXXXX, or +2547XXXXXXXX' };
    }

    await connectToDatabase();
    const user = await (Profile as any).findOne({ _id: userId });
    if (!user) {
        return { valid: false, message: 'User not found' };
    }

    // Check for pending M-Pesa transactions
    const pendingMpesaTransaction = await (MpesaTransaction as any).findOne({
        user_id: userId,
        status: { $in: ['initiated', 'pending'] },
        phone_number: formattedPhone,
    });

    if (pendingMpesaTransaction) {
        return { valid: false, message: 'You have a pending M-Pesa transaction. Please complete or wait for it to be processed.' };
    }

    return { valid: true, message: 'Validation passed', data: { formattedPhone } };
}

/**
 * Map M-Pesa result codes to VALID database enum values
 * ONLY uses codes that exist in your MpesaTransaction schema
 */
function mapMpesaResultCode(resultCode: string): number {
    const code = parseInt(resultCode);
    
    // ONLY use codes that are DEFINITELY in your schema enum
    const validSchemaCodes = [
        0,      // Success
        1,      // Insufficient funds
        2,      // Less than minimum allowed
        3,      // More than maximum allowed
        4,      // Would exceed daily limit
        5,      // Would exceed minimum balance
        6,      // Unsupported feature
        7,      // Suspended
        8,      // Inactive
        10,     // Invalid short code
        11,     // Invalid security credentials
        12,     // Invalid initiator
        13,     // Invalid sender
        14,     // Invalid receiver
        15,     // Invalid amount
        17,     // Invalid transaction
        20,     // Invalid arguments
        26,     // Invalid reference
        1032,   // Request cancelled by user
        1037,   // Request timeout
        2001,   // Invalid phone number
    ];
    
    if (validSchemaCodes.includes(code)) {
        return code;
    }
    
    // For ALL unknown codes, use safe defaults that exist in your schema
    if (code === 0 || (code > 0 && code < 1000)) {
        return 11; // Internal error for unknown success-like codes
    }
    
    if (code >= 1000 && code <= 1999) {
        return 1032; // User cancellation/timeout type errors
    }
    
    if (code >= 2000 && code <= 2999) {
        return 2001; // Configuration errors
    }
    
    // Default to internal error for ALL other unknown codes
    return 11;
}

/**
 * Map M-Pesa API status codes to VALID database status enum values
 * ONLY uses status values that exist in your MpesaTransaction schema
 */
function mapMpesaStatus(resultCode: string): string {
    const statusMap: { [key: string]: string } = {
        '0': 'completed',      // Success
        '1': 'failed',         // Insufficient funds
        '1032': 'cancelled',   // Request cancelled by user
        '1037': 'timeout',     // Request timeout
        '2001': 'failed',      // Invalid phone number
        // Map "in progress" codes to 'initiated' instead
        '1026': 'initiated',   // Transaction in progress
        '1031': 'initiated',   // Request already in progress
        '4999': 'initiated',   // Transaction in progress
    };

    // Default to 'failed' for ALL unknown codes
    return statusMap[resultCode] || 'failed';
}

/**
 * Update Transaction record to match M-Pesa transaction status
 */
async function syncTransactionWithMpesaStatus(
    mpesaTransactionId: any, 
    status: string, 
    resultCode: number, 
    resultDesc: string,
    mpesaReceiptNumber?: string
): Promise<void> {
    try {
        const updateData: any = {
            status: status,
            metadata: {
                result_code: resultCode,
                result_desc: resultDesc,
                status_updated_at: new Date().toISOString()
            }
        };

        // Add receipt number for completed transactions
        if (status === 'completed' && mpesaReceiptNumber) {
            updateData.metadata.mpesa_receipt_number = mpesaReceiptNumber;
            updateData.metadata.completed_at = new Date().toISOString();
        }

        // Add failed/cancelled timestamp
        if (['failed', 'cancelled', 'timeout'].includes(status)) {
            updateData.metadata.failed_at = new Date().toISOString();
        }

        await (Transaction as any).findOneAndUpdate(
            { mpesa_transaction_id: mpesaTransactionId },
            updateData
        );

        console.log(`🔄 Successfully synced Transaction status to: ${status}`);
    } catch (error) {
        console.error('❌ Failed to sync Transaction status:', error);
        throw error;
    }
}

/**
 * Update user balance for completed transactions
 */
async function updateUserBalance(userId: string, amountCents: number): Promise<void> {
    try {
        const user = await (Profile as any).findById(userId);
        if (user) {
            user.balance_cents += amountCents;
            await user.save();
            console.log('💰 Updated user balance:', user.balance_cents);
            revalidatePath('/dashboard/wallet');
            revalidatePath('/dashboard');
        }
    } catch (error) {
        console.error('❌ Failed to update user balance:', error);
        throw error;
    }
}

/**
 * Process M-Pesa deposit with STK Push
 */
export async function processMpesaDeposit(depositData: {
    amount: number;
    phoneNumber: string;
}): Promise<ProcessDepositResponse> {
    try {
        console.log('🎯 Starting M-Pesa deposit process:', depositData);

        const session = await getServerSession(authOptions);
        
        if (!isValidSession(session)) {
            return { success: false, message: 'User not authenticated' };
        }

        await connectToDatabase();
        const currentUser = await (Profile as any).findOne({ email: session.user.email });

        if (!currentUser) {
            return { success: false, message: 'User profile not found' };
        }

        // Validate deposit parameters
        const validationResult = await validateDeposit(currentUser._id.toString(), depositData.amount, depositData.phoneNumber);
        if (!validationResult.valid) {
            return { success: false, message: validationResult.message };
        }

        const formattedPhone = validationResult.data?.formattedPhone || depositData.phoneNumber;

        // Get M-Pesa access token
        console.log('🔑 Getting M-Pesa access token...');
        const accessToken = await getMpesaAccessToken();
        
        // Generate timestamp and password
        const timestamp = generateMpesaTimestamp();
        const password = generateMpesaPassword(timestamp);
        
        // Convert amount to cents for internal records
        const amountCents = Math.round(depositData.amount * 100);

        // STK Push request payload
        const stkPushPayload = {
            BusinessShortCode: MPESA_CONFIG.shortCode,
            Password: password,
            Timestamp: timestamp,
            TransactionType: 'CustomerPayBillOnline',
            Amount: depositData.amount,
            PartyA: formattedPhone,
            PartyB: MPESA_CONFIG.shortCode,
            PhoneNumber: formattedPhone,
            CallBackURL: MPESA_CONFIG.callbackURL,
            AccountReference: `DEPOSIT-${currentUser._id.toString().slice(-8).toUpperCase()}`,
            TransactionDesc: `Wallet deposit - ${currentUser.username}`
        };

        console.log('📦 STK Push Payload:', {
            ...stkPushPayload,
            Password: '***' // Don't log full password
        });

        // Initiate STK Push
        console.log('🚀 Initiating STK Push...');
        const stkResponse = await fetch(
            MPESA_CONFIG.environment === 'sandbox'
                ? 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest'
                : 'https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(stkPushPayload),
            }
        );

        if (!stkResponse.ok) {
            const errorData = await stkResponse.text();
            console.error('❌ M-Pesa STK Push error:', errorData);
            return { success: false, message: 'Failed to initiate M-Pesa payment. Please try again.' };
        }

        const stkData: MpesaSTKPushResponse = await stkResponse.json();
        console.log('📨 STK Push response:', stkData);

        if (stkData.ResponseCode === '0') {
            // Create M-Pesa transaction record
            const mpesaTransaction = await (MpesaTransaction as any).create({
                user_id: currentUser._id,
                amount_cents: amountCents,
                phone_number: formattedPhone,
                account_reference: stkPushPayload.AccountReference,
                transaction_desc: stkPushPayload.TransactionDesc,
                checkout_request_id: stkData.CheckoutRequestID,
                merchant_request_id: stkData.MerchantRequestID,
                status: 'initiated',
                stk_push_response: stkData,
                result_code: 1032, // Default to initiated status
                result_desc: 'STK Push initiated successfully',
                metadata: {
                    user_username: currentUser.username,
                    deposit_type: 'wallet_topup',
                    initiated_at: new Date().toISOString(),
                    callback_url: MPESA_CONFIG.callbackURL
                }
            });

            // Create pending transaction record linked to M-Pesa transaction
            const transaction = await (Transaction as any).create({
                user_id: currentUser._id,
                amount_cents: amountCents,
                type: 'DEPOSIT',
                description: `M-Pesa deposit from ${formattedPhone}`,
                status: 'pending',
                mpesa_transaction_id: mpesaTransaction._id,
                metadata: {
                    phoneNumber: formattedPhone,
                    provider: 'mpesa',
                    checkoutRequestID: stkData.CheckoutRequestID,
                    merchantRequestID: stkData.MerchantRequestID,
                    accountReference: stkPushPayload.AccountReference,
                    initiated_at: new Date().toISOString()
                }
            });

            console.log('✅ M-Pesa transaction created:', mpesaTransaction._id);
            console.log('✅ Transaction record created:', transaction._id);

            revalidatePath('/dashboard/wallet');
            revalidatePath('/dashboard');

            return {
                success: true,
                data: {
                    CheckoutRequestID: stkData.CheckoutRequestID,
                    MerchantRequestID: stkData.MerchantRequestID,
                    ResponseDescription: stkData.ResponseDescription,
                    CustomerMessage: stkData.CustomerMessage,
                    Amount: depositData.amount,
                    PhoneNumber: formattedPhone,
                    AccountReference: stkPushPayload.AccountReference,
                    transactionId: transaction._id.toString(),
                    mpesaTransactionId: mpesaTransaction._id.toString()
                },
                message: stkData.CustomerMessage || 'STK Push initiated successfully. Please check your phone for the prompt.'
            };
        } else {
            console.error('❌ STK Push failed with code:', stkData.ResponseCode);
            return {
                success: false,
                message: stkData.ResponseDescription || 'Failed to initiate M-Pesa payment. Please try again.'
            };
        }

    } catch (error) {
        console.error('💥 Process M-Pesa deposit error:', error);
        return { 
            success: false, 
            message: 'An error occurred while processing your deposit. Please try again.' 
        };
    }
}

/**
 * Check M-Pesa payment status - COMPLETELY FIXED VERSION
 */
export async function checkMpesaPaymentStatus(checkoutRequestId: string): Promise<PaymentStatusResponse> {
    try {
        console.log('🔍 Checking M-Pesa payment status:', checkoutRequestId);

        const session = await getServerSession(authOptions);
        
        if (!isValidSession(session)) {
            return { success: false, message: 'User not authenticated' };
        }

        await connectToDatabase();

        // First check database for existing status
        const mpesaTransaction = await (MpesaTransaction as any).findOne({
            checkout_request_id: checkoutRequestId
        });

        if (!mpesaTransaction) {
            return { success: false, message: 'Transaction not found' };
        }

        // If already completed or failed, return current status
        if (['completed', 'failed', 'cancelled', 'timeout'].includes(mpesaTransaction.status)) {
            return {
                success: true,
                data: {
                    status: mpesaTransaction.status,
                    resultCode: mpesaTransaction.result_code,
                    resultDesc: mpesaTransaction.result_desc,
                    mpesaReceiptNumber: mpesaTransaction.mpesa_receipt_number,
                    amount: mpesaTransaction.amount_cents,
                    completedAt: mpesaTransaction.completed_at,
                    failedAt: mpesaTransaction.failed_at,
                    source: 'database'
                },
                message: `Payment status: ${mpesaTransaction.status}`
            };
        }

        // Query M-Pesa API for current status
        console.log('📡 Querying M-Pesa API for status...');
        const accessToken = await getMpesaAccessToken();
        const timestamp = generateMpesaTimestamp();
        const password = generateMpesaPassword(timestamp);

        const queryPayload = {
            BusinessShortCode: MPESA_CONFIG.shortCode,
            Password: password,
            Timestamp: timestamp,
            CheckoutRequestID: checkoutRequestId
        };

        console.log('📦 M-Pesa Query Payload:', {
            ...queryPayload,
            Password: '***'
        });

        const queryResponse = await fetch(
            MPESA_CONFIG.environment === 'sandbox'
                ? 'https://sandbox.safaricom.co.ke/mpesa/stkpushquery/v1/query'
                : 'https://api.safaricom.co.ke/mpesa/stkpushquery/v1/query',
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(queryPayload),
            }
        );

        if (!queryResponse.ok) {
            const errorText = await queryResponse.text();
            console.error('❌ M-Pesa query API error:', errorText);
            // Return database status if API query fails
            return {
                success: true,
                data: {
                    status: mpesaTransaction.status,
                    resultCode: mpesaTransaction.result_code,
                    resultDesc: mpesaTransaction.result_desc,
                    source: 'database_fallback'
                },
                message: 'Using last known status'
            };
        }

        const queryData: MpesaQueryResponse = await queryResponse.json();
        console.log('📨 M-Pesa query response:', queryData);

        // Use ONLY VALID enum values for your schema
        const safeResultCode = mapMpesaResultCode(queryData.ResultCode);
        const safeStatus = mapMpesaStatus(queryData.ResultCode);

        console.log('🔄 Safe Status Mapping:', {
            originalCode: queryData.ResultCode,
            safeResultCode: safeResultCode,
            safeStatus: safeStatus,
            resultDesc: queryData.ResultDesc
        });

        // Update M-Pesa transaction with ONLY VALID values
        mpesaTransaction.status = safeStatus;
        mpesaTransaction.result_code = safeResultCode;
        mpesaTransaction.result_desc = queryData.ResultDesc || 'No description provided';

        // Set appropriate dates based on final status
        if (safeStatus === 'completed') {
            mpesaTransaction.mpesa_receipt_number = queryData.MpesaReceiptNumber;
            mpesaTransaction.completed_at = new Date();
        } else if (['failed', 'cancelled', 'timeout'].includes(safeStatus)) {
            mpesaTransaction.failed_at = new Date();
        }
        // For 'initiated' status, don't set completion dates

        try {
            await mpesaTransaction.save();
            console.log('💾 Successfully updated M-Pesa transaction with safe status:', safeStatus);
        } catch (saveError) {
            console.error('❌ CRITICAL: Failed to save M-Pesa transaction with safe values:', saveError);
            console.error('❌ Transaction data that failed:', {
                status: safeStatus,
                result_code: safeResultCode,
                result_desc: mpesaTransaction.result_desc
            });
            
            // Return the safe status without saving to database
            return {
                success: true,
                data: {
                    status: safeStatus,
                    resultCode: safeResultCode,
                    resultDesc: queryData.ResultDesc,
                    mpesaReceiptNumber: queryData.MpesaReceiptNumber,
                    amount: mpesaTransaction.amount_cents,
                    source: 'api_unsaved'
                },
                message: `Payment status: ${safeStatus} (database update failed)`
            };
        }

        // CRITICAL FIX: Update Transaction record for ALL final statuses, not just 'completed'
        if (['completed', 'failed', 'cancelled', 'timeout'].includes(safeStatus)) {
            try {
                await syncTransactionWithMpesaStatus(
                    mpesaTransaction._id,
                    safeStatus,
                    safeResultCode,
                    queryData.ResultDesc,
                    queryData.MpesaReceiptNumber
                );

                // Only update user balance for completed transactions
                if (safeStatus === 'completed') {
                    await updateUserBalance(mpesaTransaction.user_id, mpesaTransaction.amount_cents);
                }
            } catch (updateError) {
                console.error('❌ Failed to update transaction or user balance:', updateError);
                // Continue even if update fails - the main transaction status is what matters
            }
        }

        return {
            success: true,
            data: {
                status: mpesaTransaction.status,
                resultCode: mpesaTransaction.result_code,
                resultDesc: mpesaTransaction.result_desc,
                mpesaReceiptNumber: mpesaTransaction.mpesa_receipt_number,
                amount: mpesaTransaction.amount_cents,
                completedAt: mpesaTransaction.completed_at,
                failedAt: mpesaTransaction.failed_at,
                source: 'api'
            },
            message: `Payment status: ${mpesaTransaction.status}`
        };

    } catch (error) {
        console.error('💥 Check M-Pesa payment status error:', error);
        return { 
            success: false, 
            message: 'Failed to check payment status. Please try again.' 
        };
    }
}

/**
 * Sync transaction status with M-Pesa transaction status for existing records
 */
export async function syncTransactionStatus(transactionId: string): Promise<PaymentStatusResponse> {
    try {
        console.log('🔄 Syncing transaction status for:', transactionId);

        await connectToDatabase();
        
        const transaction = await (Transaction as any).findById(transactionId);
        if (!transaction || !transaction.mpesa_transaction_id) {
            return { success: false, message: 'Transaction not found or not linked to M-Pesa' };
        }

        const mpesaTransaction = await (MpesaTransaction as any).findById(transaction.mpesa_transaction_id);
        if (!mpesaTransaction) {
            return { success: false, message: 'M-Pesa transaction not found' };
        }

        // If statuses don't match and M-Pesa has a final status, update the transaction
        if (transaction.status !== mpesaTransaction.status && 
            ['completed', 'failed', 'cancelled', 'timeout'].includes(mpesaTransaction.status)) {
            
            await syncTransactionWithMpesaStatus(
                mpesaTransaction._id,
                mpesaTransaction.status,
                mpesaTransaction.result_code,
                mpesaTransaction.result_desc,
                mpesaTransaction.mpesa_receipt_number
            );

            // Update user balance if it's completed and balance wasn't updated
            if (mpesaTransaction.status === 'completed') {
                const user = await (Profile as any).findById(mpesaTransaction.user_id);
                if (user && user.balance_cents < mpesaTransaction.amount_cents) {
                    await updateUserBalance(mpesaTransaction.user_id, mpesaTransaction.amount_cents);
                }
            }

            console.log(`✅ Successfully synced transaction ${transactionId} from ${transaction.status} to ${mpesaTransaction.status}`);
        }

        // Get updated transaction
        const updatedTransaction = await (Transaction as any).findById(transactionId);

        return {
            success: true,
            data: {
                transactionStatus: updatedTransaction.status,
                mpesaStatus: mpesaTransaction.status,
                synced: updatedTransaction.status === mpesaTransaction.status,
                previousStatus: transaction.status
            },
            message: `Transaction status: ${updatedTransaction.status}`
        };

    } catch (error) {
        console.error('💥 Sync transaction status error:', error);
        return { 
            success: false, 
            message: 'Failed to sync transaction status' 
        };
    }
}

/**
 * Get deposit history
 */
export async function getDepositHistory(limit: number = 20, page: number = 1): Promise<DepositHistoryResponse> {
    try {
        const session = await getServerSession(authOptions);
        
        if (!isValidSession(session)) {
            return { success: false, message: 'User not authenticated' };
        }

        await connectToDatabase();
        const currentUser = await (Profile as any).findOne({ email: session.user.email });

        if (!currentUser) {
            return { success: false, message: 'User not found' };
        }

        const skip = (page - 1) * limit;

        // Get deposit transactions
        const deposits = await (Transaction as any).find({
            user_id: currentUser._id,
            type: 'DEPOSIT'
        })
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

        const total = await (Transaction as any).countDocuments({
            user_id: currentUser._id,
            type: 'DEPOSIT'
        });

        // Transform data for frontend
        const transformedDeposits: DepositHistoryItem[] = deposits.map((deposit: any) => ({
            id: deposit._id?.toString(),
            type: deposit.type,
            amount: deposit.amount_cents / 100,
            description: deposit.description,
            date: deposit.created_at?.toISOString() || new Date().toISOString(),
            status: deposit.status,
            mpesaReceiptNumber: deposit.metadata?.mpesa_receipt_number
        }));

        return {
            success: true,
            data: transformedDeposits,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            },
            message: 'Deposit history fetched successfully'
        };

    } catch (error) {
        console.error('Get deposit history error:', error);
        return {
            success: false,
            message: 'Failed to fetch deposit history',
            data: []
        };
    }
}

/**
 * Get user balance
 */
export async function getUserBalance(): Promise<BalanceResponse> {
    try {
        const session = await getServerSession(authOptions);
        
        if (!isValidSession(session)) {
            return { success: false, message: 'User not authenticated' };
        }

        await connectToDatabase();
        const currentUser = await (Profile as any).findOne({ email: session.user.email });

        if (!currentUser) {
            return { success: false, message: 'User not found' };
        }

        return {
            success: true,
            data: {
                balance: (currentUser.balance_cents || 0) / 100,
                balance_cents: currentUser.balance_cents || 0
            },
            message: 'Balance fetched successfully'
        };

    } catch (error) {
        console.error('Get user balance error:', error);
        return {
            success: false,
            message: 'Failed to fetch user balance',
            data: { balance: 0, balance_cents: 0 }
        };
    }
}

/**
 * Validate deposit amount
 */
export async function validateDepositAmount(amount: number): Promise<ValidationResult> {
    try {
        if (amount < 10 || amount > 70000) {
            return {
                valid: false,
                message: 'Amount must be between KES 10 and KES 70,000'
            };
        }

        return {
            valid: true,
            message: 'Amount is valid'
        };
    } catch (error) {
        console.error('Validate deposit amount error:', error);
        return {
            valid: false,
            message: 'Error validating deposit amount'
        };
    }
}
