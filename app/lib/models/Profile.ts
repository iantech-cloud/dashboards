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
    required: false, // Changed from true to false for OAuth users
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
    required: false, // Changed from true to false for OAuth users
    default: null, // Added default null
    unique: true, // Index defined here
    sparse: true, // Added sparse to allow multiple nulls
    trim: true,
    // Only validate if provided
    validate: {
      validator: function(v: string | null) {
        // Allow null for OAuth users
        if (v === null || v === undefined) return true;
        // If provided, must match Kenyan format
        return /^\+254[0-9]{9}$/.test(v);
      },
      message: 'Phone number must be in format +254XXXXXXXXX'
    }
  },

  // Profile completion tracking
  profile_completed: {
    type: Boolean,
    default: false,
  },

  // OAuth Integration
  oauth_provider: {
    type: String,
    enum: ['email', 'google', 'magic-link', 'credentials', null], // Added credentials and null
    default: null,
  },
  oauth_id: {
    type: String,
    sparse: true,
    unique: true, // Index defined here
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

  // ===== 🔐 ANTI-PHISHING CODE FIELDS =====
  antiPhishingCode: {
    type: String,
    default: null,
    select: false, // Don't return in queries by default for security
  },
  antiPhishingEncryptedCode: { // NEW FIELD
    type: String,
    default: null,
    select: false,
  },
  antiPhishingCodeSet: {
    type: Boolean,
    default: false, // CRITICAL: Must have default value!
  },
  antiPhishingSetAt: {
    type: Date,
    default: null,
  },
  antiPhishingLastUpdated: {
    type: Date,
    default: null,
  },
  // ===== END ANTI-PHISHING CODE FIELDS =====

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
}, {
  // IMPORTANT: Set strict to false to allow saving new fields to existing documents
  strict: false,
  // This allows the schema to save fields even if they weren't in the original document
});

// Update the updated_at field and profile_completed before saving
ProfileSchema.pre('save', function(next) {
  this.updated_at = new Date();
  
  // Set 2FA setup date when 2FA is enabled
  if (this.isModified('twoFAEnabled') && this.twoFAEnabled) {
    this.twoFASetupDate = new Date();
  }
  
  // Auto-set profile_completed when phone number is provided
  if (this.isModified('phone_number') && this.phone_number && !this.profile_completed) {
    this.profile_completed = true;
  }
  
  // Auto-set profile_completed to false if phone number is removed
  if (this.isModified('phone_number') && !this.phone_number && this.profile_completed) {
    this.profile_completed = false;
  }
  
  // Update antiPhishingLastUpdated when antiPhishingCode or antiPhishingCodeSet is modified
  if (this.isModified('antiPhishingCode') || this.isModified('antiPhishingCodeSet')) {
    this.antiPhishingLastUpdated = new Date();
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

// Virtual for checking if profile needs completion (OAuth users)
ProfileSchema.virtual('needsProfileCompletion').get(function() {
  return !this.profile_completed && (this.oauth_provider === 'google' || this.oauth_provider === 'email');
});

// Virtual for checking if user is OAuth user
ProfileSchema.virtual('isOAuthUser').get(function() {
  return this.oauth_provider && this.oauth_provider !== 'credentials';
});

// Virtual for checking if user has anti-phishing code
ProfileSchema.virtual('hasAntiPhishingCode').get(function() {
  return this.antiPhishingCodeSet === true && !!this.antiPhishingCode;
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

// Method to set anti-phishing code
ProfileSchema.methods.setAntiPhishingCode = function(hashedCode: string) {
  this.antiPhishingCode = hashedCode;
  this.antiPhishingCodeSet = true;
  this.antiPhishingSetAt = this.antiPhishingSetAt || new Date();
  this.antiPhishingLastUpdated = new Date();
  return this.save();
};

// Method to remove anti-phishing code
ProfileSchema.methods.removeAntiPhishingCode = function() {
  this.antiPhishingCode = null;
  this.antiPhishingCodeSet = false;
  this.antiPhishingLastUpdated = new Date();
  return this.save();
};

// Method to get anti-phishing code (returns the hashed code)
ProfileSchema.methods.getAntiPhishingCode = async function() {
  if (!this.antiPhishingCodeSet || !this.antiPhishingCode) {
    return null;
  }
  // This will need to select the field explicitly since it's marked as select: false
  const user = await mongoose.model('Profile').findById(this._id).select('+antiPhishingCode');
  return user?.antiPhishingCode || null;
};

// Method to complete profile (for OAuth users)
ProfileSchema.methods.completeProfile = function(phoneNumber: string) {
  this.phone_number = phoneNumber;
  this.profile_completed = true;
  return this.save();
};

// Method to check if profile can be activated
ProfileSchema.methods.canActivate = function() {
  return this.profile_completed && this.phone_number && this.is_verified;
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

// Static method to find OAuth users with incomplete profiles
ProfileSchema.statics.findIncompleteOAuthProfiles = function() {
  return this.find({
    $or: [
      { profile_completed: false },
      { phone_number: null }
    ],
    oauth_provider: { $in: ['google', 'email'] }
  });
};

// Static method to find by OAuth provider and ID
ProfileSchema.statics.findByOAuth = function(provider: string, oauthId: string) {
  return this.findOne({ oauth_provider: provider, oauth_id: oauthId });
};

// INDEX DEFINITIONS
// Fields that already have automatic indexes (via unique: true): email, username, phone_number, oauth_id, referral_id

// Only add indexes for fields that DON'T have unique: true or other automatic indexes

ProfileSchema.index({ twoFAEnabled: 1 });
ProfileSchema.index({ 'twoFABackupCodes.createdAt': 1 });
ProfileSchema.index({ role: 1, status: 1 }); // Compound index for admin queries
ProfileSchema.index({ created_at: -1 }); // For sorting by registration date

// Indexes for profile completion and OAuth
ProfileSchema.index({ profile_completed: 1 });
ProfileSchema.index({ oauth_provider: 1, profile_completed: 1 });
// REMOVED DUPLICATE: ProfileSchema.index({ phone_number: 1 }, { sparse: true }); 

// OAuth indexes - these are now defined in field definition using unique: true
// REMOVED DUPLICATE: ProfileSchema.index({ oauth_id: 1 });
ProfileSchema.index({ oauth_provider: 1 });


// Compound index for OAuth queries (optional but recommended for performance)
ProfileSchema.index({ oauth_provider: 1, oauth_id: 1 });

// Compound index for incomplete profile queries
ProfileSchema.index({ profile_completed: 1, oauth_provider: 1 });

// Indexes for anti-phishing code
ProfileSchema.index({ antiPhishingCodeSet: 1 });
ProfileSchema.index({ antiPhishingSetAt: 1 });

// Ensure virtual fields are serialized
ProfileSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    // Remove sensitive fields from JSON output
    delete ret.twoFASecret;
    delete ret.twoFABackupCodes;
    delete ret.password;
    delete ret.antiPhishingCode; // CRITICAL: Never expose hashed code
    delete ret.antiPhishingEncryptedCode; // Added new field to be removed
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
    delete ret.antiPhishingCode; // CRITICAL: Never expose hashed code
    delete ret.antiPhishingEncryptedCode; // Added new field to be removed
    return ret;
  }
});

// Check if model exists before creating it
const Profile = mongoose.models.Profile || mongoose.model('Profile', ProfileSchema);

export { Profile };

