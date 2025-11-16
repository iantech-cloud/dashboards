// app/lib/blogService.ts - Direct database service for SSR/SSG
import { connectToDatabase, BlogPost } from './models';
import { cache } from 'react';

/**
 * Serializes a Mongoose document to a plain JavaScript object
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
 * Fetches published blog posts with pagination
 * Cached per request using React cache()
 */
export const getBlogPosts = cache(async (options: {
  page?: number;
  limit?: number;
  category?: string;
  tag?: string;
} = {}) => {
  try {
    const { page = 1, limit = 9, category, tag } = options;

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

    return {
      success: true,
      data: serializedPosts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    console.error('getBlogPosts error:', error);
    return {
      success: false,
      data: [],
      pagination: { page: 1, limit: 9, total: 0, pages: 0 },
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
});

/**
 * Fetches a single blog post by slug
 * Cached per request using React cache()
 */
export const getBlogPostBySlug = cache(async (slug: string) => {
  try {
    await connectToDatabase();

    const post = await BlogPost.findOne({ 
      slug, 
      status: 'published',
      published_at: { $lte: new Date() }
    })
    .populate('author', 'username name')
    .lean();
    
    if (!post) {
      return { 
        success: false, 
        data: null,
        error: 'Post not found'
      };
    }
    
    const serializedPost = serializeDocument(post);

    return {
      success: true,
      data: serializedPost
    };
  } catch (error) {
    console.error('getBlogPostBySlug error:', error);
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
});

/**
 * Gets all published blog post slugs for static generation
 * Cached per request using React cache()
 */
export const getAllBlogSlugs = cache(async () => {
  try {
    await connectToDatabase();
    
    const posts = await BlogPost.find({ status: 'published' })
      .select('slug')
      .lean();
    
    return posts.map((post) => post.slug);
  } catch (error) {
    console.error('getAllBlogSlugs error:', error);
    return [];
  }
});

/**
 * Gets all unique categories from published posts
 * Cached per request using React cache()
 */
export const getCategories = cache(async () => {
  try {
    await connectToDatabase();
    
    const categories = await BlogPost.aggregate([
      { $match: { status: 'published', category: { $exists: true, $ne: '' } } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    return categories.map(c => ({ name: c._id, count: c.count }));
  } catch (error) {
    console.error('getCategories error:', error);
    return [];
  }
});

/**
 * Gets all unique tags from published posts
 * Cached per request using React cache()
 */
export const getTags = cache(async () => {
  try {
    await connectToDatabase();
    
    const tags = await BlogPost.aggregate([
      { $match: { status: 'published' } },
      { $unwind: '$tags' },
      { $group: { _id: '$tags', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 20 }
    ]);
    
    return tags.map(t => ({ name: t._id, count: t.count }));
  } catch (error) {
    console.error('getTags error:', error);
    return [];
  }
});
