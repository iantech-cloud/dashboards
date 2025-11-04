export interface SokoStats {
  totalClicks: number;
  totalConversions: number;
  totalEarnings: number;
  pendingCommission: number;
  approvedCommission: number;
  paidCommission: number;
  conversionRate: number;
  averageSaleValue: number;
  activeCampaigns: number;
  totalCampaigns: number;
}

export interface Campaign {
  _id: string;
  name: string;
  slug: string;
  description: string;
  short_description: string;
  featured_image: string;
  campaign_type: string;
  commission_rate: number;
  commission_fixed_amount: number;
  commission_type: string;
  product_category: string;
  status: string;
  start_date: string;
  end_date?: string;
  is_featured: boolean;
  product_price?: number;
  currency?: string;
  terms_and_conditions?: string;
  gallery_images?: string[];
  product_count: number;
}

export interface CampaignDetails extends Campaign {
  meta_title?: string;
  meta_description?: string;
  tags?: string[];
}

export interface UserAffiliateLink {
  _id: string;
  campaign_id: string;
  campaign_name: string;
  tracking_code: string;
  short_slug?: string;
  full_tracking_url: string;
  short_tracking_url?: string;
  total_clicks: number;
  total_conversions: number;
  total_commission_earned: number;
  conversion_rate: number;
  is_active: boolean;
  product_id?: string;
  product_title?: string;
  product_image?: string;
}

export interface PerformanceData {
  clicks: Array<{
    date: string;
    count: number;
  }>;
  conversions: Array<{
    date: string;
    count: number;
    amount: number;
  }>;
  topCampaigns: Array<{
    campaign_name: string;
    clicks: number;
    conversions: number;
    earnings: number;
  }>;
}

export interface Payout {
  _id: string;
  amount: number;
  status: string;
  payout_method: string;
  requested_at: string;
  processed_at?: string;
  completed_at?: string;
  conversion_count: number;
}

export interface Product {
  _id: string;
  product_id: string;
  title: string;
  description: string;
  category_name: string;
  price_usd: number;
  price_kes: number;
  image_url: string;
  size?: string;
  condition?: string;
  availability?: string;
  manufacturer?: string;
  is_featured: boolean;
}

export interface ProductDetails extends Product {
  google_product_category?: string;
  additional_images?: string[];
  mpn?: string;
  gtin?: string;
  shipping?: string;
  delivery_time?: string;
  deep_link: string;
  campaign_id?: string;
}
