// app/api/auth/[...nextauth]/route.ts
import { handlers } from "@/auth";

// Validate required environment variables for auth
if (!process.env.NEXTAUTH_SECRET) {
  console.error('[v0] CRITICAL: NEXTAUTH_SECRET is not configured. Auth will fail.');
}

if (!process.env.NEXTAUTH_URL) {
  console.error('[v0] CRITICAL: NEXTAUTH_URL is not configured. Auth will fail.');
}

export const { GET, POST } = handlers;

// Required for NextAuth v5
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
