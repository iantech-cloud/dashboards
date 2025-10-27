// app/actions/admin/soko.ts
'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { connectToDatabase } from '@/app/lib/mongoose';
import { 
  SokoCampaign, 
  UserAffiliateLink, 
  ClickTracking, 
  AffiliateConversion,
  AffiliatePayout,
  AffiliateNotification
} from '@/app/lib/models/Soko';
import { Profile, Transaction, AdminAuditLog } from '@/app/lib/models';

// ============================================================================
// HELPER FUNCTION - Check Admin Access
// ============================================================================

async function checkAdminAccess() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { authorized: false, userId: null };
  }

  const user = await Profile.findById(session.user.id);
  if (!user || (user.role !== 'admin' && user.role !== 'support')) {
    return { authorized: false, userId: null };
  }

  return { authorized: true, userId: session.user.id };
}

// ============================================================================
// GET ADMIN STATS
// ============================================================================

export async function getSokoAdminStats() {
  try {
    const { authorized } = await checkAdminAccess();
    if (!authorized) {
      return { success: false, message: 'Unauthorized' };
    }

    await connectToDatabase();

    // Get campaign stats
    const totalCampaigns = await SokoCampaign.countDocuments();
    const activeCampaigns = await SokoCampaign.countDocuments({ status: 'active' });

    // Get affiliate stats
    const totalAffiliates = (await UserAffiliateLink.distinct('user_id')).length;

    // Get click and conversion stats
    const totalClicks = await ClickTracking.countDocuments();
    const totalConversions = await AffiliateConversion.countDocuments();
    const conversionRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;

    // Get revenue stats
    const conversions = await AffiliateConversion.find();
    const totalRevenue = conversions.reduce((sum, c) => sum + c.sale_amount, 0);
    
    const pendingCommissions = conversions
      .filter(c => c.status === 'pending')
      .reduce((sum, c) => sum + c.commission_amount, 0);
    
    const approvedCommissions = conversions
      .filter(c => c.status === 'approved')
      .reduce((sum, c) => sum + c.commission_amount, 0);
    
    const paidCommissions = conversions
      .filter(c => c.status === 'paid')
      .reduce((sum, c) => sum + c.commission_amount, 0);

    // Get pending payouts count
    const pendingPayouts = await AffiliatePayout.countDocuments({ status: 'pending' });

    return {
      success: true,
      data: {
        totalCampaigns,
        activeCampaigns,
        totalAffiliates,
        totalClicks,
        totalConversions,
        conversionRate,
        totalRevenue,
        pendingCommissions,
        approvedCommissions,
        paidCommissions,
        pendingPayouts
      }
    };
  } catch (error: any) {
    console.error('Error getting admin stats:', error);
    return { success: false, message: error.message || 'Failed to get stats' };
  }
}

// ============================================================================
// GET ALL CAMPAIGNS
// ============================================================================

export async function getAllCampaigns(filters?: any) {
  try {
    const { authorized } = await checkAdminAccess();
    if (!authorized) {
      return { success: false, message: 'Unauthorized' };
    }

    await connectToDatabase();

    const query: any = {};
    if (filters?.status && filters.status !== 'all') {
      query.status = filters.status;
    }

    const campaigns = await SokoCampaign.find(query)
      .sort({ is_featured: -1, created_at: -1 });

    return {
      success: true,
      data: campaigns.map(c => ({
        _id: c._id.toString(),
        name: c.name,
        slug: c.slug,
        campaign_type: c.campaign_type,
        commission_rate: c.commission_rate,
        status: c.status,
        total_clicks: c.total_clicks,
        total_conversions: c.total_conversions,
        conversion_rate: c.conversion_rate,
        current_participants: c.current_participants,
        created_at: c.created_at,
        is_featured: c.is_featured
      }))
    };
  } catch (error: any) {
    console.error('Error getting campaigns:', error);
    return { success: false, message: error.message || 'Failed to get campaigns' };
  }
}

// ============================================================================
// GET CAMPAIGN BY ID
// ============================================================================

export async function getCampaignById(campaignId: string) {
  try {
    const { authorized } = await checkAdminAccess();
    if (!authorized) {
      return { success: false, message: 'Unauthorized' };
    }

    await connectToDatabase();

    const campaign = await SokoCampaign.findById(campaignId);
    if (!campaign) {
      return { success: false, message: 'Campaign not found' };
    }

    return {
      success: true,
      data: {
        _id: campaign._id.toString(),
        name: campaign.name,
        description: campaign.description,
        short_description: campaign.short_description,
        campaign_type: campaign.campaign_type,
        affiliate_network: campaign.affiliate_network,
        base_affiliate_link: campaign.base_affiliate_link,
        featured_image: campaign.featured_image,
        banner_image: campaign.banner_image,
        commission_type: campaign.commission_type,
        commission_rate: campaign.commission_rate,
        commission_fixed_amount: campaign.commission_fixed_amount,
        product_category: campaign.product_category,
        product_price: campaign.product_price,
        currency: campaign.currency,
        status: campaign.status,
        start_date: campaign.start_date,
        end_date: campaign.end_date,
        is_featured: campaign.is_featured,
        sort_order: campaign.sort_order,
        min_user_level: campaign.min_user_level,
        require_activation: campaign.require_activation,
        require_verification: campaign.require_verification,
        allowed_user_tiers: campaign.allowed_user_tiers || [],
        max_participants: campaign.max_participants,
        terms_and_conditions: campaign.terms_and_conditions,
        meta_title: campaign.meta_title,
        meta_description: campaign.meta_description,
        tags: campaign.tags || [],
        cj_advertiser_id: campaign.cj_advertiser_id,
        cj_publisher_id: campaign.cj_publisher_id,
        cj_site_id: campaign.cj_site_id,
        cj_campaign_id: campaign.cj_campaign_id,
        cj_api_key: campaign.cj_api_key,
        cj_access_token: campaign.cj_access_token,
        created_at: campaign.created_at,
        updated_at: campaign.updated_at
      }
    };
  } catch (error: any) {
    console.error('Error getting campaign:', error);
    return { success: false, message: error.message || 'Failed to get campaign' };
  }
}

// ============================================================================
// CREATE CAMPAIGN
// ============================================================================

export async function createCampaign(data: any) {
  try {
    const { authorized, userId } = await checkAdminAccess();
    if (!authorized) {
      return { success: false, message: 'Unauthorized' };
    }

    await connectToDatabase();

    // Generate slug from name
    const slug = data.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    // Check if slug exists
    const existingCampaign = await SokoCampaign.findOne({ slug });
    if (existingCampaign) {
      return { success: false, message: 'Campaign with this name already exists' };
    }

    // Create campaign
    const campaign = new SokoCampaign({
      ...data,
      slug,
      created_by: userId,
      total_clicks: 0,
      total_conversions: 0,
      total_sales_amount: 0,
      total_commission_paid: 0,
      conversion_rate: 0,
      current_participants: 0
    });

    await campaign.save();

    // Create audit log - FIXED: Use correct enum values
    await AdminAuditLog.create({
      actor_id: userId,
      action: 'CAMPAIGN_CREATE',
      target_type: 'campaign',
      target_id: campaign._id.toString(),
      resource_type: 'campaign',
      resource_id: campaign._id.toString(),
      action_type: 'campaign_create',
      changes: { campaign: data }
    });

    return {
      success: true,
      data: { _id: campaign._id.toString(), slug: campaign.slug },
      message: 'Campaign created successfully'
    };
  } catch (error: any) {
    console.error('Error creating campaign:', error);
    return { success: false, message: error.message || 'Failed to create campaign' };
  }
}

// ============================================================================
// UPDATE CAMPAIGN
// ============================================================================

export async function updateCampaign(campaignId: string, data: any) {
  try {
    const { authorized, userId } = await checkAdminAccess();
    if (!authorized) {
      return { success: false, message: 'Unauthorized' };
    }

    await connectToDatabase();

    const campaign = await SokoCampaign.findById(campaignId);
    if (!campaign) {
      return { success: false, message: 'Campaign not found' };
    }

    const oldData = campaign.toObject();

    // Update campaign
    Object.assign(campaign, data);
    campaign.updated_by = userId;
    await campaign.save();

    // Create audit log - FIXED: Use correct enum values
    await AdminAuditLog.create({
      actor_id: userId,
      action: 'CAMPAIGN_UPDATE',
      target_type: 'campaign',
      target_id: campaignId,
      resource_type: 'campaign',
      resource_id: campaignId,
      action_type: 'campaign_update',
      changes: { before: oldData, after: data }
    });

    return {
      success: true,
      message: 'Campaign updated successfully'
    };
  } catch (error: any) {
    console.error('Error updating campaign:', error);
    return { success: false, message: error.message || 'Failed to update campaign' };
  }
}

// ============================================================================
// DELETE CAMPAIGN
// ============================================================================

export async function deleteCampaign(campaignId: string) {
  try {
    const { authorized, userId } = await checkAdminAccess();
    if (!authorized) {
      return { success: false, message: 'Unauthorized' };
    }

    await connectToDatabase();

    const campaign = await SokoCampaign.findById(campaignId);
    if (!campaign) {
      return { success: false, message: 'Campaign not found' };
    }

    // Check if campaign has active affiliates
    const activeLinks = await UserAffiliateLink.countDocuments({
      campaign_id: campaignId,
      is_active: true
    });

    if (activeLinks > 0) {
      return { 
        success: false, 
        message: 'Cannot delete campaign with active affiliates. Please deactivate first.' 
      };
    }

    await SokoCampaign.findByIdAndDelete(campaignId);

    // Create audit log - FIXED: Use correct enum values
    await AdminAuditLog.create({
      actor_id: userId,
      action: 'CAMPAIGN_DELETE',
      target_type: 'campaign',
      target_id: campaignId,
      resource_type: 'campaign',
      resource_id: campaignId,
      action_type: 'campaign_delete',
      changes: { deleted_campaign: campaign.toObject() }
    });

    return {
      success: true,
      message: 'Campaign deleted successfully'
    };
  } catch (error: any) {
    console.error('Error deleting campaign:', error);
    return { success: false, message: error.message || 'Failed to delete campaign' };
  }
}

// ============================================================================
// TOGGLE CAMPAIGN STATUS
// ============================================================================

export async function toggleCampaignStatus(campaignId: string, newStatus: string) {
  try {
    const { authorized, userId } = await checkAdminAccess();
    if (!authorized) {
      return { success: false, message: 'Unauthorized' };
    }

    await connectToDatabase();

    const campaign = await SokoCampaign.findById(campaignId);
    if (!campaign) {
      return { success: false, message: 'Campaign not found' };
    }

    const oldStatus = campaign.status;
    campaign.status = newStatus;
    campaign.updated_by = userId;
    await campaign.save();

    // Create audit log - FIXED: Use correct enum values
    await AdminAuditLog.create({
      actor_id: userId,
      action: 'CAMPAIGN_TOGGLE_STATUS',
      target_type: 'campaign',
      target_id: campaignId,
      resource_type: 'campaign',
      resource_id: campaignId,
      action_type: 'campaign_toggle_status',
      changes: { status: { from: oldStatus, to: newStatus } }
    });

    return {
      success: true,
      message: `Campaign ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`
    };
  } catch (error: any) {
    console.error('Error toggling campaign status:', error);
    return { success: false, message: error.message || 'Failed to update status' };
  }
}

// ============================================================================
// GET PENDING PAYOUTS
// ============================================================================

export async function getPendingPayouts() {
  try {
    const { authorized } = await checkAdminAccess();
    if (!authorized) {
      return { success: false, message: 'Unauthorized' };
    }

    await connectToDatabase();

    const payouts = await AffiliatePayout.find({ status: 'pending' })
      .sort({ requested_at: 1 })
      .limit(100);

    // Get user details for each payout
    const payoutsWithUsers = await Promise.all(
      payouts.map(async (payout) => {
        const user = await Profile.findById(payout.user_id);
        return {
          _id: payout._id.toString(),
          user_id: payout.user_id,
          username: user?.username || 'Unknown',
          amount: payout.amount,
          payout_method: payout.payout_method,
          requested_at: payout.requested_at,
          conversion_count: payout.conversion_count
        };
      })
    );

    return {
      success: true,
      data: payoutsWithUsers
    };
  } catch (error: any) {
    console.error('Error getting pending payouts:', error);
    return { success: false, message: error.message || 'Failed to get payouts' };
  }
}

// ============================================================================
// GET PENDING CONVERSIONS
// ============================================================================

export async function getPendingConversions() {
  try {
    const { authorized } = await checkAdminAccess();
    if (!authorized) {
      return { success: false, message: 'Unauthorized' };
    }

    await connectToDatabase();

    const conversions = await AffiliateConversion.find({ status: 'pending' })
      .populate('campaign_id', 'name')
      .sort({ conversion_date: 1 })
      .limit(100);

    // Get user details for each conversion
    const conversionsWithUsers = await Promise.all(
      conversions.map(async (conversion) => {
        const user = await Profile.findById(conversion.user_id);
        return {
          _id: conversion._id.toString(),
          user_id: conversion.user_id,
          username: user?.username || 'Unknown',
          campaign_name: conversion.campaign_id.name,
          order_id: conversion.order_id,
          sale_amount: conversion.sale_amount,
          commission_amount: conversion.commission_amount,
          conversion_date: conversion.conversion_date
        };
      })
    );

    return {
      success: true,
      data: conversionsWithUsers
    };
  } catch (error: any) {
    console.error('Error getting pending conversions:', error);
    return { success: false, message: error.message || 'Failed to get conversions' };
  }
}

// ============================================================================
// APPROVE CONVERSION
// ============================================================================

export async function approveConversion(conversionId: string, notes?: string) {
  try {
    const { authorized, userId } = await checkAdminAccess();
    if (!authorized) {
      return { success: false, message: 'Unauthorized' };
    }

    await connectToDatabase();

    const conversion = await AffiliateConversion.findById(conversionId);
    if (!conversion) {
      return { success: false, message: 'Conversion not found' };
    }

    if (conversion.status !== 'pending') {
      return { success: false, message: 'Conversion already processed' };
    }

    // Update conversion status
    conversion.status = 'approved';
    conversion.approved_by = userId;
    conversion.approved_at = new Date();
    await conversion.save();

    // Update affiliate link stats
    await UserAffiliateLink.findByIdAndUpdate(conversion.affiliate_link_id, {
      $inc: { 
        total_commission_earned: conversion.commission_amount,
        pending_commission: -conversion.commission_amount
      }
    });

    // Send notification to user
    await AffiliateNotification.create({
      user_id: conversion.user_id,
      type: 'conversion_approved',
      title: 'Conversion Approved',
      message: `Your conversion for order ${conversion.order_id} has been approved. Commission: KES ${conversion.commission_amount.toFixed(2)}`,
      conversion_id: conversionId,
      priority: 'high'
    });

    // Create audit log - FIXED: Use correct enum values
    await AdminAuditLog.create({
      actor_id: userId,
      action: 'CONVERSION_APPROVE',
      target_type: 'conversion',
      target_id: conversionId,
      resource_type: 'conversion',
      resource_id: conversionId,
      action_type: 'conversion_approve',
      changes: { status: 'approved', notes }
    });

    return {
      success: true,
      message: 'Conversion approved successfully'
    };
  } catch (error: any) {
    console.error('Error approving conversion:', error);
    return { success: false, message: error.message || 'Failed to approve conversion' };
  }
}

// ============================================================================
// REJECT CONVERSION
// ============================================================================

export async function rejectConversion(conversionId: string, reason: string) {
  try {
    const { authorized, userId } = await checkAdminAccess();
    if (!authorized) {
      return { success: false, message: 'Unauthorized' };
    }

    await connectToDatabase();

    const conversion = await AffiliateConversion.findById(conversionId);
    if (!conversion) {
      return { success: false, message: 'Conversion not found' };
    }

    if (conversion.status !== 'pending') {
      return { success: false, message: 'Conversion already processed' };
    }

    // Update conversion status
    conversion.status = 'rejected';
    conversion.approved_by = userId;
    conversion.approved_at = new Date();
    conversion.rejection_reason = reason;
    await conversion.save();

    // Send notification to user
    await AffiliateNotification.create({
      user_id: conversion.user_id,
      type: 'conversion_rejected',
      title: 'Conversion Rejected',
      message: `Your conversion for order ${conversion.order_id} has been rejected. Reason: ${reason}`,
      conversion_id: conversionId,
      priority: 'high'
    });

    // Create audit log - FIXED: Use correct enum values
    await AdminAuditLog.create({
      actor_id: userId,
      action: 'CONVERSION_REJECT',
      target_type: 'conversion',
      target_id: conversionId,
      resource_type: 'conversion',
      resource_id: conversionId,
      action_type: 'conversion_reject',
      changes: { status: 'rejected', reason }
    });

    return {
      success: true,
      message: 'Conversion rejected successfully'
    };
  } catch (error: any) {
    console.error('Error rejecting conversion:', error);
    return { success: false, message: error.message || 'Failed to reject conversion' };
  }
}

// ============================================================================
// PROCESS PAYOUT
// ============================================================================

export async function processPayout(payoutId: string, action: 'approve' | 'reject', notes?: string) {
  try {
    const { authorized, userId } = await checkAdminAccess();
    if (!authorized) {
      return { success: false, message: 'Unauthorized' };
    }

    await connectToDatabase();

    const payout = await AffiliatePayout.findById(payoutId);
    if (!payout) {
      return { success: false, message: 'Payout not found' };
    }

    if (payout.status !== 'pending') {
      return { success: false, message: 'Payout already processed' };
    }

    if (action === 'approve') {
      // Update payout status
      payout.status = 'processing';
      payout.processed_by = userId;
      payout.processed_at = new Date();
      payout.admin_notes = notes;
      await payout.save();

      // Create transaction
      const transaction = new Transaction({
        user_id: payout.user_id,
        amount_cents: payout.amount * 100,
        type: 'WITHDRAWAL',
        description: `Affiliate payout - ${payout.conversion_count} conversions`,
        status: 'completed',
        transaction_code: `SOKO-${Date.now()}`,
        metadata: {
          payout_id: payoutId,
          payout_method: payout.payout_method,
          conversion_count: payout.conversion_count
        },
        target_type: 'user',
        target_id: payout.user_id
      });

      await transaction.save();

      // Update payout with transaction
      payout.transaction_id = transaction._id;
      payout.transaction_code = transaction.transaction_code;
      payout.status = 'completed';
      payout.completed_at = new Date();
      await payout.save();

      // Update conversions to paid status
      await AffiliateConversion.updateMany(
        { _id: { $in: payout.conversion_ids } },
        { status: 'paid', paid_at: new Date() }
      );

      // Update user affiliate links
      const conversions = await AffiliateConversion.find({ 
        _id: { $in: payout.conversion_ids } 
      });

      for (const conversion of conversions) {
        await UserAffiliateLink.findByIdAndUpdate(conversion.affiliate_link_id, {
          $inc: { 
            total_commission_paid: conversion.commission_amount,
            pending_commission: -conversion.commission_amount
          }
        });
      }

      // Send notification to user
      await AffiliateNotification.create({
        user_id: payout.user_id,
        type: 'payout_completed',
        title: 'Payout Completed',
        message: `Your payout of KES ${payout.amount.toFixed(2)} has been processed successfully.`,
        payout_id: payoutId,
        priority: 'high'
      });

      // Create audit log - FIXED: Use correct enum values
      await AdminAuditLog.create({
        actor_id: userId,
        action: 'PAYOUT_APPROVE',
        target_type: 'payout',
        target_id: payoutId,
        resource_type: 'payout',
        resource_id: payoutId,
        action_type: 'payout_approve',
        changes: { status: 'completed', notes }
      });

      return {
        success: true,
        message: 'Payout approved and processed successfully'
      };

    } else {
      // Reject payout
      payout.status = 'failed';
      payout.processed_by = userId;
      payout.processed_at = new Date();
      payout.failure_reason = notes || 'Rejected by admin';
      payout.admin_notes = notes;
      await payout.save();

      // Remove payout ID from conversions
      await AffiliateConversion.updateMany(
        { _id: { $in: payout.conversion_ids } },
        { $unset: { payout_id: 1 } }
      );

      // Send notification to user
      await AffiliateNotification.create({
        user_id: payout.user_id,
        type: 'payout_processed',
        title: 'Payout Rejected',
        message: `Your payout request has been rejected. ${notes || 'Please contact support for details.'}`,
        payout_id: payoutId,
        priority: 'high'
      });

      // Create audit log - FIXED: Use correct enum values
      await AdminAuditLog.create({
        actor_id: userId,
        action: 'PAYOUT_REJECT',
        target_type: 'payout',
        target_id: payoutId,
        resource_type: 'payout',
        resource_id: payoutId,
        action_type: 'payout_reject',
        changes: { status: 'failed', reason: notes }
      });

      return {
        success: true,
        message: 'Payout rejected'
      };
    }
  } catch (error: any) {
    console.error('Error processing payout:', error);
    return { success: false, message: error.message || 'Failed to process payout' };
  }
}

// ============================================================================
// GET CAMPAIGN ANALYTICS
// ============================================================================

export async function getCampaignAnalytics(campaignId: string, dateRange?: { start: Date; end: Date }) {
  try {
    const { authorized } = await checkAdminAccess();
    if (!authorized) {
      return { success: false, message: 'Unauthorized' };
    }

    await connectToDatabase();

    const campaign = await SokoCampaign.findById(campaignId);
    if (!campaign) {
      return { success: false, message: 'Campaign not found' };
    }

    // Build date filter
    const dateFilter: any = {};
    if (dateRange) {
      dateFilter.clicked_at = { $gte: dateRange.start, $lte: dateRange.end };
    }

    // Get clicks by day
    const clicksByDay = await ClickTracking.aggregate([
      { $match: { campaign_id: campaign._id, ...dateFilter } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$clicked_at' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Get conversions by day
    const conversionsByDay = await AffiliateConversion.aggregate([
      { $match: { campaign_id: campaign._id } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$conversion_date' } },
          count: { $sum: 1 },
          revenue: { $sum: '$sale_amount' },
          commission: { $sum: '$commission_amount' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Get top affiliates
    const topAffiliates = await UserAffiliateLink.aggregate([
      { $match: { campaign_id: campaign._id } },
      {
        $lookup: {
          from: 'profiles',
          localField: 'user_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $project: {
          username: '$user.username',
          clicks: '$total_clicks',
          conversions: '$total_conversions',
          earnings: '$total_commission_earned',
          conversion_rate: '$conversion_rate'
        }
      },
      { $sort: { earnings: -1 } },
      { $limit: 10 }
    ]);

    return {
      success: true,
      data: {
        campaign: {
          name: campaign.name,
          total_clicks: campaign.total_clicks,
          total_conversions: campaign.total_conversions,
          conversion_rate: campaign.conversion_rate,
          total_revenue: campaign.total_sales_amount,
          total_commission: campaign.total_commission_paid
        },
        clicksByDay,
        conversionsByDay,
        topAffiliates
      }
    };
  } catch (error: any) {
    console.error('Error getting campaign analytics:', error);
    return { success: false, message: error.message || 'Failed to get analytics' };
  }
}

// ============================================================================
// EXPORT REPORT
// ============================================================================

export async function exportSokoReport(reportType: 'campaigns' | 'conversions' | 'payouts', filters?: any) {
  try {
    const { authorized } = await checkAdminAccess();
    if (!authorized) {
      return { success: false, message: 'Unauthorized' };
    }

    await connectToDatabase();

    let data: any[] = [];
    let headers: string[] = [];

    switch (reportType) {
      case 'campaigns':
        const campaigns = await SokoCampaign.find(filters || {});
        headers = ['Name', 'Type', 'Status', 'Commission Rate', 'Clicks', 'Conversions', 'Revenue'];
        data = campaigns.map(c => [
          c.name,
          c.campaign_type,
          c.status,
          `${c.commission_rate}%`,
          c.total_clicks,
          c.total_conversions,
          `KES ${c.total_sales_amount.toFixed(2)}`
        ]);
        break;

      case 'conversions':
        const conversions = await AffiliateConversion.find(filters || {})
          .populate('campaign_id', 'name')
          .populate('user_id', 'username');
        headers = ['Date', 'User', 'Campaign', 'Order ID', 'Sale Amount', 'Commission', 'Status'];
        data = conversions.map(c => [
          new Date(c.conversion_date).toLocaleDateString(),
          c.user_id.username,
          c.campaign_id.name,
          c.order_id,
          `KES ${c.sale_amount.toFixed(2)}`,
          `KES ${c.commission_amount.toFixed(2)}`,
          c.status
        ]);
        break;

      case 'payouts':
        const payouts = await AffiliatePayout.find(filters || {})
          .populate('user_id', 'username');
        headers = ['Date', 'User', 'Amount', 'Method', 'Status', 'Conversions'];
        data = payouts.map(p => [
          new Date(p.requested_at).toLocaleDateString(),
          p.user_id.username,
          `KES ${p.amount.toFixed(2)}`,
          p.payout_method,
          p.status,
          p.conversion_count
        ]);
        break;
    }

    // Convert to CSV format
    const csv = [
      headers.join(','),
      ...data.map(row => row.join(','))
    ].join('\n');

    return {
      success: true,
      data: { csv, filename: `soko_${reportType}_${Date.now()}.csv` },
      message: 'Report generated successfully'
    };
  } catch (error: any) {
    console.error('Error exporting report:', error);
    return { success: false, message: error.message || 'Failed to export report' };
  }
}
