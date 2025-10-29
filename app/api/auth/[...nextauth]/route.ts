// app/api/auth/[...nextauth]/route.ts
import { handlers } from "@/auth";

export const { GET, POST } = handlers;

// Required for NextAuth v5
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
