'use server';

import { auth } from '@/auth'; 
import { connectToDatabase } from '@/app/lib/mongoose';
import { 
  SokoCampaign, 
  UserAffiliateLink, 
  ClickTracking, 
  AffiliateConversion,
  AffiliatePayout,
  AlibabaProduct
} from '@/app/lib/models/Soko';
import { Profile } from '@/app/lib/models';
import crypto from 'crypto';

// ============================================================================
// VALIDATION & SANITIZATION HELPERS
// ============================================================================

function sanitizeString(input: string): string {
  return input.trim().replace(/[<>]/g, '');
}

function sanitizeNumber(input: number): number {
  return Math.max(0, Number(input) || 0);
}

function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.toString();
  } catch {
    throw new Error('Invalid URL format');
  }
}

function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function validatePhone(phone: string): boolean {
  const phoneRegex = /^\+?[\d\s-()]{10,}$/;
  return phoneRegex.test(phone);
}

function validateAmount(amount: number): boolean {
  return amount > 0 && amount <= 1000000;
}

function validateTrackingCode(code: string): boolean {
  return /^[a-zA-Z0-9-]{8,50}$/.test(code);
}

function validateSlug(slug: string): boolean {
  return /^[a-z0-9-]+$/.test(slug);
}

// ============================================================================
// TRACKING CODE & SLUG GENERATION
// ============================================================================

function generateTrackingCode(userId: string, campaignId: string, productId?: string): string {
  const timestamp = Date.now().toString(36);
  const randomStr = crypto.randomBytes(4).toString('hex');
  const hashInput = productId 
    ? `${userId}-${campaignId}-${productId}-${timestamp}`
    : `${userId}-${campaignId}-${timestamp}`;
  const hash = crypto
    .createHash('sha256')
    .update(hashInput)
    .digest('hex')
    .substring(0, 8);
    
  return `${hash}-${randomStr}`;
}

function generateShortSlug(): string {
  return crypto.randomBytes(4).toString('base64')
    .replace(/[+/=]/g, '')
    .substring(0, 6)
    .toLowerCase();
}

// ============================================================================
// URL GENERATION HELPERS
// ============================================================================

function generateTrackingUrl(trackingCode: string): string {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  return `${baseUrl}/soko/track/${trackingCode}`;
}

function generateShortUrl(shortSlug: string): string {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  return `${baseUrl}/r/${shortSlug}`;
}

// ============================================================================
// LOAD ALL DATA (Dashboard)
// ============================================================================

export async function loadAllData() {
  try {
    const session = await auth(); 
    if (!session?.user?.id) {
      return { success: false, message: 'Unauthorized' };
    }

    await connectToDatabase();

    const [statsRes, campaignsRes, performanceRes, payoutsRes, linksRes] = await Promise.allSettled([
      getSokoStats(),
      getMyCampaigns(),
      getMyPerformance(),
      getMyPayouts(),
      getMyAffiliateLinks()
    ]);

    const result: any = {
      stats: statsRes.status === 'fulfilled' && statsRes.value.success ? statsRes.value.data : null,
      campaigns: campaignsRes.status === 'fulfilled' && campaignsRes.value.success ? campaignsRes.value.data : [],
      performance: performanceRes.status === 'fulfilled' && performanceRes.value.success ? performanceRes.value.data : null,
      payouts: payoutsRes.status === 'fulfilled' && payoutsRes.value.success ? payoutsRes.value.data : [],
      myLinks: linksRes.status === 'fulfilled' && linksRes.value.success ? linksRes.value.data : [],
      errorMessage: []
    };

    if (statsRes.status === 'rejected' || (statsRes.status === 'fulfilled' && !statsRes.value.success)) {
      result.errorMessage.push('Failed to load stats');
    }
    if (campaignsRes.status === 'rejected' || (campaignsRes.status === 'fulfilled' && !campaignsRes.value.success)) {
      result.errorMessage.push('Failed to load campaigns');
    }
    if (performanceRes.status === 'rejected' || (performanceRes.status === 'fulfilled' && !performanceRes.value.success)) {
      result.errorMessage.push('Failed to load performance data');
    }
    if (payoutsRes.status === 'rejected' || (payoutsRes.status === 'fulfilled' && !payoutsRes.value.success)) {
      result.errorMessage.push('Failed to load payouts');
    }
    if (linksRes.status === 'rejected' || (linksRes.status === 'fulfilled' && !linksRes.value.success)) {
      result.errorMessage.push('Failed to load affiliate links');
    }

    return {
      success: true,
      data: result
    };
  } catch (error: any) {
    console.error('Error loading all data:', error);
    return { success: false, message: 'Failed to load data' };
  }
}

// ============================================================================
// GET SOKO STATS
// ============================================================================

export async function getSokoStats() {
  try {
    const session = await auth(); 
    if (!session?.user?.id) {
      return { success: false, message: 'Unauthorized' };
    }

    await connectToDatabase();

    const userId = session.user.id;

    const links = await UserAffiliateLink.find({ user_id: userId });
    const linkIds = links.map(link => link._id);

    const conversions = await AffiliateConversion.find({
      user_id: userId
    });

    const totalClicks = links.reduce((sum, link) => sum + link.total_clicks, 0);
    const totalConversions = links.reduce((sum, link) => sum + link.total_conversions, 0);
    const totalEarnings = links.reduce((sum, link) => sum + link.total_commission_earned, 0);
    
    const pendingCommission = conversions
      .filter(c => c.status === 'pending')
      .reduce((sum, c) => sum + c.commission_amount, 0);
      
    const approvedCommission = conversions
      .filter(c => c.status === 'approved')
      .reduce((sum, c) => sum + c.commission_amount, 0);
      
    const paidCommission = conversions
      .filter(c => c.status === 'paid')
      .reduce((sum, c) => sum + c.commission_amount, 0);

    const conversionRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;
    const averageSaleValue = totalConversions > 0 
      ? conversions.reduce((sum, c) => sum + c.sale_amount, 0) / totalConversions 
      : 0;

    const activeCampaigns = await SokoCampaign.countDocuments({
      status: 'active',
      end_date: { $gte: new Date() }
    });

    const totalCampaigns = await SokoCampaign.countDocuments({ status: 'active' });

    return {
      success: true,
      data: {
        totalClicks,
        totalConversions,
        totalEarnings,
        pendingCommission,
        approvedCommission,
        paidCommission,
        conversionRate,
        averageSaleValue,
        activeCampaigns,
        totalCampaigns
      }
    };
  } catch (error: any) {
    console.error('Error getting Soko stats:', error);
    return { success: false, message: 'Failed to get stats' };
  }
}

// ============================================================================
// GET MY CAMPAIGNS (with user's link status)
// ============================================================================

export async function getMyCampaigns() {
  try {
    const session = await auth(); 
    if (!session?.user?.id) {
      return { success: false, message: 'Unauthorized' };
    }

    await connectToDatabase();

    const userId = session.user.id;
    const user = await Profile.findById(userId);

    if (!user) {
      return { success: false, message: 'User not found' };
    }

    const now = new Date();
    const campaigns = await SokoCampaign.find({
      status: 'active',
      start_date: { $lte: now },
      $or: [
        { end_date: { $exists: false } },
        { end_date: { $gte: now } }
      ]
    }).sort({ is_featured: -1, sort_order: 1, created_at: -1 });

    const eligibleCampaigns = campaigns.filter(campaign => {
      if (campaign.min_user_level && user.level < campaign.min_user_level) {
        return false;
      }

      if (campaign.require_activation && !user.is_active) {
        return false;
      }

      if (campaign.require_verification && !user.is_verified) {
        return false;
      }

      if (campaign.allowed_user_tiers && campaign.allowed_user_tiers.length > 0) {
        if (!campaign.allowed_user_tiers.includes(user.spin_tier)) {
          return false;
        }
      }

      if (campaign.max_participants && campaign.current_participants >= campaign.max_participants) {
        return false;
      }

      return true;
    });

    return {
      success: true,
      data: eligibleCampaigns.map(c => ({
        _id: c._id.toString(),
        name: sanitizeString(c.name),
        slug: c.slug,
        description: sanitizeString(c.description),
        short_description: sanitizeString(c.short_description),
        featured_image: c.featured_image,
        campaign_type: c.campaign_type,
        commission_rate: sanitizeNumber(c.commission_rate),
        commission_fixed_amount: sanitizeNumber(c.commission_fixed_amount),
        commission_type: c.commission_type,
        product_category: sanitizeString(c.product_category),
        product_count: c.product_count || 0,
        status: c.status,
        start_date: c.start_date,
        end_date: c.end_date,
        is_featured: c.is_featured,
        product_price: sanitizeNumber(c.product_price),
        currency: c.currency || 'KES'
      }))
    };
  } catch (error: any) {
    console.error('Error getting campaigns:', error);
    return { success: false, message: 'Failed to get campaigns' };
  }
}

// ============================================================================
// GET CAMPAIGN PRODUCTS
// ============================================================================

export async function getCampaignProducts(campaignId: string, filters?: {
  category?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  page?: number;
  limit?: number;
}) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: 'Unauthorized' };
    }

    await connectToDatabase();

    const query: any = { 
      campaign_id: campaignId,
      is_active: true 
    };

    if (filters?.category) {
      query.category_name = new RegExp(filters.category, 'i');
    }

    if (filters?.search) {
      query.$or = [
        { title: new RegExp(filters.search, 'i') },
        { description: new RegExp(filters.search, 'i') }
      ];
    }

    if (filters?.minPrice || filters?.maxPrice) {
      query.price_usd = {};
      if (filters.minPrice) query.price_usd.$gte = filters.minPrice;
      if (filters.maxPrice) query.price_usd.$lte = filters.maxPrice;
    }

    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      AlibabaProduct.find(query)
        .sort({ is_featured: -1, created_at: -1 })
        .skip(skip)
        .limit(limit),
      AlibabaProduct.countDocuments(query)
    ]);

    return {
      success: true,
      data: {
        products: products.map(p => ({
          _id: p._id.toString(),
          product_id: p.product_id,
          title: sanitizeString(p.title),
          description: sanitizeString(p.description.substring(0, 200)),
          category_name: sanitizeString(p.category_name),
          price_usd: sanitizeNumber(p.price_usd),
          price_kes: sanitizeNumber(p.price_kes),
          image_url: p.image_url,
          size: p.size,
          condition: p.condition,
          availability: p.availability,
          manufacturer: sanitizeString(p.manufacturer),
          is_featured: p.is_featured
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    };
  } catch (error: any) {
    console.error('Error getting campaign products:', error);
    return { success: false, message: 'Failed to get products' };
  }
}

// ============================================================================
// GET PRODUCT DETAILS
// ============================================================================

export async function getProductDetails(productId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: 'Unauthorized' };
    }

    await connectToDatabase();

    const product = await AlibabaProduct.findById(productId);
    if (!product || !product.is_active) {
      return { success: false, message: 'Product not found' };
    }

    return {
      success: true,
      data: {
        _id: product._id.toString(),
        product_id: product.product_id,
        title: sanitizeString(product.title),
        description: sanitizeString(product.description),
        category_name: sanitizeString(product.category_name),
        google_product_category: product.google_product_category,
        price_usd: sanitizeNumber(product.price_usd),
        price_kes: sanitizeNumber(product.price_kes),
        image_url: product.image_url,
        additional_images: product.additional_images || [],
        size: product.size,
        condition: product.condition,
        availability: product.availability,
        mpn: product.mpn,
        gtin: product.gtin,
        manufacturer: sanitizeString(product.manufacturer),
        shipping: product.shipping,
        delivery_time: product.delivery_time,
        deep_link: product.deep_link,
        campaign_id: product.campaign_id?.toString()
      }
    };
  } catch (error: any) {
    console.error('Error getting product details:', error);
    return { success: false, message: 'Failed to get product details' };
  }
}

// ============================================================================
// GENERATE AFFILIATE LINK (Updated to support products)
// ============================================================================

export async function generateAffiliateLink(campaignId: string, productId?: string) {
  try {
    const session = await auth(); 
    if (!session?.user?.id) {
      return { success: false, message: 'Unauthorized' };
    }

    if (!campaignId || typeof campaignId !== 'string' || campaignId.length !== 24) {
      return { success: false, message: 'Invalid campaign ID' };
    }

    if (productId && (typeof productId !== 'string' || productId.length !== 24)) {
      return { success: false, message: 'Invalid product ID' };
    }

    await connectToDatabase();

    const userId = session.user.id;

    // Check if link already exists
    const query: any = {
      user_id: userId,
      campaign_id: campaignId
    };

    if (productId) {
      query.product_id = productId;
    } else {
      query.product_id = { $exists: false };
    }

    const existingLink = await UserAffiliateLink.findOne(query);

    if (existingLink) {
      return {
        success: true,
        data: {
          _id: existingLink._id.toString(),
          campaign_id: existingLink.campaign_id.toString(),
          product_id: existingLink.product_id?.toString(),
          campaign_name: existingLink.campaign_name,
          tracking_code: existingLink.tracking_code,
          short_slug: existingLink.short_slug,
          full_tracking_url: existingLink.full_tracking_url,
          short_tracking_url: existingLink.short_tracking_url,
          total_clicks: existingLink.total_clicks,
          total_conversions: existingLink.total_conversions,
          total_commission_earned: existingLink.total_commission_earned,
          conversion_rate: existingLink.conversion_rate,
          is_active: existingLink.is_active
        },
        message: 'Link already exists'
      };
    }

    // Get campaign
    const campaign = await SokoCampaign.findById(campaignId);
    if (!campaign) {
      return { success: false, message: 'Campaign not found' };
    }

    // Get product if specified
    let product = null;
    let merchantUrl = campaign.base_affiliate_link;

    if (productId) {
      product = await AlibabaProduct.findById(productId);
      if (!product) {
        return { success: false, message: 'Product not found' };
      }
      if (!product.is_active) {
        return { success: false, message: 'Product is not active' };
      }
      // Use product's deep link instead of campaign link
      merchantUrl = product.deep_link;
    }

    if (!merchantUrl) {
      return { success: false, message: 'No valid affiliate link found' };
    }

    // Generate tracking code and short slug
    const trackingCode = generateTrackingCode(userId, campaignId, productId);
    const shortSlug = generateShortSlug();

    // Generate tracking URLs
    const fullTrackingUrl = generateTrackingUrl(trackingCode);
    const shortTrackingUrl = generateShortUrl(shortSlug);

    // Create affiliate link
    const affiliateLink = new UserAffiliateLink({
      user_id: userId,
      campaign_id: campaignId,
      product_id: productId,
      campaign_name: campaign.name,
      tracking_code: trackingCode,
      short_slug: shortSlug,
      full_tracking_url: fullTrackingUrl,
      short_tracking_url: shortTrackingUrl,
      merchant_affiliate_url: merchantUrl,
      total_clicks: 0,
      total_conversions: 0,
      total_sales_amount: 0,
      total_commission_earned: 0,
      total_commission_paid: 0,
      pending_commission: 0,
      conversion_rate: 0,
      average_sale_value: 0,
      is_active: true
    });

    await affiliateLink.save();

    // Update campaign participant count (only once per user per campaign)
    if (!productId) {
      await SokoCampaign.findByIdAndUpdate(campaignId, {
        $inc: { current_participants: 1 }
      });
    }

    return {
      success: true,
      data: {
        _id: affiliateLink._id.toString(),
        campaign_id: affiliateLink.campaign_id.toString(),
        product_id: affiliateLink.product_id?.toString(),
        campaign_name: sanitizeString(campaign.name),
        product_title: product ? sanitizeString(product.title) : undefined,
        tracking_code: affiliateLink.tracking_code,
        short_slug: affiliateLink.short_slug,
        full_tracking_url: affiliateLink.full_tracking_url,
        short_tracking_url: affiliateLink.short_tracking_url,
        merchant_affiliate_url: affiliateLink.merchant_affiliate_url,
        total_clicks: affiliateLink.total_clicks,
        total_conversions: affiliateLink.total_conversions,
        total_commission_earned: affiliateLink.total_commission_earned,
        conversion_rate: affiliateLink.conversion_rate,
        is_active: affiliateLink.is_active
      },
      message: 'Affiliate link generated successfully'
    };
  } catch (error: any) {
    console.error('Error generating affiliate link:', error);
    return { success: false, message: 'Failed to generate link' };
  }
}

// ============================================================================
// GET MY AFFILIATE LINKS
// ============================================================================

export async function getMyAffiliateLinks() {
  try {
    const session = await auth(); 
    if (!session?.user?.id) {
      return { success: false, message: 'Unauthorized' };
    }

    await connectToDatabase();

    const userId = session.user.id;

    const links = await UserAffiliateLink.find({ user_id: userId })
      .populate('campaign_id', 'name')
      .populate('product_id', 'title image_url')
      .sort({ created_at: -1 });

    return {
      success: true,
      data: links.map(link => ({
        _id: link._id.toString(),
        campaign_id: (link.campaign_id as any)._id.toString(),
        campaign_name: sanitizeString((link.campaign_id as any).name),
        product_id: link.product_id ? (link.product_id as any)._id.toString() : undefined,
        product_title: link.product_id ? sanitizeString((link.product_id as any).title) : undefined,
        product_image: link.product_id ? (link.product_id as any).image_url : undefined,
        tracking_code: link.tracking_code,
        short_slug: link.short_slug,
        full_tracking_url: link.full_tracking_url,
        short_tracking_url: link.short_tracking_url,
        merchant_affiliate_url: link.merchant_affiliate_url,
        total_clicks: link.total_clicks,
        total_conversions: link.total_conversions,
        total_commission_earned: link.total_commission_earned,
        conversion_rate: link.conversion_rate,
        is_active: link.is_active
      }))
    };
  } catch (error: any) {
    console.error('Error getting affiliate links:', error);
    return { success: false, message: 'Failed to get links' };
  }
}

// ============================================================================
// GET MY PERFORMANCE DATA
// ============================================================================

export async function getMyPerformance() {
  try {
    const session = await auth(); 
    if (!session?.user?.id) {
      return { success: false, message: 'Unauthorized' };
    }

    await connectToDatabase();

    const userId = session.user.id;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const clicks = await ClickTracking.aggregate([
      {
        $match: {
          user_id: userId,
          clicked_at: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$clicked_at' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const conversions = await AffiliateConversion.aggregate([
      {
        $match: {
          user_id: userId,
          conversion_date: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$conversion_date' } },
          count: { $sum: 1 },
          amount: { $sum: '$commission_amount' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const topCampaigns = await UserAffiliateLink.aggregate([
      {
        $match: { user_id: userId }
      },
      {
        $lookup: {
          from: 'sokocampaigns',
          localField: 'campaign_id',
          foreignField: '_id',
          as: 'campaign'
        }
      },
      { $unwind: '$campaign' },
      {
        $project: {
          campaign_name: '$campaign.name',
          clicks: '$total_clicks',
          conversions: '$total_conversions',
          earnings: '$total_commission_earned'
        }
      },
      { $sort: { earnings: -1 } },
      { $limit: 5 }
    ]);

    const sanitizedTopCampaigns = topCampaigns.map(campaign => ({
      campaign_name: sanitizeString(campaign.campaign_name),
      clicks: sanitizeNumber(campaign.clicks),
      conversions: sanitizeNumber(campaign.conversions),
      earnings: sanitizeNumber(campaign.earnings)
    }));

    return {
      success: true,
      data: {
        clicks: clicks.map(c => ({ date: c._id, count: sanitizeNumber(c.count) })),
        conversions: conversions.map(c => ({ 
          date: c._id, 
          count: sanitizeNumber(c.count), 
          amount: sanitizeNumber(c.amount) 
        })),
        topCampaigns: sanitizedTopCampaigns
      }
    };
  } catch (error: any) {
    console.error('Error getting performance data:', error);
    return { success: false, message: 'Failed to get performance data' };
  }
}

// ============================================================================
// GET MY PAYOUTS
// ============================================================================

export async function getMyPayouts() {
  try {
    const session = await auth(); 
    if (!session?.user?.id) {
      return { success: false, message: 'Unauthorized' };
    }

    await connectToDatabase();

    const userId = session.user.id;

    const payouts = await AffiliatePayout.find({ user_id: userId })
      .sort({ requested_at: -1 })
      .limit(50);

    return {
      success: true,
      data: payouts.map(payout => ({
        _id: payout._id.toString(),
        amount: sanitizeNumber(payout.amount),
        status: payout.status,
        payout_method: payout.payout_method,
        requested_at: payout.requested_at,
        processed_at: payout.processed_at,
        completed_at: payout.completed_at,
        conversion_count: sanitizeNumber(payout.conversion_count)
      }))
    };
  } catch (error: any) {
    console.error('Error getting payouts:', error);
    return { success: false, message: 'Failed to get payouts' };
  }
}

// ============================================================================
// REQUEST PAYOUT
// ============================================================================

export async function requestPayout(data: {
  amount: number;
  payout_method: 'mpesa' | 'paypal' | 'bank_transfer' | 'wallet';
  payout_details?: any;
}) {
  try {
    const session = await auth(); 
    if (!session?.user?.id) {
      return { success: false, message: 'Unauthorized' };
    }

    if (!data.amount || data.amount <= 0) {
      return { success: false, message: 'Invalid amount' };
    }
    
    if (!validateAmount(data.amount)) {
      return { success: false, message: 'Amount must be between 1 and 1,000,000 KES' };
    }
    
    if (!['mpesa', 'paypal', 'bank_transfer', 'wallet'].includes(data.payout_method)) {
      return { success: false, message: 'Invalid payout method' };
    }

    await connectToDatabase();

    const userId = session.user.id;
    const user = await Profile.findById(userId);

    if (!user) {
      return { success: false, message: 'User not found' };
    }

    const approvedConversions = await AffiliateConversion.find({
      user_id: userId,
      status: 'approved',
      payout_id: { $exists: false }
    });

    const totalApproved = approvedConversions.reduce(
      (sum, c) => sum + c.commission_amount, 
      0
    );

    if (data.amount > totalApproved) {
      return { success: false, message: 'Insufficient approved commission' };
    }

    if (data.amount < 100) {
      return { success: false, message: 'Minimum payout amount is KES 100' };
    }

    let payoutDetails: any = {};
    if (data.payout_method === 'mpesa') {
      const mpesaNumber = user.preferred_mpesa_number || user.phone_number;
      if (!validatePhone(mpesaNumber)) {
        return { success: false, message: 'Invalid M-Pesa number format' };
      }
      payoutDetails = {
        mpesa_number: mpesaNumber
      };
    } else if (data.payout_method === 'paypal') {
      if (!data.payout_details?.paypal_email || !validateEmail(data.payout_details.paypal_email)) {
        return { success: false, message: 'Valid PayPal email is required' };
      }
      payoutDetails = {
        paypal_email: sanitizeString(data.payout_details.paypal_email)
      };
    } else if (data.payout_method === 'bank_transfer') {
      if (!data.payout_details?.account_number || !data.payout_details?.bank_name) {
        return { success: false, message: 'Bank account details are required' };
      }
      payoutDetails = {
        account_number: sanitizeString(data.payout_details.account_number),
        bank_name: sanitizeString(data.payout_details.bank_name),
        account_name: sanitizeString(data.payout_details.account_name || '')
      };
    } else if (data.payout_details) {
      payoutDetails = Object.fromEntries(
        Object.entries(data.payout_details).map(([key, value]) => [
          key, 
          typeof value === 'string' ? sanitizeString(value) : value
        ])
      );
    }

    const payout = new AffiliatePayout({
      user_id: userId,
      amount: sanitizeNumber(data.amount),
      currency: 'KES',
      payout_method: data.payout_method,
      payout_details: payoutDetails,
      status: 'pending',
      conversion_ids: approvedConversions.slice(0, Math.ceil(data.amount / (totalApproved / approvedConversions.length))).map(c => c._id),
      conversion_count: approvedConversions.length,
      requested_at: new Date()
    });

    await payout.save();

    await AffiliateConversion.updateMany(
      { _id: { $in: payout.conversion_ids } },
      { payout_id: payout._id }
    );

    return {
      success: true,
      data: {
        _id: payout._id.toString(),
        amount: payout.amount,
        status: payout.status
      },
      message: 'Payout requested successfully'
    };
  } catch (error: any) {
    console.error('Error requesting payout:', error);
    return { success: false, message: 'Failed to request payout' };
  }
}

// ============================================================================
// TRACK CLICK (Public route - called when someone clicks affiliate link)
// ============================================================================

export async function trackClick(trackingCode: string, metadata?: any) {
  try {
    if (!trackingCode || !validateTrackingCode(trackingCode)) {
      return { success: false, message: 'Invalid tracking code' };
    }

    await connectToDatabase();

    const affiliateLink = await UserAffiliateLink.findOne({ 
      tracking_code: trackingCode,
      is_active: true 
    });

    if (!affiliateLink) {
      return { success: false, message: 'Invalid tracking code' };
    }

    const sanitizedMetadata = {
      ip_address: metadata?.ip_address ? sanitizeString(metadata.ip_address) : 'unknown',
      user_agent: metadata?.user_agent ? sanitizeString(metadata.user_agent) : 'unknown',
      device_type: metadata?.device_type ? sanitizeString(metadata.device_type) : 'other',
      browser: metadata?.browser ? sanitizeString(metadata.browser) : undefined,
      operating_system: metadata?.operating_system ? sanitizeString(metadata.operating_system) : undefined,
      country: metadata?.country ? sanitizeString(metadata.country) : undefined,
      city: metadata?.city ? sanitizeString(metadata.city) : undefined,
      referrer_url: metadata?.referrer_url ? sanitizeString(metadata.referrer_url) : undefined,
      utm_source: metadata?.utm_source ? sanitizeString(metadata.utm_source) : undefined,
      utm_medium: metadata?.utm_medium ? sanitizeString(metadata.utm_medium) : undefined,
      utm_campaign: metadata?.utm_campaign ? sanitizeString(metadata.utm_campaign) : undefined,
      session_id: metadata?.session_id ? sanitizeString(metadata.session_id) : undefined,
    };

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const existingClick = await ClickTracking.findOne({
      affiliate_link_id: affiliateLink._id,
      ip_address: sanitizedMetadata.ip_address,
      clicked_at: { $gte: twentyFourHoursAgo }
    });

    if (existingClick) {
      return {
        success: true,
        data: {
          redirect_url: affiliateLink.merchant_affiliate_url,
          tracking_id: existingClick._id.toString(),
          is_duplicate: true
        }
      };
    }

    const click = new ClickTracking({
      affiliate_link_id: affiliateLink._id,
      user_id: affiliateLink.user_id,
      campaign_id: affiliateLink.campaign_id,
      product_id: affiliateLink.product_id,
      clicked_at: new Date(),
      ...sanitizedMetadata,
      status: 'pending'
    });

    await click.save();

    await UserAffiliateLink.findByIdAndUpdate(affiliateLink._id, {
      $inc: { total_clicks: 1 },
      last_click_at: new Date()
    });

    await SokoCampaign.findByIdAndUpdate(affiliateLink.campaign_id, {
      $inc: { total_clicks: 1 }
    });

    if (affiliateLink.product_id) {
      await AlibabaProduct.findByIdAndUpdate(affiliateLink.product_id, {
        $inc: { total_clicks: 1 }
      });
    }

    if (!affiliateLink.merchant_affiliate_url) {
      return { success: false, message: 'Merchant affiliate URL not found' };
    }

    return {
      success: true,
      data: {
        redirect_url: affiliateLink.merchant_affiliate_url,
        tracking_id: click._id.toString(),
        is_duplicate: false
      }
    };
  } catch (error: any) {
    console.error('Error tracking click:', error);
    return { success: false, message: 'Failed to track click' };
  }
}

// ============================================================================
// GET CAMPAIGN DETAILS (Public)
// ============================================================================

export async function getCampaignDetails(slugOrId: string) {
  try {
    if (!slugOrId || typeof slugOrId !== 'string') {
      return { success: false, message: 'Invalid campaign identifier' };
    }

    await connectToDatabase();

    const campaign = await SokoCampaign.findOne({
      $or: [
        { slug: slugOrId },
        { _id: slugOrId }
      ],
      status: 'active'
    });

    if (!campaign) {
      return { success: false, message: 'Campaign not found' };
    }

    return {
      success: true,
      data: {
        _id: campaign._id.toString(),
        name: sanitizeString(campaign.name),
        slug: campaign.slug,
        description: sanitizeString(campaign.description),
        short_description: sanitizeString(campaign.short_description),
        featured_image: campaign.featured_image,
        gallery_images: campaign.gallery_images,
        campaign_type: campaign.campaign_type,
        commission_rate: sanitizeNumber(campaign.commission_rate),
        commission_fixed_amount: sanitizeNumber(campaign.commission_fixed_amount),
        commission_type: campaign.commission_type,
        product_category: sanitizeString(campaign.product_category),
        product_price: sanitizeNumber(campaign.product_price),
        product_count: campaign.product_count || 0,
        currency: campaign.currency,
        start_date: campaign.start_date,
        end_date: campaign.end_date,
        terms_and_conditions: sanitizeString(campaign.terms_and_conditions),
        is_featured: campaign.is_featured
      }
    };
  } catch (error: any) {
    console.error('Error getting campaign details:', error);
    return { success: false, message: 'Failed to get campaign details' };
  }
}
