// lib/models/Soko.ts
import mongoose, { Schema, model, models } from 'mongoose';

// ============================================================================
// ENUMS
// ============================================================================

const CampaignStatuses = ['draft', 'active', 'paused', 'expired', 'archived'] as const;
const CampaignTypes = ['cj_affiliate', 'amazon', 'promotional', 'custom', 'alibaba'] as const;
const CommissionTypes = ['percentage', 'fixed', 'tiered'] as const;
const ClickStatuses = ['pending', 'converted', 'rejected'] as const;
const ConversionStatuses = ['pending', 'approved', 'rejected', 'paid'] as const;
const PayoutStatuses = ['pending', 'processing', 'completed', 'failed', 'cancelled'] as const;
const PayoutMethods = ['mpesa', 'paypal', 'bank_transfer', 'wallet'] as const;
const ProductConditions = ['new', 'refurbished', 'used'] as const;
const ProductAvailability = ['in stock', 'out of stock', 'preorder', 'backorder'] as const;

// ============================================================================
// HELPER FUNCTION
// ============================================================================

const getModel = (name: string, schema: Schema) => {
  return models[name] || model(name, schema);
};

// ============================================================================
// 1. ALIBABA PRODUCT MODEL
// ============================================================================

const AlibabaProductSchema = new Schema({
  // Basic Info
  product_id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    maxlength: 500,
    index: true
  },
  description: {
    type: String,
    required: true
  },
  
  // Category
  category_name: {
    type: String,
    maxlength: 200,
    index: true
  },
  google_product_category: {
    type: String,
    maxlength: 200
  },
  
  // Pricing
  price_usd: {
    type: Number,
    required: true,
    min: 0
  },
  price_kes: {
    type: Number, // Auto-calculated from USD
    min: 0
  },
  currency: {
    type: String,
    default: 'USD',
    maxlength: 3
  },
  
  // Product Details
  size: {
    type: String,
    maxlength: 100
  },
  condition: {
    type: String,
    enum: ProductConditions,
    default: 'new'
  },
  availability: {
    type: String,
    enum: ProductAvailability,
    default: 'in stock'
  },
  
  // Identifiers
  mpn: {
    type: String, // Manufacturer Part Number
    maxlength: 100
  },
  gtin: {
    type: String, // Global Trade Item Number
    maxlength: 100
  },
  manufacturer: {
    type: String,
    maxlength: 200
  },
  
  // Media
  image_url: {
    type: String,
    required: true
  },
  additional_images: [{
    type: String
  }],
  
  // Shipping & Delivery
  shipping: {
    type: String,
    maxlength: 200
  },
  delivery_time: {
    type: String,
    maxlength: 100
  },
  
  // Links
  deep_link: {
    type: String,
    required: true // This is the Alibaba product link
  },
  
  // Metadata
  language: {
    type: String,
    default: 'en',
    maxlength: 10
  },
  
  // Campaign Association
  campaign_id: {
    type: Schema.Types.ObjectId,
    ref: 'SokoCampaign',
    index: true
  },
  
  // Stats
  total_clicks: {
    type: Number,
    default: 0
  },
  total_conversions: {
    type: Number,
    default: 0
  },
  total_sales: {
    type: Number,
    default: 0
  },
  
  // Status
  is_active: {
    type: Boolean,
    default: true,
    index: true
  },
  is_featured: {
    type: Boolean,
    default: false,
    index: true
  },
  
  // Admin
  uploaded_by: {
    type: String,
    ref: 'Profile',
    required: true
  },
  
  // Import Info
  import_batch_id: {
    type: String,
    index: true
  },
  imported_at: {
    type: Date,
    default: Date.now
  },
  
  // SEO
  slug: {
    type: String,
    unique: true,
    sparse: true,
    index: true
  },
  
  // Additional metadata
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  indexes: [
    { fields: { product_id: 1 } },
    { fields: { category_name: 1 } },
    { fields: { is_active: 1, is_featured: 1 } },
    { fields: { campaign_id: 1 } },
    { fields: { price_usd: 1 } },
    { fields: { import_batch_id: 1 } },
  ]
});

// Generate slug before saving
AlibabaProductSchema.pre('save', function(next) {
  if (!this.slug && this.title) {
    const baseSlug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    this.slug = `${baseSlug}-${this.product_id}`;
  }
  
  // Calculate KES price (assuming 1 USD = 130 KES, can be updated)
  if (this.price_usd && !this.price_kes) {
    const exchangeRate = 130; // Update this based on current rate
    this.price_kes = this.price_usd * exchangeRate;
  }
  
  next();
});

export const AlibabaProduct = getModel('AlibabaProduct', AlibabaProductSchema);

// ============================================================================
// 2. CSV IMPORT LOG MODEL
// ============================================================================

const CSVImportLogSchema = new Schema({
  batch_id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  filename: {
    type: String,
    required: true
  },
  uploaded_by: {
    type: String,
    ref: 'Profile',
    required: true
  },
  
  // Stats
  total_rows: {
    type: Number,
    default: 0
  },
  processed_rows: {
    type: Number,
    default: 0
  },
  successful_imports: {
    type: Number,
    default: 0
  },
  failed_imports: {
    type: Number,
    default: 0
  },
  skipped_rows: {
    type: Number,
    default: 0
  },
  
  // Status
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
    default: 'pending',
    index: true
  },
  
  // Processing
  started_at: {
    type: Date
  },
  completed_at: {
    type: Date
  },
  
  // Campaign association
  campaign_id: {
    type: Schema.Types.ObjectId,
    ref: 'SokoCampaign'
  },
  
  // Error tracking
  errorMessage: [{
    row: Number,
    error: String,
    data: Schema.Types.Mixed
  }],
  
  // Additional info
  notes: {
    type: String
  },
  
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

export const CSVImportLog = getModel('CSVImportLog', CSVImportLogSchema);

// ============================================================================
// 3. SOKO CAMPAIGN MODEL (Updated)
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
    type: String,
    maxlength: 100
  },
  base_affiliate_link: {
    type: String,
    required: true
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
    max: 100
  },
  commission_fixed_amount: {
    type: Number,
    default: 0
  },
  
  // Tiered Commission
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
  
  // Product Count (for Alibaba campaigns)
  product_count: {
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
    type: Number
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
  
  // Network-specific fields
  cj_advertiser_id: {
    type: String
  },
  cj_publisher_id: {
    type: String
  },
  cj_site_id: {
    type: String
  },
  cj_campaign_id: {
    type: String
  },
  cj_api_key: {
    type: String
  },
  cj_access_token: {
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
// 4. USER AFFILIATE LINK MODEL (Updated)
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
  
  // Product-specific link (for Alibaba products)
  product_id: {
    type: Schema.Types.ObjectId,
    ref: 'AlibabaProduct',
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
  short_tracking_url: {
    type: String
  },
  merchant_affiliate_url: {
    type: String // The actual merchant/product URL
  },
  
  // Campaign info (for easy access)
  campaign_name: {
    type: String
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
  
  // Sub-Affiliate Tracking
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
    { fields: { user_id: 1, campaign_id: 1 } },
    { fields: { user_id: 1, product_id: 1 }, unique: true, sparse: true },
    { fields: { tracking_code: 1 } },
    { fields: { short_slug: 1 } },
    { fields: { is_active: 1 } },
  ]
});

export const UserAffiliateLink = getModel('UserAffiliateLink', UserAffiliateLinkSchema);

// ============================================================================
// 5. CLICK TRACKING MODEL (Unchanged)
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
  product_id: {
    type: Schema.Types.ObjectId,
    ref: 'AlibabaProduct',
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
    { fields: { product_id: 1 } },
    { fields: { status: 1 } },
    { fields: { session_id: 1 } },
  ]
});

export const ClickTracking = getModel('ClickTracking', ClickTrackingSchema);

// ============================================================================
// 6-8. REMAINING MODELS (Unchanged)
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
  product_id: {
    type: Schema.Types.ObjectId,
    ref: 'AlibabaProduct',
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
  
  // External Reference
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
  
  // Sub-Affiliate Commission
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
    { fields: { product_id: 1 } },
    { fields: { status: 1, conversion_date: -1 } },
    { fields: { order_id: 1 } },
  ]
});

export const AffiliateConversion = getModel('AffiliateConversion', AffiliateConversionSchema);

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
  
  // Conversions included
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
      'performance_alert',
      'new_product'
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
  product_id: {
    type: Schema.Types.ObjectId,
    ref: 'AlibabaProduct'
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
  PayoutMethods,
  ProductConditions,
  ProductAvailability
};
