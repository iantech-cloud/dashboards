// types/next-auth.d.ts
import 'next-auth';
import 'next-auth/jwt';

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
      authMethod: string;
    } & DefaultSession['user'];
  }

  interface User {
    id: string;
    email: string;
    name?: string;
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
    authMethod?: string;
    ip?: string;
    userAgent?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    userId: string;
    email: string;
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
    sessionId?: string;
    sessionToken?: string;
    authMethod: string;
    iat: number;
    lastActivity: number;
  }
}
