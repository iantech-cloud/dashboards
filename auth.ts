// auth.ts - NextAuth v5 Complete Implementation with MongoDB Adapter - FIXED VERSION
import NextAuth, { type DefaultSession, type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import Email from "next-auth/providers/email";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import bcrypt from 'bcryptjs';
import speakeasy from 'speakeasy';
import { Profile, connectToDatabase } from '@/app/lib/models';
import { UserSession } from '@/app/lib/models/UserSession'; 
import { hashSessionToken, generateSessionToken, getSessionExpiryTime, isSessionExpired } from '@/app/lib/session-utils';
import { randomUUID } from 'crypto';
import clientPromise from '@/app/lib/mongodb';

// Validate environment variables
if (!process.env.NEXTAUTH_SECRET) {
  throw new Error('NEXTAUTH_SECRET environment variable is required');
}

if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  console.warn('Warning: GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not configured');
}

// Helper functions
function generateReferralId(): string {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

function getDashboardRoute(role: string): string {
  switch (role) {
    case 'admin':
    case 'super_admin':
      return '/admin';
    case 'support':
      return '/support';
    default:
      return '/dashboard';
  }
}

export const authConfig = {
  // NextAuth v5 configuration
  trustHost: true,
  secret: process.env.NEXTAUTH_SECRET,
  
  // MongoDB Adapter for sessions and magic links
  adapter: MongoDBAdapter(clientPromise),
  
  session: {
    strategy: 'jwt' as const,
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // Update session every 24 hours
  },
  
  pages: {
    signIn: '/auth/login',
    signOut: '/auth/login',
    error: '/auth/login',
    verifyRequest: '/auth/verify-email',
    newUser: '/auth/activate',
  },
  
  providers: [
    // 1. Credentials Provider (Email + Password)
    Credentials({
      id: 'credentials',
      name: 'credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        token2FA: { label: "2FA Code", type: "text", optional: true }
      },
      
      async authorize(credentials) {
        try {
          await connectToDatabase();
          
          if (!credentials?.email || !credentials?.password) {
            throw new Error('Email and password are required.');
          }

          const user = await Profile.findOne({ email: credentials.email }).select('+password');
          if (!user) throw new Error('Invalid email or password.');

          const userId = user._id?.toString();
          if (!userId) throw new Error('Invalid user data structure.');

          const isPasswordValid = await bcrypt.compare(credentials.password as string, user.password || '');
          if (!isPasswordValid) throw new Error('Invalid email or password.');

          // Status checks
          if (!user.is_active) {
            throw new Error('Your account is not active. Please contact support.');
          }

          if (!user.is_verified) {
            throw new Error('Please verify your email address before signing in.');
          }

          if (user.approval_status !== 'approved' && user.role !== 'user') {
            throw new Error('Your account is pending approval. Please wait for administrator approval.');
          }

          // 2FA verification if enabled
          if (user.twoFAEnabled && user.twoFASecret) {
            if (!credentials.token2FA) {
              throw new Error('2FA code is required.');
            }

            const verified = speakeasy.totp.verify({
              secret: user.twoFASecret,
              encoding: 'base32',
              token: credentials.token2FA as string,
              window: 2
            });

            if (!verified) {
              throw new Error('Invalid 2FA code.');
            }
          }
          
          await Profile.updateOne({ _id: user._id }, { last_login: new Date() });

          // Return user data for JWT token
          return {
            id: userId,
            email: user.email,
            name: user.username,
            role: user.role,
            is_verified: user.is_verified,
            is_active: user.is_active,
            is_approved: user.is_approved,
            approval_status: user.approval_status,
            activation_paid_at: user.activation_paid_at,
            status: user.status,
            twoFAEnabled: user.twoFAEnabled || false,
          };
          
        } catch (error: any) {
          console.error('Authorize error:', error);
          throw error;
        }
      },
    }),

    // 2. Google OAuth Provider
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      }
    }),

    // 3. Magic Link (Email) Provider
    Email({
      server: {
        host: 'smtp.placeholder.com',
        port: 587,
        auth: {
          user: 'placeholder@example.com',
          pass: 'password',
        },
      },
      from: process.env.EMAIL_FROM || 'noreply@hustlehub.africa',
      
      async sendVerificationRequest(params) {
        const { identifier, url, provider } = params;
        
        console.log(`Sending magic link to: ${identifier}`);
        
        try {
          if (process.env.RESEND_API_KEY) {
            const response = await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
              },
              body: JSON.stringify({
                from: provider.from,
                to: identifier,
                subject: 'Sign in to HustleHub Africa',
                html: `
                  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #4F46E5;">Welcome to HustleHub Africa</h2>
                    <p>Click the link below to sign in to your account:</p>
                    <a href="${url}" style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">
                      Sign In to HustleHub
                    </a>
                    <p style="margin-top: 20px; color: #666;">
                      If you didn't request this email, you can safely ignore it.
                    </p>
                    <p style="color: #666;">
                      This link will expire in 24 hours.
                    </p>
                  </div>
                `,
                text: `Sign in to HustleHub Africa: ${url}\n\nThis link will expire in 24 hours.`,
              }),
            });

            if (!response.ok) {
              const errorData = await response.text();
              console.error('Resend API error:', errorData);
              throw new Error(`Failed to send email: ${response.status} ${response.statusText}`);
            }

            const result = await response.json();
            console.log('Magic link email sent via Resend:', result);
          } else {
            console.log('--- MAGIC LINK EMAIL (Development/Fallback) ---');
            console.log(`To: ${identifier}`);
            console.log(`Link: ${url}`);
            console.log('--------------------------------------------------');
          }
        } catch (error) {
          console.error('Error sending magic link email:', error);
          if (process.env.NODE_ENV === 'production') {
            throw error;
          }
        }
      },
    }),
  ],
  
  callbacks: {
    async signIn({ user, account, profile }) {
      try {
        await connectToDatabase();

        // Handle Google OAuth Sign In
        if (account?.provider === 'google' && profile) {
          console.log('Google sign in attempt:', profile.email);

          let existingUser = await Profile.findOne({
            $or: [
              { oauth_id: account.providerAccountId },
              { email: profile.email }
            ]
          });

          if (existingUser) {
            if (!existingUser.oauth_id) {
              existingUser.oauth_id = account.providerAccountId;
              existingUser.oauth_provider = 'google';
              existingUser.oauth_verified = true;
              existingUser.google_profile_picture = (profile as any).picture;
            }

            if (!existingUser.is_verified) {
              existingUser.is_verified = true;
              existingUser.oauth_verified = true;
            }
            
            existingUser.last_login = new Date();
            await existingUser.save();

            user.id = existingUser._id.toString();
            return true;
          }

          // Create new user with Google OAuth
          const newUserId = randomUUID();
          const newUserReferralId = generateReferralId();

          const newUser = await Profile.create({
            _id: newUserId,
            username: (profile as any).name || profile.email?.split('@')[0],
            email: profile.email,
            phone_number: '',
            password: '',
            referral_id: newUserReferralId,
            oauth_provider: 'google',
            oauth_id: account.providerAccountId,
            oauth_verified: true,
            google_profile_picture: (profile as any).picture,
            is_verified: true,
            approval_status: 'pending',
            status: 'inactive',
            is_approved: false,
            is_active: false,
            activation_paid_at: null,
            last_login: new Date(),
          });

          user.id = newUser._id.toString();
          return true;
        }

        // Handle Magic Link (Email) Sign In
        if (account?.provider === 'email') {
          console.log('Magic link sign in attempt:', user.email);

          let existingUser = await Profile.findOne({ email: user.email });

          if (existingUser) {
            if (!existingUser.is_verified) {
              existingUser.is_verified = true;
              await existingUser.save();
            }
            
            existingUser.last_login = new Date();
            await existingUser.save();

            user.id = existingUser._id.toString();
            return true;
          }

          // New user signing in with magic link
          const newUserId = randomUUID();
          const newUserReferralId = generateReferralId();

          const newUser = await Profile.create({
            _id: newUserId,
            username: user.email?.split('@')[0] || 'user',
            email: user.email,
            phone_number: '',
            password: '',
            referral_id: newUserReferralId,
            oauth_provider: 'email',
            oauth_verified: true,
            is_verified: true,
            approval_status: 'pending',
            status: 'inactive',
            is_approved: false,
            is_active: false,
            activation_paid_at: null,
            last_login: new Date(),
          });

          user.id = newUser._id.toString();
          return true;
        }

        // Handle Credentials Sign In
        if (account?.provider === 'credentials') {
          console.log('Credentials sign in successful');
          return true;
        }
        
        return false;
      } catch (error) {
        console.error('SignIn callback error:', error);
        return false;
      }
    },
    
    async jwt({ token, user, account, trigger }) {
      try {
        // Initial sign in
        if (user && account) {
          console.log('JWT: New sign in', { provider: account.provider, userId: user.id });

          await connectToDatabase();
          const profile = await Profile.findById(user.id);
          if (!profile) {
            console.error('JWT: User profile not found');
            return token;
          }

          let authMethod = 'email';
          if (account.provider === 'google') authMethod = 'google';
          else if (account.provider === 'credentials') authMethod = 'credential'; 

          const sessionToken = generateSessionToken();
          const sessionTokenHash = hashSessionToken(sessionToken);
          
          const customSession = await UserSession.create({
            user_id: user.id,
            session_token_hash: sessionTokenHash,
            ip_address: 'unknown',
            user_agent: 'unknown',
            expires_at: getSessionExpiryTime(),
            is_active: true,
            auth_method: authMethod, 
            last_activity: new Date(),
          });

          // CRITICAL FIX: Enhanced token with ALL ID fields for maximum compatibility
          const enhancedToken = {
            ...token,
            // PRIMARY user ID fields - set ALL for maximum compatibility
            sub: user.id,           // NextAuth v5 standard field (subject)
            userId: user.id,        // Custom field for backward compatibility
            id: user.id,            // Alternative field
            
            // User data
            email: profile.email,
            name: profile.username,
            role: profile.role,
            dashboardRoute: getDashboardRoute(profile.role),
            
            // Status flags
            is_verified: profile.is_verified,
            is_active: profile.is_active,
            is_approved: profile.is_approved,
            approval_status: profile.approval_status,
            activation_paid_at: profile.activation_paid_at,
            status: profile.status,
            twoFAEnabled: profile.twoFAEnabled || false,
            
            // Session tracking
            sessionId: customSession._id.toString(),
            sessionToken: sessionToken,
            authMethod: authMethod,
            lastActivity: Math.floor(Date.now() / 1000),
          };

          console.log('JWT: Enhanced token created with userId:', enhancedToken.userId, 'sub:', enhancedToken.sub);
          return enhancedToken;
        }

        // Handle session updates
        if (trigger === "update") {
          console.log('JWT: Token update triggered');
          await connectToDatabase();
          
          // CRITICAL: Use multiple fallbacks for userId
          const userId = token.sub || token.userId || token.id;
          if (!userId) {
            console.error('JWT UPDATE: No userId found in token');
            return token;
          }
          
          const updatedUser = await Profile.findById(userId);
          if (updatedUser) {
            return {
              ...token,
              // CRITICAL: Preserve ALL ID fields
              sub: userId,
              userId: userId,
              id: userId,
              name: updatedUser.username,
              role: updatedUser.role,
              dashboardRoute: getDashboardRoute(updatedUser.role),
              is_verified: updatedUser.is_verified,
              is_active: updatedUser.is_active,
              is_approved: updatedUser.is_approved,
              approval_status: updatedUser.approval_status,
              activation_paid_at: updatedUser.activation_paid_at,
              status: updatedUser.status,
              twoFAEnabled: updatedUser.twoFAEnabled || false,
            };
          }
        }

        // Validate and preserve token on every request
        if (token.sessionId && !user) {
          await connectToDatabase();
          
          // CRITICAL: Use multiple fallbacks for userId
          const userId = token.sub || token.userId || token.id;
          if (!userId) {
            console.error('JWT VALIDATION: No userId found in token', { 
              hasSub: !!token.sub, 
              hasUserId: !!token.userId, 
              hasId: !!token.id 
            });
            return token;
          }

          const sessionTokenHash = hashSessionToken(token.sessionToken as string);
          const customSession = await UserSession.findOne({
            _id: token.sessionId,
            session_token_hash: sessionTokenHash,
            is_active: true,
          });

          if (!customSession || isSessionExpired(customSession.expires_at, customSession.last_activity)) {
            console.log('JWT: Session expired or not found');
            if (customSession) {
              await UserSession.findByIdAndUpdate(customSession._id, { is_active: false });
            }
            return token;
          }

          await UserSession.findByIdAndUpdate(customSession._id, {
            last_activity: new Date(),
            expires_at: getSessionExpiryTime(),
          });

          // CRITICAL: Ensure ALL ID fields are preserved
          return {
            ...token,
            sub: userId,
            userId: userId,
            id: userId,
            lastActivity: Math.floor(Date.now() / 1000),
          };
        }

        // CRITICAL SAFETY CHECK: Always ensure userId consistency across all fields
        const userId = token.sub || token.userId || token.id;
        if (userId) {
          token.sub = userId;
          token.userId = userId;
          token.id = userId;
        } else {
          console.error('JWT: CRITICAL - No userId found anywhere in token!', {
            tokenKeys: Object.keys(token),
            hasSub: !!token.sub,
            hasUserId: !!token.userId,
            hasId: !!token.id
          });
        }

        return token;
      } catch (error) {
        console.error('JWT callback error:', error);
        // CRITICAL: Preserve userId even on error
        const userId = token.sub || token.userId || token.id;
        if (userId) {
          token.sub = userId;
          token.userId = userId;
          token.id = userId;
        }
        return token;
      }
    },

    // CRITICAL FIX: Enhanced session callback with explicit field mapping
    async session({ session, token }) {
      console.log('SESSION CALLBACK - Input Token:', { 
        hasToken: !!token,
        sub: token?.sub,
        userId: token?.userId, 
        id: token?.id,
        email: token?.email,
        allTokenKeys: token ? Object.keys(token) : []
      });
      
      if (!token) {
        console.error('SESSION CALLBACK ERROR: No token provided!');
        return session;
      }

      if (!session.user) {
        console.error('SESSION CALLBACK ERROR: No session.user object!');
        session.user = {} as any;
      }

      // CRITICAL FIX: Get userId with multiple fallbacks
      const userId = token.sub || token.userId || token.id;
      
      if (!userId) {
        console.error('SESSION CALLBACK CRITICAL ERROR: No userId found in token!', {
          tokenKeys: Object.keys(token),
          tokenValues: token
        });
        // Return session as-is but log the error
        return session;
      }

      // EXPLICIT FIELD MAPPING - Map EVERY field explicitly
      session.user.id = userId as string;
      session.user.email = (token.email || session.user.email) as string;
      session.user.name = (token.name || session.user.name) as string;
      
      // Map custom fields explicitly
      session.user.role = token.role as string;
      session.user.is_verified = token.is_verified as boolean;
      session.user.is_active = token.is_active as boolean;
      session.user.is_approved = token.is_approved as boolean;
      session.user.approval_status = token.approval_status as string;
      session.user.activation_paid_at = token.activation_paid_at 
        ? new Date(token.activation_paid_at as any) 
        : undefined;
      session.user.status = token.status as string;
      session.user.twoFAEnabled = token.twoFAEnabled as boolean;
      session.user.authMethod = token.authMethod as string;
      
      // Map session-level properties
      (session as any).dashboardRoute = token.dashboardRoute as string;
      (session as any).expires = token.exp as string;
      
      console.log('SESSION CALLBACK - Output Session:', {
        userId: session.user.id,
        email: session.user.email,
        role: session.user.role,
        is_verified: session.user.is_verified,
        is_active: session.user.is_active,
        is_approved: session.user.is_approved
      });
      
      // CRITICAL: Verify the session.user.id is set before returning
      if (!session.user.id) {
        console.error('SESSION CALLBACK FINAL ERROR: session.user.id is still not set!');
      } else {
        console.log('SESSION CALLBACK SUCCESS: session.user.id =', session.user.id);
      }
      
      return session;
    },

    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      else if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    }
  },

  events: {
    async signOut({ token }) {
      if (token?.sessionId) {
        console.log('Event: User signed out, deactivating session:', token.sessionId);
        try {
          await connectToDatabase();
          await UserSession.findByIdAndUpdate(token.sessionId, { 
            is_active: false,
            ended_at: new Date(),
          });
        } catch (error) {
          console.error('Error deactivating session on sign out:', error);
        }
      }
    },

    async createUser({ user }) {
      console.log('Event: New user created:', user.email);
    },

    async linkAccount({ user, account, profile }) {
      console.log('Event: Account linked:', user.email, account.provider);
    },
  },

  // CRITICAL: Enable debug mode to see detailed logs
  debug: true,

} satisfies NextAuthConfig;

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);

// ==================== TYPE DECLARATIONS - ENHANCED ====================

declare module 'next-auth' {
  interface Session {
    dashboardRoute: string;
    expires: string;
    user: {
      id: string;              // CRITICAL: Must be here
      email: string;           // Standard NextAuth field
      name?: string | null;    // Standard NextAuth field
      image?: string | null;   // Standard NextAuth field
      role: string;
      is_verified: boolean;
      is_active: boolean;
      is_approved: boolean;
      approval_status: string;
      activation_paid_at?: Date;
      status: string;
      twoFAEnabled: boolean;
      authMethod: string;
    };
  }
  
  interface User {
    id: string;              // CRITICAL: Must match your DB _id
    email: string;
    name?: string | null;
    role: string;
    is_verified: boolean;
    is_active: boolean;
    is_approved: boolean;
    approval_status: string;
    activation_paid_at?: Date;
    status: string;
    twoFAEnabled: boolean;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    // CRITICAL: All possible ID fields for maximum compatibility
    sub: string;             // NextAuth v5 standard (subject)
    id: string;              // Alternative ID field
    userId: string;          // Custom ID field
    
    // User data
    email: string;
    name?: string | null;
    role: string;
    dashboardRoute: string;
    
    // Status fields
    is_verified: boolean;
    is_active: boolean;
    is_approved: boolean;
    approval_status: string;
    activation_paid_at?: Date;
    status: string;
    twoFAEnabled: boolean;
    
    // Session tracking
    sessionId?: string;
    sessionToken?: string;
    authMethod: string;
    lastActivity: number;
  }
}
