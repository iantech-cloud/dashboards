import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import bcrypt from 'bcryptjs';
import speakeasy from 'speakeasy';
import { Profile, connectToDatabase } from '@/app/lib/models';
import { randomUUID } from 'crypto';
import clientPromise from '@/app/lib/mongodb';

// Environment validation
// IMPORTANT: do NOT throw at module top-level. This module is imported
// transitively by many API route handlers, and Next.js evaluates those
// modules during "Collecting page data" at build time. Throwing here would
// fail the production build whenever an env var isn't injected during that
// step (which is common on Vercel). Instead we warn and let NextAuth surface
// the error at request time if the secret is genuinely missing in runtime.
if (!process.env.NEXTAUTH_SECRET) {
  console.warn('Warning: NEXTAUTH_SECRET environment variable is not set. Auth will fail at runtime until it is configured.');
}

if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  console.warn('Warning: GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not configured. Google sign-in will fail.');
}

// For development, NEXTAUTH_URL can be inferred from NODE_ENV
// For production, it should be explicitly set in environment variables
if (!process.env.NEXTAUTH_URL) {
  if (process.env.NODE_ENV === 'development') {
    console.warn('Warning: NEXTAUTH_URL not set. CSRF validation may fail in development.');
  } else {
    console.warn('Error: NEXTAUTH_URL environment variable is required for production.');
  }
}

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

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.NEXTAUTH_SECRET,
  adapter: MongoDBAdapter(clientPromise),
  
  // Trust the host - required for CSRF validation in development and production
  trustHost: true,
  
  session: {
    strategy: 'jwt' as const,
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  providers: [
    // ==================== CREDENTIALS PROVIDER ====================
    Credentials({
      id: 'credentials',
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        token2FA: { label: "2FA Code", type: "text", optional: true }
      },
      
      async authorize(credentials) {
        try {
          console.log('[v0] Credentials authorize called');
          
          if (!credentials?.email || !credentials?.password) {
            console.warn('[v0] Missing email or password in credentials');
            throw new Error('Email and password are required.');
          }

          try {
            await connectToDatabase();
          } catch (dbError: any) {
            console.error('[v0] Database connection failed in authorize:', dbError?.message);
            throw new Error('Unable to connect to database. Please try again later.');
          }
          
          try {
            const user = await Profile.findOne({ email: credentials.email });

            if (!user) {
              console.warn('[v0] User not found:', credentials.email);
              throw new Error('User not found.');
            }

            const passwordMatch = await bcrypt.compare(credentials.password, user.password);

            if (!passwordMatch) {
              console.warn('[v0] Invalid password for user:', credentials.email);
              throw new Error('Invalid password.');
            }

            console.log('[v0] User authenticated successfully:', credentials.email);
            (user as any).authMethod = 'credentials';
            return user;
          } catch (queryError: any) {
            console.error('[v0] Database query error in authorize:', queryError?.message);
            throw new Error(queryError?.message || 'Authentication failed.');
          }
        } catch (error: any) {
          console.error('[v0] Authorization error:', error?.message);
          throw new Error(error?.message || 'Authentication failed.');
        }
      },
    }),

    // ==================== GOOGLE OAUTH PROVIDER ====================
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET ? [Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      },
      allowDangerousEmailAccountLinking: true, 
    })] : []),
  ],
  
  callbacks: {
    // ==================== SIGN IN CALLBACK ====================
    async signIn({ user, account, profile }) {
      try {
        console.log('[v0] signIn callback started for:', profile?.email || user?.email);
        
        try {
          await connectToDatabase();
        } catch (dbError: any) {
          console.error('[v0] Database connection failed in signIn:', dbError?.message);
          return false;
        }

        if (account?.provider === 'google' && profile) {
          console.log('[v0] Google sign in attempt:', profile.email);

          try {
            let existingUser = await Profile.findOne({ email: profile.email });

            if (existingUser) {
              console.log('[v0] Existing user found/linked:', existingUser.email);
              
              if (!existingUser.oauth_id || existingUser.oauth_id !== account.providerAccountId) {
                existingUser.oauth_id = account.providerAccountId;
                existingUser.oauth_provider = 'google';
                existingUser.oauth_verified = true;
                existingUser.google_profile_picture = (profile as any).picture;
              }

              if (!existingUser.is_verified) {
                existingUser.is_verified = true;
              }

              existingUser.last_login = new Date();
              await existingUser.save();
            }
            
            (user as any).authMethod = 'google';
            return true;
          } catch (queryError: any) {
            console.error('[v0] Database query error in signIn:', queryError?.message);
            return false;
          }
        }

        return true;
      } catch (error) {
        console.error('[v0] SignIn callback error:', error);
        return false;
      }
    },

    // ==================== JWT CALLBACK ====================
    async jwt({ token, user, account, trigger, session: updateSession }) {
      try {
        console.log('[v0] JWT callback - trigger:', trigger);
        
        if (trigger === 'update' && updateSession) {
          console.log('[v0] JWT callback - session update');
          return { ...token, ...updateSession };
        }

        // Only make database calls on initial sign in
        if (user && (trigger === 'signIn' || !token.userId)) {
          try {
            await connectToDatabase();
          } catch (dbError: any) {
            console.error('[v0] Database connection failed in JWT:', dbError?.message);
            return token;
          }
          
          try {
            const lookupQuery = user.id ? { _id: user.id } : { email: user.email };
            const profile = await Profile.findOne(lookupQuery);

            if (profile) {
              const userId = profile._id.toString();
              const dashboardRoute = getDashboardRoute(profile.role);

              // Determine auth method - check multiple sources
              let authMethod = 'credentials'; // default
              
              if ((user as any).authMethod) {
                authMethod = (user as any).authMethod;
              } else if (account?.provider === 'google') {
                authMethod = 'google';
              } else if (profile.oauth_provider === 'google' && profile.oauth_verified) {
                authMethod = 'google';
              } else if (profile.oauth_id) {
                authMethod = profile.oauth_provider || 'google';
              }

              console.log('[v0] JWT callback - Auth method determined:', {
                email: profile.email,
                authMethod,
                hasOAuthId: !!profile.oauth_id,
                oauthProvider: profile.oauth_provider,
                accountProvider: account?.provider
              });

              const isActivationPaid = profile.approval_status !== 'pending' && profile.rank !== 'Unactivated';

              return {
                ...token,
                sub: userId,
                id: userId,
                userId: userId,
                email: profile.email || '',
                name: profile.username || '',
                role: profile.role || 'user',
                dashboardRoute: dashboardRoute,
                is_verified: profile.is_verified ?? false,
                is_active: profile.is_active ?? false,
                is_approved: profile.is_approved ?? false,
                approval_status: profile.approval_status || 'pending',
                rank: profile.rank || 'Unactivated',
                activation_paid_at: profile.activation_paid_at || null,
                isActivationPaid: isActivationPaid,
                status: profile.status || 'inactive',
                twoFAEnabled: profile.twoFAEnabled || false,
                profile_completed: profile.profile_completed || false,
                phone_number: profile.phone_number || null,
                authMethod: authMethod,
              };
            }
          } catch (queryError: any) {
            console.error('[v0] Database query error in JWT:', queryError?.message);
            return token;
          }
        }

        // For subsequent calls, just return the existing token
        const userId = token.sub || token.userId || token.id;
        if (userId) {
          token.sub = userId;
          token.userId = userId;
          token.id = userId;
        }

        return token;
      } catch (error) {
        console.error('[v0] JWT callback error:', error);
        return token;
      }
    },

    // ==================== SESSION CALLBACK ====================
    async session({ session, token }) {
      if (!token || !token.userId) {
        return session;
      }

      const userId = token.userId;
      
      session.user.id = userId;
      session.user.email = token.email as string || '';
      session.user.name = token.name as string || '';
      session.user.role = token.role as string || 'user';
      session.user.is_verified = token.is_verified as boolean ?? false;
      session.user.is_active = token.is_active as boolean ?? false;
      session.user.is_approved = token.is_approved as boolean ?? false;
      session.user.approval_status = token.approval_status as string || 'pending';
      session.user.rank = token.rank as string || 'Unactivated';
      session.user.activation_paid_at = token.activation_paid_at 
        ? new Date(token.activation_paid_at as any) 
        : undefined;
      session.user.isActivationPaid = token.isActivationPaid as boolean ?? false;
      session.user.status = token.status as string || 'inactive';
      session.user.twoFAEnabled = token.twoFAEnabled as boolean ?? false;
      session.user.authMethod = token.authMethod as string || 'credentials';
      session.user.profile_completed = token.profile_completed as boolean ?? false;
      session.user.phone_number = token.phone_number as string || null;
      
      (session as any).dashboardRoute = token.dashboardRoute as string || '/dashboard';
      
      return session;
    },
  },

  pages: {
    signIn: "/auth/login",
    error: "/auth/error",
  },
});

// ==================== SERVER LOGOUT HANDLER ====================
export async function handleServerLogout() {
  try {
    // For NextAuth v5, use the signOut function we already exported
    await signOut({ redirect: false });
    
    // You can add additional server-side cleanup here if needed
    // For example: clearing custom cookies, logging, etc.
    
    return { success: true, message: 'Logged out successfully' };
  } catch (error) {
    console.error('Logout error:', error);
    throw new Error('Failed to logout');
  }
}

// ==================== TYPE DECLARATIONS ====================
declare module "next-auth" {
  interface Session {
    dashboardRoute: string;
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      role: string;
      is_verified: boolean;
      is_active: boolean;
      is_approved: boolean;
      approval_status: string;
      rank: string;
      activation_paid_at?: Date;
      isActivationPaid: boolean;
      status: string;
      twoFAEnabled: boolean;
      authMethod: string;
      profile_completed?: boolean;
      phone_number?: string | null;
    };
  }
  
  interface User {
    id: string;
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
    profile_completed?: boolean;
    phone_number?: string | null;
    authMethod?: string;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    userId: string;
    role: string;
    dashboardRoute: string;
    is_verified: boolean;
    is_active: boolean;
    is_approved: boolean;
    approval_status: string;
    rank: string;
    activation_paid_at?: Date;
    isActivationPaid: boolean;
    status: string;
    twoFAEnabled: boolean;
    profile_completed?: boolean;
    phone_number?: string | null;
    authMethod: string;
  }
}
