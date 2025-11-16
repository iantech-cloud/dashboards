// app/api/blogs/[slug]/route.ts - Single blog post API handler
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
 * GET /api/blogs/[slug] - Fetch single blog post by slug
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    await connectToDatabase();

    const post = await BlogPost.findOne({ 
      slug, 
      status: 'published',
      published_at: { $lte: new Date() }
    })
    .populate('author', 'username name')
    .lean();
    
    if (!post) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Blog post not found',
          data: null 
        },
        { status: 404 }
      );
    }
    
    const serializedPost = serializeDocument(post);

    return NextResponse.json({
      success: true,
      data: serializedPost
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120'
      }
    });

  } catch (error) {
    console.error('GET /api/blogs/[slug] error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to fetch blog post',
        data: null 
      },
      { status: 500 }
    );
  }
}
