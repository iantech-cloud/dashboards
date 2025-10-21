// app/lib/actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

// Spin mutation
export async function spinToWin(userId: string) {
  try {
    // Replace this with your actual spin logic
    const spinResult = await fetch(`${process.env.API_BASE_URL}/api/spin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await getToken()}`,
      },
      body: JSON.stringify({ userId }),
    });

    if (!spinResult.ok) {
      throw new Error('Spin failed');
    }

    const result = await spinResult.json();
    
    // Revalidate the dashboard to show updated data
    revalidatePath('/dashboard');
    
    return {
      success: true,
      data: result.data,
      message: result.message || 'Spin successful'
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Spin failed'
    };
  }
}

// Helper function to get auth token (you'll need to implement this based on your auth setup)
async function getToken(): Promise<string> {
  // Implement based on your auth system
  return '';
}
