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

if (!process.env.NEXTAUTH_SECRET) {
  throw new Error('NEXTAUTH_SECRET environment variable is required');
}

if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  console.warn('Warning: GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not configured');
}

if (!process.env.RESEND_API_KEY) {
  console.warn('Warning: RESEND_API_KEY not configured - Magic link emails will not be sent');
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

/**
 * Send magic link email using Resend API
 */
async function sendMagicLinkEmail(email: string, url: string): Promise<{ success: boolean; error?: string }> {
  if (!process.env.RESEND_API_KEY) {
    console.error('RESEND_API_KEY not configured');
    
    // In development, log the link
    if (process.env.NODE_ENV === 'development') {
      console.log('====== MAGIC LINK EMAIL (Development Mode) ======');
      console.log(`To: ${email}`);
      console.log(`Magic Link: ${url}`);
      console.log('================================================');
      return { success: true };
    }
    
    return { success: false, error: 'Email service not configured' };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || 'HustleHub Africa <noreply@hustlehub.africa>',
        to: email,
        subject: 'Sign in to HustleHub Africa',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">HustleHub Africa</h1>
            </div>
            
            <div style="background-color: #ffffff; padding: 40px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
              <h2 style="color: #4F46E5; margin-top: 0;">Welcome Back!</h2>
              
              <p style="font-size: 16px; color: #555;">
                Click the button below to sign in to your HustleHub Africa account. This link will expire in 24 hours for security reasons.
              </p>
              
              <div style="text-align: center; margin: 35px 0;">
                <a href="${url}" 
                   style="display: inline-block; 
                          padding: 16px 32px; 
                          background-color: #4F46E5; 
                          color: white; 
                          text-decoration: none; 
                          border-radius: 8px; 
                          font-weight: bold; 
                          font-size: 16px;
                          box-shadow: 0 4px 6px rgba(79, 70, 229, 0.3);">
                  Sign In to HustleHub
                </a>
              </div>
              
              <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin-top: 30px;">
                <p style="margin: 0 0 10px 0; font-size: 14px; color: #666;">
                  <strong>🔒 Security Note:</strong>
                </p>
                <ul style="font-size: 14px; color: #666; margin: 0; padding-left: 20px;">
                  <li>This link can only be used once</li>
                  <li>It will expire in 24 hours</li>
                  <li>Only use this link if you requested it</li>
                </ul>
              </div>
              
              <p style="font-size: 14px; color: #777; margin-top: 30px; border-top: 1px solid #e0e0e0; padding-top: 20px;">
                If you didn't request this email, you can safely ignore it. Someone might have entered your email address by mistake.
              </p>
              
              <p style="font-size: 12px; color: #999; margin-top: 20px;">
                If the button doesn't work, copy and paste this link into your browser:<br>
                <a href="${url}" style="color: #4F46E5; word-break: break-all;">${url}</a>
              </p>
            </div>
            
            <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
              <p>© ${new Date().getFullYear()} HustleHub Africa. All rights reserved.</p>
            </div>
          </body>
          </html>
        `,
        text: `Sign in to HustleHub Africa\n\nClick the link below to sign in:\n${url}\n\nThis link will expire in 24 hours.\n\nIf you didn't request this email, you can safely ignore it.\n\n© ${new Date().getFullYear()} HustleHub Africa`,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Resend API error:', errorData);
      return { 
        success: false, 
        error: `Failed to send email: ${response.status} ${response.statusText}` 
      };
    }

    const result = await response.json();
    console.log('✅ Magic link email sent successfully via Resend:', result.id);
    return { success: true };

  } catch (error) {
    console.error('Error sending magic link email:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

export const authConfig = {
  trustHost: true,
  secret: process.env.NEXTAUTH_SECRET,
  adapter: MongoDBAdapter(clientPromise),
  
  session: {
    strategy: 'jwt' as const,
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
  },

  // ✅ CRITICAL: Cookie configuration for production
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === 'production' 
        ? '__Secure-next-auth.session-token' 
        : 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        domain: process.env.NODE_ENV === 'production' 
          ? '.hustlehubafrica.com'  // ✅ Allows subdomains
          : undefined,
      },
    },
    callbackUrl: {
      name: process.env.NODE_ENV === 'production'
        ? '__Secure-next-auth.callback-url'
        : 'next-auth.callback-url',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        domain: process.env.NODE_ENV === 'production'
          ? '.hustlehubafrica.com'
          : undefined,
      },
    },
    csrfToken: {
      name: process.env.NODE_ENV === 'production'
        ? '__Host-next-auth.csrf-token'
        : 'next-auth.csrf-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
  
  pages: {
    signIn: '/auth/login',
    signOut: '/auth/login',
    error: '/auth/login',
    verifyRequest: '/auth/verify-request',
    newUser: undefined, // Don't use automatic newUser redirect
  },
  
  providers: [
    // ==================== CREDENTIALS PROVIDER ====================
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

          // Check 2FA if enabled
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
            profile_completed: user.profile_completed || false,
            phone_number: user.phone_number || null,
          };
          
        } catch (error: any) {
          console.error('Authorize error:', error);
          throw error;
        }
      },
    }),

    // ==================== GOOGLE OAUTH PROVIDER ====================
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      },
      allowDangerousEmailAccountLinking: true,
    }),

    // ==================== EMAIL (MAGIC LINK) PROVIDER ====================
    Email({
      server: {
        host: process.env.EMAIL_SERVER_HOST || 'smtp.resend.com',
        port: Number(process.env.EMAIL_SERVER_PORT) || 465,
        auth: {
          user: process.env.EMAIL_SERVER_USER || 'resend',
          pass: process.env.RESEND_API_KEY || '',
        },
      },
      from: process.env.EMAIL_FROM || 'HustleHub Africa <noreply@hustlehub.africa>',
      maxAge: 24 * 60 * 60,
      
      async sendVerificationRequest({ identifier: email, url }) {
        console.log(`📧 Sending magic link to: ${email}`);
        
        const result = await sendMagicLinkEmail(email, url);
        
        if (!result.success) {
          console.error('Failed to send magic link:', result.error);
          
          if (process.env.NODE_ENV === 'production') {
            throw new Error('Failed to send magic link email. Please try again or use another sign-in method.');
          }
          
          console.warn('⚠️ Development mode: Magic link not sent, but continuing...');
        }
      },
    }),
  ],
  
  callbacks: {
    // ==================== SIGN IN CALLBACK ====================
    async signIn({ user, account, profile, email }) {
      try {
        await connectToDatabase();

        // ===== GOOGLE OAUTH SIGN IN =====
        if (account?.provider === 'google' && profile) {
          console.log('🔵 Google sign in attempt:', profile.email);

          let existingUser = await Profile.findOne({
            $or: [
              { oauth_id: account.providerAccountId },
              { email: profile.email }
            ]
          });

          if (existingUser) {
            console.log('✅ Existing user found:', existingUser.email);
            
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

            return true;
          }

          // ===== CREATE NEW USER FROM GOOGLE OAUTH =====
          console.log('🆕 Creating new user from Google OAuth');
          
          const newUserId = randomUUID();
          const newUserReferralId = generateReferralId();

          const newUser = await Profile.create({
            _id: newUserId,
            username: (profile as any).name || profile.email?.split('@')[0] || 'user',
            email: profile.email,
            oauth_id: account.providerAccountId,
            oauth_provider: 'google',
            oauth_verified: true,
            is_verified: true,
            google_profile_picture: (profile as any).picture,
            referral_id: newUserReferralId,
            role: 'user',
            profile_completed: false,
            approval_status: 'pending',
            status: 'pending',
            is_approved: false,
            is_active: false,
            last_login: new Date(),
          });

          console.log('✅ New OAuth user created:', newUser.email);
          return true;
        }

        // ===== MAGIC LINK SIGN IN =====
        if (account?.provider === 'email') {
          console.log('📧 Magic link sign in for:', user.email);

          const existingUser = await Profile.findOne({ email: user.email });

          if (!existingUser) {
            console.log('❌ No user found for magic link:', user.email);
            return false;
          }

          if (!existingUser.is_verified) {
            console.log('❌ User email not verified:', user.email);
            return false;
          }

          existingUser.last_login = new Date();
          await existingUser.save();

          console.log('✅ Magic link sign in successful:', user.email);
          return true;
        }

        return true;
      } catch (error) {
        console.error('❌ SignIn callback error:', error);
        return false;
      }
    },

    // ==================== JWT CALLBACK ====================
    async jwt({ token, user, account, trigger, session: updateSession }) {
      try {
        if (trigger === 'update' && updateSession) {
          console.log('🔄 JWT: Updating session with new data');
          return { ...token, ...updateSession };
        }

        if (user) {
          await connectToDatabase();
          
          console.log('🔑 JWT: Initial sign in, loading user data for:', user.email);
          
          const profile = await Profile.findOne({ 
            $or: [
              { _id: user.id },
              { email: user.email }
            ]
          });

          if (!profile) {
            console.error('JWT: Profile not found for user:', user.email);
            return token;
          }

          const userId = profile._id.toString();
          const dashboardRoute = getDashboardRoute(profile.role);

          const sessionToken = generateSessionToken();
          const sessionTokenHash = hashSessionToken(sessionToken);

          const authMethod = account?.provider === 'google' ? 'google' 
                          : account?.provider === 'email' ? 'email' 
                          : 'credentials';

          const newSession = await UserSession.create({
            user_id: userId,
            session_token_hash: sessionTokenHash,
            device_info: 'Web Browser',
            ip_address: 'Unknown',
            is_active: true,
            created_at: new Date(),
            last_activity: new Date(),
            expires_at: getSessionExpiryTime(),
            auth_method: authMethod,
          });

          token.sub = userId;
          token.id = userId;
          token.userId = userId;
          token.email = profile.email;
          token.name = profile.username;
          token.role = profile.role;
          token.dashboardRoute = dashboardRoute;
          token.is_verified = profile.is_verified;
          token.is_active = profile.is_active;
          token.is_approved = profile.is_approved;
          token.approval_status = profile.approval_status;
          token.activation_paid_at = profile.activation_paid_at;
          token.status = profile.status;
          token.twoFAEnabled = profile.twoFAEnabled || false;
          token.profile_completed = profile.profile_completed || false;
          token.phone_number = profile.phone_number || null;
          token.sessionId = newSession._id.toString();
          token.sessionToken = sessionToken;
          token.authMethod = authMethod;
          token.lastActivity = Math.floor(Date.now() / 1000);

          console.log('✅ JWT: Token populated with user data:', {
            userId,
            email: profile.email,
            role: profile.role,
            is_verified: profile.is_verified,
            is_active: profile.is_active,
            activation_paid_at: profile.activation_paid_at ? 'Yes' : 'No',
            is_approved: profile.is_approved,
            approval_status: profile.approval_status,
          });

          return token;
        }

        if (token.sessionId && token.sessionToken) {
          const userId = token.sub || token.userId || token.id;
          if (!userId) {
            console.error('JWT: No userId in token');
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

          return {
            ...token,
            sub: userId,
            userId: userId,
            id: userId,
            lastActivity: Math.floor(Date.now() / 1000),
          };
        }

        const userId = token.sub || token.userId || token.id;
        if (userId) {
          token.sub = userId;
          token.userId = userId;
          token.id = userId;
        } else {
          console.error('JWT: CRITICAL - No userId found anywhere in token!');
        }

        return token;
      } catch (error) {
        console.error('JWT callback error:', error);
        const userId = token.sub || token.userId || token.id;
        if (userId) {
          token.sub = userId;
          token.userId = userId;
          token.id = userId;
        }
        return token;
      }
    },

    // ==================== SESSION CALLBACK ====================
    async session({ session, token }) {
      console.log('SESSION CALLBACK - Input Token:', { 
        hasToken: !!token,
        sub: token?.sub,
        userId: token?.userId, 
        id: token?.id,
        email: token?.email,
      });
      
      if (!token) {
        console.error('SESSION CALLBACK ERROR: No token provided!');
        return session;
      }

      if (!session.user) {
        console.error('SESSION CALLBACK ERROR: No session.user object!');
        session.user = {} as any;
      }

      const userId = token.sub || token.userId || token.id;
      
      if (!userId) {
        console.error('SESSION CALLBACK CRITICAL ERROR: No userId found in token!');
        return session;
      }

      session.user.id = userId as string;
      session.user.email = (token.email || session.user.email) as string;
      session.user.name = (token.name || session.user.name) as string;
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
      session.user.profile_completed = token.profile_completed as boolean;
      session.user.phone_number = token.phone_number as string | null;
      
      (session as any).dashboardRoute = token.dashboardRoute as string;
      (session as any).expires = token.exp as string;
      
      console.log('✅ SESSION CALLBACK SUCCESS:', {
        userId: session.user.id,
        email: session.user.email,
        role: session.user.role,
        is_verified: session.user.is_verified,
        is_active: session.user.is_active,
        activation_paid_at: session.user.activation_paid_at ? 'Yes' : 'No',
        is_approved: session.user.is_approved,
      });
      
      return session;
    },

    // ==================== REDIRECT CALLBACK ====================
    async redirect({ url, baseUrl }) {
      console.log('🔄 REDIRECT CALLBACK:', { url, baseUrl });

      // Handle relative URLs
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      
      // Handle URLs from same origin
      if (new URL(url).origin === baseUrl) return url;
      
      // Default to base URL
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

  debug: process.env.NODE_ENV === 'development',

} satisfies NextAuthConfig;

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);

// ==================== TYPE DECLARATIONS ====================
declare module 'next-auth' {
  interface Session {
    dashboardRoute: string;
    expires: string;
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
      activation_paid_at?: Date;
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
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    sub: string;
    id: string;
    userId: string;
    email: string;
    name?: string | null;
    role: string;
    dashboardRoute: string;
    is_verified: boolean;
    is_active: boolean;
    is_approved: boolean;
    approval_status: string;
    activation_paid_at?: Date;
    status: string;
    twoFAEnabled: boolean;
    profile_completed?: boolean;
    phone_number?: string | null;
    sessionId?: string;
    sessionToken?: string;
    authMethod: string;
    lastActivity: number;
  }
}
