// app/actions.ts
'use server';

import { revalidatePath } from 'next/cache';

export async function apiFetch<T>(
  endpoint: string, 
  method: 'GET' | 'POST' = 'GET', 
  data?: any
): Promise<{ success: boolean; data?: T; message: string }> {
  try {
    const response = await fetch(`${process.env.NEXTAUTH_URL || ''}/api${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: data ? JSON.stringify(data) : undefined,
      cache: 'no-store',
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    
    // Revalidate relevant paths if needed
    if (method === 'POST') {
      revalidatePath('/dashboard');
      revalidatePath('/admin');
    }
    
    return result;
  } catch (error) {
    console.error('API fetch error:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Network error' 
    };
  }
}
