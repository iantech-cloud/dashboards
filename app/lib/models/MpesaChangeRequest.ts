import mongoose from 'mongoose';

const MpesaChangeRequestSchema = new mongoose.Schema({
  // User Information
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Profile',
    required: true,
  },

  // Request Details
  phoneNumber: {
    type: String,
    required: true,
    trim: true,
  },
  reason: {
    type: String,
    required: true,
    trim: true,
    minlength: 10,
    maxlength: 500,
  },

  // Request Status
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },

  // Admin Processing
  adminFeedback: {
    type: String,
    default: '',
    maxlength: 1000,
  },
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Profile',
    default: null,
  },
  processedDate: {
    type: Date,
    default: null,
  },

  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update the updatedAt field before saving
MpesaChangeRequestSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Index for better query performance
MpesaChangeRequestSchema.index({ userId: 1 });
MpesaChangeRequestSchema.index({ status: 1 });
MpesaChangeRequestSchema.index({ createdAt: -1 });

// Check if model exists before creating it
const MpesaChangeRequest = mongoose.models.MpesaChangeRequest || 
  mongoose.model('MpesaChangeRequest', MpesaChangeRequestSchema);

export { MpesaChangeRequest };
