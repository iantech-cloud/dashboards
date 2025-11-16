// app/api/blogs/route.ts - Complete API handler for blog operations
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase, BlogPost } from '@/app/lib/models';

/**
 * Serializes document for API response
 */
function serializeDocument(doc: any) {
  if (!doc) return null;
  const serialized = JSON.parse(JSON.stringify(doc));
  
  if (serialized._id && typeof serialized._id !== 'string') {
    serialized._id = serialized._id.toString();
  }
  if (serialized.author?._id && typeof serialized.author._id !== 'string') {
    serialized.author._id = serialized.author._id.toString();
  }
  if (serialized.source_submission_id && typeof serialized.source_submission_id !== 'string') {
    serialized.source_submission_id = serialized.source_submission_id.toString();
  }
  
  return serialized;
}

/**
 * GET /api/blogs - Fetch published blog posts
 * Query params:
 * - page: number (default: 1)
 * - limit: number (default: 9)
 * - category: string (optional)
 * - tag: string (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '9');
    const category = searchParams.get('category');
    const tag = searchParams.get('tag');

    await connectToDatabase();

    const skip = (page - 1) * limit;
    const query: any = { 
      status: 'published',
      published_at: { $lte: new Date() }
    };

    if (category) query.category = category;
    if (tag) query.tags = tag;

    const [posts, total] = await Promise.all([
      BlogPost.find(query)
        .populate('author', 'username name')
        .select('-content') // Exclude full content for list view
        .sort({ published_at: -1, created_at: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      BlogPost.countDocuments(query)
    ]);

    const serializedPosts = posts.map(serializeDocument);

    return NextResponse.json({
      success: true,
      data: serializedPosts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120'
      }
    });

  } catch (error) {
    console.error('GET /api/blogs error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to fetch blog posts',
        data: [],
        pagination: { page: 1, limit: 9, total: 0, pages: 0 }
      },
      { status: 500 }
    );
  }
}
