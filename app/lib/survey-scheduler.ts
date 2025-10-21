import { connectToDatabase, Survey, SurveyAssignment, Profile, Referral } from './models';
import { Types } from 'mongoose';

/**
 * Assign surveys to 15% of active users with priority to new users and top referrers
 */
export async function assignSurveys() {
  try {
    await connectToDatabase();
    
    // Get active surveys scheduled for now
    const now = new Date();
    const surveys = await Survey.find({
      status: 'active',
      scheduled_for: { $lte: now },
      expires_at: { $gt: now }
    });

    if (surveys.length === 0) {
      console.log('No active surveys to assign');
      return;
    }

    for (const survey of surveys) {
      // Get total active users
      const totalActiveUsers = await Profile.countDocuments({
        is_active: true,
        is_approved: true,
        approval_status: 'approved',
        status: 'active'
      });

      const targetUserCount = Math.ceil(totalActiveUsers * (survey.target_percentage / 100));

      // Get users who haven't been assigned this survey
      const assignedUserIds = await SurveyAssignment.distinct('user_id', {
        survey_id: survey._id
      });

      // Priority 1: New users (joined in last 7 days)
      if (survey.priority_new_users) {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        
        const newUsers = await Profile.find({
          _id: { $nin: assignedUserIds },
          is_active: true,
          is_approved: true,
          approval_status: 'approved',
          status: 'active',
          created_at: { $gte: oneWeekAgo }
        }).limit(targetUserCount).select('_id');

        for (const user of newUsers) {
          const assignment = new SurveyAssignment({
            survey_id: survey._id,
            user_id: user._id,
            assigned_reason: 'new_user'
          });
          await assignment.save();
          assignedUserIds.push(user._id.toString());
        }
      }

      // Priority 2: Top referrers
      if (survey.priority_top_referrers && assignedUserIds.length < targetUserCount) {
        const remainingSlots = targetUserCount - assignedUserIds.length;
        
        const topReferrers = await Referral.aggregate([
          {
            $group: {
              _id: '$referrer_id',
              referralCount: { $sum: 1 }
            }
          },
          {
            $match: {
              _id: { $nin: assignedUserIds.map(id => new Types.ObjectId(id)) }
            }
          },
          {
            $sort: { referralCount: -1 }
          },
          {
            $limit: remainingSlots
          }
        ]);

        for (const referrer of topReferrers) {
          const assignment = new SurveyAssignment({
            survey_id: survey._id,
            user_id: referrer._id,
            assigned_reason: 'top_referrer'
          });
          await assignment.save();
          assignedUserIds.push(referrer._id.toString());
        }
      }

      // Priority 3: Random selection for remaining slots
      if (assignedUserIds.length < targetUserCount) {
        const remainingSlots = targetUserCount - assignedUserIds.length;
        
        const randomUsers = await Profile.aggregate([
          {
            $match: {
              _id: { $nin: assignedUserIds.map(id => new Types.ObjectId(id)) },
              is_active: true,
              is_approved: true,
              approval_status: 'approved',
              status: 'active'
            }
          },
          { $sample: { size: remainingSlots } },
          { $project: { _id: 1 } }
        ]);

        for (const user of randomUsers) {
          const assignment = new SurveyAssignment({
            survey_id: survey._id,
            user_id: user._id,
            assigned_reason: 'random'
          });
          await assignment.save();
        }
      }

      console.log(`Assigned survey "${survey.title}" to ${targetUserCount} users`);
    }
  } catch (error) {
    console.error('Error assigning surveys:', error);
  }
}

/**
 * Activate scheduled surveys (run this as a cron job every minute)
 */
export async function activateScheduledSurveys() {
  try {
    await connectToDatabase();
    
    const now = new Date();
    
    // Find surveys scheduled for activation
    const surveysToActivate = await Survey.find({
      status: 'scheduled',
      scheduled_for: { $lte: now }
    });

    for (const survey of surveysToActivate) {
      // Calculate expiration (5 minutes from now)
      const expiresAt = new Date(now);
      expiresAt.setMinutes(expiresAt.getMinutes() + 5);

      await Survey.updateOne(
        { _id: survey._id },
        {
          status: 'active',
          activated_at: now,
          expires_at: expiresAt
        }
      );

      console.log(`Activated survey: ${survey.title}`);
      
      // Assign surveys to users
      await assignSurveys();
    }
  } catch (error) {
    console.error('Error activating surveys:', error);
  }
}

/**
 * Expire surveys that have passed their expiration time
 */
export async function expireSurveys() {
  try {
    await connectToDatabase();
    
    const now = new Date();
    
    await Survey.updateMany(
      {
        status: 'active',
        expires_at: { $lte: now }
      },
      {
        status: 'completed'
      }
    );
  } catch (error) {
    console.error('Error expiring surveys:', error);
  }
}
