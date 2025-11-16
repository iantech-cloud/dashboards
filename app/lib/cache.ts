// lib/cache.js
import { unstable_cache } from 'next/cache';

export const getCachedBlogPosts = unstable_cache(
  async (page = 1, limit = 9) => {
    await connectToDatabase();
    const skip = (page - 1) * limit;
    
    return BlogPost.find({ status: 'published' })
      .populate('author', 'username name')
      .sort({ published_at: -1, created_at: -1 })
      .skip(skip)
      .limit(limit)
      .select('_id title slug excerpt featured_image tags read_time created_at author')
      .lean();
  },
  ['blog-posts'],
  { revalidate: 3600 } // 1 hour cache
);

export const getCachedBlogPost = unstable_cache(
  async (slug: string) => {
    await connectToDatabase();
    return BlogPost.findOne({ slug, status: 'published' })
      .populate('author', 'username name')
      .select('_id title slug content excerpt featured_image tags read_time views created_at updated_at published_at author meta_title meta_description')
      .lean();
  },
  ['blog-post'],
  { revalidate: 3600 }
);
