// types/models.ts
export interface IProfile {
  _id: string;
  email: string;
  username: string;
  balance_cents: number;
  total_deposits_today_cents: number;
  total_withdrawals_today_cents: number;
  daily_deposit_limit_cents: number;
  daily_withdrawal_limit_cents: number;
  last_deposit_reset: Date;
  last_withdrawal_reset: Date;
  last_deposit_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface ITransaction {
  _id: string;
  user_id: string;
  amount_cents: number;
  type: 'DEPOSIT' | 'WITHDRAWAL' | 'EARNINGS' | 'REFERRAL_BONUS';
  description: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  transaction_code?: string;
  metadata?: Record<string, any>;
  mpesa_transaction_id?: string;
  reconciled: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface IMpesaTransaction {
  _id: string;
  user_id: string;
  amount_cents: number;
  phone_number: string;
  account_reference: string;
  transaction_desc: string;
  checkout_request_id: string;
  merchant_request_id: string;
  status: 'initiated' | 'pending' | 'completed' | 'failed' | 'cancelled';
  stk_push_response?: Record<string, any>;
  callback_response?: Record<string, any>;
  result_code?: number;
  result_desc?: string;
  mpesa_receipt_number?: string;
  created_at: Date;
  updated_at: Date;
}

export interface IWithdrawal {
  _id: string;
  user_id: string;
  amount_cents: number;
  mpesa_number: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  processed_at?: Date;
  processed_by?: string;
  failure_reason?: string;
  created_at: Date;
  updated_at: Date;
}

// API Response types
export type ApiResponse<T = void> = {
  success: boolean;
  data?: T;
  message: string;
  error?: string;
};
