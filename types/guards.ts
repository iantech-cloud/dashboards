// types/guards.ts
import type { Session } from 'next-auth';
import type { IProfile } from './models';

export function isProfile(obj: any): obj is IProfile {
  return obj && 
    typeof obj._id === 'string' &&
    typeof obj.email === 'string' &&
    typeof obj.balance_cents === 'number';
}

export function hasEmail(session: Session | null): session is Session & { user: { email: string } } {
  return !!session?.user?.email;
}
