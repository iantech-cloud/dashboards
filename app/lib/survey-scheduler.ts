import { connectToDatabase, Survey, SurveyAssignment, Profile, Referral } from './models';
import { Types } from 'mongoose';

/**
 * Assign surveys to eligible users with priority to new users and top referrers
 */
export async function assignSurveys() {
  try {
    await connectToDatabase();
    
    // Get active or manually enabled surveys that need assignment
    const now = new Date();
    const surveys = await Survey.find({
      $or: [
        {
          status: 'active',
          scheduled_for: { $lte: now },
          expires_at: { $gt: now }
        },
        {
          is_manually_enabled: true,
          status: { $in: ['active', 'scheduled'] }
        }
      ]
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

      const targetPercentage = survey.target_percentage || 15; // Default to 15%
      const targetUserCount = Math.ceil(totalActiveUsers * (targetPercentage / 100));

      // Get users who haven't been assigned this survey
      const assignedUserIds = await SurveyAssignment.distinct('user_id', {
        survey_id: survey._id
      });

      const eligibleQuery = {
        _id: { $nin: assignedUserIds.map(id => new Types.ObjectId(id)) },
        is_active: true,
        is_approved: true,
        approval_status: 'approved',
        status: 'active'
      };

      // Priority 1: New users (joined in last 7 days)
      if (survey.priority_new_users !== false) {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        
        const newUsers = await Profile.find({
          ...eligibleQuery,
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
      if (survey.priority_top_referrers !== false && assignedUserIds.length < targetUserCount) {
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

      // Priority 3: High accuracy users (users with good survey completion rate)
      if (assignedUserIds.length < targetUserCount) {
        const remainingSlots = targetUserCount - assignedUserIds.length;
        
        const highAccuracyUsers = await Profile.find({
          ...eligibleQuery,
          survey_accuracy_rate: { $gte: 70 } // Users with 70%+ accuracy
        })
        .sort({ survey_accuracy_rate: -1 })
        .limit(remainingSlots)
        .select('_id');

        for (const user of highAccuracyUsers) {
          const assignment = new SurveyAssignment({
            survey_id: survey._id,
            user_id: user._id,
            assigned_reason: 'high_accuracy'
          });
          await assignment.save();
          assignedUserIds.push(user._id.toString());
        }
      }

      // Priority 4: Random selection for remaining slots
      if (assignedUserIds.length < targetUserCount) {
        const remainingSlots = targetUserCount - assignedUserIds.length;
        
        const randomUsers = await Profile.aggregate([
          {
            $match: eligibleQuery
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

      console.log(`Assigned survey "${survey.title}" to ${assignedUserIds.length} users`);
    }
  } catch (error) {
    console.error('Error assigning surveys:', error);
  }
}

/**
 * Activate scheduled surveys (run this as a cron job every minute)
 * Checks both time-based schedule and manual enablement
 */
export async function activateScheduledSurveys() {
  try {
    await connectToDatabase();
    
    const now = new Date();
    
    // Convert to EAT (UTC+3)
    const eatTime = new Date(now.toLocaleString('en-US', { timeZone: 'Africa/Nairobi' }));
    const dayOfWeek = eatTime.getDay(); // 0 = Sunday, 2 = Tuesday
    const hour = eatTime.getHours();
    
    // Check if it's Tuesday 21:00 EAT
    const isTuesdaySchedule = dayOfWeek === 2 && hour === 21;
    
    // Find surveys to activate (either scheduled for now OR manually enabled)
    const surveysToActivate = await Survey.find({
      $or: [
        {
          status: 'scheduled',
          scheduled_for: { $lte: now },
          is_manually_enabled: false
        },
        {
          status: 'scheduled',
          is_manually_enabled: true
        }
      ]
    });

    for (const survey of surveysToActivate) {
      // Calculate expiration based on activation time
      const expiresAt = new Date(now);
      
      // If manually enabled, give 24 hours. If Tuesday schedule, give 2 hours
      if (survey.is_manually_enabled) {
        expiresAt.setHours(expiresAt.getHours() + 24);
      } else {
        expiresAt.setHours(expiresAt.getHours() + 2); // 2 hours for Tuesday schedule
      }

      await Survey.updateOne(
        { _id: survey._id },
        {
          status: 'active',
          activated_at: now,
          expires_at: expiresAt
        }
      );

      console.log(`Activated survey: ${survey.title} (Manual: ${survey.is_manually_enabled})`);
      
      // Assign surveys to users
      await assignSurveys();
    }

    // Also check if we should activate based on Tuesday schedule
    if (isTuesdaySchedule) {
      const scheduledSurveys = await Survey.find({
        status: 'scheduled',
        scheduled_for: { $lte: now },
        is_manually_enabled: false
      });

      if (scheduledSurveys.length > 0) {
        console.log(`Tuesday 21:00 EAT - Activating ${scheduledSurveys.length} scheduled surveys`);
      }
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
    
    const result = await Survey.updateMany(
      {
        status: 'active',
        expires_at: { $lte: now }
      },
      {
        status: 'completed'
      }
    );

    if (result.modifiedCount > 0) {
      console.log(`Expired ${result.modifiedCount} surveys`);
    }
  } catch (error) {
    console.error('Error expiring surveys:', error);
  }
}

/**
 * Check and activate surveys based on schedule or manual enablement
 * This should run every minute via cron
 */
export async function processSurveySchedule() {
  console.log('Processing survey schedule...');
  await activateScheduledSurveys();
  await expireSurveys();
  console.log('Survey schedule processing complete');
}
