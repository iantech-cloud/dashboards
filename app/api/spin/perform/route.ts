// app/api/spin/perform/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { performSpin } from '@/app/actions/spin';

export async function POST(request: NextRequest) {
  try {
    const result = await performSpin();
    return NextResponse.json(result);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
