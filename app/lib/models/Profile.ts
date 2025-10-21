import mongoose from 'mongoose';

const ProfileSchema = new mongoose.Schema({
  // Authentication & Basic Info
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
    select: false,
  },
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  phone_number: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },

  // Account Status & Verification
  is_verified: {
    type: Boolean,
    default: false,
  },
  is_active: {
    type: Boolean,
    default: true,
  },
  is_approved: {
    type: Boolean,
    default: false,
  },
  approval_status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  status: {
    type: String,
    enum: ['active', 'suspended', 'banned', 'inactive'],
    default: 'active',
  },

  // User Role & Permissions
  role: {
    type: String,
    enum: ['user', 'admin', 'support'],
    default: 'user',
  },

  // Account Restrictions
  ban_reason: {
    type: String,
    default: null,
  },
  banned_at: {
    type: Date,
    default: null,
  },
  suspension_reason: {
    type: String,
    default: null,
  },
  suspended_at: {
    type: Date,
    default: null,
  },

  // Financial Information
  balance: {
    type: Number,
    default: 0,
    min: 0,
  },
  total_earnings: {
    type: Number,
    default: 0,
    min: 0,
  },
  activation_paid_at: {
    type: Date,
    default: null,
  },

  // User Progress & Stats
  level: {
    type: Number,
    default: 1,
    min: 1,
  },
  rank: {
    type: String,
    default: 'Beginner',
  },
  tasks_completed: {
    type: Number,
    default: 0,
    min: 0,
  },
  available_spins: {
    type: Number,
    default: 0,
    min: 0,
  },

  // Referral System
  referral_id: {
    type: String,
    unique: true,
    sparse: true,
  },
  referred_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Profile',
    default: null,
  },

  // Timestamps
  created_at: {
    type: Date,
    default: Date.now,
  },
  updated_at: {
    type: Date,
    default: Date.now,
  },
  last_login: {
    type: Date,
    default: null,
  },
  last_withdrawal_date: {
    type: Date,
    default: null,
  },
});

// Update the updated_at field before saving
ProfileSchema.pre('save', function(next) {
  this.updated_at = new Date();
  next();
});

// Check if model exists before creating it
const Profile = mongoose.models.Profile || mongoose.model('Profile', ProfileSchema);

export { Profile };
