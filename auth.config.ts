import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  providers: [], // This will be populated in auth.ts
  pages: {
    signIn: "/auth/login",
    signUp: "/auth/register",
    error: "/auth/error",
    verifyRequest: "/auth/verify-request",
  },
  callbacks: {
    // These callbacks will be merged with the ones in auth.ts
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = nextUrl.pathname.startsWith('/dashboard');
      const isOnAdmin = nextUrl.pathname.startsWith('/admin');
      const isOnSupport = nextUrl.pathname.startsWith('/support');
      const isOnAccount = nextUrl.pathname.startsWith('/account');

      // Protect routes
      if (isOnDashboard || isOnAdmin || isOnSupport || isOnAccount) {
        if (isLoggedIn) return true;
        return false; // Redirect unauthenticated users to login page
      }

      return true;
    },
  },
} satisfies NextAuthConfig;
