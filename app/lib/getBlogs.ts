// app/lib/getBlogs.ts - Cached blog fetching with Next.js cache
import { connectToDatabase, BlogPost } from './models';
import { unstable_cache } from 'next/cache';

interface BlogPostQuery {
  page?: number;
  limit?: number;
  status?: string;
  category?: string;
  tag?: string;
}

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
  
  return serialized;
}

/**
 * Fetches published blog posts with caching (60 seconds revalidation)
 * This function is cached at the data level for better performance
 */
const getCachedBlogPosts = unstable_cache(
  async (page: number, limit: number, category?: string, tag?: string) => {
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
      posts: serializedPosts,
      total,
      totalPages: Math.ceil(total / limit)
    };
  },
  ['blog-posts-list'], // Cache key
  {
    revalidate: 60, // Revalidate every 60 seconds
    tags: ['blog-posts'] // Tag for on-demand revalidation
  }
);

/**
 * Fetches a single blog post by slug with caching
 */
const getCachedBlogPostBySlug = unstable_cache(
  async (slug: string) => {
    await connectToDatabase();

    const post = await BlogPost.findOne({ 
      slug, 
      status: 'published',
      published_at: { $lte: new Date() }
    })
    .populate('author', 'username name')
    .lean();
    
    if (!post) return null;
    
    return serializeDocument(post);
  },
  ['blog-post-detail'], // Cache key
  {
    revalidate: 60, // Revalidate every 60 seconds
    tags: ['blog-post'] // Tag for on-demand revalidation
  }
);

/**
 * Public API for fetching blog posts with pagination
 */
export async function getBlogPosts(options: BlogPostQuery = {}) {
  const { 
    page = 1, 
    limit = 9, 
    category, 
    tag 
  } = options;

  try {
    const result = await getCachedBlogPosts(page, limit, category, tag);
    
    return {
      success: true,
      data: result.posts,
      pagination: {
        page,
        limit,
        total: result.total,
        pages: result.totalPages
      }
    };
  } catch (error) {
    console.error('Get blog posts error:', error);
    return { 
      success: false, 
      message: 'Failed to fetch blog posts',
      data: [],
      pagination: { page: 1, limit, total: 0, pages: 0 }
    };
  }
}

/**
 * Public API for fetching a single blog post by slug
 */
export async function getBlogPostBySlug(slug: string) {
  try {
    const post = await getCachedBlogPostBySlug(slug);
    
    if (!post) {
      return { success: false, message: 'Blog post not found', data: null };
    }
    
    return { success: true, data: post };
  } catch (error) {
    console.error('Get blog post by slug error:', error);
    return { success: false, message: 'Failed to fetch blog post', data: null };
  }
}

/**
 * Gets all unique categories from published posts
 * Cached for 5 minutes
 */
export const getCategories = unstable_cache(
  async () => {
    await connectToDatabase();
    
    const categories = await BlogPost.aggregate([
      { $match: { status: 'published', category: { $exists: true, $ne: '' } } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    return categories.map(c => ({ name: c._id, count: c.count }));
  },
  ['blog-categories'],
  { revalidate: 300, tags: ['blog-categories'] }
);

/**
 * Gets all unique tags from published posts
 * Cached for 5 minutes
 */
export const getTags = unstable_cache(
  async () => {
    await connectToDatabase();
    
    const tags = await BlogPost.aggregate([
      { $match: { status: 'published' } },
      { $unwind: '$tags' },
      { $group: { _id: '$tags', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 20 }
    ]);
    
    return tags.map(t => ({ name: t._id, count: t.count }));
  },
  ['blog-tags'],
  { revalidate: 300, tags: ['blog-tags'] }
);
