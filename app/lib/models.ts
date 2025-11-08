// lib/models.ts - COMPLETE VERSION WITH ANTI-PHISHING CODE
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
  'SURVEY_REVOKE',
  'ACTIVATION_FEE',
  'ADMIN_ACTIVATION', 
  'COMPANY_REVENUE',
  'ACCOUNT_ACTIVATION',
  'SPIN_COST',
  'SPIN_PRIZE',
  'ADMIN_CREDIT',
  'ADMIN_DEBIT'
] as const;
const BlogPostStatuses = ['draft', 'published', 'archived'] as const;
const UserContentTypes = ['blog_post', 'social_media', 'product_review', 'video', 'other'] as const;
const UserContentStatuses = ['pending', 'approved', 'rejected', 'revision_requested'] as const;
const UserContentPaymentStatuses = ['pending', 'paid', 'rejected'] as const;

// M-Pesa Specific Enums
const MpesaTransactionStatuses = ['initiated', 'pending', 'completed', 'failed', 'cancelled', 'timeout'] as const;
const MpesaResultCodes = [0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15, 17, 20, 26, 1032, 1037, 2001] as const;

// Source Types for Transactions and M-Pesa
const SourceTypes = ['wallet', 'dashboard', 'api', 'activation'] as const;

// Survey Categories
const SurveyCategories = ['market_research', 'consumer_insights', 'product_feedback', 'academic', 'other'] as const;

// Survey Status
const SurveyStatuses = ['draft', 'scheduled', 'active', 'completed', 'cancelled'] as const;

// Audit Log Action Types - UPDATED FOR USER MANAGEMENT, SPIN & CSV
const AuditActionTypes = [
  'create', 'update', 'delete', 'approve', 'reject', 'activate', 'suspend', 'ban',
  'spin_win', 'spin_attempt', 'spin_settings_update', 'spin_wheel_activated', 'spin_wheel_deactivated',
  'campaign_create', 'campaign_update', 'campaign_delete', 'campaign_toggle_status', 'campaign_create_csv',
  'conversion_approve', 'conversion_reject', 
  'payout_approve', 'payout_reject', 'payout_process',
  'csv_import', 'product_create', 'product_update', 'product_delete', 'product_bulk_delete'
] as const;

const AuditResourceTypes = [
  'user', 'transaction', 'activation', 'withdrawal', 'profile', 'referral',
  'spin', 'spin_prize', 'spin_settings', 'spin_log', 'blog_post', 'mpesa_change_request',
  'campaign', 'affiliate_link', 'conversion', 'payout', 'soko', 'anti_phishing',
  'product', 'csv_import', 'alibaba_product'
] as const;

const AuditActions = [
  'CREATE', 'UPDATE', 'DELETE', 'ACTIVATE', 'DEACTIVATE', 
  'APPROVE', 'REJECT', 'SUSPEND', 'BAN', 'UNBAN',
  'SPIN_WIN', 'SPIN_ATTEMPT', 'SPIN_SETTINGS_UPDATE',
  'CAMPAIGN_CREATE', 'CAMPAIGN_UPDATE', 'CAMPAIGN_DELETE', 'CAMPAIGN_TOGGLE_STATUS', 'CAMPAIGN_CREATE_FROM_CSV',
  'CONVERSION_APPROVE', 'CONVERSION_REJECT',
  'PAYOUT_APPROVE', 'PAYOUT_REJECT', 'PAYOUT_PROCESS',
  'CSV_IMPORT', 'PRODUCT_CREATE', 'PRODUCT_UPDATE', 'PRODUCT_DELETE'
] as const;

// Spin to Win Enums
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

// --- Helper function to get or create a model ---
const getModel = (name: string, schema: Schema) => {
  return models[name] || model(name, schema);
};

// --- Define Schemas & Models ---

/**
 * 1. Profile Model - ENHANCED FOR M-PESA & ACTIVATION & SPIN & 2FA & ANTI-PHISHING
 */
const ProfileSchema = new Schema({
  _id: { type: String, required: true },
  username: { type: String, required: true, maxlength: 50 },
  phone_number: { 
    type: String, 
    required: false,
    default: null,
    maxlength: 50 
  },
  email: { type: String, required: true, unique: true, maxlength: 255 },
  password: {
    type: String,
    required: false,
    select: false
  },

  // ===== 2FA FIELDS =====
  twoFAEnabled: { type: Boolean, default: false },
  twoFASecret: { 
    type: String, 
    default: null,
  },
  twoFABackupCodes: [{
    code: { type: String },
    used: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
  }],
  twoFALastUsed: { type: Date },
  twoFASetupDate: { type: Date },
  // ===== END 2FA FIELDS =====

  // ===== ANTI-PHISHING CODE FIELDS =====
  antiPhishingCode: { 
    type: String, 
    default: null,
    select: false // Don't return in queries by default for security
  },
  antiPhishingCodeSet: { 
    type: Boolean, 
    default: false,
    index: true
  },
  antiPhishingSetAt: { 
    type: Date 
  },
  antiPhishingLastUpdated: { 
    type: Date 
  },
  // ===== END ANTI-PHISHING CODE FIELDS =====

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
  available_spins: { type: Number, default: 0 },
  total_spins_used: { type: Number, default: 0 },
  total_prizes_won: { type: Number, default: 0 },
  spin_tier: { 
    type: String, 
    enum: UserTiers, 
    default: 'starter' 
  },
  last_spin_at: { type: Date },
  spin_streak: { type: Number, default: 0 },
  max_spin_streak: { type: Number, default: 0 },

  // Enhanced M-Pesa Integration Fields
  total_deposits_cents: { type: Number, default: 0 },
  total_withdrawals_cents: { type: Number, default: 0 },
  last_deposit_at: { type: Date },
  last_withdrawal_at: { type: Date },

  preferred_mpesa_number: { 
    type: String, 
    required: false,
    default: null 
  },
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

  // Authentication method tracking
  authMethod: { 
    type: String, 
    enum: ['email', 'google'], 
    default: 'email' 
  },

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
    { fields: { authMethod: 1 } },
    // 2FA INDEXES
    { fields: { twoFAEnabled: 1 } },
    { fields: { twoFALastUsed: 1 } },
    // ANTI-PHISHING INDEXES
    { fields: { antiPhishingCodeSet: 1 } },
    { fields: { antiPhishingSetAt: 1 } },
  ]
});

// 2FA Methods
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

// Anti-phishing code methods
ProfileSchema.methods.setAntiPhishingCode = function(hashedCode: string) {
  this.antiPhishingCode = hashedCode;
  this.antiPhishingCodeSet = true;
  this.antiPhishingSetAt = this.antiPhishingSetAt || new Date();
  this.antiPhishingLastUpdated = new Date();
  return this.save();
};

ProfileSchema.methods.removeAntiPhishingCode = function() {
  this.antiPhishingCode = null;
  this.antiPhishingCodeSet = false;
  this.antiPhishingLastUpdated = new Date();
  return this.save();
};

ProfileSchema.methods.getAntiPhishingCode = async function() {
  if (!this.antiPhishingCodeSet || !this.antiPhishingCode) {
    return null;
  }
  // Note: Returns the hashed code. In production, consider using encryption instead
  return this.antiPhishingCode;
};

// Virtual fields
ProfileSchema.virtual('twoFASetupInProgress').get(function() {
  return !this.twoFAEnabled && !!this.twoFASecret;
});

ProfileSchema.virtual('requires2FA').get(function() {
  return this.twoFAEnabled && !!this.twoFASecret;
});

ProfileSchema.virtual('hasPhoneNumber').get(function() {
  return !!this.phone_number;
});

ProfileSchema.virtual('hasAntiPhishingCode').get(function() {
  return this.antiPhishingCodeSet && !!this.antiPhishingCode;
});

// Profile completion calculation
ProfileSchema.methods.calculateCompletionPercentage = function() {
  const requiredFields = [
    'username',
    'email',
  ];
  
  const completedFields = requiredFields.filter(field => 
    this[field] !== null && this[field] !== undefined && this[field] !== ''
  );
  
  // Add bonus for optional fields
  const bonusFields = (this.phone_number ? 1 : 0) + (this.antiPhishingCodeSet ? 1 : 0);
  
  this.completion_percentage = Math.round(
    ((completedFields.length + bonusFields) / (requiredFields.length + 2)) * 100
  );
  
  this.profile_completed = this.completion_percentage >= 80;
  return this.save();
};

// JSON serialization security
ProfileSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    // Remove sensitive data from JSON output
    delete ret.twoFASecret;
    delete ret.twoFABackupCodes;
    delete ret.password;
    delete ret.antiPhishingCode; // CRITICAL: Never expose hashed code
    return ret;
  }
});

export const Profile = getModel('Profile', ProfileSchema);

/**
 * 2. ActivationPayment Model
 */
const ActivationPaymentSchema = new Schema({
  user_id: { type: String, ref: 'Profile', required: true, index: true },
  amount_cents: { type: Number, default: 100000, required: true },
  currency: { type: String, default: 'KES', maxlength: 3, required: true },
  provider: { type: String, enum: PaymentProviders, required: true },
  provider_reference: { type: String, maxlength: 255 },
  provider_response: { type: Schema.Types.Mixed },
  status: { type: String, enum: PaymentStatuses, default: 'pending', required: true, index: true },
  paid_at: { type: Date },
  
  mpesa_transaction_id: { type: Schema.Types.ObjectId, ref: 'MpesaTransaction' },
  checkout_request_id: { type: String, index: true },
  mpesa_receipt_number: { type: String },
  phone_number: { type: String, required: true },
  
  metadata: { 
    type: Schema.Types.Mixed,
    default: {
      activation_type: 'account_activation',
      auto_approved: false,
      requires_manual_review: false
    }
  },
  
  retry_count: { type: Number, default: 0 },
  last_retry_at: { type: Date },
  error_message: { type: String },
  error_stack: { type: String },
  
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
 * 3. SupportTicket Model
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
  
  category: { type: String, enum: ['activation', 'deposit', 'withdrawal', 'technical', 'general', 'spin', 'security'], default: 'general' },
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

const AdminAuditLogSchema = new Schema({
  actor_id: { type: String, ref: 'Profile', required: true, index: true },
  action: { 
    type: String, 
    required: true, 
    maxlength: 100,
   enum: [
      'APPROVE_USER',
      'REJECT_USER',
      'ACTIVATE_USER',
      'SUSPEND_USER',
      'BAN_USER',
      'REINSTATE_USER',
      'ADD_SPINS',
      'UPDATE_USER_STATUS',
      'UPDATE_USER_BALANCE',
      'CREDIT_USER_BALANCE',
      'DEBIT_USER_BALANCE',
      'RESET_USER_LIMITS',
      'DELETE_USER',
      'APPROVE_WITHDRAWAL',
      'REJECT_WITHDRAWAL',
      'COMPLETE_WITHDRAWAL',
      'REVERSE_WITHDRAWAL',
      'UPDATE_WITHDRAWAL_NOTES',
      'CREATE_MPESA_CHANGE_REQUEST',
      'APPROVE_MPESA_CHANGE',
      'REJECT_MPESA_CHANGE',
      'DELETE_MPESA_CHANGE_REQUEST',
      'CREATE_SPIN_PRIZE',
      'UPDATE_SPIN_PRIZE',
      'DELETE_SPIN_PRIZE',
      'UPDATE_SPIN_SETTINGS',
      'ACTIVATE_SPIN_WHEEL',
      'DEACTIVATE_SPIN_WHEEL',
      'UPDATE_SPIN_SCHEDULE',
      'VIEW_SPIN_LOGS',
      'MANAGE_SPIN_PRIZES',
      'CREATE_BLOG_POST',
      'UPDATE_BLOG_POST',
      'DELETE_BLOG_POST',
      'CREATE_SURVEY',
      'UPDATE_SURVEY',
      'DELETE_SURVEY',
      'ACTIVATE_SURVEY',
      'DEACTIVATE_SURVEY',
      'CREATE_TRANSACTION',
      'UPDATE_TRANSACTION',
      'REVERSE_TRANSACTION',
      'UPDATE_SYSTEM_SETTINGS',
      'SYNC_COMPANY_FINANCIALS',
      'VIEW_AUDIT_LOGS',
      'EXPORT_DATA',
      'CAMPAIGN_CREATE',
      'CAMPAIGN_UPDATE',
      'CAMPAIGN_DELETE',
      'CAMPAIGN_TOGGLE_STATUS',
      'CAMPAIGN_CREATE_FROM_CSV',
      'CONVERSION_APPROVE',
      'CONVERSION_REJECT',
      'PAYOUT_APPROVE',
      'PAYOUT_REJECT',
      'PAYOUT_PROCESS',
      'UPDATE_ANTI_PHISHING',
      'REMOVE_ANTI_PHISHING',
      'CSV_IMPORT',
      'PRODUCT_CREATE',
      'PRODUCT_UPDATE',
      'PRODUCT_DELETE'
    ]
  },
  target_type: { type: String, required: true, maxlength: 50 },
  target_id: { type: String, required: true, index: true },
  changes: { type: Schema.Types.Mixed },
  ip_address: { type: String },
  user_agent: { type: String },
  
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
  
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  },
  
  processing_time_ms: { type: Number },
  
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
 * 5. Referral Model
 */
const ReferralSchema = new Schema({
  referrer_id: { type: String, ref: 'Profile', required: true, index: true },
  referred_id: { type: String, ref: 'Profile', required: true, unique: true },
  earning_cents: { type: Number, default: 0 },
  
  status: { type: String, enum: ['active', 'inactive', 'bonus_paid'], default: 'active' },
  referral_bonus_paid: { type: Boolean, default: false },
  referral_bonus_amount_cents: { type: Number, default: 5000 },
  bonus_paid_at: { type: Date },
  
  referred_user_activated: { type: Boolean, default: false },
  referred_user_activated_at: { type: Date },
  
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
 * 6. DownlineUser Model
 */
const DownlineUserSchema = new Schema({
  main_user_id: { type: String, ref: 'Profile', required: true },
  downline_user_id: { type: String, ref: 'Profile', required: true, unique: true },
  level: { type: Number, default: 1 },
  
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
 * 7. Earning Model
 */
const EarningSchema = new Schema({
  user_id: { type: String, ref: 'Profile', required: true, index: true },
  amount_cents: { type: Number, required: true },
  type: { type: String, enum: EarningTypes, required: true },
  description: { type: String },
  
  source_id: { type: Schema.Types.ObjectId },
  source_type: { type: String },
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
 * 8. Withdrawal Model
 */
const WithdrawalSchema = new Schema({
  user_id: { type: String, ref: 'Profile', required: true, index: true },
  amount_cents: { type: Number, required: true },
  status: { type: String, enum: WithdrawalStatuses, default: 'pending', index: true },
  mpesa_number: { type: String, maxlength: 50, required: true },
  transaction_code: { type: String, maxlength: 100 },
  approved_by: { type: String, ref: 'Profile' },
  approved_at: { type: Date },
  
  processed_at: { type: Date },
  processing_notes: { type: String },
  failure_reason: { type: String },
  
  mpesa_receipt_number: { type: String },
  mpesa_response: { type: Schema.Types.Mixed },
  
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
 * 9. Transaction Model
 */
const TransactionSchema = new Schema({
  user_id: { type: String, ref: 'Profile', required: false, index: true },
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
  
  processed_at: { type: Date },
  processing_duration_ms: { type: Number },
  source: { 
    type: String, 
    enum: SourceTypes,
    default: 'wallet' 
  },
  
  balance_before_cents: { type: Number },
  balance_after_cents: { type: Number },
  
  is_activation_fee: { type: Boolean, default: false },
  activation_payment_id: { type: Schema.Types.ObjectId, ref: 'ActivationPayment' },
  
  spin_related: {
    spin_log_id: { type: Schema.Types.ObjectId, ref: 'SpinLog' },
    prize_type: { type: String, enum: SpinPrizeTypes },
    spin_cost: { type: Boolean, default: false }
  },
  
  admin_processed: { type: Boolean, default: false },
  admin_processed_by: { type: String, ref: 'Profile' },
  admin_processed_at: { type: Date },

  target_type: {
    type: String,
    enum: ['user', 'company'],
    required: true,
    default: 'user',
    index: true
  },
  
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
    { fields: { target_type: 1, target_id: 1 } },
  ]
});

export const Transaction = getModel('Transaction', TransactionSchema);

/**
 * 10. Customer Model
 */
const CustomerSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  image_url: { type: String },
}, {
  timestamps: true,
});

export const Customer = getModel('Customer', CustomerSchema);

//invoice

/**
 * 12. Revenue Model
 */
const RevenueSchema = new Schema({
  month: { type: String, required: true, unique: true },
  revenue: { type: Number, required: true },
}, {
  timestamps: true,
});

export const Revenue = getModel('Revenue', RevenueSchema);

/**
 * 13. MpesaChangeRequest Model
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
 * 14. MpesaTransaction Model
 */
const MpesaTransactionSchema = new Schema({
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

  result_code: { 
    type: Number,
    enum: MpesaResultCodes,
    index: true 
  },
  result_desc: { 
    type: String 
  },

  status: {
    type: String,
    enum: MpesaTransactionStatuses,
    default: 'initiated',
    index: true
  },

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

  stk_push_request: { 
    type: Schema.Types.Mixed 
  },
  stk_push_response: { 
    type: Schema.Types.Mixed 
  },
  callback_payload: { 
    type: Schema.Types.Mixed 
  },

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
 * 15. MpesaCallbackLog Model
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
 * 16. BlogPost Model
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
  read_time: { type: Number, default: 5 },
  category: { type: String, maxlength: 100 },

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
 * 17. UserContent Model
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
  payment_amount: { type: Number, required: true },
  task_category: { type: String, required: true, maxlength: 100 },
  external_url: { type: String },
  attachments: [{ type: String }],
  tags: [{ type: String, maxlength: 50 }],
  word_count: { type: Number, default: 0 },

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
 * 18. Survey Model
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
  topics: [{ type: String }],
  payout_cents: { type: Number, default: 5000, required: true },
  duration_minutes: { type: Number, default: 5, required: true },
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
    correct_answer_index: { type: Number, required: true },
    required: { type: Boolean, default: true }
  }],

  target_percentage: { type: Number, default: 15 },
  priority_new_users: { type: Boolean, default: true },
  priority_top_referrers: { type: Boolean, default: true },

  status: {
    type: String,
    enum: SurveyStatuses,
    default: 'draft',
    index: true
  },
  scheduled_for: { type: Date, index: true },
  activated_at: { type: Date },
  expires_at: { type: Date },
  
  is_manually_enabled: { 
    type: Boolean, 
    default: false,
    index: true 
  },

  max_responses: { type: Number, default: 1000 },
  current_responses: { type: Number, default: 0 },
  successful_responses: { type: Number, default: 0 },
  failed_responses: { type: Number, default: 0 },
  completion_rate: { type: Number, default: 0 },
  average_score: { type: Number, default: 0 },
  average_completion_time: { type: Number, default: 0 },

  created_by: { type: String, ref: 'Profile', required: true },

  ai_generated: { type: Boolean, default: false },
  ai_prompt: { type: String },
  ai_model: { type: String },
  
  tags: [{ type: String }],
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  },
  estimated_completion_rate: { type: Number, default: 0 },
  quality_score: { type: Number, default: 0 },
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

SurveySchema.pre('save', function(next) {
  if (this.isModified('current_responses') || this.isModified('successful_responses')) {
    if (this.current_responses > 0) {
      this.completion_rate = (this.successful_responses / this.current_responses) * 100;
    }
  }
  next();
});

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

SurveySchema.methods.isAvailable = function() {
  const now = new Date();
  return this.status === 'active' && 
         this.expires_at > now &&
         (this.is_manually_enabled || 
          (this.scheduled_for <= now && this.is_manually_enabled !== false));
};

SurveySchema.methods.enableManually = function(hours = 24) {
  this.is_manually_enabled = true;
  this.status = 'active';
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + hours);
  this.expires_at = expiresAt;
  return this.save();
};

SurveySchema.methods.disableManually = function() {
  this.is_manually_enabled = false;
  if (this.scheduled_for && this.scheduled_for > new Date()) {
    this.status = 'scheduled';
  }
  return this.save();
};

SurveySchema.virtual('payout_formatted').get(function() {
  return `KES ${(this.payout_cents / 100).toFixed(2)}`;
});

SurveySchema.virtual('time_remaining').get(function() {
  const now = new Date();
  return this.expires_at ? Math.max(0, this.expires_at.getTime() - now.getTime()) : 0;
});

SurveySchema.virtual('is_expired').get(function() {
  return this.expires_at ? this.expires_at <= new Date() : false;
});

SurveySchema.set('toJSON', { virtuals: true });
SurveySchema.set('toObject', { virtuals: true });

export const Survey = getModel('Survey', SurveySchema);

/**
 * 19. Survey Response Model
 */
const SurveyResponseSchema = new Schema({
  survey_id: { type: Schema.Types.ObjectId, ref: 'Survey', required: true, index: true },
  user_id: { type: String, ref: 'Profile', required: true, index: true },
  
  status: {
    type: String,
    enum: ['in_progress', 'completed', 'timeout', 'wrong_answer', 'abandoned'],
    default: 'in_progress',
    index: true
  },
  started_at: { type: Date, default: Date.now, required: true },
  completed_at: { type: Date },
  time_taken_seconds: { type: Number },
  
  answers: [{
    question_index: { type: Number, required: true },
    selected_option_index: { type: Number, required: true },
    is_correct: { type: Boolean, required: true },
    answered_at: { type: Date, default: Date.now },
    time_spent_seconds: { type: Number, default: 0 }
  }],
  
  score: { type: Number },
  all_correct: { type: Boolean },
  correct_answers: { type: Number, default: 0 },
  total_questions: { type: Number, default: 0 },
  
  payout_credited: { type: Boolean, default: false },
  payout_amount_cents: { type: Number, default: 0 },
  
  revoked: { type: Boolean, default: false },
  revoked_at: { type: Date },
  revoked_by: { type: String, ref: 'Profile' },
  revoke_reason: { type: String },
  
  user_rating: { type: Number, min: 1, max: 5 },
  feedback: { type: String },
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

SurveyResponseSchema.pre('save', function(next) {
  if (this.isModified('answers') && this.answers.length > 0) {
    this.total_questions = this.answers.length;
    this.correct_answers = this.answers.filter(answer => answer.is_correct).length;
    this.score = (this.correct_answers / this.total_questions) * 100;
    this.all_correct = this.correct_answers === this.total_questions;
  }
  
  if (this.isModified('status') && this.status === 'completed' && this.completed_at) {
    this.time_taken_seconds = Math.floor(
      (this.completed_at.getTime() - this.started_at.getTime()) / 1000
    );
  }
  next();
});

SurveyResponseSchema.methods.markCompleted = function(answers: any[]) {
  this.answers = answers;
  this.status = 'completed';
  this.completed_at = new Date();
  return this.save();
};

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
 * 20. SurveyAssignment Model
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
    enum: ['new_user', 'top_referrer', 'high_accuracy', 'random'],
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
 * 21. VerificationToken Model
 */
const VerificationTokenSchema = new Schema({
  token: { type: String, required: true, index: true },
  user_id: { type: String, ref: 'Profile', required: true, index: true },
  expires: { type: Date, required: true },
  
  purpose: { 
    type: String, 
    enum: ['email_verification', 'password_reset', 'mpesa_change', '2fa_setup', 'account_recovery', 'anti_phishing_setup'],
    default: 'email_verification',
    required: true,
    index: true
  },
  
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  },
  
  used: { type: Boolean, default: false },
  used_at: { type: Date },
  
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

VerificationTokenSchema.index({ expires: 1 }, { expireAfterSeconds: 86400 });

export const VerificationToken = getModel('VerificationToken', VerificationTokenSchema);

/**
 * 22. SystemSettings Model
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
 * 23. FailedTransaction Model
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
 * 24. ActivationLog Model
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

/**
 * 25. SpinPrize Model
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
  icon: { type: String, required: true },
  
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
  
  min_referrals: { 
    type: Number, 
    default: 0,
    min: 0 
  },
  requires_activation: { type: Boolean, default: true },
  min_user_level: { type: Number, default: 0 },
  
  value_cents: { 
    type: Number, 
    default: 0,
    min: 0 
  },
  value_description: { type: String },
  
  credit_type: { 
    type: String, 
    enum: ['balance', 'spins', 'airtime', 'badge', 'feature', 'voucher', 'boost'],
    required: true 
  },
  duration_days: { 
    type: Number, 
    default: 0,
    min: 0 
  },
  
  is_active: { type: Boolean, default: true },
  is_featured: { type: Boolean, default: false },
  admin_notes: { type: String },
  
  is_ad_slot: { type: Boolean, default: false },
  ad_provider: { type: String },
  ad_value_cents: { type: Number, default: 0 },
  
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
  
  created_by: { type: String, ref: 'Profile', required: true },
  updated_by: { type: String, ref: 'Profile' },
  
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
 * 26. SpinLog Model
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
    default: 500,
    required: true 
  },
  spins_used: { 
    type: Number, 
    default: 5, 
    required: true 
  },
  
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
  
  status: { 
    type: String, 
    enum: SpinStatuses, 
    default: 'pending',
    index: true 
  },
  won: { type: Boolean, default: false },
  
  user_tier: { 
    type: String, 
    enum: UserTiers, 
    required: true 
  },
  user_referral_count: { type: Number, required: true },
  user_balance_before: { type: Number, required: true },
  user_spins_before: { type: Number, required: true },
  user_level: { type: Number, required: true },
  
  calculated_probability: { type: Number, required: true },
  available_prizes_count: { type: Number, required: true },
  probability_multiplier: { type: Number, default: 1.0 },
  
  cost_impact_cents: { type: Number, default: 0 },
  revenue_impact_cents: { type: Number, default: 0 },
  net_impact_cents: { type: Number, default: 0 },
  
  credited: { type: Boolean, default: false },
  credited_at: { type: Date },
  credit_transaction_id: { 
    type: Schema.Types.ObjectId, 
    ref: 'Transaction' 
  },
  
  spin_session_id: { type: String, index: true },
  spin_wheel_position: { type: Number },
  
  tasks_completed_this_week: { 
    referral: { type: Boolean, default: false },
    writing: { type: Boolean, default: false },
    last_updated: { type: Date }
  },
  
  needs_review: { type: Boolean, default: false },
  reviewed_by: { type: String, ref: 'Profile' },
  reviewed_at: { type: Date },
  review_notes: { type: String },
  
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
 * 27. SpinSettings Model
 */
const SpinSettingsSchema = new Schema({
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
    default: 1440,
    min: 60,
    max: 10080
  },
  
  require_tasks_completion: { type: Boolean, default: true },
  min_user_level: { 
    type: Number, 
    default: 0,
    min: 0 
  },
  require_activation: { type: Boolean, default: true },
  require_email_verification: { type: Boolean, default: false },
  
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
  
  maintenance_mode: { type: Boolean, default: false },
  maintenance_message: { type: String },
  maintenance_start: { type: Date },
  maintenance_end: { type: Date },
  
  total_spins_today: { type: Number, default: 0 },
  total_wins_today: { type: Number, default: 0 },
  total_revenue_today_cents: { type: Number, default: 0 },
  total_payouts_today_cents: { type: Number, default: 0 },
  last_reset_date: { type: Date, default: Date.now },
  
  last_activated_by: { type: String, ref: 'Profile' },
  last_activated_at: { type: Date },
  last_updated_by: { type: String, ref: 'Profile' },
  
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
 * 28. UserSpinEligibility Model
 */
const UserSpinEligibilitySchema = new Schema({
  user_id: { 
    type: String, 
    ref: 'Profile', 
    required: true, 
    unique: true,
    index: true 
  },
  
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
  
  tasks_completed_this_week: {
    referral: { type: Boolean, default: false },
    writing: { type: Boolean, default: false },
    last_updated: { type: Date }
  },
  
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
  
  cooldown_until: { type: Date },
  cooldown_reason: { type: String },
  
  total_spins: { type: Number, default: 0 },
  total_wins: { type: Number, default: 0 },
  total_prize_value_cents: { type: Number, default: 0 },
  win_streak: { type: Number, default: 0 },
  loss_streak: { type: Number, default: 0 },
  
  active_prizes: [{
    prize_id: { type: Schema.Types.ObjectId, ref: 'SpinPrize' },
    prize_type: { type: String, enum: SpinPrizeTypes },
    awarded_at: { type: Date },
    expires_at: { type: Date },
    is_active: { type: Boolean, default: true },
    metadata: { type: Schema.Types.Mixed }
  }],
  
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
 * 29. SpinAnalytics Model
 */
const SpinAnalyticsSchema = new Schema({
  date: { type: Date, required: true, index: true },
  period: { 
    type: String, 
    enum: ['daily', 'weekly', 'monthly'],
    required: true 
  },
  
  total_spins: { type: Number, default: 0 },
  total_users: { type: Number, default: 0 },
  active_users: { type: Number, default: 0 },
  new_users: { type: Number, default: 0 },
  
  total_wins: { type: Number, default: 0 },
  total_losses: { type: Number, default: 0 },
  win_rate: { type: Number, default: 0 },
  
  total_revenue_cents: { type: Number, default: 0 },
  total_payouts_cents: { type: Number, default: 0 },
  net_revenue_cents: { type: Number, default: 0 },
  average_payout_cents: { type: Number, default: 0 },
  
  prize_distribution: {
    type: Map,
    of: Number,
    default: {}
  },
  
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
  
  peak_hours: {
    type: Map,
    of: Number,
    default: {}
  },
  
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

/**
 * 30. Company Model
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
  
  registration_number: { type: String },
  tax_id: { type: String },
  address: { type: String },
  
  is_active: { 
    type: Boolean, 
    default: true 
  },
  
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

export const Company = getModel('Company', CompanySchema);

export { mongoose, connectToDatabase };

// Import Soko and other models
export {
  SokoCampaign,
  UserAffiliateLink,
  ClickTracking,
  AffiliateConversion,
  AffiliatePayout,
  AffiliateNotification,
  CampaignStatuses,
  CampaignTypes,
  CommissionTypes,
  ClickStatuses,
  ConversionStatuses,
  PayoutStatuses,
  PayoutMethods
} from './models/Soko';

export { UserSession } from './models/UserSession';
export { Invoice, InvoiceUtils, type IInvoice, type InvoiceCreateData, type InvoiceUpdateData } from './models/Invoice';

