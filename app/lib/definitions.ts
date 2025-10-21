// Types for database query results (raw data)
export interface ProfileDB {
  username: string;
  phone_number: string;
  referral_id: string | null;
  email: string;
  is_verified: boolean;
  is_active: boolean;
  is_approved: boolean;
  status: string;
  ban_reason: string | null;
  banned_at: Date | null;
  suspension_reason: string | null;
  suspended_at: Date | null;
  level: number;
  rank: string;
  total_earnings_cents: number;
  tasks_completed: number;
  available_spins: number;
  balance_cents: number;
}

export interface StatsCalcDB {
  referral_count: number | null;
  downline_count: number | null;
  pending_withdrawals_cents: number;
  direct_referral_earnings_cents: number;
  downline_earnings_cents: number;
}

export interface ReceiptDB {
  id: string;
  amount_cents: number;
  created_at: Date;
  transaction_code: string;
}

export interface Revenue {
  month: string;
  revenue: number;
}

export interface LatestInvoiceRaw {
  id: string;
  amount: number;
  name: string;
  image_url: string;
  email: string;
}

export interface InvoicesTable {
  id: string;
  customer_id: string;
  amount: number;
  date: string;
  status: string;
  name: string;
  email: string;
  image_url: string;
}

export interface InvoiceForm {
  id: string;
  customer_id: string;
  amount: number;
  status: string;
}

export interface CustomerField {
  id: string;
  name: string;
}

export interface CustomersTableType {
  id: string;
  name: string;
  email: string;
  image_url: string;
  total_invoices: number;
  total_pending: string;
  total_paid: string;
}

// Transformed types for UI consumption
export interface Profile {
  username: string;
  phone_number: string;
  referral_id: string | null;
  email: string;
  is_verified: boolean;
  is_active: boolean;
  is_approved: boolean;
  status: string;
  ban_reason: string | null;
  banned_at: string | null;
  suspension_reason: string | null;
  suspended_at: string | null;
  level: number;
  rank: string;
  total_earnings: number;
  tasks_completed: number;
  available_spins: number;
}

// --- New Referral Types Added ---
export interface Referral {
  id: string;
  name: string;
  email: string;
  joinDate: string;
  status: 'active' | 'pending' | 'suspended' | 'banned' | 'inactive';
  earnings: number;
  level?: number;
  rank?: string;
  commission?: number;
  tier?: number;
  referrer?: string;
  referred?: string;
  referrerEmail?: string;
  referredEmail?: string;
  referrerId?: string;
  referredId?: string;
  notes?: string;
  ticketId?: string;
  user?: string;
  issue?: string;
  priority?: string;
  tasksCompleted?: number;
  totalEarnings?: number;
  isInvitation?: boolean;
}

export interface ReferralResponse {
  success: boolean;
  data: Referral[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  summary: {
    total: number;
    active: number;
    pending: number;
    totalEarnings: number;
  };
}

export interface CreateReferralRequest {
  referredEmail: string;
  referredName?: string;
  notes?: string;
}
// --- End New Referral Types ---

export interface CommissionConfig {
  directReferral: number; // KSH 800 for direct referral
  level1: number; // KSH 100 for level 1 downline
  level2: number; // KSH 50 for level 2 downline
  level3: number; // KSH 25 for level 3 downline
  activationAmount: number; // KSH 1000 activation fee
}

export const COMMISSION_CONFIG: CommissionConfig = {
  directReferral: 80000, // in cents (800 KSH)
  level1: 10000, // in cents (100 KSH)
  level2: 5000, // in cents (50 KSH)
  level3: 2500, // in cents (25 KSH)
  activationAmount: 100000 // in cents (1000 KSH)
};

// Updated Stats interface (includes referral stats)
export interface Stats {
  totalEarnings: number;
  availableBalance: number;
  pendingWithdrawals: number;
  referralCount: number;
  directReferralEarnings: number;
  downlineCount: number;
  downlineEarnings: number;
  level: number;
  rank: string;
  availableSpins: number;
  activeReferrals?: number;
  pendingReferrals?: number;
  totalReferralEarnings?: number;
}

export interface Receipt {
  id: string;
  amount: number;
  date: string;
  transactionCode: string;
}

// Data type for transactions from the database (redefined with specific types)
export interface TransactionDB {
  id: string;
  amount_cents: number;
  type: 'DEPOSIT' | 'WITHDRAWAL' | 'BONUS' | 'TASK_PAYMENT' | 'SPIN_WIN' | 'REFERRAL' | 'SURVEY';
  description: string;
  status: string;
  created_at: Date;
}

export interface Transaction {
  id: string;
  amount: number;
  type: 'DEPOSIT' | 'WITHDRAWAL' | 'BONUS' | 'TASK_PAYMENT' | 'SPIN_WIN' | 'REFERRAL' | 'SURVEY';
  description: string;
  status: string;
  date: string;
}

export interface DashboardData {
  profile: Profile;
  stats: Stats;
  receipts: Receipt[];
  transactions: Transaction[];
}

// Types for dashboard page and layout
export interface User {
  id: string;
  name: string;
  phone: string;
  balance: number;
  referralCode: string;
  totalEarnings: number;
  tasksCompleted: number;
  isVerified: boolean;
  isActive: boolean;
  isApproved: boolean;
  role: string;
  status: 'active' | 'inactive' | 'suspended' | 'banned' | 'pending';
  banReason?: string;
  bannedAt?: string;
  suspensionReason?: string;
  suspendedAt?: string;
  level: number;
  rank: string;
  availableSpins: number;
  lastWithdrawalDate?: string;
  email: string;
}

export interface DashboardPageProps {
  user: User | null;
  apiFetch: <T>(endpoint: string, method: 'GET' | 'POST', data?: any) => Promise<{ success: boolean; data?: T; message: string }>;
}

