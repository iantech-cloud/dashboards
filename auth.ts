// auth.ts - FIXED VERSION: Allow login at any stage, redirect appropriately
import NextAuth, { DefaultSession, NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from 'bcryptjs';
import speakeasy from 'speakeasy';
import { Profile, connectToDatabase } from '@/app/lib/models'; 

// Validate environment variables
if (!process.env.NEXTAUTH_SECRET) {
  throw new Error('NEXTAUTH_SECRET environment variable is required');
}

// Helper function to determine the user's dashboard route based on their role.
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

// Helper function to get user status redirect
function getUserStatusRedirect(user: any): string {
    // Check email verification first
    if (!user.is_verified) {
        return '/auth/confirm';
    }
    
    // Then check activation payment
    if (!user.activation_paid_at) {
        return '/auth/activate';
    }
    
    // Then check approval status
    if (!user.is_approved || user.approval_status !== 'approved') {
        return '/auth/pending-approval';
    }
    
    // Check if account is active
    if (!user.is_active || user.status !== 'active') {
        return '/auth/login?error=Inactive';
    }
    
    // All conditions met - go to dashboard
    return getDashboardRoute(user.role);
}

/**
 * The configuration object for NextAuth.js (Auth.js v5) with 2FA support.
 */
export const authOptions: NextAuthConfig = {
    // Session Configuration
    session: {
        strategy: 'jwt',
        maxAge: 30 * 24 * 60 * 60, // 30 days
    },
    
    // Pages Configuration
    pages: {
        signIn: '/auth/login',
        signOut: '/auth/login',
        error: '/auth/login',
        newUser: '/auth/activate',
    },
    
    // Providers Configuration
    providers: [
        Credentials({
            id: 'credentials',
            name: 'Credentials',
            credentials: {
                email: { label: 'Email', type: 'email' },
                password: { label: 'Password', type: 'password' },
                twoFAToken: { label: '2FA Token', type: 'text', optional: true },
            },
            
            async authorize(credentials) {
                try {
                    await connectToDatabase();
                    
                    if (!credentials?.email || !credentials?.password) {
                        throw new Error('Email and password are required.');
                    }

                    // Find user with password
                    const user = await Profile.findOne({ email: credentials.email })
                        .select('+password');

                    if (!user) {
                        throw new Error('Invalid email or password.');
                    }

                    // Store user ID early to ensure we have it
                    const userId = user._id?.toString() || user.id?.toString();
                    
                    if (!userId) {
                        console.error('User object missing _id:', user);
                        throw new Error('Invalid user data structure.');
                    }
                    
                    // Verify password
                    const isPasswordValid = await bcrypt.compare(
                        credentials.password as string,
                        user.password || ''
                    );

                    if (!isPasswordValid) {
                        throw new Error('Invalid email or password.');
                    }
                    
                    // ===== CRITICAL STATUS CHECKS (BLOCK LOGIN) =====
                    // Only block login for banned/permanently suspended accounts
                    
                    // Check if user is banned
                    if (user.status === 'banned') {
                        const message = user.ban_reason || 'Your account has been permanently banned.';
                        throw new Error(`Banned: ${message}`);
                    }

                    // Check if user is suspended (and suspension hasn't expired)
                    if (user.status === 'suspended' && user.suspended_at && user.suspended_at.getTime() > Date.now()) {
                        let message = `Your account has been suspended until: ${new Date(user.suspended_at).toLocaleString()}.`;
                        if (user.suspension_reason) {
                            message += ` Reason: ${user.suspension_reason}`;
                        }
                        throw new Error(`Suspended: ${message}`);
                    } else if (user.status === 'suspended') {
                        // Suspension expired, reactivate user
                        await Profile.updateOne(
                            { _id: user._id }, 
                            { 
                                status: 'active', 
                                suspended_at: null, 
                                suspension_reason: null 
                            }
                        );
                        user.status = 'active'; 
                    }

                    // ===== 2FA VERIFICATION (if enabled and email verified) =====
                    // Only enforce 2FA if user has verified their email
                    if (user.is_verified && user.twoFAEnabled && user.twoFASecret) {
                        console.log('2FA is enabled for user:', user.email);
                        
                        // If no 2FA token provided, return partial user to indicate 2FA required
                        if (!credentials.twoFAToken) {
                            console.log('2FA token not provided, returning requires2FA flag');
                            
                            // Return special user object to indicate 2FA is required
                            return {
                                id: userId,
                                email: user.email,
                                name: user.username,
                                role: user.role,
                                requires2FA: true,
                                twoFAEnabled: true,
                                // Include all status fields for proper routing
                                is_verified: user.is_verified,
                                is_active: user.is_active,
                                is_approved: user.is_approved,
                                approval_status: user.approval_status,
                                activation_paid_at: user.activation_paid_at,
                                status: user.status,
                                dashboardRoute: getDashboardRoute(user.role),
                            } as any;
                        }

                        // 2FA token provided, verify it
                        console.log('2FA token provided, verifying...');
                        
                        const verified = speakeasy.totp.verify({
                            secret: user.twoFASecret,
                            encoding: 'base32',
                            token: credentials.twoFAToken as string,
                            window: 2, // Allow 2 time steps (60 seconds) tolerance
                            step: 30, // 30-second steps (standard for Google Authenticator)
                        });

                        console.log('2FA verification result:', verified);

                        if (!verified) {
                            throw new Error('InvalidTwoFactorCode: Invalid 2FA verification code. Please try again.');
                        }

                        // Update last 2FA used timestamp
                        await Profile.updateOne(
                            { _id: user._id },
                            { 
                                twoFALastUsed: new Date(),
                                last_login: new Date()
                            }
                        );

                        console.log('2FA verification successful for user:', user.email);
                    } else {
                        // No 2FA required, just update last login
                        await Profile.updateOne(
                            { _id: user._id },
                            { last_login: new Date() }
                        );
                    }

                    // ===== FULL USER OBJECT (AUTHENTICATION COMPLETE) =====
                    // Allow login regardless of verification/activation/approval status
                    // The redirect logic will handle routing them to the appropriate page
                    
                    console.log('Full authentication successful for user:', user.email);
                    console.log('User status:', {
                        is_verified: user.is_verified,
                        activation_paid_at: user.activation_paid_at,
                        is_approved: user.is_approved,
                        approval_status: user.approval_status,
                        is_active: user.is_active,
                        status: user.status
                    });
                    
                    // Return complete user object for session
                    return {
                        id: userId,
                        email: user.email,
                        name: user.username,
                        role: user.role,
                        dashboardRoute: getDashboardRoute(user.role),
                        is_verified: user.is_verified,
                        is_active: user.is_active,
                        is_approved: user.is_approved,
                        approval_status: user.approval_status,
                        activation_paid_at: user.activation_paid_at,
                        status: user.status,
                        twoFAEnabled: user.twoFAEnabled || false,
                        requires2FA: false, // Authentication is now complete
                    };
                    
                } catch (error: any) {
                    console.error('Authorize error:', error);
                    throw error;
                }
            },
        }),
    ],
    
    // Callbacks Configuration
    callbacks: {
        async signIn({ user, account }) {
            // For credentials provider, authorize has already handled verification
            if (account?.provider === 'credentials') {
                // Check if 2FA is required but not yet verified
                if ((user as any).requires2FA === true) {
                    console.log('SignIn callback: 2FA required, allowing sign-in for 2FA prompt');
                    return true;
                }
                
                // Full authentication complete - allow sign in
                // The redirect callback will handle routing to the appropriate page
                console.log('SignIn callback: Full authentication complete, allowing sign-in');
                return true;
            }
            
            return false; // Only credentials provider supported
        },
        
        async jwt({ token, user, trigger }) {
            // When user signs in
            if (user) {
                token.id = user.id;
                token.role = user.role;
                token.dashboardRoute = (user as any).dashboardRoute;
                token.is_verified = (user as any).is_verified;
                token.is_active = (user as any).is_active;
                token.is_approved = (user as any).is_approved;
                token.approval_status = (user as any).approval_status;
                token.activation_paid_at = (user as any).activation_paid_at;
                token.status = (user as any).status;
                token.twoFAEnabled = (user as any).twoFAEnabled || false;
                token.requires2FA = (user as any).requires2FA || false;
            }

            // Refresh user data on session update
            if (trigger === "update") {
                try {
                    await connectToDatabase();
                    const updatedUser = await Profile.findById(token.id);
                    if (updatedUser) {
                        token.role = updatedUser.role;
                        token.dashboardRoute = getDashboardRoute(updatedUser.role);
                        token.is_verified = updatedUser.is_verified;
                        token.is_active = updatedUser.is_active;
                        token.is_approved = updatedUser.is_approved;
                        token.approval_status = updatedUser.approval_status;
                        token.activation_paid_at = updatedUser.activation_paid_at;
                        token.status = updatedUser.status;
                        token.twoFAEnabled = updatedUser.twoFAEnabled || false;
                    }
                } catch (error) {
                    console.error('JWT update error:', error);
                }
            }

            return token;
        },

        async session({ session, token }) {
            if (token) {
                session.user.id = token.id as string;
                session.user.role = token.role as string;
                session.user.name = token.name as string;
                (session as any).dashboardRoute = token.dashboardRoute as string;

                // Add all status fields to session
                session.user.is_verified = token.is_verified as boolean;
                session.user.is_active = token.is_active as boolean;
                session.user.is_approved = token.is_approved as boolean;
                session.user.approval_status = token.approval_status as string;
                session.user.activation_paid_at = token.activation_paid_at as Date;
                session.user.status = token.status as string;
                session.user.twoFAEnabled = token.twoFAEnabled as boolean;
                session.user.requires2FA = token.requires2FA as boolean;
            }
            return session;
        },
        
        async redirect({ url, baseUrl }) {
            try {
                console.log('Redirect callback - url:', url, 'baseUrl:', baseUrl);
                
                // If redirecting after sign in, check user status and redirect accordingly
                if (url === baseUrl || url === `${baseUrl}/`) {
                    // This is a default redirect after sign-in
                    // The LoginContent component will handle the actual redirect
                    return baseUrl;
                }
                
                // If URL is already absolute, return it
                if (url.startsWith('http')) {
                    return url;
                }
                
                // If URL starts with '/', make it absolute
                if (url.startsWith('/')) {
                    return `${baseUrl}${url}`;
                }
                
                // Default to baseUrl
                return baseUrl;
            } catch (error) {
                console.error('Redirect error:', error);
                return baseUrl;
            }
        },
    },

    // Debugging
    debug: process.env.NODE_ENV === 'development',
    
    // Secret for JWT encryption
    secret: process.env.NEXTAUTH_SECRET,

    // Events for better error handling
    events: {
        async signIn({ user }) {
            console.log('User signed in:', user.email);
        },
        async signOut() {
            console.log('User signed out successfully');
        },
    },

    // Logger configuration
    logger: {
        error(code, metadata) {
            console.error('NextAuth error:', code, metadata);
        },
        warn(code) {
            console.warn('NextAuth warning:', code);
        },
        debug(code, metadata) {
            if (process.env.NODE_ENV === 'development') {
                console.log('NextAuth debug:', code, metadata);
            }
        }
    }
};

// Create NextAuth instance
const { handlers, auth, signIn, signOut } = NextAuth(authOptions);

// Export the instance methods
export { handlers, auth, signIn, signOut };

// Export helper function for use in other files
export { getUserStatusRedirect };

// Type declarations
declare module 'next-auth' {
    interface Session {
        dashboardRoute: string;
        user: {
            id: string;
            role: string;
            is_verified: boolean;
            is_active: boolean;
            is_approved: boolean;
            approval_status: string;
            activation_paid_at?: Date;
            status: string;
            twoFAEnabled: boolean;
            requires2FA: boolean;
        } & DefaultSession['user'];
    }
    interface User {
        role: string;
        dashboardRoute: string;
        is_verified: boolean;
        is_active: boolean;
        is_approved: boolean;
        approval_status: string;
        activation_paid_at?: Date;
        status: string;
        twoFAEnabled: boolean;
        requires2FA: boolean;
    }
}

declare module 'next-auth/jwt' {
    interface JWT {
        role: string;
        dashboardRoute: string;
        id: string;
        is_verified: boolean;
        is_active: boolean;
        is_approved: boolean;
        approval_status: string;
        activation_paid_at?: Date;
        status: string;
        twoFAEnabled: boolean;
        requires2FA: boolean;
    }
}
