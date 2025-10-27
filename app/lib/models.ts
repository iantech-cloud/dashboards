// lib/models.ts
import mongoose, { Schema, model, models, Types } from 'mongoose';
import { connectToDatabase } from './mongoose';

// --- Mongoose Enums (replaces SQL ENUM types) ---

const UserRoles = ['user', 'support', 'admin'] as const;
const ApprovalStatuses = ['pending', 'approved', 'rejected'] as const;
const UserStatuses = ['active', 'inactive', 'suspended', 'banned', 'pending'] as const;
const PaymentProviders = ['mpesa', 'card', 'bank'] as const;
const PaymentStatuses = ['pending', 'completed', 'failed', 'refunded'] as const;
const TicketStatuses = ['open', 'in_progress', 'resolved', 'closed'] as const;
const TicketPriorities = ['low', 'medium', 'high', 'urgent'] as const;
const EarningTypes = ['REFERRAL', 'DOWNLINE', 'TASK', 'BONUS', 'SPIN', 'SURVEY'] as const;
const WithdrawalStatuses = ['pending', 'approved', 'rejected', 'completed'] as const;
const TransactionTypes = [
  'DEPOSIT',
  'WITHDRAWAL',
  'BONUS',
  'TASK_PAYMENT',
  'SPIN_WIN',
  'REFERRAL',
  'SURVEY',
  'ACTIVATION_FEE',
  'COMPANY_REVENUE',
  'ACCOUNT_ACTIVATION',
  'SPIN_COST', // Added for spin cost transactions
  'SPIN_PRIZE' // Added for prize transactions
] as const;
const InvoiceStatuses = ['pending', 'paid'] as const;
const BlogPostStatuses = ['draft', 'published', 'archived'] as const;
const UserContentTypes = ['blog_post', 'social_media', 'product_review', 'video', 'other'] as const;
const UserContentStatuses = ['pending', 'approved', 'rejected', 'revision_requested'] as const;
const UserContentPaymentStatuses = ['pending', 'paid', 'rejected'] as const;

// M-Pesa Specific Enums
const MpesaTransactionStatuses = ['initiated', 'pending', 'completed', 'failed', 'cancelled', 'timeout'] as const;
const MpesaResultCodes = [0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15, 17, 20, 26, 1032, 1037, 2001] as const;

// Source Types for Transactions and M-Pesa
const SourceTypes = ['wallet', 'dashboard', 'api', 'activation'] as const;

/**
 * Survey Categories
 */
const SurveyCategories = ['market_research', 'consumer_insights', 'product_feedback', 'academic', 'other'] as const;

/**
 * Survey Status
 */
const SurveyStatuses = ['draft', 'scheduled', 'active', 'completed', 'cancelled'] as const;

// Audit Log Action Types - UPDATED FOR USER MANAGEMENT & SPIN
const AuditActionTypes = [
  'create', 'update', 'delete', 'approve', 'reject', 'activate', 'suspend', 'ban',
  'spin_win', 'spin_attempt', 'spin_settings_update', 'spin_wheel_activated', 'spin_wheel_deactivated'
] as const;
const AuditResourceTypes = [
  'user', 'transaction', 'activation', 'withdrawal', 'profile', 'referral',
  'spin', 'spin_prize', 'spin_settings', 'spin_log', 'blog_post', 'mpesa_change_request'
] as const;

// --- New Spin to Win Enums ---
const SpinPrizeTypes = [
  'EXTRA_SPIN_VOUCHER',
  'BONUS_CREDIT',
  'REFERRAL_BOOST',
  'TRAINING_COURSE',
  'AIRTIME',
  'LEADERSHIP_TOKEN',
  'SURVEY_PRIORITY',
  'MYSTERY_BOX',
  'COMMISSION_BOOST',
  'TOP_AFFILIATE_BADGE',
  'TRY_AGAIN',
  'AD_SLOT'
] as const;

const SpinStatuses = ['pending', 'won', 'lost', 'credited'] as const;
const UserTiers = ['starter', 'bronze', 'silver', 'gold', 'diamond'] as const;
const SpinActivationModes = ['manual', 'scheduled'] as const;
const WeekDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
// --- End New Spin to Win Enums ---


// --- Helper function to get or create a model ---
const getModel = (name: string, schema: Schema) => {
  return models[name] || model(name, schema);
};

// --- Step 2: Define Schemas & Models ---

/**
 * 1. Profile Model (replaces profiles table) - ENHANCED FOR M-PESA & ACTIVATION & SPIN & 2FA
 */
const ProfileSchema = new Schema({
  _id: { type: String, required: true },
  username: { type: String, required: true, maxlength: 50 },
  phone_number: { type: String, required: true, maxlength: 50 },
  email: { type: String, required: true, unique: true, maxlength: 255 },
  password: {
    type: String,
    required: false,
    select: false
  },

  // ===== 2FA FIELDS - UPDATED =====
  twoFAEnabled: { type: Boolean, default: false },
  twoFASecret: { 
    type: String, 
    default: null,
    // NOT using select: false to avoid update issues
  },
  twoFABackupCodes: [{
    code: { type: String },
    used: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
  }],
  twoFALastUsed: { type: Date },
  twoFASetupDate: { type: Date },
  // ===== END 2FA FIELDS =====

  referral_id: { type: String, unique: true, sparse: true, maxlength: 10 },
  role: { type: String, enum: UserRoles, default: 'user', required: true },

  // Enhanced Activation Fields
  is_verified: { type: Boolean, default: false },
  email_verified_at: { type: Date },
  activation_paid_at: { type: Date },
  activation_amount_cents: { type: Number, default: 100000 }, // KES 1000
  activation_method: { type: String, enum: ['mpesa', 'manual'], default: 'mpesa' },
  activation_transaction_id: { type: Schema.Types.ObjectId, ref: 'Transaction' },

  approval_status: { type: String, enum: ApprovalStatuses, default: 'pending', required: true },
  approval_by: { type: String, ref: 'Profile' },
  approval_at: { type: Date },
  approval_notes: { type: String },

  status: { type: String, enum: UserStatuses, default: 'pending', required: true },
  is_active: { type: Boolean, default: false },
  is_approved: { type: Boolean, default: false },

  ban_reason: { type: String },
  banned_at: { type: Date },
  suspension_reason: { type: String },
  suspended_at: { type: Date },

  level: { type: Number, default: 0 },
  rank: { type: String, default: 'Unactivated', maxlength: 50 },
  total_earnings_cents: { type: Number, default: 0 },
  balance_cents: { type: Number, default: 0 },
  tasks_completed: { type: Number, default: 0 },
  
  // Enhanced spin fields
  available_spins: { type: Number, default: 0 }, // Updated available_spins
  total_spins_used: { type: Number, default: 0 },
  total_prizes_won: { type: Number, default: 0 },
  spin_tier: { 
    type: String, 
    enum: UserTiers, 
    default: 'starter' 
  },
  last_spin_at: { type: Date },
  spin_streak: { type: Number, default: 0 }, // Consecutive days with spins
  max_spin_streak: { type: Number, default: 0 },

  // Enhanced M-Pesa Integration Fields
  total_deposits_cents: { type: Number, default: 0 },
  total_withdrawals_cents: { type: Number, default: 0 },
  last_deposit_at: { type: Date },
  last_withdrawal_at: { type: Date },

  preferred_mpesa_number: { type: String },
  mpesa_number_verified: { type: Boolean, default: false },
  mpesa_verification_date: { type: Date },

  // Enhanced Daily Limits with Better Tracking
  daily_deposit_limit_cents: { type: Number, default: 7000000 }, // KES 70,000
  daily_withdrawal_limit_cents: { type: Number, default: 1500000 }, // KES 15,000
  total_deposits_today_cents: { type: Number, default: 0 },
  total_withdrawals_today_cents: { type: Number, default: 0 },
  last_deposit_reset: { type: Date, default: Date.now },
  last_withdrawal_reset: { type: Date, default: Date.now },

  // M-Pesa Transaction Statistics
  mpesa_transactions_count: { type: Number, default: 0 },
  successful_mpesa_deposits: { type: Number, default: 0 },
  failed_mpesa_deposits: { type: Number, default: 0 },
  last_mpesa_deposit_date: { type: Date },

  // Security & Compliance
  kyc_status: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' },
  kyc_verified_at: { type: Date },

  // Referral System
  referred_by: { type: String, ref: 'Profile' },
  referral_bonus_claimed: { type: Boolean, default: false },

  // Profile Completion
  profile_completed: { type: Boolean, default: false },
  completion_percentage: { type: Number, default: 0 },

  // Login tracking
  last_login: { type: Date },

}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  indexes: [
    { fields: { role: 1 } },
    { fields: { approval_status: 1 } },
    { fields: { status: 1 } },
    { fields: { email: 1 } },
    { fields: { phone_number: 1 } },
    { fields: { preferred_mpesa_number: 1 } },
    { fields: { last_deposit_reset: 1 } },
    { fields: { activation_paid_at: 1 } },
    { fields: { is_active: 1 } },
    { fields: { referred_by: 1 } },
    { fields: { spin_tier: 1 } },
    { fields: { available_spins: 1 } },
    // 2FA INDEXES
    { fields: { twoFAEnabled: 1 } },
    { fields: { twoFALastUsed: 1 } },
  ]
});

// ADD THESE METHODS to ProfileSchema (after schema definition, before export):
ProfileSchema.methods.enable2FA = function(secret: string) {
  this.twoFASecret = secret;
  this.twoFAEnabled = true;
  this.twoFASetupDate = new Date();
  return this.save();
};

ProfileSchema.methods.disable2FA = function() {
  this.twoFASecret = null;
  this.twoFAEnabled = false;
  this.twoFABackupCodes = [];
  this.twoFASetupDate = null;
  return this.save();
};

ProfileSchema.methods.verify2FAToken = function() {
  this.twoFALastUsed = new Date();
  return this.save();
};

// ADD VIRTUAL FIELDS
ProfileSchema.virtual('twoFASetupInProgress').get(function() {
  return !this.twoFAEnabled && !!this.twoFASecret;
});

ProfileSchema.virtual('requires2FA').get(function() {
  return this.twoFAEnabled && !!this.twoFASecret;
});

// ENSURE JSON SERIALIZATION SECURITY
ProfileSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    // Remove sensitive 2FA data from JSON output
    delete ret.twoFASecret;
    delete ret.twoFABackupCodes;
    delete ret.password;
    return ret;
  }
});

export const Profile = getModel('Profile', ProfileSchema);

/**
 * 2. ActivationPayment Model (replaces activation_payments table) - ENHANCED
 */
const ActivationPaymentSchema = new Schema({
  user_id: { type: String, ref: 'Profile', required: true, index: true },
  amount_cents: { type: Number, default: 100000, required: true }, // KES 1000
  currency: { type: String, default: 'KES', maxlength: 3, required: true },
  provider: { type: String, enum: PaymentProviders, required: true },
  provider_reference: { type: String, maxlength: 255 },
  provider_response: { type: Schema.Types.Mixed },
  status: { type: String, enum: PaymentStatuses, default: 'pending', required: true, index: true },
  paid_at: { type: Date },
  
  // Enhanced fields for better tracking
  mpesa_transaction_id: { type: Schema.Types.ObjectId, ref: 'MpesaTransaction' },
  checkout_request_id: { type: String, index: true },
  mpesa_receipt_number: { type: String },
  phone_number: { type: String, required: true },
  
  // Activation specific metadata
  metadata: { 
    type: Schema.Types.Mixed,
    default: {
      activation_type: 'account_activation',
      auto_approved: false,
      requires_manual_review: false
    }
  },
  
  // Retry and error handling
  retry_count: { type: Number, default: 0 },
  last_retry_at: { type: Date },
  error_message: { type: String },
  error_stack: { type: String },
  
  // Processing info
  processed_by_system: { type: Boolean, default: false },
  processed_at: { type: Date },
  processing_duration_ms: { type: Number },
  
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  indexes: [
    { fields: { user_id: 1, status: 1 } },
    { fields: { checkout_request_id: 1 } },
    { fields: { mpesa_receipt_number: 1 } },
    { fields: { paid_at: 1 } },
    { fields: { created_at: -1 } },
  ]
});

export const ActivationPayment = getModel('ActivationPayment', ActivationPaymentSchema);

/**
 * 3. SupportTicket Model (replaces support_tickets table)
 */
const SupportTicketSchema = new Schema({
  user_id: { type: String, ref: 'Profile', required: true, index: true },
  assigned_to: { type: String, ref: 'Profile', index: true },
  subject: { type: String, required: true, maxlength: 255 },
  description: { type: String, required: true },
  status: { type: String, enum: TicketStatuses, default: 'open', required: true, index: true },
  priority: { type: String, enum: TicketPriorities, default: 'medium', required: true },
  resolution_notes: { type: String },
  resolved_by: { type: String, ref: 'Profile' },
  closed_at: { type: Date },
  
  // Enhanced fields
  category: { type: String, enum: ['activation', 'deposit', 'withdrawal', 'technical', 'general', 'spin'], default: 'general' },
  related_transaction_id: { type: Schema.Types.ObjectId, ref: 'Transaction' },
  related_mpesa_transaction_id: { type: Schema.Types.ObjectId, ref: 'MpesaTransaction' },
  
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  indexes: [
    { fields: { user_id: 1, status: 1 } },
    { fields: { category: 1 } },
  ]
});

export const SupportTicket = getModel('SupportTicket', SupportTicketSchema);

/**
 * 4. AdminAuditLog Model (replaces admin_audit_logs table) - ENHANCED FOR SPIN CONTROL
 */
const AdminAuditLogSchema = new Schema({
  actor_id: { type: String, ref: 'Profile', required: true, index: true },
  action: { 
    type: String, 
    required: true, 
    maxlength: 100,
    enum: [
      // User Management Actions
      'APPROVE_USER',
      'REJECT_USER',
      'ACTIVATE_USER',
      'SUSPEND_USER',
      'BAN_USER',
      'ADD_SPINS',
      'UPDATE_USER_STATUS',
      'UPDATE_USER_BALANCE',
      'RESET_USER_LIMITS',
      'DELETE_USER',
      
      // Withdrawal Management Actions
      'APPROVE_WITHDRAWAL',
      'REJECT_WITHDRAWAL',
      'COMPLETE_WITHDRAWAL',
      'REVERSE_WITHDRAWAL',
      'UPDATE_WITHDRAWAL_NOTES',
      
      // M-Pesa Change Request Actions
      'CREATE_MPESA_CHANGE_REQUEST',
      'APPROVE_MPESA_CHANGE',
      'REJECT_MPESA_CHANGE',
      'DELETE_MPESA_CHANGE_REQUEST',
      
      // Spin Actions
      'CREATE_SPIN_PRIZE',
      'UPDATE_SPIN_PRIZE',
      'DELETE_SPIN_PRIZE',
      'UPDATE_SPIN_SETTINGS',
      'ACTIVATE_SPIN_WHEEL',
      'DEACTIVATE_SPIN_WHEEL',
      'UPDATE_SPIN_SCHEDULE',
      'VIEW_SPIN_LOGS',
      'MANAGE_SPIN_PRIZES',
      
      // Blog Actions
      'CREATE_BLOG_POST',
      'UPDATE_BLOG_POST',
      'DELETE_BLOG_POST',
      
      // Survey Actions
      'CREATE_SURVEY',
      'UPDATE_SURVEY',
      'DELETE_SURVEY',
      'ACTIVATE_SURVEY',
      'DEACTIVATE_SURVEY',
      
      // Transaction Actions
      'CREATE_TRANSACTION',
      'UPDATE_TRANSACTION',
      'REVERSE_TRANSACTION',
      
      // System Actions
      'UPDATE_SYSTEM_SETTINGS',
      'VIEW_AUDIT_LOGS',
      'EXPORT_DATA'
    ]
  },
  target_type: { type: String, required: true, maxlength: 50 },
  target_id: { type: String, required: true, index: true },
  changes: { type: Schema.Types.Mixed },
  ip_address: { type: String },
  user_agent: { type: String },
  
  // Enhanced fields for user management & spin
  resource_type: { 
    type: String, 
    enum: AuditResourceTypes, 
    default: 'user',
    required: true 
  },
  resource_id: { type: String, index: true },
  action_type: { 
    type: String, 
    enum: AuditActionTypes, 
    required: true,
    index: true 
  },
  
  // Additional metadata for better tracking
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  },
  
  // Performance tracking
  processing_time_ms: { type: Number },
  
  // Spin-specific fields
  spin_related: {
    prize_type: { type: String, enum: SpinPrizeTypes },
    spin_settings_id: { type: Schema.Types.ObjectId, ref: 'SpinSettings' },
    activation_mode: { type: String, enum: SpinActivationModes },
    scheduled_days: [{ type: String, enum: WeekDays }]
  }
  
}, {
  timestamps: { createdAt: 'created_at' },
  indexes: [
    { fields: { created_at: -1 } },
    { fields: { resource_type: 1, resource_id: 1 } },
    { fields: { action_type: 1 } },
    { fields: { actor_id: 1, created_at: -1 } },
    { fields: { target_id: 1 } },
    { fields: { action: 1 } },
    { fields: { 'spin_related.prize_type': 1 } },
  ]
});
export const AdminAuditLog = getModel('AdminAuditLog', AdminAuditLogSchema);

/**
 * 5. Referral Model (replaces referrals table) - ENHANCED
 */
const ReferralSchema = new Schema({
  referrer_id: { type: String, ref: 'Profile', required: true, index: true },
  referred_id: { type: String, ref: 'Profile', required: true, unique: true },
  earning_cents: { type: Number, default: 0 },
  
  // Enhanced fields
  status: { type: String, enum: ['active', 'inactive', 'bonus_paid'], default: 'active' },
  referral_bonus_paid: { type: Boolean, default: false },
  referral_bonus_amount_cents: { type: Number, default: 5000 }, // KES 50
  bonus_paid_at: { type: Date },
  
  // Activation tracking
  referred_user_activated: { type: Boolean, default: false },
  referred_user_activated_at: { type: Date },
  
  // Enhanced metadata for user management
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  }
  
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  indexes: [
    { fields: { referrer_id: 1, status: 1 } },
    { fields: { referred_user_activated: 1 } },
    { fields: { bonus_paid_at: 1 } },
  ]
});

export const Referral = getModel('Referral', ReferralSchema);

/**
 * 6. DownlineUser Model (replaces downline_users table)
 */
const DownlineUserSchema = new Schema({
  main_user_id: { type: String, ref: 'Profile', required: true },
  downline_user_id: { type: String, ref: 'Profile', required: true, unique: true },
  level: { type: Number, default: 1 },
  
  // Enhanced fields
  activated: { type: Boolean, default: false },
  activation_date: { type: Date },
  total_earnings_from_downline_cents: { type: Number, default: 0 },
  
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  indexes: [
    { fields: { main_user_id: 1, downline_user_id: 1 }, unique: true },
    { fields: { activated: 1 } },
  ]
});

export const DownlineUser = getModel('DownlineUser', DownlineUserSchema);

/**
 * 7. Earning Model (replaces earnings table)
 */
const EarningSchema = new Schema({
  user_id: { type: String, ref: 'Profile', required: true, index: true },
  amount_cents: { type: Number, required: true },
  type: { type: String, enum: EarningTypes, required: true },
  description: { type: String },
  
  // Enhanced fields
  source_id: { type: Schema.Types.ObjectId }, // Reference to source (task, referral, etc)
  source_type: { type: String }, // Type of source
  transaction_id: { type: Schema.Types.ObjectId, ref: 'Transaction' },
  processed: { type: Boolean, default: false },
  processed_at: { type: Date },
  
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  indexes: [
    { fields: { user_id: 1, type: 1 } },
    { fields: { processed: 1 } },
  ]
});

export const Earning = getModel('Earning', EarningSchema);

/**
 * 8. Withdrawal Model (replaces withdrawals table) - ENHANCED
 */
const WithdrawalSchema = new Schema({
  user_id: { type: String, ref: 'Profile', required: true, index: true },
  amount_cents: { type: Number, required: true },
  status: { type: String, enum: WithdrawalStatuses, default: 'pending', index: true },
  mpesa_number: { type: String, maxlength: 50, required: true },
  transaction_code: { type: String, maxlength: 100 },
  approved_by: { type: String, ref: 'Profile' },
  approved_at: { type: Date },
  
  // Enhanced fields for better tracking
  processed_at: { type: Date },
  processing_notes: { type: String },
  failure_reason: { type: String },
  
  // M-Pesa specific fields for withdrawals
  mpesa_receipt_number: { type: String },
  mpesa_response: { type: Schema.Types.Mixed },
  
  // User eligibility checks
  user_was_active: { type: Boolean, default: true },
  user_balance_before: { type: Number },
  user_balance_after: { type: Number },
  
  metadata: { type: Schema.Types.Mixed, default: {} },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  indexes: [
    { fields: { user_id: 1, created_at: -1 } },
    { fields: { status: 1 } },
    { fields: { mpesa_number: 1 } },
    { fields: { transaction_code: 1 } },
    { fields: { approved_at: 1 } },
  ]
});

export const Withdrawal = getModel('Withdrawal', WithdrawalSchema);

/**
 * 9. Transaction Model (replaces transactions table) - ENHANCED FOR M-PESA & ACTIVATION & SPIN & COMPANY
 */
const TransactionSchema = new Schema({
  user_id: { type: String, ref: 'Profile', required: false, index: true }, // Now optional for company transactions
  amount_cents: { type: Number, required: true },
  type: {
    type: String,
    enum: TransactionTypes,
    required: true
  },
  description: { type: String, required: true },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'cancelled'],
    default: 'completed',
    required: true
  },
  transaction_code: {
    type: String,
    required: false,
    sparse: true
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  },
  mpesa_transaction_id: {
    type: Schema.Types.ObjectId,
    ref: 'MpesaTransaction',
    sparse: true
  },
  reconciled: { type: Boolean, default: false },
  reconciled_at: { type: Date },
  reconciliation_notes: { type: String },
  
  // Enhanced fields for better tracking
  processed_at: { type: Date },
  processing_duration_ms: { type: Number },
  source: { 
    type: String, 
    enum: SourceTypes,
    default: 'wallet' 
  },
  
  // Balance tracking
  balance_before_cents: { type: Number },
  balance_after_cents: { type: Number },
  
  // Activation specific
  is_activation_fee: { type: Boolean, default: false },
  activation_payment_id: { type: Schema.Types.ObjectId, ref: 'ActivationPayment' },
  
  // Spin specific
  spin_related: {
    spin_log_id: { type: Schema.Types.ObjectId, ref: 'SpinLog' },
    prize_type: { type: String, enum: SpinPrizeTypes },
    spin_cost: { type: Boolean, default: false }
  },
  
  // User management specific fields
  admin_processed: { type: Boolean, default: false },
  admin_processed_by: { type: String, ref: 'Profile' },
  admin_processed_at: { type: Date },

  // NEW: Company transaction support
  target_type: {
    type: String,
    enum: ['user', 'company'],
    required: true,
    default: 'user',
    index: true
  },
  
  // NEW: Target entity ID (can be user_id or company_id)
  target_id: {
    type: String,
    required: true,
    index: true
  },
  
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  indexes: [
    { fields: { user_id: 1, created_at: -1 } },
    { fields: { type: 1 } },
    { fields: { status: 1 } },
    { fields: { mpesa_transaction_id: 1 } },
    { fields: { reconciled: 1 } },
    { fields: { transaction_code: 1 } },
    { fields: { source: 1 } },
    { fields: { is_activation_fee: 1 } },
    { fields: { admin_processed: 1 } },
    { fields: { 'spin_related.prize_type': 1 } },
    { fields: { target_type: 1, target_id: 1 } }, // NEW index for company transactions
  ]
});

export const Transaction = getModel('Transaction', TransactionSchema);

// --- Models required by the existing functions ---

/**
 * 10. Customer Model (replaces customers table)
 */
const CustomerSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  image_url: { type: String },
}, {
  timestamps: true,
});

export const Customer = getModel('Customer', CustomerSchema);

/**
 * 11. Invoice Model (replaces invoices table)
 */
const InvoiceSchema = new Schema({
  customer_id: { type: Types.ObjectId, ref: 'Customer', required: true, index: true },
  amount: { type: Number, required: true },
  status: { type: String, enum: InvoiceStatuses, required: true, index: true },
  date: { type: Date, required: true, default: Date.now },
}, {
  timestamps: true,
});

export const Invoice = getModel('Invoice', InvoiceSchema);

/**
 * 12. Revenue Model (replaces revenue table)
 */
const RevenueSchema = new Schema({
  month: { type: String, required: true, unique: true },
  revenue: { type: Number, required: true },
}, {
  timestamps: true,
});

export const Revenue = getModel('Revenue', RevenueSchema);

/**
 * 13. MpesaChangeRequest Model (Fixes the export error)
 */
const MpesaChangeRequestSchema = new Schema({
  user_id: { type: String, ref: 'Profile', required: true, index: true },
  old_number: { type: String, maxlength: 50 },
  new_number: { type: String, required: true, maxlength: 50 },
  reason: { type: String, maxlength: 500 },

  approval_status: { type: String, enum: ApprovalStatuses, default: 'pending', required: true, index: true },
  approved_by: { type: String, ref: 'Profile' },
  approval_at: { type: Date },
  approval_notes: { type: String },

}, {
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
});

export const MpesaChangeRequest = getModel('MpesaChangeRequest', MpesaChangeRequestSchema);

/**
 * 14. MpesaTransaction Model (ENHANCED for tracking M-Pesa transactions)
 */
const MpesaTransactionSchema = new Schema({
  // M-Pesa API Identifiers
  checkout_request_id: { 
    type: String, 
    unique: true, 
    sparse: true,
    index: true 
  },
  merchant_request_id: { 
    type: String,
    index: true 
  },
  mpesa_receipt_number: { 
    type: String, 
    unique: true, 
    sparse: true,
    index: true 
  },

  // User and Transaction Details
  user_id: { 
    type: String, 
    ref: 'Profile', 
    required: true, 
    index: true 
  },
  amount_cents: { 
    type: Number, 
    required: true 
  },
  phone_number: { 
    type: String, 
    required: true,
    index: true 
  },
  account_reference: { 
    type: String, 
    required: true 
  },
  transaction_desc: { 
    type: String 
  },

  // M-Pesa Response Details
  result_code: { 
    type: Number,
    enum: MpesaResultCodes,
    index: true 
  },
  result_desc: { 
    type: String 
  },

  // Status Tracking
  status: {
    type: String,
    enum: MpesaTransactionStatuses,
    default: 'initiated',
    index: true
  },

  // Timestamps for lifecycle tracking
  initiated_at: { 
    type: Date, 
    default: Date.now 
  },
  callback_received_at: { 
    type: Date 
  },
  completed_at: { 
    type: Date 
  },
  failed_at: { 
    type: Date 
  },

  // API Request/Response Storage
  stk_push_request: { 
    type: Schema.Types.Mixed 
  },
  stk_push_response: { 
    type: Schema.Types.Mixed 
  },
  callback_payload: { 
    type: Schema.Types.Mixed 
  },

  // Retry and Error Handling
  retry_count: { 
    type: Number, 
    default: 0 
  },
  last_retry_at: { 
    type: Date 
  },
  error_message: { 
    type: String 
  },
  error_stack: { 
    type: String 
  },

  // Enhanced Metadata
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  },
  source: { 
    type: String, 
    enum: SourceTypes,
    default: 'wallet' 
  },
  ip_address: { 
    type: String 
  },
  user_agent: { 
    type: String 
  },

  // Reconciliation Fields
  reconciled: { 
    type: Boolean, 
    default: false 
  },
  reconciled_at: { 
    type: Date 
  },
  reconciliation_notes: { 
    type: String 
  },

  // Activation specific
  is_activation_payment: { type: Boolean, default: false },
  activation_processed: { type: Boolean, default: false },
  activation_processed_at: { type: Date },

}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  indexes: [
    { fields: { checkout_request_id: 1 } },
    { fields: { mpesa_receipt_number: 1 } },
    { fields: { user_id: 1, created_at: -1 } },
    { fields: { status: 1, created_at: -1 } },
    { fields: { phone_number: 1 } },
    { fields: { result_code: 1 } },
    { fields: { created_at: -1 } },
    { fields: { reconciled: 1 } },
    { fields: { is_activation_payment: 1 } },
  ]
});

export const MpesaTransaction = getModel('MpesaTransaction', MpesaTransactionSchema);

/**
 * 15. MpesaCallbackLog Model (ENHANCED for auditing callbacks)
 */
const MpesaCallbackLogSchema = new Schema({
  checkout_request_id: { 
    type: String, 
    index: true 
  },
  merchant_request_id: { 
    type: String 
  },
  result_code: { 
    type: Number 
  },
  result_desc: { 
    type: String 
  },
  payload: { 
    type: Schema.Types.Mixed 
  },
  ip_address: { 
    type: String 
  },
  user_agent: { 
    type: String 
  },
  processed: { 
    type: Boolean, 
    default: false 
  },
  processing_error: { 
    type: String 
  },
  processing_duration_ms: { 
    type: Number 
  },
  
  // Enhanced fields
  headers: { 
    type: Schema.Types.Mixed 
  },
  raw_body: { 
    type: String 
  },
  response_sent: { 
    type: Boolean, 
    default: false 
  },
  response_code: { 
    type: Number 
  },
  
  // Activation specific
  is_activation_callback: { type: Boolean, default: false },
  
}, {
  timestamps: { createdAt: 'created_at' },
  indexes: [
    { fields: { created_at: -1 } },
    { fields: { checkout_request_id: 1 } },
    { fields: { processed: 1 } },
    { fields: { result_code: 1 } },
    { fields: { is_activation_callback: 1 } },
  ]
});

export const MpesaCallbackLog = getModel('MpesaCallbackLog', MpesaCallbackLogSchema);

/**
 * 16. BlogPost Model (for admin blog management) - UPDATED FOR USER CONTENT INTEGRATION
 */
const BlogPostSchema = new Schema({
  title: { type: String, required: true, maxlength: 255 },
  slug: { type: String, required: true, unique: true, maxlength: 300 },
  content: { type: String, required: true },
  excerpt: { type: String, maxlength: 500 },
  featured_image: { type: String },
  author: { type: String, ref: 'Profile', required: true, index: true },
  status: {
    type: String,
    enum: BlogPostStatuses,
    default: 'draft',
    required: true,
    index: true
  },
  published_at: { type: Date },
  meta_title: { type: String, maxlength: 255 },
  meta_description: { type: String, maxlength: 500 },
  tags: [{ type: String, maxlength: 50 }],
  read_time: { type: Number, default: 5 }, // in minutes
  category: { type: String, maxlength: 100 },

  // New fields for user content integration
  source_submission_id: {
    type: Schema.Types.ObjectId,
    ref: 'UserContent',
    required: false,
    index: true
  },
  metadata: {
    submitted_via: { type: String, default: 'user_content' },
    original_submission_date: { type: Date },
    payment_amount: { type: Number },
    content_type: { type: String, enum: UserContentTypes },
    task_category: { type: String }
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  indexes: [
    { fields: { slug: 1 } },
    { fields: { status: 1, published_at: -1 } },
    { fields: { author: 1, created_at: -1 } },
    { fields: { tags: 1 } },
    { fields: { category: 1 } },
    { fields: { source_submission_id: 1 } },
  ]
});

export const BlogPost = getModel('BlogPost', BlogPostSchema);

/**
 * 17. UserContent Model (for user submissions from earn by tasks) - UPDATED
 */
const UserContentSchema = new Schema({
  user: { type: String, ref: 'Profile', required: true, index: true },
  title: { type: String, required: true, maxlength: 255 },
  content: { type: String, required: true },
  content_type: {
    type: String,
    enum: UserContentTypes,
    required: true,
    index: true
  },
  submission_date: { type: Date, default: Date.now, index: true },
  status: {
    type: String,
    enum: UserContentStatuses,
    default: 'pending',
    required: true,
    index: true
  },
  admin_notes: { type: String },
  revision_notes: { type: String },
  approved_at: { type: Date },
  approved_by: { type: String, ref: 'Profile' },
  payment_status: {
    type: String,
    enum: UserContentPaymentStatuses,
    default: 'pending',
    index: true
  },
  payment_amount: { type: Number, required: true }, // in cents
  task_category: { type: String, required: true, maxlength: 100 },
  external_url: { type: String },
  attachments: [{ type: String }],
  tags: [{ type: String, maxlength: 50 }],
  word_count: { type: Number, default: 0 },

  // New field to track if blog post was created
  blog_post_id: {
    type: Schema.Types.ObjectId,
    ref: 'BlogPost',
    required: false,
    index: true
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  indexes: [
    { fields: { user: 1, submission_date: -1 } },
    { fields: { status: 1, submission_date: -1 } },
    { fields: { content_type: 1 } },
    { fields: { payment_status: 1 } },
    { fields: { task_category: 1 } },
    { fields: { blog_post_id: 1 } },
  ]
});

export const UserContent = getModel('UserContent', UserContentSchema);

/**
 * 18. Survey Model - UPDATED
 */
const SurveySchema = new Schema({
  title: { type: String, required: true, maxlength: 255 },
  description: { type: String, required: true },
  category: {
    type: String,
    enum: SurveyCategories,
    required: true,
    index: true
  },
  topics: [{ type: String }], // AI-generated topics
  payout_cents: { type: Number, default: 5000, required: true }, // KSH 50
  duration_minutes: { type: Number, default: 5, required: true }, // 5 minutes
  questions: [{
    question_text: { type: String, required: true },
    question_type: {
      type: String,
      enum: ['multiple_choice'],
      default: 'multiple_choice',
      required: true
    },
    options: [{
      text: { type: String, required: true },
      is_correct: { type: Boolean, default: false }
    }],
    correct_answer_index: { type: Number, required: true }, // Index of correct option
    required: { type: Boolean, default: true }
  }],

  // Selection criteria
  target_percentage: { type: Number, default: 15 }, // 15% of users
  priority_new_users: { type: Boolean, default: true },
  priority_top_referrers: { type: Boolean, default: true },

  // Scheduling and availability
  status: {
    type: String,
    enum: SurveyStatuses,
    default: 'draft',
    index: true
  },
  scheduled_for: { type: Date, index: true }, // Tuesday 2100 hrs EAT
  activated_at: { type: Date },
  expires_at: { type: Date },
  
  // Manual override for admin
  is_manually_enabled: { 
    type: Boolean, 
    default: false,
    index: true 
  },

  // Stats
  max_responses: { type: Number, default: 1000 },
  current_responses: { type: Number, default: 0 },
  successful_responses: { type: Number, default: 0 },
  failed_responses: { type: Number, default: 0 },
  completion_rate: { type: Number, default: 0 }, // Percentage of successful completions
  average_score: { type: Number, default: 0 }, // Average score across all responses
  average_completion_time: { type: Number, default: 0 }, // Average time in seconds

  created_by: { type: String, ref: 'Profile', required: true },

  // AI generation info
  ai_generated: { type: Boolean, default: false },
  ai_prompt: { type: String },
  ai_model: { type: String },
  
  // Metadata
  tags: [{ type: String }],
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  },
  estimated_completion_rate: { type: Number, default: 0 }, // Predicted completion rate
  quality_score: { type: Number, default: 0 }, // Score based on user feedback and completion rates
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  indexes: [
    { fields: { status: 1, scheduled_for: 1 } },
    { fields: { category: 1 } },
    { fields: { created_at: -1 } },
    { fields: { is_manually_enabled: 1, status: 1 } },
    { fields: { expires_at: 1 } },
    { fields: { 'topics': 1 } },
    { fields: { difficulty: 1 } },
  ]
});

// Pre-save middleware to update calculated fields
SurveySchema.pre('save', function(next) {
  if (this.isModified('current_responses') || this.isModified('successful_responses')) {
    // Update completion rate
    if (this.current_responses > 0) {
      this.completion_rate = (this.successful_responses / this.current_responses) * 100;
    }
  }
  next();
});

// Static method to find active surveys
SurveySchema.statics.findActiveSurveys = function() {
  const now = new Date();
  return this.find({
    status: 'active',
    expires_at: { $gt: now },
    $or: [
      { is_manually_enabled: true },
      { 
        scheduled_for: { $lte: now },
        is_manually_enabled: { $ne: false }
      }
    ]
  });
};

// Static method to find available surveys for a user
SurveySchema.statics.findAvailableSurveys = function(userId: string) {
  const now = new Date();
  return this.find({
    status: 'active',
    expires_at: { $gt: now },
    $or: [
      { is_manually_enabled: true },
      { 
        scheduled_for: { $lte: now },
        is_manually_enabled: { $ne: false }
      }
    ]
  });
};

// Instance method to check if survey is available
SurveySchema.methods.isAvailable = function() {
  const now = new Date();
  return this.status === 'active' && 
         this.expires_at > now &&
         (this.is_manually_enabled || 
          (this.scheduled_for <= now && this.is_manually_enabled !== false));
};

// Instance method to enable survey manually
SurveySchema.methods.enableManually = function(hours = 24) {
  this.is_manually_enabled = true;
  this.status = 'active';
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + hours);
  this.expires_at = expiresAt;
  return this.save();
};

// Instance method to disable manual enabling
SurveySchema.methods.disableManually = function() {
  this.is_manually_enabled = false;
  // If it was scheduled and the schedule time hasn't passed, revert to scheduled
  if (this.scheduled_for && this.scheduled_for > new Date()) {
    this.status = 'scheduled';
  }
  return this.save();
};

// Virtual for formatted payout
SurveySchema.virtual('payout_formatted').get(function() {
  return `KES ${(this.payout_cents / 100).toFixed(2)}`;
});

// Virtual for time remaining
SurveySchema.virtual('time_remaining').get(function() {
  const now = new Date();
  return this.expires_at ? Math.max(0, this.expires_at.getTime() - now.getTime()) : 0;
});

// Virtual for is_expired
SurveySchema.virtual('is_expired').get(function() {
  return this.expires_at ? this.expires_at <= new Date() : false;
});

// Ensure virtual fields are serialized
SurveySchema.set('toJSON', { virtuals: true });
SurveySchema.set('toObject', { virtuals: true });

export const Survey = getModel('Survey', SurveySchema);

/**
 * 19. Survey Response Model - UPDATED
 */
const SurveyResponseSchema = new Schema({
  survey_id: { type: Schema.Types.ObjectId, ref: 'Survey', required: true, index: true },
  user_id: { type: String, ref: 'Profile', required: true, index: true },
  
  // Response tracking
  status: {
    type: String,
    enum: ['in_progress', 'completed', 'timeout', 'wrong_answer', 'abandoned'],
    default: 'in_progress',
    index: true
  },
  started_at: { type: Date, default: Date.now, required: true },
  completed_at: { type: Date },
  time_taken_seconds: { type: Number }, // Total time taken in seconds
  
  // Answers
  answers: [{
    question_index: { type: Number, required: true },
    selected_option_index: { type: Number, required: true },
    is_correct: { type: Boolean, required: true },
    answered_at: { type: Date, default: Date.now },
    time_spent_seconds: { type: Number, default: 0 } // Time spent on this question
  }],
  
  // Results
  score: { type: Number }, // Percentage score
  all_correct: { type: Boolean }, // Whether all answers were correct
  correct_answers: { type: Number, default: 0 },
  total_questions: { type: Number, default: 0 },
  
  // Payout tracking
  payout_credited: { type: Boolean, default: false },
  payout_amount_cents: { type: Number, default: 0 },
  
  // Revocation system
  revoked: { type: Boolean, default: false },
  revoked_at: { type: Date },
  revoked_by: { type: String, ref: 'Profile' },
  revoke_reason: { type: String },
  
  // User experience metrics
  user_rating: { type: Number, min: 1, max: 5 }, // User rating of survey experience
  feedback: { type: String }, // User feedback
  difficulty_perception: { 
    type: String, 
    enum: ['too_easy', 'appropriate', 'too_hard'] 
  },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  indexes: [
    { fields: { survey_id: 1, user_id: 1 }, unique: true },
    { fields: { status: 1 } },
    { fields: { created_at: -1 } },
    { fields: { revoked: 1 } },
    { fields: { payout_credited: 1 } },
  ]
});

// Pre-save middleware to calculate results
SurveyResponseSchema.pre('save', function(next) {
  if (this.isModified('answers') && this.answers.length > 0) {
    this.total_questions = this.answers.length;
    this.correct_answers = this.answers.filter(answer => answer.is_correct).length;
    this.score = (this.correct_answers / this.total_questions) * 100;
    this.all_correct = this.correct_answers === this.total_questions;
  }
  
  // Calculate time taken if completed
  if (this.isModified('status') && this.status === 'completed' && this.completed_at) {
    this.time_taken_seconds = Math.floor(
      (this.completed_at.getTime() - this.started_at.getTime()) / 1000
    );
  }
  next();
});

// Instance method to mark as completed
SurveyResponseSchema.methods.markCompleted = function(answers: any[]) {
  this.answers = answers;
  this.status = 'completed';
  this.completed_at = new Date();
  return this.save();
};

// Instance method to revoke response
SurveyResponseSchema.methods.revoke = function(adminId: string, reason: string) {
  this.revoked = true;
  this.revoked_at = new Date();
  this.revoked_by = adminId;
  this.revoke_reason = reason;
  this.payout_credited = false;
  return this.save();
};

export const SurveyResponse = getModel('SurveyResponse', SurveyResponseSchema);
/**
 * 20. SurveyAssignment Model - For tracking which users get which surveys
 */
const SurveyAssignmentSchema = new Schema({
  survey_id: {
    type: Schema.Types.ObjectId,
    ref: 'Survey',
    required: true,
    index: true
  },
  user_id: {
    type: String,
    ref: 'Profile',
    required: true,
    index: true
  },
  assigned_at: { type: Date, default: Date.now, index: true },
  assigned_reason: {
    type: String,
    enum: ['new_user', 'top_referrer', 'high_accuracy', 'random'], // ADDED 'high_accuracy'
    required: true
  },
  notified: { type: Boolean, default: false },
  notified_at: { type: Date },
}, {
  timestamps: { createdAt: 'created_at' },
  indexes: [
    { fields: { survey_id: 1, user_id: 1 }, unique: true },
    { fields: { assigned_reason: 1 } },
  ]
});

export const SurveyAssignment = getModel('SurveyAssignment', SurveyAssignmentSchema);

/**
 * 21. VerificationToken Model (for email verification and 2FA codes) - ENHANCED
 */
const VerificationTokenSchema = new Schema({
  token: { type: String, required: true, index: true },
  user_id: { type: String, ref: 'Profile', required: true, index: true },
  expires: { type: Date, required: true }, // Remove index: true to avoid duplicate
  
  // Purpose of the verification token
  purpose: { 
    type: String, 
    enum: ['email_verification', 'password_reset', 'mpesa_change', '2fa_setup', 'account_recovery'],
    default: 'email_verification',
    required: true,
    index: true
  },
  
  // Metadata for storing additional information
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  },
  
  // Track usage
  used: { type: Boolean, default: false },
  used_at: { type: Date },
  
  // IP tracking for security
  ip_address: { type: String },
  user_agent: { type: String },
  
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  indexes: [
    { fields: { token: 1 } },
    { fields: { user_id: 1, purpose: 1 } },
    { fields: { used: 1 } },
    { fields: { purpose: 1 } },
  ]
});

// Index to automatically delete expired tokens after 24 hours (TTL index)
VerificationTokenSchema.index({ expires: 1 }, { expireAfterSeconds: 86400 });

export const VerificationToken = getModel('VerificationToken', VerificationTokenSchema);
/**
 * 22. SystemSettings Model - For storing system-wide settings
 */
const SystemSettingsSchema = new Schema({
  key: { 
    type: String, 
    required: true, 
    unique: true 
  },
  value: { 
    type: Schema.Types.Mixed, 
    required: true 
  },
  description: { 
    type: String 
  },
  is_active: { 
    type: Boolean, 
    default: true 
  },
  updated_by: { 
    type: String, 
    ref: 'Profile' 
  },
  last_updated_at: { 
    type: Date, 
    default: Date.now 
  },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  indexes: [
    { fields: { key: 1 } },
    { fields: { is_active: 1 } },
  ]
});

export const SystemSettings = getModel('SystemSettings', SystemSettingsSchema);

/**
 * 23. FailedTransaction Model - For tracking detailed failed transaction attempts
 */
const FailedTransactionSchema = new Schema({
  user_id: { 
    type: String, 
    ref: 'Profile', 
    required: true, 
    index: true 
  },
  amount_cents: { 
    type: Number, 
    required: true 
  },
  type: { 
    type: String, 
    enum: TransactionTypes, 
    required: true 
  },
  details: { 
    type: String 
  },
  error_code: { 
    type: String 
  },
  error_message: { 
    type: String, 
    required: true 
  },
  metadata: { 
    type: Schema.Types.Mixed, 
    default: {} 
  },
  is_retryable: { 
    type: Boolean, 
    default: false 
  },
  resolved: { 
    type: Boolean, 
    default: false 
  },
  resolved_at: { 
    type: Date 
  },
  resolved_by: { 
    type: String, 
    ref: 'Profile' 
  },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  indexes: [
    { fields: { user_id: 1, created_at: -1 } },
    { fields: { resolved: 1 } },
    { fields: { error_code: 1 } },
  ]
});

export const FailedTransaction = getModel('FailedTransaction', FailedTransactionSchema);

/**
 * 24. ActivationLog Model - For tracking activation attempts and history
 */
const ActivationLogSchema = new Schema({
  user_id: { 
    type: String, 
    ref: 'Profile', 
    required: true, 
    index: true 
  },
  action: { 
    type: String, 
    enum: ['initiated', 'payment_sent', 'payment_confirmed', 'activated', 'failed'],
    required: true 
  },
  checkout_request_id: { 
    type: String, 
    index: true 
  },
  amount_cents: { 
    type: Number, 
    required: true 
  },
  phone_number: { 
    type: String, 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['success', 'failed', 'pending'],
    required: true 
  },
  error_message: { 
    type: String 
  },
  ip_address: { 
    type: String 
  },
  user_agent: { 
    type: String 
  },
  metadata: { 
    type: Schema.Types.Mixed, 
    default: {} 
  },
}, {
  timestamps: { createdAt: 'created_at' },
  indexes: [
    { fields: { user_id: 1, created_at: -1 } },
    { fields: { action: 1 } },
    { fields: { checkout_request_id: 1 } },
    { fields: { status: 1 } },
  ]
});

export const ActivationLog = getModel('ActivationLog', ActivationLogSchema);

// --- Enhanced Spin to Win Models with Full Admin Control ---

/**
 * 25. SpinPrize Model - Defines available prizes and probabilities with admin control
 */
const SpinPrizeSchema = new Schema({
  name: { type: String, required: true },
  type: { 
    type: String, 
    enum: SpinPrizeTypes, 
    required: true,
    unique: true 
  },
  display_name: { type: String, required: true },
  description: { type: String, required: true },
  icon: { type: String, required: true }, // Emoji or icon name
  
  // Probability settings with admin control
  base_probability: { 
    type: Number, 
    required: true,
    min: 0,
    max: 100,
    validate: {
      validator: function(v: number) {
        return v >= 0 && v <= 100;
      },
      message: 'Probability must be between 0 and 100'
    }
  },
  accessible_tiers: [{ 
    type: String, 
    enum: UserTiers,
    required: true 
  }],
  
  // Requirements with admin control
  min_referrals: { 
    type: Number, 
    default: 0,
    min: 0 
  },
  requires_activation: { type: Boolean, default: true },
  min_user_level: { type: Number, default: 0 },
  
  // Prize value with admin control
  value_cents: { 
    type: Number, 
    default: 0,
    min: 0 
  },
  value_description: { type: String }, // e.g., "KES 100", "7 days boost"
  
  // Prize-specific settings
  credit_type: { 
    type: String, 
    enum: ['balance', 'spins', 'airtime', 'badge', 'feature', 'voucher', 'boost'],
    required: true 
  },
  duration_days: { 
    type: Number, 
    default: 0,
    min: 0 
  }, // For time-limited prizes
  
  // Admin control flags
  is_active: { type: Boolean, default: true },
  is_featured: { type: Boolean, default: false },
  admin_notes: { type: String },
  
  // Ad slot specific
  is_ad_slot: { type: Boolean, default: false },
  ad_provider: { type: String },
  ad_value_cents: { type: Number, default: 0 },
  
  // Order for wheel display
  wheel_order: { 
    type: Number, 
    required: true,
    min: 1 
  },
  color: { 
    type: String, 
    required: true,
    match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid color format']
  },
  
  // Audit fields
  created_by: { type: String, ref: 'Profile', required: true },
  updated_by: { type: String, ref: 'Profile' },
  
  // Versioning for admin changes
  version: { type: Number, default: 1 },
  
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  indexes: [
    { fields: { type: 1 } },
    { fields: { is_active: 1 } },
    { fields: { accessible_tiers: 1 } },
    { fields: { wheel_order: 1 } },
    { fields: { base_probability: -1 } },
    { fields: { is_featured: 1 } },
    { fields: { created_by: 1 } },
  ]
});

export const SpinPrize = getModel('SpinPrize', SpinPrizeSchema);

/**
 * 26. SpinLog Model - Tracks every spin attempt with admin visibility
 */
const SpinLogSchema = new Schema({
  user_id: { 
    type: String, 
    ref: 'Profile', 
    required: true, 
    index: true 
  },
  spin_cost_cents: { 
    type: Number, 
    default: 500, // 5 spins = KES 5
    required: true 
  },
  spins_used: { 
    type: Number, 
    default: 5, 
    required: true 
  },
  
  // Prize information
  prize_id: { 
    type: Schema.Types.ObjectId, 
    ref: 'SpinPrize',
    index: true 
  },
  prize_type: { 
    type: String, 
    enum: SpinPrizeTypes,
    index: true 
  },
  prize_name: { type: String },
  prize_value_cents: { type: Number, default: 0 },
  
  // Spin result
  status: { 
    type: String, 
    enum: SpinStatuses, 
    default: 'pending',
    index: true 
  },
  won: { type: Boolean, default: false },
  
  // User state at time of spin
  user_tier: { 
    type: String, 
    enum: UserTiers, 
    required: true 
  },
  user_referral_count: { type: Number, required: true },
  user_balance_before: { type: Number, required: true },
  user_spins_before: { type: Number, required: true },
  user_level: { type: Number, required: true },
  
  // Probability calculation
  calculated_probability: { type: Number, required: true },
  available_prizes_count: { type: Number, required: true },
  probability_multiplier: { type: Number, default: 1.0 },
  
  // Cost impact tracking
  cost_impact_cents: { type: Number, default: 0 },
  revenue_impact_cents: { type: Number, default: 0 },
  net_impact_cents: { type: Number, default: 0 },
  
  // Crediting tracking
  credited: { type: Boolean, default: false },
  credited_at: { type: Date },
  credit_transaction_id: { 
    type: Schema.Types.ObjectId, 
    ref: 'Transaction' 
  },
  
  // Spin session info
  spin_session_id: { type: String, index: true }, // Group spins in same session
  spin_wheel_position: { type: Number }, // Where wheel landed
  
  // Eligibility checks
  tasks_completed_this_week: { 
    referral: { type: Boolean, default: false },
    writing: { type: Boolean, default: false },
    last_updated: { type: Date }
  },
  
  // Admin review fields
  needs_review: { type: Boolean, default: false },
  reviewed_by: { type: String, ref: 'Profile' },
  reviewed_at: { type: Date },
  review_notes: { type: String },
  
  // Technical metadata
  user_agent: { type: String },
  ip_address: { type: String },
  
  metadata: { 
    type: Schema.Types.Mixed, 
    default: {} 
  },
  
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  indexes: [
    { fields: { user_id: 1, created_at: -1 } },
    { fields: { status: 1 } },
    { fields: { won: 1 } },
    { fields: { credited: 1 } },
    { fields: { prize_type: 1 } },
    { fields: { spin_session_id: 1 } },
    { fields: { created_at: -1 } },
    { fields: { needs_review: 1 } },
    { fields: { user_tier: 1 } },
    { fields: { net_impact_cents: 1 } },
  ]
});

export const SpinLog = getModel('SpinLog', SpinLogSchema);

/**
 * 27. SpinSettings Model - Complete admin controls and scheduling
 */
const SpinSettingsSchema = new Schema({
  // Activation settings with full admin control
  is_active: { 
    type: Boolean, 
    default: false,
    index: true 
  },
  activation_mode: { 
    type: String, 
    enum: SpinActivationModes,
    default: 'scheduled',
    index: true 
  },
  
  // Scheduled activation with admin control
  scheduled_days: [{ 
    type: String, 
    enum: WeekDays 
  }],
  start_time: { 
    type: String,
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format']
  },
  end_time: { 
    type: String,
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format']
  },
  timezone: { 
    type: String, 
    default: 'Africa/Nairobi' 
  },
  
  // User limits with admin control
  spins_per_session: { 
    type: Number, 
    default: 3,
    min: 1,
    max: 10 
  },
  spins_cost_per_spin: { 
    type: Number, 
    default: 5,
    min: 1,
    max: 20 
  },
  cooldown_minutes: { 
    type: Number, 
    default: 1440, // 24 hours between sessions
    min: 60,
    max: 10080 // 1 week
  },
  
  // Eligibility requirements with admin control
  require_tasks_completion: { type: Boolean, default: true },
  min_user_level: { 
    type: Number, 
    default: 0,
    min: 0 
  },
  require_activation: { type: Boolean, default: true },
  require_email_verification: { type: Boolean, default: false },
  
  // Probability adjustments with admin control
  probability_multipliers: {
    starter: { 
      type: Number, 
      default: 1.0,
      min: 0.1,
      max: 5.0 
    },
    bronze: { 
      type: Number, 
      default: 1.1,
      min: 0.1,
      max: 5.0 
    },
    silver: { 
      type: Number, 
      default: 1.2,
      min: 0.1,
      max: 5.0 
    },
    gold: { 
      type: Number, 
      default: 1.3,
      min: 0.1,
      max: 5.0 
    },
    diamond: { 
      type: Number, 
      default: 1.5,
      min: 0.1,
      max: 5.0 
    }
  },
  
  // Ad integration with admin control
  ad_slot_enabled: { type: Boolean, default: true },
  ad_slot_probability: { 
    type: Number, 
    default: 5,
    min: 0,
    max: 100 
  },
  ad_min_referrals: { 
    type: Number, 
    default: 50,
    min: 0 
  },
  
  // Maintenance mode with admin control
  maintenance_mode: { type: Boolean, default: false },
  maintenance_message: { type: String },
  maintenance_start: { type: Date },
  maintenance_end: { type: Date },
  
  // Analytics and reporting
  total_spins_today: { type: Number, default: 0 },
  total_wins_today: { type: Number, default: 0 },
  total_revenue_today_cents: { type: Number, default: 0 },
  total_payouts_today_cents: { type: Number, default: 0 },
  last_reset_date: { type: Date, default: Date.now },
  
  // Admin audit trail
  last_activated_by: { type: String, ref: 'Profile' },
  last_activated_at: { type: Date },
  last_updated_by: { type: String, ref: 'Profile' },
  
  // Version control
  version: { type: Number, default: 1 },
  change_history: [{
    changed_by: { type: String, ref: 'Profile' },
    changed_at: { type: Date, default: Date.now },
    changes: { type: Schema.Types.Mixed },
    version: { type: Number }
  }],
  
  metadata: { 
    type: Schema.Types.Mixed, 
    default: {} 
  },
  
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  indexes: [
    { fields: { is_active: 1 } },
    { fields: { activation_mode: 1 } },
    { fields: { maintenance_mode: 1 } },
    { fields: { last_activated_at: -1 } },
    { fields: { last_reset_date: 1 } },
  ]
});

export const SpinSettings = getModel('SpinSettings', SpinSettingsSchema);

/**
 * 28. UserSpinEligibility Model - Track user eligibility and limits with admin visibility
 */
const UserSpinEligibilitySchema = new Schema({
  user_id: { 
    type: String, 
    ref: 'Profile', 
    required: true, 
    unique: true,
    index: true 
  },
  
  // Spin limits with admin visibility
  spins_used_today: { 
    type: Number, 
    default: 0,
    min: 0 
  },
  last_spin_date: { type: Date },
  current_session_spins: { 
    type: Number, 
    default: 0,
    min: 0 
  },
  session_started_at: { type: Date },
  
  // Task completion tracking
  tasks_completed_this_week: {
    referral: { type: Boolean, default: false },
    writing: { type: Boolean, default: false },
    last_updated: { type: Date }
  },
  
  // Eligibility flags with admin control
  is_eligible: { type: Boolean, default: false },
  eligibility_reason: { type: String },
  last_eligibility_check: { type: Date },
  manual_override: { 
    type: Boolean, 
    default: false 
  },
  override_by: { type: String, ref: 'Profile' },
  override_reason: { type: String },
  override_until: { type: Date },
  
  // Cooldown tracking
  cooldown_until: { type: Date },
  cooldown_reason: { type: String },
  
  // Statistics for admin reporting
  total_spins: { type: Number, default: 0 },
  total_wins: { type: Number, default: 0 },
  total_prize_value_cents: { type: Number, default: 0 },
  win_streak: { type: Number, default: 0 },
  loss_streak: { type: Number, default: 0 },
  
  // Current active prizes
  active_prizes: [{
    prize_id: { type: Schema.Types.ObjectId, ref: 'SpinPrize' },
    prize_type: { type: String, enum: SpinPrizeTypes },
    awarded_at: { type: Date },
    expires_at: { type: Date },
    is_active: { type: Boolean, default: true },
    metadata: { type: Schema.Types.Mixed }
  }],
  
  // Performance metrics
  average_win_rate: { type: Number, default: 0 },
  favorite_prize: { type: String, enum: SpinPrizeTypes },
  last_win_date: { type: Date },
  
  metadata: { 
    type: Schema.Types.Mixed, 
    default: {} 
  },
  
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  indexes: [
    { fields: { is_eligible: 1 } },
    { fields: { cooldown_until: 1 } },
    { fields: { last_spin_date: 1 } },
    { fields: { manual_override: 1 } },
    { fields: { total_spins: -1 } },
    { fields: { total_prize_value_cents: -1 } },
  ]
});

export const UserSpinEligibility = getModel('UserSpinEligibility', UserSpinEligibilitySchema);

/**
 * 29. SpinAnalytics Model - For admin reporting and analytics
 */
const SpinAnalyticsSchema = new Schema({
  // Date range
  date: { type: Date, required: true, index: true },
  period: { 
    type: String, 
    enum: ['daily', 'weekly', 'monthly'],
    required: true 
  },
  
  // Usage statistics
  total_spins: { type: Number, default: 0 },
  total_users: { type: Number, default: 0 },
  active_users: { type: Number, default: 0 },
  new_users: { type: Number, default: 0 },
  
  // Win/loss statistics
  total_wins: { type: Number, default: 0 },
  total_losses: { type: Number, default: 0 },
  win_rate: { type: Number, default: 0 },
  
  // Financial statistics
  total_revenue_cents: { type: Number, default: 0 },
  total_payouts_cents: { type: Number, default: 0 },
  net_revenue_cents: { type: Number, default: 0 },
  average_payout_cents: { type: Number, default: 0 },
  
  // Prize distribution
  prize_distribution: {
    type: Map,
    of: Number,
    default: {}
  },
  
  // Tier performance
  tier_performance: {
    starter: {
      spins: { type: Number, default: 0 },
      wins: { type: Number, default: 0 },
      payout: { type: Number, default: 0 }
    },
    bronze: {
      spins: { type: Number, default: 0 },
      wins: { type: Number, default: 0 },
      payout: { type: Number, default: 0 }
    },
    silver: {
      spins: { type: Number, default: 0 },
      wins: { type: Number, default: 0 },
      payout: { type: Number, default: 0 }
    },
    gold: {
      spins: { type: Number, default: 0 },
      wins: { type: Number, default: 0 },
      payout: { type: Number, default: 0 }
    },
    diamond: {
      spins: { type: Number, default: 0 },
      wins: { type: Number, default: 0 },
      payout: { type: Number, default: 0 }
    }
  },
  
  // Time-based analytics
  peak_hours: {
    type: Map,
    of: Number,
    default: {}
  },
  
  // User engagement
  average_spins_per_user: { type: Number, default: 0 },
  retention_rate: { type: Number, default: 0 },
  
  metadata: { 
    type: Schema.Types.Mixed, 
    default: {} 
  },
  
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  indexes: [
    { fields: { date: 1, period: 1 }, unique: true },
    { fields: { period: 1 } },
    { fields: { total_revenue_cents: -1 } },
  ]
});

export const SpinAnalytics = getModel('SpinAnalytics', SpinAnalyticsSchema);

// --- End Enhanced Spin to Win Models ---

/**
 * 30. Company Model - Independent company entity separate from users
 */
const CompanySchema = new Schema({
  name: { 
    type: String, 
    required: true,
    default: 'HustleHub Africa Ltd'
  },
  email: { 
    type: String, 
    required: true, 
    unique: true,
    default: 'company@hustlehubafrica.com'
  },
  phone_number: { 
    type: String,
    default: '+254700000000'
  },
  
  // Financial tracking
  wallet_balance_cents: { 
    type: Number, 
    default: 0,
    required: true 
  },
  total_revenue_cents: { 
    type: Number, 
    default: 0 
  },
  total_expenses_cents: { 
    type: Number, 
    default: 0 
  },
  
  // Revenue breakdown
  activation_revenue_cents: { 
    type: Number, 
    default: 0 
  },
  unclaimed_referral_revenue_cents: { 
    type: Number, 
    default: 0 
  },
  content_payment_revenue_cents: { 
    type: Number, 
    default: 0 
  },
  other_revenue_cents: { 
    type: Number, 
    default: 0 
  },
  
  // Company info
  registration_number: { type: String },
  tax_id: { type: String },
  address: { type: String },
  
  // Settings
  is_active: { 
    type: Boolean, 
    default: true 
  },
  
  // Metadata
  metadata: { 
    type: Schema.Types.Mixed, 
    default: {} 
  },
  
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  indexes: [
    { fields: { email: 1 } },
    { fields: { is_active: 1 } },
  ]
});

// Export the Company model
export const Company = getModel('Company', CompanySchema);

export { mongoose, connectToDatabase };
