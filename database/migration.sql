import { Schema, model, models } from 'mongoose';
import { connectToDatabase } from './mongoose';

// --- Step 1: Define Mongoose Enums (replaces SQL ENUM types) ---

const UserRoles = ['user', 'support', 'admin'] as const;
const ApprovalStatuses = ['pending', 'approved', 'rejected'] as const;
const UserStatuses = ['active', 'inactive', 'suspended', 'banned'] as const;
const PaymentProviders = ['mpesa', 'card', 'bank'] as const;
const PaymentStatuses = ['pending', 'completed', 'failed', 'refunded'] as const;
const TicketStatuses = ['open', 'in_progress', 'resolved', 'closed'] as const;
const TicketPriorities = ['low', 'medium', 'high', 'urgent'] as const;
const EarningTypes = ['REFERRAL', 'DOWNLINE', 'TASK', 'BONUS', 'SPIN'] as const;
const WithdrawalStatuses = ['pending', 'approved', 'rejected', 'completed'] as const;
const TransactionTypes = ['DEPOSIT', 'WITHDRAWAL', 'BONUS', 'TASK_PAYMENT'] as const; // Added common transaction types

// --- Helper function to get or create a model ---
// This is necessary to avoid defining models multiple times in a Next.js environment
const getModel = (name: string, schema: Schema) => {
  return models[name] || model(name, schema);
};

// --- Step 2: Define Schemas & Models ---

/**
 * 1. Profile Model (replaces profiles table)
 * NOTE: The primary key (_id) is set to String to match the UUID structure
 * typically provided by external Auth systems like Supabase/NextAuth.
 */
const ProfileSchema = new Schema({
  // UUID from auth.users(id). We use String to maintain UUID format.
  _id: { type: String, required: true },
  username: { type: String, required: true, maxlength: 50 },
  phone_number: { type: String, required: true, maxlength: 50 },
  email: { type: String, required: true, unique: true, maxlength: 255 },
  referral_id: { type: String, unique: true, sparse: true, maxlength: 10 },
  role: { type: String, enum: UserRoles, default: 'user', required: true },

  // Verification and activation
  is_verified: { type: Boolean, default: false },
  email_verified_at: { type: Date },
  activation_paid_at: { type: Date },

  // Approval workflow
  approval_status: { type: String, enum: ApprovalStatuses, default: 'pending', required: true },
  approval_by: { type: String, ref: 'Profile' },
  approval_at: { type: Date },
  approval_notes: { type: String },

  // User status
  status: { type: String, enum: UserStatuses, default: 'active', required: true },
  is_active: { type: Boolean, default: true },
  is_approved: { type: Boolean, default: false },

  // Suspension and ban
  ban_reason: { type: String },
  banned_at: { type: Date },
  suspension_reason: { type: String },
  suspended_at: { type: Date },

  // Gamification & Earnings (Stored as cents/BIGINT)
  level: { type: Number, default: 1 },
  rank: { type: String, default: 'Bronze', maxlength: 50 },
  total_earnings_cents: { type: Number, default: 0 },
  balance_cents: { type: Number, default: 0 },
  tasks_completed: { type: Number, default: 0 },
  available_spins: { type: Number, default: 0 },

}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  // Define indexes for performance, mirroring the SQL
  indexes: [
    { fields: { role: 1 } },
    { fields: { approval_status: 1 } },
    { fields: { status: 1 } },
    { fields: { email: 1 } },
  ]
});

export const Profile = getModel('Profile', ProfileSchema);


/**
 * 2. ActivationPayment Model (replaces activation_payments table)
 */
const ActivationPaymentSchema = new Schema({
  user_id: { type: String, ref: 'Profile', required: true, index: true },
  amount_cents: { type: Number, default: 100000, required: true }, // KSH 1000
  currency: { type: String, default: 'KES', maxlength: 3, required: true },

  provider: { type: String, enum: PaymentProviders, required: true },
  provider_reference: { type: String, maxlength: 255 },
  provider_response: { type: Schema.Types.Mixed }, // JSONB equivalent

  status: { type: String, enum: PaymentStatuses, default: 'pending', required: true, index: true },
  paid_at: { type: Date },

  metadata: { type: Schema.Types.Mixed }, // JSONB equivalent
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
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
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
});

export const SupportTicket = getModel('SupportTicket', SupportTicketSchema);

/**
 * 4. AdminAuditLog Model (replaces admin_audit_logs table)
 */
const AdminAuditLogSchema = new Schema({
  actor_id: { type: String, ref: 'Profile', required: true, index: true },
  action: { type: String, required: true, maxlength: 100 },
  target_type: { type: String, required: true, maxlength: 50 },
  target_id: { type: String }, // Can be any UUID (profile, ticket, payment, etc.)
  changes: { type: Schema.Types.Mixed }, // JSONB equivalent
  ip_address: { type: String },
  user_agent: { type: String },
}, {
  timestamps: { createdAt: 'created_at' }, // Only created_at is needed
  // Index on creation date for recent logs
  indexes: [
    { fields: { created_at: -1 } }, // Created DESC
  ]
});

export const AdminAuditLog = getModel('AdminAuditLog', AdminAuditLogSchema);

/**
 * 5. Referral Model (replaces referrals table)
 */
const ReferralSchema = new Schema({
  referrer_id: { type: String, ref: 'Profile', required: true, index: true },
  referred_id: { type: String, ref: 'Profile', required: true, unique: true },
  earning_cents: { type: Number, default: 0 },
}, {
  timestamps: { createdAt: 'created_at' },
});

export const Referral = getModel('Referral', ReferralSchema);

/**
 * 6. DownlineUser Model (replaces downline_users table)
 */
const DownlineUserSchema = new Schema({
  main_user_id: { type: String, ref: 'Profile', required: true },
  downline_user_id: { type: String, ref: 'Profile', required: true, unique: true },
  level: { type: Number, default: 1 },
}, {
  timestamps: { createdAt: 'created_at' },
  // Compound index for efficient lookup of a user's downline
  index: { main_user_id: 1, downline_user_id: 1, unique: true }
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
}, {
  timestamps: { createdAt: 'created_at' },
});

export const Earning = getModel('Earning', EarningSchema);

/**
 * 8. Withdrawal Model (replaces withdrawals table)
 */
const WithdrawalSchema = new Schema({
  user_id: { type: String, ref: 'Profile', required: true, index: true },
  amount_cents: { type: Number, required: true },
  status: { type: String, enum: WithdrawalStatuses, default: 'pending', index: true },
  mpesa_number: { type: String, maxlength: 50 },
  transaction_code: { type: String, maxlength: 100 },
  approved_by: { type: String, ref: 'Profile' },
  approved_at: { type: Date },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
});

export const Withdrawal = getModel('Withdrawal', WithdrawalSchema);

/**
 * 9. Transaction Model (replaces transactions table)
 */
const TransactionSchema = new Schema({
  user_id: { type: String, ref: 'Profile', required: true, index: true },
  amount_cents: { type: Number, required: true },
  type: { type: String, enum: TransactionTypes, required: true },
  description: { type: String },
  status: { type: String, default: 'completed' }, // Used for processing, but usually 'completed'
}, {
  timestamps: { createdAt: 'created_at' },
});

export const Transaction = getModel('Transaction', TransactionSchema);

// Export Mongoose connect function for use elsewhere
export { connectToDatabase };

