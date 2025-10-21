// app/api/test-email/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { testEmailConfig } from '@/app/actions/email';

export async function GET(request: NextRequest) {
  try {
    const result = await testEmailConfig();
    
    if (result.success) {
      return NextResponse.json({ 
        success: true, 
        message: 'Email configuration is working correctly' 
      });
    } else {
      return NextResponse.json({ 
        success: false, 
        message: 'Email configuration failed',
        error: result.error,
        details: result.details
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Test email error:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Test failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
