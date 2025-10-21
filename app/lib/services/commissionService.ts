import { connectToDatabase, Profile, Referral, DownlineUser, Transaction, ActivationPayment } from '@/app/lib/models';
import { COMMISSION_CONFIG } from '@/app/lib/definitions';

export class CommissionService {
  /**
   * Process referral commissions when a user gets approved
   */
  static async processReferralCommissions(approvedUserId: string) {
    await connectToDatabase();

    try {
      const approvedUser = await Profile.findById(approvedUserId);
      if (!approvedUser) {
        throw new Error('Approved user not found');
      }

      // Check if user paid activation fee
      const activationPayment = await ActivationPayment.findOne({
        user_id: approvedUserId,
        status: 'completed'
      });

      if (!activationPayment) {
        console.log(`User ${approvedUserId} hasn't paid activation fee, skipping commissions`);
        return;
      }

      // Find the direct referrer
      const directReferral = await Referral.findOne({
        referred_id: approvedUserId
      }).populate('referrer_id');

      if (!directReferral) {
        console.log(`No direct referrer found for user ${approvedUserId}`);
        return;
      }

      const directReferrer = directReferral.referrer_id;
      
      // Process direct referral commission (Level 0)
      await this.processDirectReferralCommission(directReferrer, approvedUser);

      // Process downline commissions (Level 1, 2, 3)
      await this.processDownlineCommissions(directReferrer, approvedUser);

      console.log(`Successfully processed commissions for approved user: ${approvedUserId}`);
      
    } catch (error) {
      console.error('Error processing referral commissions:', error);
      throw error;
    }
  }

  /**
   * Process direct referral commission (Level 0 - KSH 800)
   */
  private static async processDirectReferralCommission(
    referrer: any, 
    referredUser: any
  ) {
    // Update referral earning
    await Referral.findOneAndUpdate(
      { referred_id: referredUser._id },
      { earning_cents: COMMISSION_CONFIG.directReferral }
    );

    // Create transaction for referrer
    await Transaction.create({
      user_id: referrer._id,
      amount_cents: COMMISSION_CONFIG.directReferral,
      type: 'REFERRAL',
      description: `Direct referral commission from ${referredUser.username}`,
      status: 'completed',
      metadata: {
        referredUser: referredUser._id,
        level: 0,
        type: 'direct'
      }
    });

    // Update referrer's balance and total earnings
    await Profile.findByIdAndUpdate(referrer._id, {
      $inc: {
        balance_cents: COMMISSION_CONFIG.directReferral,
        total_earnings_cents: COMMISSION_CONFIG.directReferral
      }
    });

    console.log(`Direct referral commission processed: ${referrer.username} earned ${COMMISSION_CONFIG.directReferral/100} KSH`);
  }

  /**
   * Process downline commissions (Level 1-3)
   */
  private static async processDownlineCommissions(
    directReferrer: any,
    newUser: any
  ) {
    // Get upline chain (up to 3 levels)
    const uplineChain = await this.getUplineChain(directReferrer._id, 3);
    
    for (let level = 0; level < uplineChain.length; level++) {
      const uplineUser = uplineChain[level];
      const commissionAmount = this.getCommissionForLevel(level + 1);
      
      if (commissionAmount > 0) {
        await this.processDownlineCommission(uplineUser, newUser, level + 1, commissionAmount);
      }
    }
  }

  /**
   * Process individual downline commission
   */
  private static async processDownlineCommission(
    uplineUser: any,
    newUser: any,
    level: number,
    commissionAmount: number
  ) {
    // Create transaction for upline user
    await Transaction.create({
      user_id: uplineUser._id,
      amount_cents: commissionAmount,
      type: 'REFERRAL',
      description: `Level ${level} downline commission from ${newUser.username}`,
      status: 'completed',
      metadata: {
        referredUser: newUser._id,
        level: level,
        type: 'downline'
      }
    });

    // Update upline user's balance and total earnings
    await Profile.findByIdAndUpdate(uplineUser._id, {
      $inc: {
        balance_cents: commissionAmount,
        total_earnings_cents: commissionAmount
      }
    });

    console.log(`Level ${level} downline commission processed: ${uplineUser.username} earned ${commissionAmount/100} KSH`);
  }

  /**
   * Get upline chain up to specified depth
   */
  private static async getUplineChain(userId: string, maxDepth: number): Promise<any[]> {
    const uplineChain: any[] = [];
    let currentUserId = userId;
    let depth = 0;

    while (depth < maxDepth) {
      const referral = await Referral.findOne({ referred_id: currentUserId })
        .populate('referrer_id');

      if (!referral || !referral.referrer_id) {
        break;
      }

      uplineChain.push(referral.referrer_id);
      currentUserId = referral.referrer_id._id;
      depth++;
    }

    return uplineChain;
  }

  /**
   * Get commission amount for specific level
   */
  private static getCommissionForLevel(level: number): number {
    switch (level) {
      case 1: return COMMISSION_CONFIG.level1; // KSH 100
      case 2: return COMMISSION_CONFIG.level2; // KSH 50
      case 3: return COMMISSION_CONFIG.level3; // KSH 25
      default: return 0;
    }
  }

  /**
   * Build downline structure when a new user is referred
   */
  static async buildDownlineStructure(referredUserId: string, referrerId: string) {
    await connectToDatabase();

    // Create direct downline relationship (Level 1)
    await DownlineUser.create({
      main_user_id: referrerId,
      downline_user_id: referredUserId,
      level: 1
    });

    // Get upline chain for the referrer and create indirect downline relationships
    const uplineChain = await this.getUplineChain(referrerId, 2); // Get up to level 2 upline (for level 3 downline)
    
    for (let levelOffset = 0; levelOffset < uplineChain.length; levelOffset++) {
      const uplineUser = uplineChain[levelOffset];
      await DownlineUser.create({
        main_user_id: uplineUser._id,
        downline_user_id: referredUserId,
        level: levelOffset + 2 // Level 2, 3, etc.
      });
    }

    console.log(`Downline structure built for user: ${referredUserId}`);
  }
}
