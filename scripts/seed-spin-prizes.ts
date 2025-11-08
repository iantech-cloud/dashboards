// scripts/seed-spin-prizes.ts
// Run this script once to initialize the spin prizes in the database
// Usage: npx ts-node scripts/seed-spin-prizes.ts

import { connectToDatabase, SpinPrize } from '../app/lib/models';

async function seedSpinPrizes() {
  try {
    await connectToDatabase();
    
    console.log('🎯 Seeding spin prizes...');

    // Clear existing prizes
    await SpinPrize.deleteMany({});
    console.log('✅ Cleared existing prizes');

    // Define all prizes with proper configuration
    const prizes = [
      {
        type: 'EXTRA_SPIN_VOUCHER',
        name: 'Extra Spin Voucher',
        display_name: '5 Extra Spins',
        description: 'Get 5 additional spins to use',
        icon: '🎟️',
        base_probability: 20,
        accessible_tiers: ['starter', 'bronze', 'silver', 'gold', 'diamond'],
        min_referrals: 0,
        requires_activation: true,
        value_cents: 500, // 5 spins = KES 5
        value_description: '5 extra spins',
        credit_type: 'spins',
        duration_days: 0,
        is_active: true,
        is_featured: false,
        wheel_order: 1,
        color: '#FF6B6B',
        created_by: 'system'
      },
      {
        type: 'BONUS_CREDIT',
        name: 'Bonus Credit',
        display_name: 'KES 100 Bonus',
        description: 'Get KES 100 credited to your account',
        icon: '💰',
        base_probability: 15,
        accessible_tiers: ['starter', 'bronze', 'silver', 'gold', 'diamond'],
        min_referrals: 0,
        requires_activation: true,
        value_cents: 10000, // KES 100
        value_description: 'KES 100',
        credit_type: 'balance',
        duration_days: 0,
        is_active: true,
        is_featured: true,
        wheel_order: 2,
        color: '#4ECDC4',
        created_by: 'system'
      },
      {
        type: 'REFERRAL_BOOST',
        name: '20% Referral Boost',
        display_name: '20% Referral Boost',
        description: 'Get 20% more on next 5 referral rewards',
        icon: '🧭',
        base_probability: 10,
        accessible_tiers: ['bronze', 'silver', 'gold', 'diamond'],
        min_referrals: 3,
        requires_activation: true,
        value_cents: 0,
        value_description: '20% boost for 5 referrals',
        credit_type: 'boost',
        duration_days: 7,
        is_active: true,
        is_featured: false,
        wheel_order: 3,
        color: '#96CEB4',
        created_by: 'system'
      },
      {
        type: 'TRAINING_COURSE',
        name: 'Free Training Course',
        display_name: 'Free Training',
        description: 'Access to premium training course',
        icon: '🧠',
        base_probability: 10,
        accessible_tiers: ['starter', 'bronze', 'silver', 'gold', 'diamond'],
        min_referrals: 0,
        requires_activation: true,
        value_cents: 50000, // KES 500 value
        value_description: 'Premium training access',
        credit_type: 'voucher',
        duration_days: 30,
        is_active: true,
        is_featured: false,
        wheel_order: 4,
        color: '#FFEAA7',
        created_by: 'system'
      },
      {
        type: 'AIRTIME',
        name: 'Free Airtime',
        display_name: 'KES 50 Airtime',
        description: 'Get KES 50 airtime credit',
        icon: '📱',
        base_probability: 10,
        accessible_tiers: ['silver', 'gold', 'diamond'],
        min_referrals: 5,
        requires_activation: true,
        value_cents: 5000, // KES 50
        value_description: 'KES 50 airtime',
        credit_type: 'airtime',
        duration_days: 0,
        is_active: true,
        is_featured: true,
        wheel_order: 5,
        color: '#45B7D1',
        created_by: 'system'
      },
      {
        type: 'LEADERSHIP_TOKEN',
        name: 'Leadership Token',
        display_name: 'Leadership Token',
        description: 'Exclusive leadership program access',
        icon: '💼',
        base_probability: 5,
        accessible_tiers: ['gold', 'diamond'],
        min_referrals: 50,
        requires_activation: true,
        value_cents: 100000, // KES 1000 value
        value_description: 'Leadership access',
        credit_type: 'badge',
        duration_days: 0,
        is_active: true,
        is_featured: true,
        wheel_order: 6,
        color: '#DDA0DD',
        created_by: 'system'
      },
      {
        type: 'SURVEY_PRIORITY',
        name: 'Survey Priority',
        display_name: 'Survey Priority',
        description: 'Get priority access to high-paying surveys',
        icon: '🧾',
        base_probability: 5,
        accessible_tiers: ['silver', 'gold', 'diamond'],
        min_referrals: 15,
        requires_activation: true,
        value_cents: 0,
        value_description: 'Priority survey access',
        credit_type: 'feature',
        duration_days: 30,
        is_active: true,
        is_featured: false,
        wheel_order: 7,
        color: '#98D8C8',
        created_by: 'system'
      },
      {
        type: 'MYSTERY_BOX',
        name: 'Mystery Box',
        display_name: 'Mystery Box',
        description: 'Random surprise gift worth up to KES 50',
        icon: '🎲',
        base_probability: 10,
        accessible_tiers: ['starter', 'bronze', 'silver', 'gold', 'diamond'],
        min_referrals: 0,
        requires_activation: true,
        value_cents: 2500, // KES 25 average
        value_description: 'Random gift',
        credit_type: 'balance',
        duration_days: 0,
        is_active: true,
        is_featured: false,
        wheel_order: 8,
        color: '#F7DC6F',
        created_by: 'system'
      },
      {
        type: 'COMMISSION_BOOST',
        name: 'Commission Boost',
        display_name: '15% Commission Boost',
        description: 'Get 15% commission boost for 7 days',
        icon: '💎',
        base_probability: 3,
        accessible_tiers: ['gold', 'diamond'],
        min_referrals: 50,
        requires_activation: true,
        value_cents: 0,
        value_description: '15% boost for 7 days',
        credit_type: 'boost',
        duration_days: 7,
        is_active: true,
        is_featured: true,
        wheel_order: 9,
        color: '#BB8FCE',
        created_by: 'system'
      },
      {
        type: 'TOP_AFFILIATE_BADGE',
        name: 'Top Affiliate Badge',
        display_name: 'Top Affiliate Badge',
        description: 'Exclusive recognition for top performers',
        icon: '👑',
        base_probability: 2,
        accessible_tiers: ['diamond'],
        min_referrals: 100,
        requires_activation: true,
        value_cents: 0,
        value_description: 'Elite status',
        credit_type: 'badge',
        duration_days: 0,
        is_active: true,
        is_featured: true,
        wheel_order: 10,
        color: '#E8DAEF',
        created_by: 'system'
      },
      {
        type: 'TRY_AGAIN',
        name: 'Try Again',
        display_name: 'Try Again',
        description: 'Better luck next time!',
        icon: '❌',
        base_probability: 10,
        accessible_tiers: ['starter', 'bronze', 'silver', 'gold', 'diamond'],
        min_referrals: 0,
        requires_activation: true,
        value_cents: 0,
        value_description: 'No prize',
        credit_type: 'balance', // FIXED: Changed from 'none' to 'balance'
        duration_days: 0,
        is_active: true,
        is_featured: false,
        wheel_order: 11,
        color: '#CCCCCC',
        created_by: 'system'
      },
      {
        type: 'AD_SLOT',
        name: 'Ad Slot',
        display_name: 'Watch Ad & Earn',
        description: 'Watch a short ad and earn KES 10',
        icon: '📺',
        base_probability: 5,
        accessible_tiers: ['silver', 'gold', 'diamond'],
        min_referrals: 50,
        requires_activation: true,
        value_cents: 1000, // KES 10
        value_description: 'KES 10 for watching ad',
        credit_type: 'balance',
        duration_days: 0,
        is_active: true,
        is_featured: false,
        is_ad_slot: true,
        wheel_order: 12,
        color: '#FFD93D',
        created_by: 'system'
      }
    ];

    // Insert prizes
    await SpinPrize.insertMany(prizes);
    console.log(`✅ Inserted ${prizes.length} prizes`);

    // Verify probabilities sum to 100%
    const totalProbability = prizes.reduce((sum, p) => sum + p.base_probability, 0);
    console.log(`📊 Total probability: ${totalProbability}%`);

    console.log('🎉 Spin prizes seeded successfully!');
    
    return { success: true, count: prizes.length };
  } catch (error) {
    console.error('❌ Error seeding prizes:', error);
    throw error;
  }
}

// Run if executed directly
if (require.main === module) {
  seedSpinPrizes()
    .then(() => {
      console.log('✅ Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Failed:', error);
      process.exit(1);
    });
}

export default seedSpinPrizes;
