import mongoose, { Schema, Document, Model } from 'mongoose';

// Interface for Approved By user data
export interface IApprovedBy {
  _id: mongoose.Types.ObjectId;
  username?: string;
  name?: string;
  email?: string;
}

// Main Content Submission Interface
export interface IContentSubmission extends Document {
  title: string;
  content_type: 'blog_post' | 'social_media' | 'product_review' | 'video' | 'other';
  content_text: string;
  status: 'pending' | 'approved' | 'rejected' | 'revision_requested';
  payment_status: 'pending' | 'paid' | 'rejected';
  payment_amount: number;
  submission_date: Date;
  task_category: string;
  admin_feedback?: string;
  revision_notes?: string;
  word_count?: number;
  tags: string[];
  attachments: string[];
  user_id: string; // Reference to the user who submitted
  approved_at?: Date;
  approved_by?: mongoose.Types.ObjectId | IApprovedBy; // Reference to admin who approved
  created_at: Date;
  updated_at: Date;
}

// Static methods interface
interface ContentSubmissionModel extends Model<IContentSubmission> {
  findByUserId(userId: string): Promise<IContentSubmission[]>;
  findPendingSubmissions(): Promise<IContentSubmission[]>;
  findByStatus(status: string): Promise<IContentSubmission[]>;
}

const ContentSubmissionSchema = new Schema<IContentSubmission>(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters']
    },
    content_type: {
      type: String,
      required: [true, 'Content type is required'],
      enum: {
        values: ['blog_post', 'social_media', 'product_review', 'video', 'other'],
        message: 'Content type must be one of: blog_post, social_media, product_review, video, other'
      }
    },
    content_text: {
      type: String,
      required: [true, 'Content text is required'],
      trim: true
    },
    status: {
      type: String,
      required: [true, 'Status is required'],
      enum: {
        values: ['pending', 'approved', 'rejected', 'revision_requested'],
        message: 'Status must be one of: pending, approved, rejected, revision_requested'
      },
      default: 'pending'
    },
    payment_status: {
      type: String,
      required: [true, 'Payment status is required'],
      enum: {
        values: ['pending', 'paid', 'rejected'],
        message: 'Payment status must be one of: pending, paid, rejected'
      },
      default: 'pending'
    },
    payment_amount: {
      type: Number,
      required: [true, 'Payment amount is required'],
      min: [0, 'Payment amount cannot be negative'],
      default: 0
    },
    submission_date: {
      type: Date,
      required: [true, 'Submission date is required'],
      default: Date.now
    },
    task_category: {
      type: String,
      required: [true, 'Task category is required'],
      trim: true
    },
    admin_feedback: {
      type: String,
      trim: true
    },
    revision_notes: {
      type: String,
      trim: true
    },
    word_count: {
      type: Number,
      min: [0, 'Word count cannot be negative'],
      default: 0
    },
    tags: [{
      type: String,
      trim: true
    }],
    attachments: [{
      type: String,
      trim: true
    }],
    user_id: {
      type: String,
      required: [true, 'User ID is required'],
      ref: 'User'
    },
    approved_at: {
      type: Date
    },
    approved_by: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: {
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    },
    toJSON: {
      virtuals: true,
      transform: function(doc, ret) {
        ret._id = ret._id.toString();
        if (ret.approved_by && ret.approved_by._id) {
          ret.approved_by._id = ret.approved_by._id.toString();
        }
        return ret;
      }
    },
    toObject: {
      virtuals: true
    }
  }
);

// Indexes for better query performance
ContentSubmissionSchema.index({ user_id: 1, created_at: -1 });
ContentSubmissionSchema.index({ status: 1 });
ContentSubmissionSchema.index({ payment_status: 1 });
ContentSubmissionSchema.index({ content_type: 1 });
ContentSubmissionSchema.index({ submission_date: -1 });

// Virtual for formatted submission date
ContentSubmissionSchema.virtual('formatted_submission_date').get(function() {
  return this.submission_date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
});

// Virtual for total word count (if not provided)
ContentSubmissionSchema.virtual('calculated_word_count').get(function() {
  if (this.word_count && this.word_count > 0) {
    return this.word_count;
  }
  // Calculate word count from content_text
  const text = this.content_text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return text ? text.split(' ').length : 0;
});

// Static method to find submissions by user ID
ContentSubmissionSchema.statics.findByUserId = function(userId: string) {
  return this.find({ user_id: userId })
    .sort({ created_at: -1 })
    .populate('approved_by', 'username name email')
    .exec();
};

// Static method to find pending submissions
ContentSubmissionSchema.statics.findPendingSubmissions = function() {
  return this.find({ status: 'pending' })
    .sort({ created_at: -1 })
    .populate('approved_by', 'username name email')
    .exec();
};

// Static method to find submissions by status
ContentSubmissionSchema.statics.findByStatus = function(status: string) {
  return this.find({ status })
    .sort({ created_at: -1 })
    .populate('approved_by', 'username name email')
    .exec();
};

// Instance method to approve submission
ContentSubmissionSchema.methods.approve = function(approvedBy: string, notes?: string) {
  this.status = 'approved';
  this.approved_at = new Date();
  this.approved_by = approvedBy;
  if (notes) {
    this.admin_feedback = notes;
  }
  return this.save();
};

// Instance method to reject submission
ContentSubmissionSchema.methods.reject = function(reason: string) {
  this.status = 'rejected';
  this.admin_feedback = reason;
  return this.save();
};

// Instance method to request revision
ContentSubmissionSchema.methods.requestRevision = function(notes: string) {
  this.status = 'revision_requested';
  this.revision_notes = notes;
  return this.save();
};

// Instance method to update payment status
ContentSubmissionSchema.methods.updatePaymentStatus = function(status: 'pending' | 'paid' | 'rejected') {
  this.payment_status = status;
  return this.save();
};

// Middleware to calculate word count before saving
ContentSubmissionSchema.pre('save', function(next) {
  if (this.isModified('content_text') && (!this.word_count || this.word_count === 0)) {
    const text = this.content_text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    this.word_count = text ? text.split(' ').length : 0;
  }
  next();
});

// Check if model already exists to prevent OverwriteModelError
const ContentSubmission = (mongoose.models.ContentSubmission as ContentSubmissionModel) || 
  mongoose.model<IContentSubmission, ContentSubmissionModel>(
    'ContentSubmission', 
    ContentSubmissionSchema
  );

export default ContentSubmission;
