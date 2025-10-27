// app/soko/track/[code]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/app/lib/mongoose';
import { ClickTracking, UserAffiliateLink, SokoCampaign } from '@/app/lib/models/Soko';
import { headers } from 'next/headers';
import crypto from 'crypto';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    // FIX: Await params before destructuring
    const { code } = await params;
    
    await connectToDatabase();

    // Validate tracking code format
    if (!code || !/^[a-zA-Z0-9-]{8,50}$/.test(code)) {
      return NextResponse.redirect(new URL('/404', request.url));
    }

    // Find the affiliate link with merchant URL
    const affiliateLink = await UserAffiliateLink.findOne({ 
      tracking_code: code,
      is_active: true 
    });

    if (!affiliateLink) {
      console.log(`Affiliate link not found for tracking code: ${code}`);
      return NextResponse.redirect(new URL('/404', request.url));
    }

    // Get campaign details
    const campaign = await SokoCampaign.findById(affiliateLink.campaign_id);
    if (!campaign) {
      console.log(`Campaign not found for affiliate link: ${affiliateLink._id}`);
      return NextResponse.redirect(new URL('/404', request.url));
    }

    // Check if campaign is active
    const now = new Date();
    if (campaign.status !== 'active' || 
        (campaign.start_date && new Date(campaign.start_date) > now) ||
        (campaign.end_date && new Date(campaign.end_date) < now)) {
      console.log(`Campaign is not active: ${campaign._id}`);
      return NextResponse.redirect(new URL('/campaign-expired', request.url));
    }

    // Get request metadata with awaited headers
    const headersList = await headers();
    const ipAddress = request.ip || 
                     headersList.get('x-forwarded-for')?.split(',')[0] || 
                     headersList.get('x-real-ip') || 
                     'unknown';
    
    const userAgent = headersList.get('user-agent') || 'unknown';
    const referrerUrl = headersList.get('referer') || 'direct';
    
    // Extract UTM parameters from the request
    const url = new URL(request.url);
    const utmSource = url.searchParams.get('utm_source') || 'direct';
    const utmMedium = url.searchParams.get('utm_medium') || 'affiliate';
    const utmCampaign = url.searchParams.get('utm_campaign') || campaign.slug;
    
    // Determine device type using exact enum values from schema
    let deviceType: 'desktop' | 'mobile' | 'tablet' | 'other' = 'other';
    const userAgentLower = userAgent.toLowerCase();
    
    if (/mobile|android|iphone|ipod|blackberry|opera mini|iemobile/i.test(userAgentLower)) {
      deviceType = 'mobile';
    } else if (/tablet|ipad|playbook|silk/i.test(userAgentLower)) {
      deviceType = 'tablet';
    } else if (/windows|macintosh|linux|x11/i.test(userAgentLower)) {
      deviceType = 'desktop';
    }

    // Determine browser
    let browser = 'unknown';
    if (userAgent.includes('Chrome')) browser = 'chrome';
    else if (userAgent.includes('Firefox')) browser = 'firefox';
    else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) browser = 'safari';
    else if (userAgent.includes('Edge')) browser = 'edge';
    else if (userAgent.includes('Opera')) browser = 'opera';

    // Determine operating system
    let operatingSystem = 'unknown';
    if (userAgent.includes('Windows')) operatingSystem = 'windows';
    else if (userAgent.includes('Mac')) operatingSystem = 'macos';
    else if (userAgent.includes('Linux')) operatingSystem = 'linux';
    else if (userAgent.includes('Android')) operatingSystem = 'android';
    else if (userAgent.includes('iOS') || userAgent.includes('iPhone')) operatingSystem = 'ios';

    // Generate session ID for tracking
    const sessionId = crypto.randomBytes(16).toString('hex');

    // Create click tracking record with exact schema fields
    const clickData = {
      affiliate_link_id: affiliateLink._id,
      user_id: affiliateLink.user_id.toString(),
      campaign_id: campaign._id,
      
      // Click Details
      clicked_at: new Date(),
      ip_address: ipAddress,
      user_agent: userAgent,
      
      // Device & Location Info
      device_type: deviceType,
      browser: browser,
      operating_system: operatingSystem,
      country: 'unknown', // Could be enhanced with IP geolocation service
      city: 'unknown',    // Could be enhanced with IP geolocation service
      
      // Referrer Info
      referrer_url: referrerUrl,
      utm_source: utmSource,
      utm_medium: utmMedium,
      utm_campaign: utmCampaign,
      
      // Conversion Status (using valid enum value from schema)
      status: 'pending' as const, // Using 'pending' which is valid in ClickStatuses
      
      // Session Tracking
      session_id: sessionId,
      
      // Metadata
      metadata: {
        original_url: request.url,
        headers: {
          'user-agent': userAgent,
          'referer': referrerUrl,
          'x-forwarded-for': headersList.get('x-forwarded-for'),
          'x-real-ip': headersList.get('x-real-ip')
        },
        query_params: Object.fromEntries(url.searchParams)
      }
    };

    // Create click tracking record
    const clickRecord = await ClickTracking.create(clickData);

    // Update affiliate link stats (atomic update)
    await UserAffiliateLink.findByIdAndUpdate(affiliateLink._id, {
      $inc: { total_clicks: 1 },
      last_click_at: new Date()
    });

    // Update campaign stats (atomic update)
    await SokoCampaign.findByIdAndUpdate(campaign._id, {
      $inc: { total_clicks: 1 },
      last_click_at: new Date()
    });

    // Get the merchant affiliate URL (where we redirect to)
    const merchantUrl = affiliateLink.merchant_affiliate_url || campaign.base_affiliate_link;
    
    if (!merchantUrl) {
      console.error('No merchant URL found for campaign:', campaign._id);
      return NextResponse.redirect(new URL('/404', request.url));
    }

    // Create redirect URL with tracking parameters
    const targetUrl = new URL(merchantUrl);
    
    // Add UTM parameters for the merchant
    targetUrl.searchParams.set('utm_source', 'soko-affiliate');
    targetUrl.searchParams.set('utm_medium', 'affiliate');
    targetUrl.searchParams.set('utm_campaign', campaign.slug);
    targetUrl.searchParams.set('utm_content', `user-${affiliateLink.user_id}`);
    
    // Add affiliate tracking parameters
    targetUrl.searchParams.set('affiliate_id', affiliateLink.user_id.toString());
    targetUrl.searchParams.set('tracking_code', code);
    targetUrl.searchParams.set('click_id', clickRecord._id.toString());
    
    // Preserve original UTM parameters if they exist
    const originalUtmSource = url.searchParams.get('utm_source');
    const originalUtmMedium = url.searchParams.get('utm_medium');
    const originalUtmCampaign = url.searchParams.get('utm_campaign');
    const originalUtmTerm = url.searchParams.get('utm_term');
    const originalUtmContent = url.searchParams.get('utm_content');
    
    if (originalUtmSource) targetUrl.searchParams.set('original_utm_source', originalUtmSource);
    if (originalUtmMedium) targetUrl.searchParams.set('original_utm_medium', originalUtmMedium);
    if (originalUtmCampaign) targetUrl.searchParams.set('original_utm_campaign', originalUtmCampaign);
    if (originalUtmTerm) targetUrl.searchParams.set('original_utm_term', originalUtmTerm);
    if (originalUtmContent) targetUrl.searchParams.set('original_utm_content', originalUtmContent);

    // Add timestamp for tracking
    targetUrl.searchParams.set('click_timestamp', now.getTime().toString());

    // Network-specific parameters
    if (campaign.affiliate_network === 'CJ Affiliate') {
      if (campaign.cj_publisher_id) targetUrl.searchParams.set('pid', campaign.cj_publisher_id);
      if (campaign.cj_site_id) targetUrl.searchParams.set('site_id', campaign.cj_site_id);
      if (campaign.cj_advertiser_id) targetUrl.searchParams.set('aid', campaign.cj_advertiser_id);
    }

    // Amazon Associates parameters
    if (campaign.affiliate_network === 'Amazon Associates') {
      const amazonTag = campaign.cj_advertiser_id || campaign.cj_publisher_id;
      if (amazonTag && !targetUrl.searchParams.has('tag')) {
        targetUrl.searchParams.set('tag', amazonTag);
      }
    }

    // ShareASale parameters
    if (campaign.affiliate_network === 'ShareASale') {
      if (campaign.cj_publisher_id) targetUrl.searchParams.set('afftrack', campaign.cj_publisher_id);
    }

    console.log(`Tracking click: ${code} for user ${affiliateLink.user_id} -> ${targetUrl.toString()}`);

    // Perform redirect with 302 status (temporary redirect)
    return NextResponse.redirect(targetUrl.toString(), 302);

  } catch (error) {
    console.error('Error tracking click:', error);
    
    // Log the error for debugging
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Tracking error details: ${errorMessage}`);
    
    // Fallback redirect to home page with error parameter
    const fallbackUrl = new URL('/', request.url);
    fallbackUrl.searchParams.set('tracking_error', 'true');
    
    return NextResponse.redirect(fallbackUrl.toString());
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    // FIX: Await params before destructuring
    const { code } = await params;
    
    await connectToDatabase();

    const body = await request.json();
    
    // Extract conversion data
    const { 
      conversion_id, 
      sale_amount, 
      commission_amount, 
      conversion_date,
      additional_data 
    } = body;

    // Find the affiliate link
    const affiliateLink = await UserAffiliateLink.findOne({ 
      tracking_code: code,
      is_active: true 
    });

    if (!affiliateLink) {
      return NextResponse.json({ success: false, message: 'Invalid tracking code' }, { status: 404 });
    }

    // Handle conversion tracking
    if (conversion_id) {
      // Update the click status to indicate conversion
      await ClickTracking.findOneAndUpdate(
        { 
          tracking_code: code, 
          status: 'pending',
          user_id: affiliateLink.user_id.toString()
        },
        {
          status: 'converted',
          converted_at: conversion_date ? new Date(conversion_date) : new Date(),
          conversion_id: conversion_id,
          $set: {
            'metadata.conversion_data': {
              sale_amount,
              commission_amount,
              conversion_date: conversion_date || new Date(),
              additional_data
            }
          }
        }
      );

      // Update affiliate link conversion stats
      await UserAffiliateLink.findByIdAndUpdate(affiliateLink._id, {
        $inc: { 
          total_conversions: 1,
          total_commission_earned: commission_amount || 0,
          total_sales_amount: sale_amount || 0
        },
        last_conversion_at: new Date()
      });

      console.log(`Conversion recorded for tracking code: ${code}, amount: ${commission_amount}`);
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Conversion data processed successfully',
      tracking_code: code 
    });

  } catch (error) {
    console.error('Error processing conversion POST:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Failed to process conversion data' 
    }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    // FIX: Await params before destructuring
    const { code } = await params;
    
    await connectToDatabase();

    const body = await request.json();
    const { status, conversion_id, metadata } = body;

    // Find the affiliate link
    const affiliateLink = await UserAffiliateLink.findOne({ 
      tracking_code: code 
    });

    if (!affiliateLink) {
      return NextResponse.json({ success: false, message: 'Invalid tracking code' }, { status: 404 });
    }

    // Update click status
    const updateData: any = {};
    if (status) updateData.status = status;
    if (conversion_id) updateData.conversion_id = conversion_id;
    if (status === 'converted') updateData.converted_at = new Date();
    if (metadata) updateData.$set = { 'metadata.additional': metadata };

    await ClickTracking.findOneAndUpdate(
      { 
        tracking_code: code,
        user_id: affiliateLink.user_id.toString()
      },
      updateData
    );

    return NextResponse.json({ 
      success: true, 
      message: 'Click status updated successfully',
      tracking_code: code 
    });

  } catch (error) {
    console.error('Error updating click status:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Failed to update click status' 
    }, { status: 500 });
  }
}
