// app/api/spin/prizes/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAvailablePrizes } from '@/app/actions/spin';

export async function GET(request: NextRequest) {
  try {
    const result = await getAvailablePrizes();
    return NextResponse.json(result);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
