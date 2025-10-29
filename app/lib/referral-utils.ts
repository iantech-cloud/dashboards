import { Profile } from './models';

/**
 * Generate a unique 8-character referral ID
 */
export async function generateReferralId(): Promise<string> {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let attempts = 0;
  const maxAttempts = 5;

  while (attempts < maxAttempts) {
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }

    // Check if this ID already exists
    const existingProfile = await Profile.findOne({ referral_id: result });
    if (!existingProfile) {
      return result;
    }

    attempts++;
  }

  // Fallback to timestamp-based ID
  return `U${Date.now().toString().slice(-7)}`;
}
