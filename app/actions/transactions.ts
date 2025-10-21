'use server';

import {
	connectToDatabase,
	Profile,
	Transaction,
	Withdrawal,
	MpesaTransaction
} from '../lib/models';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { revalidatePath } from 'next/cache';

// M-Pesa Daraja API configuration
const MPESA_CONFIG = {
	consumerKey: process.env.MPESA_CONSUMER_KEY!,
	consumerSecret: process.env.MPESA_CONSUMER_SECRET!,
	shortCode: process.env.MPESA_SHORTCODE!,
	passkey: process.env.MPESA_PASSKEY!,
	callbackURL: process.env.MPESA_CALLBACK_URL!,
	environment: process.env.MPESA_ENVIRONMENT || 'sandbox', // sandbox or production
};

// Generate M-Pesa access token
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

// Generate M-Pesa password - FIXED TIMESTAMP
function generateMpesaPassword(timestamp: string): string {
	const password = Buffer.from(`${MPESA_CONFIG.shortCode}${MPESA_CONFIG.passkey}${timestamp}`).toString('base64');
	return password;
}

// Generate correct M-Pesa timestamp - FIXED
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

// Helper function to transform MongoDB documents to plain objects
function transformTransaction(transaction: any): any {
	const plainTransaction = transaction.toObject ? transaction.toObject() : transaction;
    
    const serializeValue = (value: any) => {
        if (value && typeof value === 'object') {
            if (value.constructor.name === 'ObjectId' || (value.buffer && value.constructor.name === 'ObjectID')) {
                return value.toString();
            }
            if (Array.isArray(value)) {
                return value.map(serializeValue);
            }
            if (Buffer.isBuffer(value)) {
                return value.toString('hex');
            }
            const newObj: { [key: string]: any } = {};
            for (const key in value) {
                newObj[key] = serializeValue(value[key]);
            }
            return newObj;
        }
        if (value instanceof Date) {
            return value.toISOString();
        }
        return value;
    };

	return {
		id: plainTransaction._id?.toString(),
		user_id: plainTransaction.user_id?.toString(),
		amount_cents: plainTransaction.amount_cents,
		type: plainTransaction.type,
		description: plainTransaction.description,
		status: plainTransaction.status,
		transaction_code: plainTransaction.transaction_code,
		metadata: serializeValue(plainTransaction.metadata), 
		mpesa_transaction_id: plainTransaction.mpesa_transaction_id?.toString(),
		reconciled: plainTransaction.reconciled,
		created_at: plainTransaction.created_at?.toISOString(),
		updated_at: plainTransaction.updated_at?.toISOString(),
		__v: plainTransaction.__v
	};
}

async function resetDailyLimitsIfNeeded(user: any) {
	const now = new Date();
	const lastDepositReset = new Date(user.last_deposit_reset);
	
	if (now.toDateString() !== lastDepositReset.toDateString()) {
		await Profile.findByIdAndUpdate(user._id, {
			total_deposits_today_cents: 0,
			total_withdrawals_today_cents: 0,
			last_deposit_reset: now,
			last_withdrawal_reset: now
		});
	}
}

async function validateDeposit(userId: string, amount: number, phoneNumber: string): Promise<{ valid: boolean; message: string }> {
	if (amount < 10 || amount > 70000) {
		return { valid: false, message: 'Amount must be between KES 10 and KES 70,000' };
	}

	if (!phoneNumber.match(/^254[0-9]{9}$/)) {
		return { valid: false, message: 'Invalid phone number format. Use 2547XXXXXXXX' };
	}

	await connectToDatabase();
	const user = await Profile.findById(userId);
	if (!user) {
		return { valid: false, message: 'User not found' };
	}

	await resetDailyLimitsIfNeeded(user);
	const updatedUser = await Profile.findById(userId).lean();
	if (!updatedUser) {
		return { valid: false, message: 'User data refresh failed' };
	}

	const amountCents = Math.round(amount * 100);
	if (updatedUser.total_deposits_today_cents + amountCents > updatedUser.daily_deposit_limit_cents) {
		return { valid: false, message: `Daily deposit limit exceeded. Maximum: KES ${(updatedUser.daily_deposit_limit_cents / 100).toFixed(2)}` };
	}

	const pendingMpesaTransaction = await MpesaTransaction.findOne({
		user_id: userId,
		status: { $in: ['initiated', 'pending'] },
		phone_number: phoneNumber,
	});

	if (pendingMpesaTransaction) {
		return { valid: false, message: 'You have a pending M-Pesa transaction. Please complete or wait for the callback.' };
	}

	return { valid: true, message: 'Validation passed' };
}

async function updateDailyDepositLimit(userId: string, amountCents: number) {
	await Profile.findByIdAndUpdate(userId, {
		$inc: { total_deposits_today_cents: amountCents },
		last_deposit_at: new Date()
	});
}

// ----------------------------------------------------------------------
// EXPORTED ACTIONS
// ----------------------------------------------------------------------

export async function getTransactions(limit: number = 50): Promise<{	
	success: boolean;	
	data?: any[];	
	message: string	
}> {
	try {
		const session = await getServerSession(authOptions);
		
		if (!session?.user?.email) {
			return { success: false, message: 'Unauthorized' };
		}

		await connectToDatabase();
		const currentUser = await Profile.findOne({ email: session.user.email });

		if (!currentUser) {
			return { success: false, message: 'User not found' };
		}

		const transactions = await Transaction.find({ user_id: currentUser._id })
			.sort({ created_at: -1 })
			.limit(limit)
			.lean(); 

		const transformedTransactions = transactions.map(transformTransaction);

		return {
			success: true,
			data: transformedTransactions,
			message: 'Transactions fetched successfully'
		};

	} catch (error) {
		console.error('Get transactions error:', error);
		return { success: false, message: 'Failed to fetch transactions' };
	}
}

export async function processMpesaDeposit(depositData: {
	amount: number;
	phoneNumber: string;
}): Promise<{	
	success: boolean;	
	data?: any;	
	message: string	
}> {
	try {
		const session = await getServerSession(authOptions);
		
		if (!session?.user?.email) {
			return { success: false, message: 'Unauthorized' };
		}

		await connectToDatabase();
		const currentUser = await Profile.findOne({ email: session.user.email });

		if (!currentUser) {
			return { success: false, message: 'User not found' };
		}

		const validationResult = await validateDeposit(currentUser._id, depositData.amount, depositData.phoneNumber);
		if (!validationResult.valid) {
			return { success: false, message: validationResult.message };
		}

		// Get M-Pesa access token
		const accessToken = await getMpesaAccessToken();
		
		// FIXED: Use correct timestamp format
		const timestamp = generateMpesaTimestamp();
		const password = generateMpesaPassword(timestamp);
		
		// Convert amount to cents for internal records
		const amountCents = Math.round(depositData.amount * 100);

		// STK Push request payload - FIXED: Use the same timestamp
		const stkPushPayload = {
			BusinessShortCode: MPESA_CONFIG.shortCode,
			Password: password,
			Timestamp: timestamp, // Use the same timestamp here
			TransactionType: 'CustomerPayBillOnline',
			Amount: depositData.amount,
			PartyA: depositData.phoneNumber,
			PartyB: MPESA_CONFIG.shortCode,
			PhoneNumber: depositData.phoneNumber,
			CallBackURL: MPESA_CONFIG.callbackURL,
			AccountReference: `HUSTLE-${currentUser._id.toString().slice(-8).toUpperCase()}`,
			TransactionDesc: `Wallet deposit - ${currentUser.username}`
		};

		console.log('STK Push Payload:', {
			...stkPushPayload,
			Password: '***' // Don't log full password
		});

		// Initiate STK Push
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
			console.error('M-Pesa STK Push error:', errorData);
			return { success: false, message: 'Failed to initiate M-Pesa payment' };
		}

		const stkData = await stkResponse.json();

		if (stkData.ResponseCode === '0') {
			// Create M-Pesa transaction record
			const mpesaTransaction = await MpesaTransaction.create({
				user_id: currentUser._id,
				amount_cents: amountCents,
				phone_number: depositData.phoneNumber,
				account_reference: stkPushPayload.AccountReference,
				transaction_desc: stkPushPayload.TransactionDesc,
				checkout_request_id: stkData.CheckoutRequestID,
				merchant_request_id: stkData.MerchantRequestID,
				status: 'initiated',
				stk_push_response: stkData,
				result_code: 1032,
				result_desc: 'STK Push initiated successfully'
			});

			// Create pending transaction record linked to M-Pesa transaction
			const transaction = await Transaction.create({
				user_id: currentUser._id,
				amount_cents: amountCents,
				type: 'DEPOSIT',
				description: `M-Pesa deposit from ${depositData.phoneNumber}`,
				status: 'pending',
				mpesa_transaction_id: mpesaTransaction._id,
				metadata: {
					phoneNumber: depositData.phoneNumber,
					provider: 'mpesa',
					checkoutRequestID: stkData.CheckoutRequestID,
					merchantRequestID: stkData.MerchantRequestID,
				}
			});

			await updateDailyDepositLimit(currentUser._id, amountCents);
			revalidatePath('/dashboard/wallet');

			return {
				success: true,
				data: {
					CheckoutRequestID: stkData.CheckoutRequestID,
					MerchantRequestID: stkData.MerchantRequestID,
					ResponseDescription: stkData.ResponseDescription,
					transactionId: transaction._id.toString(),
					mpesaTransactionId: mpesaTransaction._id.toString()
				},
				message: 'STK Push initiated successfully. Please check your phone for the prompt.'
			};
		} else {
			return {
				success: false,
				message: stkData.ResponseDescription || 'Failed to initiate M-Pesa payment. Please try again.'
			};
		}

	} catch (error) {
		console.error('Process M-Pesa deposit error:', error);
		return { success: false, message: 'Failed to process M-Pesa deposit due to a server error.' };
	}
}

export async function processWithdrawal(withdrawalData: {
	amount: number;
	mpesaNumber: string;
}): Promise<{	
	success: boolean;	
	data?: any;	
	message: string	
}> {
	try {
		const session = await getServerSession(authOptions);
		
		if (!session?.user?.email) {
			return { success: false, message: 'Unauthorized' };
		}

		await connectToDatabase();
		const currentUser = await Profile.findOne({ email: session.user.email }).lean(); 

		if (!currentUser) {
			return { success: false, message: 'User not found' };
		}

		const today = new Date();
		const isFriday = today.getDay() === 5;
		if (!isFriday) {
			return { success: false, message: 'Withdrawals are only allowed on Fridays' };
		}

		const amountCents = Math.round(withdrawalData.amount * 100);
		if (currentUser.balance_cents < amountCents) {
			return { success: false, message: 'Insufficient balance' };
		}

		if (!withdrawalData.mpesaNumber.match(/^254[0-9]{9}$/)) {
			return { success: false, message: 'Invalid M-Pesa number format' };
		}

		const withdrawal = await Withdrawal.create({
			user_id: currentUser._id,
			amount_cents: amountCents,
			mpesa_number: withdrawalData.mpesaNumber,
			status: 'pending'
		});

		const transaction = await Transaction.create({
			user_id: currentUser._id,
			amount_cents: amountCents,
			type: 'WITHDRAWAL',
			description: `Withdrawal request to ${withdrawalData.mpesaNumber}`,
			status: 'pending',
			metadata: {
				withdrawalId: withdrawal._id.toString(),
				mpesaNumber: withdrawalData.mpesaNumber
			}
		});

		await Profile.findByIdAndUpdate(currentUser._id, {
			$inc: { balance_cents: -amountCents }
		});

		revalidatePath('/dashboard/wallet');

		const transformedWithdrawal = withdrawal.toObject();
		transformedWithdrawal.id = transformedWithdrawal._id.toString();
		delete transformedWithdrawal._id;
		delete transformedWithdrawal.__v;

		const transformedTransaction = transformTransaction(transaction);

		return {
			success: true,
			data: {
				transactionCode: `WDL${withdrawal._id.toString().slice(-8).toUpperCase()}`,
				newBalance: (currentUser.balance_cents - amountCents) / 100,
				withdrawal: transformedWithdrawal,
				transaction: transformedTransaction
			},
			message: 'Withdrawal request submitted successfully'
		};

	} catch (error) {
		console.error('Process withdrawal error:', error);
		return { success: false, message: 'Failed to process withdrawal' };
	}
}
