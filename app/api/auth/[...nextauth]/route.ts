import NextAuth from 'next-auth';
import { authOptions } from '@/auth'; // Import the auth options from your auth.ts

// Create the NextAuth handler with your configuration
const handler = NextAuth(authOptions);

// Export the handler for GET and POST requests
export { handler as GET, handler as POST };
