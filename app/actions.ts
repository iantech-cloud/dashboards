// app/actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';

export async function apiFetch<T = any>(
  endpoint: string, 
  method: 'GET' | 'POST' = 'GET', 
  data?: any
): Promise<{ success: boolean; data?: T; message: string }> {
  try {
    // Get session to verify authentication
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return {
        success: false,
        message: 'Unauthorized - Please log in'
      };
    }

    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:5000';
    
    // Clean endpoint
    let cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    if (cleanEndpoint.startsWith('/api/')) {
      cleanEndpoint = cleanEndpoint.substring(4);
    }
    
    const url = `${baseUrl}/api${cleanEndpoint}`;
    
    console.log('API Fetch:', { url, method, hasData: !!data });

    // Get all cookies to forward to the API
    const cookieStore = await cookies();
    const cookieString = cookieStore.getAll()
      .map(cookie => `${cookie.name}=${cookie.value}`)
      .join('; ');

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieString, // Forward cookies for authentication
      },
      body: data ? JSON.stringify(data) : undefined,
      cache: 'no-store',
      credentials: 'include',
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API fetch error: ${response.status}`, errorText);
      
      // More descriptive error messages
      if (response.status === 401) {
        return {
          success: false,
          message: 'Session expired - Please log in again'
        };
      }
      
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
      message: error instanceof Error ? error.message : 'Network error occurred' 
    };
  }
}

// Alternative: Call API routes directly using internal functions
export async function directApiFetch<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ success: boolean; data?: T; message?: string }> {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return {
        success: false,
        message: 'Unauthorized'
      };
    }

    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${process.env.NEXTAUTH_URL || 'http://localhost:5000'}/api${cleanEndpoint}`;
    
    const cookieStore = await cookies();
    const cookieString = cookieStore.getAll()
      .map(cookie => `${cookie.name}=${cookie.value}`)
      .join('; ');

    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieString,
        ...options.headers,
      },
      credentials: 'include',
      ...options,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error('Direct API fetch error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Network error occurred',
    };
  }
}
