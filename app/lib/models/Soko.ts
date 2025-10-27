// lib/models/Soko.ts
import mongoose, { Schema, model, models } from 'mongoose';

// ============================================================================
// ENUMS
// ============================================================================

const CampaignStatuses = ['draft', 'active', 'paused', 'expired', 'archived'] as const;
const CampaignTypes = ['cj_affiliate', 'amazon', 'promotional', 'custom'] as const;
const CommissionTypes = ['percentage', 'fixed', 'tiered'] as const;
const ClickStatuses = ['pending', 'converted', 'rejected'] as const;
const ConversionStatuses = ['pending', 'approved', 'rejected', 'paid'] as const;
const PayoutStatuses = ['pending', 'processing', 'completed', 'failed', 'cancelled'] as const;
const PayoutMethods = ['mpesa', 'paypal', 'bank_transfer', 'wallet'] as const;

// ============================================================================
// HELPER FUNCTION
// ============================================================================

const getModel = (name: string, schema: Schema) => {
  return models[name] || model(name, schema);
};

// ============================================================================
// 1. SOKO CAMPAIGN MODEL (Admin creates affiliate campaigns)
// ============================================================================

const SokoCampaignSchema = new Schema({
  // Basic Info
  name: {
    type: String,
    required: true,
    maxlength: 255,
    index: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    maxlength: 300,
    index: true
  },
  description: {
    type: String,
    required: true
  },
  short_description: {
    type: String,
    maxlength: 500
  },
  
  // Campaign Type & Links
  campaign_type: {
    type: String,
    enum: CampaignTypes,
    required: true,
    default: 'promotional',
    index: true
  },
  affiliate_network: {
    type: String, // 'CJ', 'Amazon Associates', 'ShareASale', etc.
    maxlength: 100
  },
  base_affiliate_link: {
    type: String,
    required: true // The original affiliate link from CJ/Amazon
  },
  
  // Visual Assets
  featured_image: {
    type: String
  },
  gallery_images: [{
    type: String
  }],
  banner_image: {
    type: String
  },
  
  // Commission Structure
  commission_type: {
    type: String,
    enum: CommissionTypes,
    default: 'percentage',
    required: true
  },
  commission_rate: {
    type: Number,
    required: true,
    min: 0,
    max: 100 // For percentage
  },
  commission_fixed_amount: {
    type: Number, // For fixed commission
    default: 0
  },
  
  // Tiered Commission (optional)
  commission_tiers: [{
    min_sales: { type: Number, required: true },
    max_sales: { type: Number },
    rate: { type: Number, required: true }
  }],
  
  // Product/Offer Details
  product_category: {
    type: String,
    maxlength: 100,
    index: true
  },
  product_price: {
    type: Number,
    default: 0
  },
  currency: {
    type: String,
    default: 'KES',
    maxlength: 3
  },
  
  // Campaign Status & Timing
  status: {
    type: String,
    enum: CampaignStatuses,
    default: 'draft',
    required: true,
    index: true
  },
  start_date: {
    type: Date,
    required: true,
    default: Date.now
  },
  end_date: {
    type: Date,
    index: true
  },
  
  // Tracking & Analytics
  total_clicks: {
    type: Number,
    default: 0
  },
  total_conversions: {
    type: Number,
    default: 0
  },
  total_sales_amount: {
    type: Number,
    default: 0
  },
  total_commission_paid: {
    type: Number,
    default: 0
  },
  conversion_rate: {
    type: Number,
    default: 0
  },
  
  // Eligibility & Requirements
  min_user_level: {
    type: Number,
    default: 0
  },
  require_activation: {
    type: Boolean,
    default: true
  },
  require_verification: {
    type: Boolean,
    default: true
  },
  allowed_user_tiers: [{
    type: String,
    enum: ['starter', 'bronze', 'silver', 'gold', 'diamond']
  }],
  
  // Limits
  max_participants: {
    type: Number // Maximum affiliates who can promote
  },
  current_participants: {
    type: Number,
    default: 0
  },
  
  // SEO & Marketing
  meta_title: {
    type: String,
    maxlength: 255
  },
  meta_description: {
    type: String,
    maxlength: 500
  },
  tags: [{
    type: String,
    maxlength: 50
  }],
  
  // Admin Info
  created_by: {
    type: String,
    ref: 'Profile',
    required: true,
    index: true
  },
  updated_by: {
    type: String,
    ref: 'Profile'
  },
  
  // Additional Settings
  is_featured: {
    type: Boolean,
    default: false,
    index: true
  },
  sort_order: {
    type: Number,
    default: 0
  },
  
  // Terms & Conditions
  terms_and_conditions: {
    type: String
  },
  
  // Metadata
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  indexes: [
    { fields: { slug: 1 } },
    { fields: { status: 1, start_date: 1 } },
    { fields: { campaign_type: 1 } },
    { fields: { is_featured: 1, sort_order: 1 } },
    { fields: { product_category: 1 } },
    { fields: { end_date: 1 } },
  ]
});

// Virtual for active status
SokoCampaignSchema.virtual('is_active').get(function() {
  const now = new Date();
  return this.status === 'active' && 
         this.start_date <= now && 
         (!this.end_date || this.end_date >= now);
});

SokoCampaignSchema.set('toJSON', { virtuals: true });
SokoCampaignSchema.set('toObject', { virtuals: true });

export const SokoCampaign = getModel('SokoCampaign', SokoCampaignSchema);

// ============================================================================
// 2. USER AFFILIATE LINK MODEL (User's personalized tracking links)
// ============================================================================

const UserAffiliateLinkSchema = new Schema({
  user_id: {
    type: String,
    ref: 'Profile',
    required: true,
    index: true
  },
  campaign_id: {
    type: Schema.Types.ObjectId,
    ref: 'SokoCampaign',
    required: true,
    index: true
  },
  
  // Unique Tracking
  tracking_code: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  short_slug: {
    type: String,
    unique: true,
    sparse: true,
    index: true
  },
  
  // Generated Link
  full_tracking_url: {
    type: String,
    required: true
  },
  
  // Performance Metrics
  total_clicks: {
    type: Number,
    default: 0
  },
  total_conversions: {
    type: Number,
    default: 0
  },
  total_sales_amount: {
    type: Number,
    default: 0
  },
  total_commission_earned: {
    type: Number,
    default: 0
  },
  total_commission_paid: {
    type: Number,
    default: 0
  },
  pending_commission: {
    type: Number,
    default: 0
  },
  
  // Statistics
  conversion_rate: {
    type: Number,
    default: 0
  },
  average_sale_value: {
    type: Number,
    default: 0
  },
  
  // Status
  is_active: {
    type: Boolean,
    default: true,
    index: true
  },
  
  // Last Activity
  last_click_at: {
    type: Date
  },
  last_conversion_at: {
    type: Date
  },
  
  // Sub-Affiliate Tracking (Optional)
  sub_affiliates: [{
    user_id: { type: String, ref: 'Profile' },
    joined_at: { type: Date, default: Date.now },
    total_commission: { type: Number, default: 0 }
  }],
  
  // Metadata
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  indexes: [
    { fields: { user_id: 1, campaign_id: 1 }, unique: true },
    { fields: { tracking_code: 1 } },
    { fields: { short_slug: 1 } },
    { fields: { is_active: 1 } },
  ]
});

export const UserAffiliateLink = getModel('UserAffiliateLink', UserAffiliateLinkSchema);

// ============================================================================
// 3. CLICK TRACKING MODEL
// ============================================================================

const ClickTrackingSchema = new Schema({
  affiliate_link_id: {
    type: Schema.Types.ObjectId,
    ref: 'UserAffiliateLink',
    required: true,
    index: true
  },
  user_id: {
    type: String,
    ref: 'Profile',
    required: true,
    index: true
  },
  campaign_id: {
    type: Schema.Types.ObjectId,
    ref: 'SokoCampaign',
    required: true,
    index: true
  },
  
  // Click Details
  clicked_at: {
    type: Date,
    default: Date.now,
    index: true
  },
  ip_address: {
    type: String
  },
  user_agent: {
    type: String
  },
  
  // Device & Location Info
  device_type: {
    type: String,
    enum: ['desktop', 'mobile', 'tablet', 'other'],
    default: 'other'
  },
  browser: {
    type: String
  },
  operating_system: {
    type: String
  },
  country: {
    type: String
  },
  city: {
    type: String
  },
  
  // Referrer Info
  referrer_url: {
    type: String
  },
  utm_source: {
    type: String
  },
  utm_medium: {
    type: String
  },
  utm_campaign: {
    type: String
  },
  
  // Conversion Status
  status: {
    type: String,
    enum: ClickStatuses,
    default: 'pending',
    index: true
  },
  converted_at: {
    type: Date
  },
  conversion_id: {
    type: Schema.Types.ObjectId,
    ref: 'AffiliateConversion'
  },
  
  // Session Tracking
  session_id: {
    type: String,
    index: true
  },
  
  // Metadata
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: { createdAt: 'created_at' },
  indexes: [
    { fields: { affiliate_link_id: 1, clicked_at: -1 } },
    { fields: { user_id: 1, clicked_at: -1 } },
    { fields: { campaign_id: 1, clicked_at: -1 } },
    { fields: { status: 1 } },
    { fields: { session_id: 1 } },
  ]
});

export const ClickTracking = getModel('ClickTracking', ClickTrackingSchema);

// ============================================================================
// 4. AFFILIATE CONVERSION MODEL
// ============================================================================

const AffiliateConversionSchema = new Schema({
  affiliate_link_id: {
    type: Schema.Types.ObjectId,
    ref: 'UserAffiliateLink',
    required: true,
    index: true
  },
  user_id: {
    type: String,
    ref: 'Profile',
    required: true,
    index: true
  },
  campaign_id: {
    type: Schema.Types.ObjectId,
    ref: 'SokoCampaign',
    required: true,
    index: true
  },
  click_id: {
    type: Schema.Types.ObjectId,
    ref: 'ClickTracking',
    index: true
  },
  
  // Conversion Details
  order_id: {
    type: String,
    required: true,
    index: true
  },
  sale_amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'KES',
    maxlength: 3
  },
  
  // Commission Calculation
  commission_rate: {
    type: Number,
    required: true
  },
  commission_amount: {
    type: Number,
    required: true,
    min: 0
  },
  
  // Status & Approval
  status: {
    type: String,
    enum: ConversionStatuses,
    default: 'pending',
    required: true,
    index: true
  },
  approved_by: {
    type: String,
    ref: 'Profile'
  },
  approved_at: {
    type: Date
  },
  rejection_reason: {
    type: String
  },
  
  // Timestamps
  conversion_date: {
    type: Date,
    default: Date.now,
    required: true,
    index: true
  },
  paid_at: {
    type: Date
  },
  
  // External Reference (from affiliate network)
  external_conversion_id: {
    type: String,
    index: true
  },
  external_network_name: {
    type: String
  },
  
  // Payout Tracking
  payout_id: {
    type: Schema.Types.ObjectId,
    ref: 'AffiliatePayout'
  },
  
  // Sub-Affiliate Commission (if applicable)
  sub_affiliate_commission: {
    user_id: { type: String, ref: 'Profile' },
    commission_amount: { type: Number, default: 0 },
    commission_rate: { type: Number, default: 0 }
  },
  
  // Metadata
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  indexes: [
    { fields: { user_id: 1, conversion_date: -1 } },
    { fields: { campaign_id: 1, status: 1 } },
    { fields: { status: 1, conversion_date: -1 } },
    { fields: { order_id: 1 } },
  ]
});

export const AffiliateConversion = getModel('AffiliateConversion', AffiliateConversionSchema);

// ============================================================================
// 5. AFFILIATE PAYOUT MODEL
// ============================================================================

const AffiliatePayoutSchema = new Schema({
  user_id: {
    type: String,
    ref: 'Profile',
    required: true,
    index: true
  },
  
  // Payout Details
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'KES',
    maxlength: 3
  },
  
  // Payment Method
  payout_method: {
    type: String,
    enum: PayoutMethods,
    required: true
  },
  payout_details: {
    mpesa_number: { type: String },
    paypal_email: { type: String },
    bank_name: { type: String },
    bank_account_number: { type: String },
    bank_account_name: { type: String }
  },
  
  // Status
  status: {
    type: String,
    enum: PayoutStatuses,
    default: 'pending',
    required: true,
    index: true
  },
  
  // Conversions included in this payout
  conversion_ids: [{
    type: Schema.Types.ObjectId,
    ref: 'AffiliateConversion'
  }],
  conversion_count: {
    type: Number,
    default: 0
  },
  
  // Processing Details
  requested_at: {
    type: Date,
    default: Date.now,
    required: true
  },
  processed_by: {
    type: String,
    ref: 'Profile'
  },
  processed_at: {
    type: Date
  },
  completed_at: {
    type: Date
  },
  
  // Transaction Reference
  transaction_id: {
    type: Schema.Types.ObjectId,
    ref: 'Transaction'
  },
  transaction_code: {
    type: String
  },
  
  // Failure Handling
  failure_reason: {
    type: String
  },
  retry_count: {
    type: Number,
    default: 0
  },
  
  // Admin Notes
  admin_notes: {
    type: String
  },
  
  // Metadata
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  indexes: [
    { fields: { user_id: 1, requested_at: -1 } },
    { fields: { status: 1, requested_at: -1 } },
  ]
});

export const AffiliatePayout = getModel('AffiliatePayout', AffiliatePayoutSchema);

// ============================================================================
// 6. AFFILIATE NOTIFICATION MODEL
// ============================================================================

const AffiliateNotificationSchema = new Schema({
  user_id: {
    type: String,
    ref: 'Profile',
    required: true,
    index: true
  },
  
  // Notification Type
  type: {
    type: String,
    enum: [
      'new_campaign',
      'campaign_update',
      'conversion_approved',
      'conversion_rejected',
      'payout_processed',
      'payout_completed',
      'milestone_reached',
      'policy_update',
      'performance_alert'
    ],
    required: true,
    index: true
  },
  
  // Content
  title: {
    type: String,
    required: true,
    maxlength: 255
  },
  message: {
    type: String,
    required: true
  },
  
  // Related Entities
  campaign_id: {
    type: Schema.Types.ObjectId,
    ref: 'SokoCampaign'
  },
  conversion_id: {
    type: Schema.Types.ObjectId,
    ref: 'AffiliateConversion'
  },
  payout_id: {
    type: Schema.Types.ObjectId,
    ref: 'AffiliatePayout'
  },
  
  // Status
  is_read: {
    type: Boolean,
    default: false,
    index: true
  },
  read_at: {
    type: Date
  },
  
  // Priority
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  
  // Action Link
  action_url: {
    type: String
  },
  
  // Metadata
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: { createdAt: 'created_at' },
  indexes: [
    { fields: { user_id: 1, created_at: -1 } },
    { fields: { is_read: 1, created_at: -1 } },
    { fields: { type: 1 } },
  ]
});

export const AffiliateNotification = getModel('AffiliateNotification', AffiliateNotificationSchema);

// ============================================================================
// EXPORTS
// ============================================================================

export {
  CampaignStatuses,
  CampaignTypes,
  CommissionTypes,
  ClickStatuses,
  ConversionStatuses,
  PayoutStatuses,
  PayoutMethods
};
