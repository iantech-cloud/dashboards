import NextAuth, { DefaultSession, NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { MongoDBAdapter } from "@next-auth/mongodb-adapter";
import bcrypt from 'bcryptjs';
import { Profile, connectToDatabase } from '@/app/lib/models'; 
import { MongoClient } from 'mongodb';

// Validate environment variables
if (!process.env.NEXTAUTH_SECRET) {
  throw new Error('NEXTAUTH_SECRET environment variable is required');
}

if (!process.env.MONGODB_URI) {
  throw new Error('MONGODB_URI environment variable is required');
}

// Create MongoDB client promise for the adapter
const client = new MongoClient(process.env.MONGODB_URI);
const clientPromise = client.connect();

// Helper function to determine the user's dashboard route based on their role.
function getDashboardRoute(role: string): string {
    switch (role) {
        case 'admin':
            return '/admin';
        case 'support':
            return '/support';
        default:
            return '/dashboard';
    }
}

// Helper function to get user status redirect
function getUserStatusRedirect(user: any): string {
    if (!user.is_verified) {
        return '/auth/confirm';
    }
    if (!user.activation_paid_at) {
        return '/auth/activate';
    }
    if (!user.is_approved || user.approval_status !== 'approved') {
        return '/auth/pending-approval';
    }
    if (!user.is_active) {
        return '/auth/login?error=Inactive';
    }
    return getDashboardRoute(user.role);
}

/**
 * The configuration object for NextAuth.js (Auth.js v5).
 */
export const authOptions: NextAuthConfig = {
    // 1. Adapter Setup (Connects NextAuth to MongoDB)
    adapter: MongoDBAdapter(clientPromise),
    
    // 2. Session Configuration
    session: {
        strategy: 'jwt',
        maxAge: 30 * 24 * 60 * 60, // 30 days
    },
    
    // 3. Pages Configuration - ADDED SIGNOUT PAGE
    pages: {
        signIn: '/auth/login',
        signOut: '/auth/login', // Redirect to login after logout
        error: '/auth/login',
        verifyRequest: '/auth/confirm',
        newUser: '/auth/activate',
    },
    
    // 4. Providers Configuration
    providers: [
        Credentials({
            id: 'credentials',
            name: 'Credentials',
            credentials: {
                email: { label: 'Email', type: 'email' },
                password: { label: 'Password', type: 'password' },
            },
            
            async authorize(credentials) {
                await connectToDatabase();
                
                if (!credentials?.email || !credentials?.password) {
                    throw new Error('Email and password are required.');
                }

                const user = await Profile.findOne({ email: credentials.email }).select('+password');

                if (!user) {
                    throw new Error('Invalid email or password.');
                }
                
                const isPasswordValid = await bcrypt.compare(
                    credentials.password as string,
                    user.password || ''
                );

                if (!isPasswordValid) {
                    throw new Error('Invalid email or password.');
                }
                
                // Authorization and Status Checks
                if (user.status === 'banned') {
                    const message = user.ban_reason || 'Your account has been permanently banned.';
                    throw new Error(`Banned: ${message}`);
                }

                if (user.status === 'suspended' && user.suspended_at && user.suspended_at.getTime() > Date.now()) {
                    let message = `Your account has been suspended until: ${new Date(user.suspended_at).toLocaleString()}.`;
                    if (user.suspension_reason) {
                        message += ` Reason: ${user.suspension_reason}`;
                    }
                    throw new Error(`Suspended: ${message}`);
                } else if (user.status === 'suspended') {
                    await Profile.updateOne({ _id: user._id }, { status: 'active', suspended_at: null, suspension_reason: null });
                    user.status = 'active'; 
                }

                // Return user object with status information for proper redirect handling
                return {
                    id: user._id.toString(),
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
                };
            },
        }),
    ],
    
    // 5. Callbacks Configuration (FIXED)
    callbacks: {
        async signIn({ user, account, profile }) {
            // If using non-Credentials providers, this performs a basic verification check.
            // For Credentials, the 'authorize' function has already run the checks.
            if (account?.provider === 'credentials') {
              return true;
            }

            await connectToDatabase();
            const dbUser = await Profile.findOne({ email: user.email });
            
            if (!dbUser) return false;
            
            // Allow sign in only if email is verified
            if (!dbUser.is_verified) {
              throw new Error('Please verify your email before signing in');
            }
            
            return true;
        },
        
        async jwt({ token, user, trigger, session }) {
            if (user) {
                // 1. Persist essential data passed from 'authorize'
                token.id = user.id;
                token.role = user.role; 
                token.dashboardRoute = (user as any).dashboardRoute;

                // 2. Fetch full status from DB to inject into the token
                await connectToDatabase();
                const dbUser = await Profile.findOne({ email: user.email });
                if (dbUser) {
                    token.role = dbUser.role; // Ensure latest role is used
                    token.is_verified = dbUser.is_verified;
                    token.is_active = dbUser.is_active;
                    token.is_approved = dbUser.is_approved;
                    token.approval_status = dbUser.approval_status;
                    token.activation_paid_at = dbUser.activation_paid_at;
                    token.status = dbUser.status;
                }
            }

            // Update token when user is updated (e.g., after payment or approval)
            if (trigger === "update" && session?.user) {
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
                }
            }

            return token;
        },

        async session({ session, token }) {
            if (token) {
                // 1. Persist essential data (Original behavior)
                session.user.id = token.id as string;
                session.user.role = token.role as string;
                session.user.name = token.name as string;
                (session as any).dashboardRoute = token.dashboardRoute as string;

                // 2. Add new status fields
                session.user.is_verified = token.is_verified as boolean;
                session.user.is_active = token.is_active as boolean;
                session.user.is_approved = token.is_approved as boolean;
                session.user.approval_status = token.approval_status as string;
                session.user.activation_paid_at = token.activation_paid_at as Date;
                session.user.status = token.status as string;
            }
            return session;
        },
        
        async redirect({ url, baseUrl }) {
            // FIXED: Handle relative URLs properly
            try {
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

    // 6. Debugging (enable in development)
    debug: process.env.NODE_ENV === 'development',
    
    // 7. Secret for JWT encryption
    secret: process.env.NEXTAUTH_SECRET,

    // 8. Events for better error handling - FIXED SIGNOUT
    events: {
        async signIn({ user, account, profile, isNewUser }) {
            console.log('User signed in:', user.email);
        },
        async signOut({ token, session }) {
            console.log('User signed out successfully');
            // Clear any custom cookies or sessions if needed
        },
        async createUser({ user }) {
            console.log('User created:', user.email);
        },
        async linkAccount({ user, account, profile }) {
            console.log('Account linked:', user.email);
        },
        async session({ session, token }) {
            // Session is being created or updated
        },
    },

    // 9. ADDED: Proper logout configuration
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

// Type declarations (UPDATED)
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
    }
}
