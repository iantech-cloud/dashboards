// app/auth/verify-login/page.tsx
import { redirect } from 'next/navigation';
import { auth } from '@/auth';

export default async function VerifyLoginPage() {
  const session = await auth();
  
  console.log('Verify login - Session:', session);
  
  if (!session?.user) {
    redirect('/auth/login?error=SessionNotFound');
  }
  
  const user = session.user;
  
  // Check email verification first
  if (!user.is_verified) {
    redirect('/auth/confirm');
  }
  
  // Then check activation payment
  if (!user.activation_paid_at) {
    redirect('/auth/activate');
  }
  
  // Then check approval status
  if (!user.is_approved || user.approval_status !== 'approved') {
    redirect('/auth/pending-approval');
  }
  
  // Check if account is active
  if (!user.is_active || user.status !== 'active') {
    redirect('/auth/login?error=Inactive');
  }
  
  // All checks passed - redirect to appropriate dashboard
  const dashboardRoute = user.role === 'admin' || user.role === 'super_admin' 
    ? '/admin' 
    : '/dashboard';
    
  redirect(dashboardRoute);
}
