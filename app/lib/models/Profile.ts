import mongoose from 'mongoose';

const ProfileSchema = new mongoose.Schema({
  // Authentication & Basic Info
  email: {
    type: String,
    required: true,
    unique: true, // This creates an index automatically
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

  // OAuth Integration
  oauth_provider: {
    type: String,
    enum: ['email', 'google', 'magic-link'],
    default: 'email',
    index: true,
  },
  oauth_id: {
    type: String,
    sparse: true,
    unique: true,
    index: true,
  },
  oauth_verified: {
    type: Boolean,
    default: false,
  },
  google_profile_picture: {
    type: String,
    default: null,
  },

  // Two-Factor Authentication (2FA)
  twoFAEnabled: {
    type: Boolean,
    default: false,
  },
  twoFASecret: {
    type: String,
    default: null,
    select: false, // Don't include in queries by default for security
  },
  twoFABackupCodes: [{
    code: {
      type: String,
      select: false,
    },
    used: {
      type: Boolean,
      default: false,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    }
  }],
  twoFALastUsed: {
    type: Date,
    default: null,
  },
  twoFASetupDate: {
    type: Date,
    default: null,
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

  // Security & Login History
  login_attempts: {
    type: Number,
    default: 0,
  },
  lock_until: {
    type: Date,
    default: null,
  },
  password_changed_at: {
    type: Date,
    default: Date.now,
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
  
  // Set 2FA setup date when 2FA is enabled
  if (this.isModified('twoFAEnabled') && this.twoFAEnabled) {
    this.twoFASetupDate = new Date();
  }
  
  next();
});

// Virtual for checking if 2FA is set up (has secret but not enabled)
ProfileSchema.virtual('twoFASetupInProgress').get(function() {
  return !this.twoFAEnabled && !!this.twoFASecret;
});

// Virtual for checking if account requires 2FA
ProfileSchema.virtual('requires2FA').get(function() {
  return this.twoFAEnabled && !!this.twoFASecret;
});

// Method to enable 2FA
ProfileSchema.methods.enable2FA = function(secret: string) {
  this.twoFASecret = secret;
  this.twoFAEnabled = true;
  this.twoFASetupDate = new Date();
  return this.save();
};

// Method to disable 2FA
ProfileSchema.methods.disable2FA = function() {
  this.twoFASecret = null;
  this.twoFAEnabled = false;
  this.twoFABackupCodes = [];
  this.twoFASetupDate = null;
  return this.save();
};

// Method to verify 2FA token (to be used with speakeasy)
ProfileSchema.methods.verify2FAToken = function(token: string) {
  // This method would be used in conjunction with speakeasy
  // The actual verification logic is in the API route
  this.twoFALastUsed = new Date();
  return this.save();
};

// Method to generate backup codes (optional enhancement)
ProfileSchema.methods.generateBackupCodes = function(count: number = 8) {
  const codes = [];
  for (let i = 0; i < count; i++) {
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    codes.push({
      code: code, // In production, you should hash these
      used: false,
      createdAt: new Date()
    });
  }
  this.twoFABackupCodes = codes;
  return this.save();
};

// Method to use a backup code
ProfileSchema.methods.useBackupCode = function(code: string) {
  const backupCode = this.twoFABackupCodes.find(
    bc => bc.code === code && !bc.used
  );
  
  if (backupCode) {
    backupCode.used = true;
    this.twoFALastUsed = new Date();
    return this.save().then(() => true);
  }
  
  return Promise.resolve(false);
};

// Static method to find by email with 2FA data
ProfileSchema.statics.findByEmailWith2FA = function(email: string) {
  return this.findOne({ email }).select('+twoFASecret +twoFABackupCodes');
};

// Static method to check if user has 2FA enabled
ProfileSchema.statics.has2FAEnabled = function(email: string) {
  return this.findOne({ email, twoFAEnabled: true }).select('twoFAEnabled twoFASecret');
};

// REMOVED DUPLICATE INDEXES
// The following fields already have unique: true which automatically creates indexes:
// - email (line 8)
// - username (line 17)
// - phone_number (line 23)
// - referral_id (line 155, with sparse: true)
// - oauth_provider (line 31)
// - oauth_id (line 37)

// Only add indexes for fields that DON'T have unique: true
ProfileSchema.index({ twoFAEnabled: 1 });
ProfileSchema.index({ 'twoFABackupCodes.createdAt': 1 });
ProfileSchema.index({ role: 1, status: 1 }); // Compound index for admin queries
ProfileSchema.index({ created_at: -1 }); // For sorting by registration date
ProfileSchema.index({ oauth_provider: 1 });
ProfileSchema.index({ oauth_id: 1 });

// Ensure virtual fields are serialized
ProfileSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    // Remove sensitive fields from JSON output
    delete ret.twoFASecret;
    delete ret.twoFABackupCodes;
    delete ret.password;
    return ret;
  }
});

ProfileSchema.set('toObject', {
  virtuals: true,
  transform: function(doc, ret) {
    // Remove sensitive fields from object output
    delete ret.twoFASecret;
    delete ret.twoFABackupCodes;
    delete ret.password;
    return ret;
  }
});

// Check if model exists before creating it
const Profile = mongoose.models.Profile || mongoose.model('Profile', ProfileSchema);

export { Profile };
