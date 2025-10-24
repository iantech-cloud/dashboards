// app/api/admin/transactions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAdminTransactions } from '../../../actions/transactions';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '1000');
    const type = searchParams.get('type') || 'all';
    const status = searchParams.get('status') || 'all';
    const dateFrom = searchParams.get('dateFrom') || '';
    const dateTo = searchParams.get('dateTo') || '';

    const filters = { type, status, dateFrom, dateTo };
    
    const result = await getAdminTransactions(limit, filters);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Admin transactions API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
