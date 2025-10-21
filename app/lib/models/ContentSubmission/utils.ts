import ContentSubmission, { IContentSubmission } from './ContentSubmission';

// Types for content submission operations
export interface CreateSubmissionData {
  title: string;
  content_type: 'blog_post' | 'social_media' | 'product_review' | 'video' | 'other';
  content_text: string;
  task_category: string;
  user_id: string;
  payment_amount?: number;
  word_count?: number;
  tags?: string[];
  attachments?: string[];
}

export interface UpdateSubmissionData {
  title?: string;
  content_text?: string;
  task_category?: string;
  word_count?: number;
  tags?: string[];
  attachments?: string[];
}

// Utility functions for content submission operations
export const ContentSubmissionUtils = {
  // Create a new content submission
  async createSubmission(data: CreateSubmissionData): Promise<IContentSubmission> {
    const submission = new ContentSubmission({
      ...data,
      payment_amount: data.payment_amount || 0,
      word_count: data.word_count || 0,
      tags: data.tags || [],
      attachments: data.attachments || []
    });

    return await submission.save();
  },

  // Get submission by ID with user check
  async getSubmissionById(id: string, userId?: string): Promise<IContentSubmission | null> {
    const query: any = { _id: id };
    if (userId) {
      query.user_id = userId;
    }

    return await ContentSubmission.findOne(query)
      .populate('approved_by', 'username name email')
      .exec();
  },

  // Get all submissions for a user
  async getUserSubmissions(userId: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [submissions, total] = await Promise.all([
      ContentSubmission.find({ user_id: userId })
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .populate('approved_by', 'username name email')
        .exec(),
      ContentSubmission.countDocuments({ user_id: userId })
    ]);

    return {
      submissions,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1
    };
  },

  // Update a submission
  async updateSubmission(
    id: string, 
    userId: string, 
    data: UpdateSubmissionData
  ): Promise<IContentSubmission | null> {
    return await ContentSubmission.findOneAndUpdate(
      { _id: id, user_id: userId },
      { 
        ...data,
        updated_at: new Date()
      },
      { new: true, runValidators: true }
    ).populate('approved_by', 'username name email').exec();
  },

  // Delete a submission
  async deleteSubmission(id: string, userId: string): Promise<boolean> {
    const result = await ContentSubmission.deleteOne({ 
      _id: id, 
      user_id: userId 
    }).exec();
    
    return result.deletedCount > 0;
  },

  // Admin: Get all submissions with pagination and filtering
  async getAdminSubmissions(
    filters: {
      status?: string;
      payment_status?: string;
      content_type?: string;
      user_id?: string;
    } = {},
    page: number = 1,
    limit: number = 20
  ) {
    const skip = (page - 1) * limit;
    const query: any = {};

    if (filters.status) query.status = filters.status;
    if (filters.payment_status) query.payment_status = filters.payment_status;
    if (filters.content_type) query.content_type = filters.content_type;
    if (filters.user_id) query.user_id = filters.user_id;

    const [submissions, total] = await Promise.all([
      ContentSubmission.find(query)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .populate('approved_by', 'username name email')
        .exec(),
      ContentSubmission.countDocuments(query)
    ]);

    return {
      submissions,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1
    };
  },

  // Admin: Update submission status
  async updateSubmissionStatus(
    id: string,
    status: 'approved' | 'rejected' | 'revision_requested',
    adminId: string,
    notes?: string
  ): Promise<IContentSubmission | null> {
    const updateData: any = { 
      status,
      updated_at: new Date()
    };

    if (status === 'approved') {
      updateData.approved_at = new Date();
      updateData.approved_by = adminId;
      if (notes) updateData.admin_feedback = notes;
    } else if (status === 'rejected') {
      if (notes) updateData.admin_feedback = notes;
    } else if (status === 'revision_requested') {
      if (notes) updateData.revision_notes = notes;
    }

    return await ContentSubmission.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('approved_by', 'username name email').exec();
  },

  // Get submission statistics
  async getSubmissionStats(userId?: string) {
    const matchStage: any = {};
    if (userId) {
      matchStage.user_id = userId;
    }

    const stats = await ContentSubmission.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalSubmissions: { $sum: 1 },
          totalEarnings: { $sum: '$payment_amount' },
          pendingCount: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          approvedCount: {
            $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] }
          },
          rejectedCount: {
            $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] }
          },
          revisionRequestedCount: {
            $sum: { $cond: [{ $eq: ['$status', 'revision_requested'] }, 1, 0] }
          },
          paidCount: {
            $sum: { $cond: [{ $eq: ['$payment_status', 'paid'] }, 1, 0] }
          }
        }
      }
    ]);

    return stats[0] || {
      totalSubmissions: 0,
      totalEarnings: 0,
      pendingCount: 0,
      approvedCount: 0,
      rejectedCount: 0,
      revisionRequestedCount: 0,
      paidCount: 0
    };
  }
};

export default ContentSubmissionUtils;
