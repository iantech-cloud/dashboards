'use server';

import { auth } from '@/auth';
import { connectToDatabase } from '@/app/lib/mongoose';
import { 
  SokoCampaign, 
  UserAffiliateLink, 
  ClickTracking, 
  AffiliateConversion,
  AffiliatePayout,
  AffiliateNotification,
  AlibabaProduct,
  CSVImportLog
} from '@/app/lib/models/Soko';
import { Profile, Transaction, AdminAuditLog } from '@/app/lib/models';
import crypto from 'crypto';

// ============================================================================
// HELPER FUNCTION - Check Admin Access
// ============================================================================

async function checkAdminAccess() {
  const session = await auth(); 
  
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
// CSV FIELD MAPPING HELPER - UPDATED FOR YOUR CSV FORMAT
// ============================================================================

function normalizeCSVHeader(header: string): string {
  // Remove BOM character and normalize
  return header.replace(/^\uFEFF/, '').toLowerCase().trim().replace(/[^a-z0-9]/g, '_');
}

function mapCSVHeaders(headers: string[]): Map<string, number> {
  const fieldMap = new Map<string, number>();
  
  // Updated field variations to match your CSV columns exactly
  const fieldVariations: { [key: string]: string[] } = {
    'category_name': ['category_name', 'category', 'categoryname', 'product_category'],
    'id': ['id', 'product_id', 'productid', 'item_id'],
    'title': ['title', 'product_title', 'name', 'product_name', 'producttitle'],
    'description': ['description', 'product_description', 'desc', 'productdescription'],
    'price_usd': ['price', 'price_usd', 'priceusd', 'price_in_usd', 'usd_price'],
    'image_url': ['image_url', 'imageurl', 'image', 'product_image', 'img_url'],
    'size': ['size', 'product_size', 'dimensions'],
    'google_product_category': ['google_product_category', 'googleproductcategory', 'google_category'],
    'condition': ['condition', 'product_condition', 'item_condition'],
    'availability': ['availability', 'stock', 'in_stock', 'available'],
    'mpn': ['mpn', 'manufacturer_part_number', 'part_number'],
    'shipping': ['shipping', 'shipping_cost', 'shipping_info'],
    'language': ['language', 'lang', 'languange'],
    'delivery_time': ['delivery_time', 'deliverytime', 'delivery', 'shipping_time'],
    'manufacturer': ['manufacturer', 'brand', 'maker'],
    'gtin': ['gtin', 'ean', 'upc', 'barcode'],
    'deep_link': ['deep_link', 'deeplink', 'product_link', 'url', 'link', 'product_url']
  };
  
  headers.forEach((header, index) => {
    const normalized = normalizeCSVHeader(header);
    
    // Find which field this header matches
    let matched = false;
    for (const [fieldName, variations] of Object.entries(fieldVariations)) {
      if (variations.includes(normalized)) {
        fieldMap.set(fieldName, index);
        matched = true;
        break;
      }
    }
    
    // If no match found, try direct comparison with common variations
    if (!matched) {
      if (normalized.includes('price')) {
        fieldMap.set('price_usd', index);
      } else if (normalized.includes('shipping')) {
        fieldMap.set('shipping', index);
      } else if (normalized.includes('delivery')) {
        fieldMap.set('delivery_time', index);
      } else if (normalized.includes('manufacturer')) {
        fieldMap.set('manufacturer', index);
      }
    }
  });
  
  return fieldMap;
}

// ============================================================================
// IMPROVED CSV PARSING FUNCTION
// ============================================================================

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  let quoteChar = '';
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if ((char === '"' || char === "'") && !inQuotes) {
      inQuotes = true;
      quoteChar = char;
    } else if (char === quoteChar && inQuotes) {
      if (nextChar === quoteChar) {
        // Escaped quote
        current += char;
        i++; // Skip next quote
      } else {
        // End of quoted field
        inQuotes = false;
        quoteChar = '';
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  // Add the last field
  result.push(current);
  
  return result.map(field => field.trim());
}

// ============================================================================
// PROCESS CSV ROW - UPDATED FOR YOUR CSV DATA
// ============================================================================

function processCSVRow(row: string[], fieldMap: Map<string, number>, uploadedBy: string, campaignId?: string): any {
  const getValue = (field: string): string => {
    const index = fieldMap.get(field);
    return index !== undefined && index < row.length ? (row[index]?.trim() || '') : '';
  };
  
  const getNumberValue = (field: string, defaultValue: number = 0): number => {
    const value = getValue(field);
    if (!value) return defaultValue;
    
    // Handle currency values like "0.5 USD", "339 USD", etc.
    const numericValue = value.replace(/[^0-9.-]/g, '');
    const parsed = parseFloat(numericValue);
    return isNaN(parsed) ? defaultValue : parsed;
  };
  
  // Extract values
  const productId = getValue('id');
  const title = getValue('title');
  const description = getValue('description');
  const priceUsd = getNumberValue('price_usd');
  const deepLink = getValue('deep_link');
  
  // Validate required fields
  if (!productId || !title || !deepLink) {
    throw new Error(`Missing required fields: ${!productId ? 'ID' : ''} ${!title ? 'Title' : ''} ${!deepLink ? 'Deep Link' : ''}`);
  }
  
  // Handle scientific notation in ID (1E+13)
  let finalProductId = productId;
  if (productId.includes('E+') || productId === '1E+13') {
    // Convert scientific notation to actual number - extract from deep_link if possible
    const match = deepLink.match(/productId=(\d+)/);
    if (match && match[1]) {
      finalProductId = match[1];
    } else {
      finalProductId = '10000000000000';
    }
  }
  
  // Map condition value
  const conditionRaw = getValue('condition').toLowerCase();
  let condition = 'new';
  if (conditionRaw.includes('refurb')) condition = 'refurbished';
  else if (conditionRaw.includes('used')) condition = 'used';
  
  // Map availability value
  const availabilityRaw = getValue('availability').toLowerCase();
  let availability = 'in_stock';
  if (availabilityRaw.includes('out')) availability = 'out_of_stock';
  else if (availabilityRaw.includes('preorder')) availability = 'preorder';
  else if (availabilityRaw.includes('backorder')) availability = 'backorder';
  
  // Extract shipping cost
  const shippingRaw = getValue('shipping');
  const shippingCost = shippingRaw ? parseFloat(shippingRaw.replace(/[^0-9.-]/g, '')) || 0 : 0;
  
  return {
    product_id: finalProductId,
    title: title.substring(0, 500),
    description: description || 'Alibaba.com 5M+ hot-selling Products',
    category_name: getValue('category_name').substring(0, 200),
    google_product_category: getValue('google_product_category').substring(0, 200),
    price_usd: priceUsd,
    price_kes: Math.round(priceUsd * 130 * 100) / 100, // Auto-convert to KES
    image_url: getValue('image_url'),
    size: getValue('size').substring(0, 100),
    condition: condition,
    availability: availability,
    mpn: getValue('mpn').substring(0, 100),
    gtin: getValue('gtin').substring(0, 100),
    manufacturer: getValue('manufacturer').substring(0, 200),
    shipping: shippingCost,
    delivery_time: getValue('delivery_time').substring(0, 100),
    deep_link: deepLink,
    language: getValue('language') || 'en',
    campaign_id: campaignId,
    uploaded_by: uploadedBy,
    is_active: true,
    total_clicks: 0,
    total_conversions: 0
  };
}

// ============================================================================
// UPLOAD AND PROCESS CSV (UPDATED WITH BETTER ERROR HANDLING)
// ============================================================================

export async function uploadAndProcessCSV(data: {
  csvContent: string;
  filename: string;
  campaignId?: string;
  batchSize?: number;
}) {
  try {
    const { authorized, userId } = await checkAdminAccess();
    if (!authorized) {
      return { success: false, message: 'Unauthorized' };
    }

    await connectToDatabase();

    // Generate batch ID
    const batchId = `BATCH-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

    // Parse CSV content - handle different line endings
    const lines = data.csvContent.split(/\r\n|\n|\r/).filter(line => line.trim());
    if (lines.length < 2) {
      return { success: false, message: 'CSV file is empty or invalid' };
    }

    // Parse headers - handle BOM character
    const headers = parseCSVLine(lines[0]);
    const fieldMap = mapCSVHeaders(headers);

    // Validate that we have the required fields
    const missingFields = [];
    if (!fieldMap.has('id')) missingFields.push('id');
    if (!fieldMap.has('title')) missingFields.push('title');
    if (!fieldMap.has('deep_link')) missingFields.push('deep_link');
    
    if (missingFields.length > 0) {
      return { 
        success: false, 
        message: `CSV missing required columns: ${missingFields.join(', ')}. Found columns: ${headers.join(', ')}` 
      };
    }

    // Create import log
    const importLog = new CSVImportLog({
      batch_id: batchId,
      filename: data.filename,
      uploaded_by: userId,
      total_rows: lines.length - 1,
      processed_rows: 0,
      successful_imports: 0,
      failed_imports: 0,
      skipped_rows: 0,
      status: 'processing',
      started_at: new Date(),
      campaign_id: data.campaignId,
      errorMessage: []
    });

    await importLog.save();

    // Process rows in batches
    const batchSize = data.batchSize || 20;
    const totalRows = lines.length - 1;
    let processedCount = 0;
    let successCount = 0;
    let failedCount = 0;
    let skippedCount = 0;
    const errorMessage: any[] = [];

    for (let i = 1; i < lines.length; i += batchSize) {
      const batch = lines.slice(i, Math.min(i + batchSize, lines.length));
      const batchPromises = [];
      
      for (let j = 0; j < batch.length; j++) {
        const rowIndex = i + j;
        const line = batch[j];
        
        try {
          // Parse CSV row using improved parser
          const row = parseCSVLine(line);

          if (row.length === 0 || (row.length === 1 && row[0] === '')) {
            skippedCount++;
            continue;
          }

          // Process row data
          const productData = processCSVRow(row, fieldMap, userId!, data.campaignId);

          // Use upsert to handle existing products more efficiently
          const upsertPromise = AlibabaProduct.findOneAndUpdate(
            { product_id: productData.product_id },
            { 
              ...productData,
              import_batch_id: batchId,
              imported_at: new Date()
            },
            { 
              upsert: true, 
              new: true,
              setDefaultsOnInsert: true 
            }
          ).exec();

          batchPromises.push(upsertPromise.then(() => {
            successCount++;
            processedCount++;
          }).catch(error => {
            failedCount++;
            errorMessage.push({
              row: rowIndex,
              error: error.message,
              data: line.substring(0, 200)
            });
          }));

        } catch (error: any) {
          failedCount++;
          errorMessage.push({
            row: rowIndex,
            error: error.message,
            data: line.substring(0, 200)
          });
        }
      }

      // Wait for current batch to complete
      try {
        await Promise.all(batchPromises);
        
        // Update progress after each batch
        await CSVImportLog.findByIdAndUpdate(importLog._id, {
          processed_rows: processedCount,
          successful_imports: successCount,
          failed_imports: failedCount,
          skipped_rows: skippedCount,
          errorMessage: errorMessage.slice(0, 50)
        });
      } catch (batchError) {
        console.error('Batch processing error:', batchError);
      }

      // Small delay between batches to prevent overload
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    // Final update
    importLog.processed_rows = processedCount;
    importLog.successful_imports = successCount;
    importLog.failed_imports = failedCount;
    importLog.skipped_rows = skippedCount;
    importLog.status = failedCount === totalRows ? 'failed' : successCount > 0 ? 'completed' : 'failed';
    importLog.completed_at = new Date();
    importLog.errorMessage = errorMessage.slice(0, 50);
    await importLog.save();

    // Update campaign product count if campaign specified
    if (data.campaignId) {
      const productCount = await AlibabaProduct.countDocuments({ 
        campaign_id: data.campaignId,
        is_active: true 
      });
      await SokoCampaign.findByIdAndUpdate(data.campaignId, { product_count: productCount });
    }

    // Create audit log
    await AdminAuditLog.create({
      actor_id: userId,
      action: 'CSV_IMPORT',
      target_type: 'product',
      target_id: batchId,
      resource_type: 'product',
      resource_id: batchId,
      action_type: 'csv_import',
      changes: {
        filename: data.filename,
        total_rows: totalRows,
        successful: successCount,
        failed: failedCount,
        batch_id: batchId
      }
    });

    return {
      success: true,
      data: {
        batch_id: batchId,
        total_rows: totalRows,
        processed: processedCount,
        successful: successCount,
        failed: failedCount,
        skipped: skippedCount,
        errorMessage: errorMessage.slice(0, 10)
      },
      message: `Import completed: ${successCount} products processed successfully, ${failedCount} failed`
    };

  } catch (error: any) {
    console.error('Error processing CSV:', error);
    return { 
      success: false, 
      message: error.message || 'Failed to process CSV'
    };
  }
}

// ============================================================================
// GET IMPORT LOGS
// ============================================================================

export async function getImportLogs(limit: number = 20) {
  try {
    const { authorized } = await checkAdminAccess();
    if (!authorized) {
      return { success: false, message: 'Unauthorized' };
    }

    await connectToDatabase();

    const logs = await CSVImportLog.find()
      .sort({ created_at: -1 })
      .limit(limit)
      .populate('campaign_id', 'name');

    return {
      success: true,
      data: logs.map(log => ({
        _id: log._id.toString(),
        batch_id: log.batch_id,
        filename: log.filename,
        campaign_name: log.campaign_id ? (log.campaign_id as any).name : 'N/A',
        total_rows: log.total_rows,
        processed_rows: log.processed_rows,
        successful_imports: log.successful_imports,
        failed_imports: log.failed_imports,
        status: log.status,
        created_at: log.created_at,
        completed_at: log.completed_at
      }))
    };
  } catch (error: any) {
    console.error('Error getting import logs:', error);
    return { success: false, message: 'Failed to get import logs' };
  }
}

// ============================================================================
// GET IMPORT LOG DETAILS
// ============================================================================

export async function getImportLogDetails(batchId: string) {
  try {
    const { authorized } = await checkAdminAccess();
    if (!authorized) {
      return { success: false, message: 'Unauthorized' };
    }

    await connectToDatabase();

    const log = await CSVImportLog.findOne({ batch_id: batchId })
      .populate('campaign_id', 'name');

    if (!log) {
      return { success: false, message: 'Import log not found' };
    }

    return {
      success: true,
      data: {
        _id: log._id.toString(),
        batch_id: log.batch_id,
        filename: log.filename,
        campaign_name: log.campaign_id ? (log.campaign_id as any).name : 'N/A',
        total_rows: log.total_rows,
        processed_rows: log.processed_rows,
        successful_imports: log.successful_imports,
        failed_imports: log.failed_imports,
        skipped_rows: log.skipped_rows,
        status: log.status,
        started_at: log.started_at,
        completed_at: log.completed_at,
        errorMessage: log.errorMessage,
        notes: log.notes
      }
    };
  } catch (error: any) {
    console.error('Error getting import log details:', error);
    return { success: false, message: 'Failed to get import details' };
  }
}

// ============================================================================
// GET ALIBABA PRODUCTS
// ============================================================================

export async function getAlibabaProducts(filters?: {
  campaign_id?: string;
  category?: string;
  is_active?: boolean;
  is_featured?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}) {
  try {
    const { authorized } = await checkAdminAccess();
    if (!authorized) {
      return { success: false, message: 'Unauthorized' };
    }

    await connectToDatabase();

    const query: any = {};
    
    if (filters?.campaign_id) query.campaign_id = filters.campaign_id;
    if (filters?.category) query.category_name = new RegExp(filters.category, 'i');
    if (filters?.is_active !== undefined) query.is_active = filters.is_active;
    if (filters?.is_featured !== undefined) query.is_featured = filters.is_featured;
    if (filters?.search) {
      query.$or = [
        { title: new RegExp(filters.search, 'i') },
        { product_id: new RegExp(filters.search, 'i') },
        { description: new RegExp(filters.search, 'i') }
      ];
    }

    const page = filters?.page || 1;
    const limit = filters?.limit || 50;
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
          title: p.title,
          category_name: p.category_name,
          price_usd: p.price_usd,
          price_kes: p.price_kes,
          image_url: p.image_url,
          is_active: p.is_active,
          is_featured: p.is_featured,
          total_clicks: p.total_clicks,
          total_conversions: p.total_conversions,
          created_at: p.created_at
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
    console.error('Error getting Alibaba products:', error);
    return { success: false, message: 'Failed to get products' };
  }
}

// ============================================================================
// UPDATE PRODUCT
// ============================================================================

export async function updateAlibabaProduct(productId: string, data: any) {
  try {
    const { authorized, userId } = await checkAdminAccess();
    if (!authorized) {
      return { success: false, message: 'Unauthorized' };
    }

    await connectToDatabase();

    const product = await AlibabaProduct.findById(productId);
    if (!product) {
      return { success: false, message: 'Product not found' };
    }

    // Update product
    Object.assign(product, data);
    await product.save();

    // Create audit log
    await AdminAuditLog.create({
      actor_id: userId,
      action: 'PRODUCT_UPDATE',
      target_type: 'product',
      target_id: productId,
      resource_type: 'product',
      resource_id: productId,
      action_type: 'product_update',
      changes: data
    });

    return {
      success: true,
      message: 'Product updated successfully'
    };
  } catch (error: any) {
    console.error('Error updating product:', error);
    return { success: false, message: 'Failed to update product' };
  }
}

// ============================================================================
// DELETE PRODUCT
// ============================================================================

export async function deleteAlibabaProduct(productId: string) {
  try {
    const { authorized, userId } = await checkAdminAccess();
    if (!authorized) {
      return { success: false, message: 'Unauthorized' };
    }

    await connectToDatabase();

    const product = await AlibabaProduct.findById(productId);
    if (!product) {
      return { success: false, message: 'Product not found' };
    }

    await AlibabaProduct.findByIdAndDelete(productId);

    // Update campaign product count
    if (product.campaign_id) {
      const productCount = await AlibabaProduct.countDocuments({ 
        campaign_id: product.campaign_id,
        is_active: true 
      });
      await SokoCampaign.findByIdAndUpdate(product.campaign_id, { product_count: productCount });
    }

    // Create audit log
    await AdminAuditLog.create({
      actor_id: userId,
      action: 'PRODUCT_DELETE',
      target_type: 'product',
      target_id: productId,
      resource_type: 'product',
      resource_id: productId,
      action_type: 'product_delete',
      changes: { deleted_product: product.toObject() }
    });

    return {
      success: true,
      message: 'Product deleted successfully'
    };
  } catch (error: any) {
    console.error('Error deleting product:', error);
    return { success: false, message: 'Failed to delete product' };
  }
}

// ============================================================================
// ADMIN STATS FUNCTIONS
// ============================================================================

export async function getSokoAdminStats() {
  try {
    const { authorized } = await checkAdminAccess();
    if (!authorized) {
      return { success: false, message: 'Unauthorized' };
    }

    await connectToDatabase();

    const totalCampaigns = await SokoCampaign.countDocuments();
    const activeCampaigns = await SokoCampaign.countDocuments({ status: 'active' });
    const totalProducts = await AlibabaProduct.countDocuments({ is_active: true });
    const totalAffiliates = (await UserAffiliateLink.distinct('user_id')).length;
    const totalClicks = await ClickTracking.countDocuments();
    const totalConversions = await AffiliateConversion.countDocuments();
    const conversionRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;

    const conversions = await AffiliateConversion.find();
    const totalRevenue = conversions.reduce((sum, c) => sum + c.sale_amount, 0);
    const pendingCommissions = conversions.filter(c => c.status === 'pending').reduce((sum, c) => sum + c.commission_amount, 0);
    const approvedCommissions = conversions.filter(c => c.status === 'approved').reduce((sum, c) => sum + c.commission_amount, 0);
    const paidCommissions = conversions.filter(c => c.status === 'paid').reduce((sum, c) => sum + c.commission_amount, 0);
    const pendingPayouts = await AffiliatePayout.countDocuments({ status: 'pending' });

    return {
      success: true,
      data: {
        totalCampaigns,
        activeCampaigns,
        totalProducts,
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
        product_count: c.product_count || 0,
        created_at: c.created_at,
        is_featured: c.is_featured
      }))
    };
  } catch (error: any) {
    console.error('Error getting campaigns:', error);
    return { success: false, message: error.message || 'Failed to get campaigns' };
  }
}

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
        product_count: campaign.product_count || 0,
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
        created_at: campaign.created_at,
        updated_at: campaign.updated_at
      }
    };
  } catch (error: any) {
    console.error('Error getting campaign:', error);
    return { success: false, message: error.message || 'Failed to get campaign' };
  }
}

export async function createCampaign(data: any) {
  try {
    const { authorized, userId } = await checkAdminAccess();
    if (!authorized) {
      return { success: false, message: 'Unauthorized' };
    }

    await connectToDatabase();

    const slug = data.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const existingCampaign = await SokoCampaign.findOne({ slug });
    if (existingCampaign) {
      return { success: false, message: 'Campaign with this name already exists' };
    }

    const campaign = new SokoCampaign({
      ...data,
      slug,
      created_by: userId,
      total_clicks: 0,
      total_conversions: 0,
      total_sales_amount: 0,
      total_commission_paid: 0,
      conversion_rate: 0,
      current_participants: 0,
      product_count: 0
    });

    await campaign.save();

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
    Object.assign(campaign, data);
    campaign.updated_by = userId;
    await campaign.save();

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

    const conversionsWithUsers = await Promise.all(
      conversions.map(async (conversion) => {
        const user = await Profile.findById(conversion.user_id);
        return {
          _id: conversion._id.toString(),
          user_id: conversion.user_id,
          username: user?.username || 'Unknown',
          campaign_name: (conversion.campaign_id as any).name,
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

    conversion.status = 'approved';
    conversion.approved_by = userId;
    conversion.approved_at = new Date();
    await conversion.save();

    await UserAffiliateLink.findByIdAndUpdate(conversion.affiliate_link_id, {
      $inc: { 
        total_commission_earned: conversion.commission_amount,
        pending_commission: -conversion.commission_amount
      }
    });

    await AffiliateNotification.create({
      user_id: conversion.user_id,
      type: 'conversion_approved',
      title: 'Conversion Approved',
      message: `Your conversion for order ${conversion.order_id} has been approved. Commission: KES ${conversion.commission_amount.toFixed(2)}`,
      conversion_id: conversionId,
      priority: 'high'
    });

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

    conversion.status = 'rejected';
    conversion.approved_by = userId;
    conversion.approved_at = new Date();
    conversion.rejection_reason = reason;
    await conversion.save();

    await AffiliateNotification.create({
      user_id: conversion.user_id,
      type: 'conversion_rejected',
      title: 'Conversion Rejected',
      message: `Your conversion for order ${conversion.order_id} has been rejected. Reason: ${reason}`,
      conversion_id: conversionId,
      priority: 'high'
    });

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
      payout.status = 'processing';
      payout.processed_by = userId;
      payout.processed_at = new Date();
      payout.admin_notes = notes;
      await payout.save();

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

      payout.transaction_id = transaction._id;
      payout.transaction_code = transaction.transaction_code;
      payout.status = 'completed';
      payout.completed_at = new Date();
      await payout.save();

      await AffiliateConversion.updateMany(
        { _id: { $in: payout.conversion_ids } },
        { status: 'paid', paid_at: new Date() }
      );

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

      await AffiliateNotification.create({
        user_id: payout.user_id,
        type: 'payout_completed',
        title: 'Payout Completed',
        message: `Your payout of KES ${payout.amount.toFixed(2)} has been processed successfully.`,
        payout_id: payoutId,
        priority: 'high'
      });

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
      payout.status = 'failed';
      payout.processed_by = userId;
      payout.processed_at = new Date();
      payout.failure_reason = notes || 'Rejected by admin';
      payout.admin_notes = notes;
      await payout.save();

      await AffiliateConversion.updateMany(
        { _id: { $in: payout.conversion_ids } },
        { $unset: { payout_id: 1 } }
      );

      await AffiliateNotification.create({
        user_id: payout.user_id,
        type: 'payout_processed',
        title: 'Payout Rejected',
        message: `Your payout request has been rejected. ${notes || 'Please contact support for details.'}`,
        payout_id: payoutId,
        priority: 'high'
      });

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

    const dateFilter: any = {};
    if (dateRange) {
      dateFilter.clicked_at = { $gte: dateRange.start, $lte: dateRange.end };
    }

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
          total_commission: campaign.total_commission_paid,
          product_count: campaign.product_count || 0
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

export async function exportSokoReport(reportType: 'campaigns' | 'conversions' | 'payouts' | 'products', filters?: any) {
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
        headers = ['Name', 'Type', 'Status', 'Commission Rate', 'Clicks', 'Conversions', 'Revenue', 'Products'];
        data = campaigns.map(c => [
          c.name,
          c.campaign_type,
          c.status,
          `${c.commission_rate}%`,
          c.total_clicks,
          c.total_conversions,
          `KES ${c.total_sales_amount.toFixed(2)}`,
          c.product_count || 0
        ]);
        break;

      case 'conversions':
        const conversions = await AffiliateConversion.find(filters || {})
          .populate('campaign_id', 'name')
          .populate('user_id', 'username');
        headers = ['Date', 'User', 'Campaign', 'Order ID', 'Sale Amount', 'Commission', 'Status'];
        data = conversions.map(c => [
          new Date(c.conversion_date).toLocaleDateString(),
          (c.user_id as any).username,
          (c.campaign_id as any).name,
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
          (p.user_id as any).username,
          `KES ${p.amount.toFixed(2)}`,
          p.payout_method,
          p.status,
          p.conversion_count
        ]);
        break;

      case 'products':
        const products = await AlibabaProduct.find(filters || {});
        headers = ['Product ID', 'Title', 'Category', 'Price USD', 'Price KES', 'Clicks', 'Conversions', 'Status'];
        data = products.map(p => [
          p.product_id,
          p.title,
          p.category_name,
          `$${p.price_usd.toFixed(2)}`,
          `KES ${p.price_kes.toFixed(2)}`,
          p.total_clicks,
          p.total_conversions,
          p.is_active ? 'Active' : 'Inactive'
        ]);
        break;
    }

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
