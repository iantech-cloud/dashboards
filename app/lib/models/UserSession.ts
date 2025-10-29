import mongoose, { Schema, model, models } from 'mongoose';

const UserSessionSchema = new Schema({
  user_id: { 
    type: String, 
    ref: 'Profile', 
    required: true, 
    index: true 
  },
  session_token_hash: { 
    type: String, 
    required: true, 
    unique: true,
    index: true 
  },
  ip_address: { 
    type: String 
  },
  user_agent: { 
    type: String 
  },
  created_at: { 
    type: Date, 
    default: Date.now,
    index: true 
  },
  last_activity: { 
    type: Date, 
    default: Date.now,
    index: true 
  },
  expires_at: { 
    type: Date, 
    required: true
    // REMOVED: index: true - using schema.index() below instead
  },
  is_active: { 
    type: Boolean, 
    default: true,
    index: true 
  },
  auth_method: {
    type: String,
    // FIX: Updated enum to match all providers used in auth.ts
    // 'credential' is for email/password login.
    // 'email' covers magic link login (from the Email provider).
    enum: ['credential', 'google', 'email'], 
    required: true
  }
}, {
  timestamps: true
});

// Index to automatically delete expired sessions
UserSessionSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

// Compound indexes for common queries
UserSessionSchema.index({ user_id: 1, is_active: 1 });
UserSessionSchema.index({ session_token_hash: 1, is_active: 1 });

export const UserSession = models.UserSession || model('UserSession', UserSessionSchema);

