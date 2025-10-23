// app/dashboard/blog/page.tsx
import Link from 'next/link';
import { connectToDatabase, BlogPost } from '../../lib/models';
import { cache } from 'react';

// Cache the database queries
const getCachedBlogData = cache(async (page: number, category: string, search: string) => {
  await connectToDatabase();
  
  const limit = 12;
  const skip = (page - 1) * limit;

  // Optimized query - only select fields we need
  const query: any = { status: 'published' };
  
  if (category !== 'all') {
    query.category = category;
  }

  if (search) {
    // Use text search if available, otherwise fallback to regex
    query.$text = { $search: search };
  }

  const selectFields = 'title excerpt featured_image slug category tags read_time published_at author metadata';
  
  const [posts, total, categories] = await Promise.all([
    BlogPost.find(query)
      .select(selectFields)
      .populate('author', 'username name')
      .sort({ published_at: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
      .maxTimeMS(5000), // Timeout after 5 seconds
    BlogPost.countDocuments(query),
    BlogPost.distinct('category', { status: 'published' })
  ]);

  return {
    posts,
    total,
    categories: categories.filter(Boolean),
    totalPages: Math.ceil(total / limit)
  };
});

interface DashboardBlogPageProps {
  searchParams: Promise<{
    page?: string;
    category?: string;
    search?: string;
  }>;
}

// Generate static params for common pages
export async function generateStaticParams() {
  return [
    { page: '1' },
    { page: '2' },
  ];
}

export default async function DashboardBlogPage({ searchParams }: DashboardBlogPageProps) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page || '1'));
  const category = params.category || 'all';
  const search = params.search?.trim() || '';

  try {
    const { posts, total, categories, totalPages } = await getCachedBlogData(page, category, search);

    return (
      <div className="min-h-screen bg-gray-50 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header - Optimized with less DOM nodes */}
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Blog Posts</h1>
                <p className="text-gray-600 mt-2">
                  Read the latest articles and updates
                </p>
              </div>
              <Link
                href="/blog"
                prefetch={true}
                className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors"
              >
                View Public Blog
                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </Link>
            </div>
          </div>

          {/* Search and Filters - Simplified */}
          <SearchFilters search={search} category={category} categories={categories} />

          {/* Blog Posts Grid - Optimized rendering */}
          <BlogPostsGrid 
            posts={posts} 
            search={search} 
            category={category} 
            page={page}
            total={total}
            totalPages={totalPages}
            limit={12}
          />
        </div>
      </div>
    );
  } catch (error) {
    console.error('Blog page error:', error);
    return <ErrorFallback />;
  }
}

// Separate components for better code splitting
function SearchFilters({ search, category, categories }: { 
  search: string; 
  category: string; 
  categories: string[]; 
}) {
  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
      <form className="flex flex-col lg:flex-row gap-3" method="GET">
        <div className="flex-1">
          <div className="relative">
            <input
              type="text"
              name="search"
              placeholder="Search blog posts..."
              defaultValue={search}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>

        <select
          name="category"
          defaultValue={category}
          className="w-full lg:w-48 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="all">All Categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>

        <button
          type="submit"
          className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          Apply
        </button>

        {(search || category !== 'all') && (
          <Link
            href="/dashboard/blog"
            className="px-6 py-2 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 transition-colors text-center"
          >
            Clear
          </Link>
        )}
      </form>
    </div>
  );
}

function BlogPostsGrid({ 
  posts, 
  search, 
  category, 
  page, 
  total, 
  totalPages, 
  limit 
}: { 
  posts: any[];
  search: string;
  category: string;
  page: number;
  total: number;
  totalPages: number;
  limit: number;
}) {
  if (posts.length === 0) {
    return <EmptyState search={search} category={category} />;
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {posts.map((post) => (
          <BlogPostCard key={post._id} post={post} />
        ))}
      </div>

      {totalPages > 1 && (
        <Pagination 
          page={page}
          totalPages={totalPages}
          total={total}
          limit={limit}
          category={category}
          search={search}
        />
      )}
    </>
  );
}

function BlogPostCard({ post }: { post: any }) {
  const authorDisplayName = post.author?.username || post.author?.name || 'Unknown Author';
  const isUserSubmission = post.metadata?.submitted_via === 'user_content';
  
  return (
    <article className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all">
      {post.featured_image && (
        <div className="w-full h-48 bg-gray-200 relative">
          <img
            src={post.featured_image}
            alt={post.title}
            className="w-full h-full object-cover"
            loading="lazy" // Lazy load images
          />
        </div>
      )}
      
      <div className="p-6">
        {isUserSubmission && (
          <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 mb-3">
            User Submission
          </div>
        )}
        
        <div className="flex items-center text-sm text-gray-500 mb-2">
          <time dateTime={post.published_at || post.created_at}>
            {new Date(post.published_at || post.created_at).toLocaleDateString()}
          </time>
          <span className="mx-2">•</span>
          <span>{post.read_time || 5} min read</span>
        </div>
        
        <h2 className="text-xl font-bold text-gray-900 mb-3 line-clamp-2">
          <Link 
            href={`/dashboard/blog/${post.slug}`}
            prefetch={true}
            className="hover:text-blue-600 transition-colors"
          >
            {post.title}
          </Link>
        </h2>
        
        {post.excerpt && (
          <p className="text-gray-600 mb-4 line-clamp-3">
            {post.excerpt}
          </p>
        )}
        
        <div className="space-y-2 mb-4">
          {post.category && (
            <div className="text-sm font-medium text-blue-600">
              {post.category}
            </div>
          )}
          
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {post.tags.slice(0, 2).map((tag: string, index: number) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800"
                >
                  {tag}
                </span>
              ))}
              {post.tags.length > 2 && (
                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
                  +{post.tags.length - 2}
                </span>
              )}
            </div>
          )}
        </div>
        
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <span className="text-sm text-gray-600">
            By {authorDisplayName}
          </span>
          <Link 
            href={`/dashboard/blog/${post.slug}`}
            prefetch={true}
            className="text-blue-600 hover:text-blue-800 font-medium text-sm flex items-center"
          >
            Read
            <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </article>
  );
}

function Pagination({ page, totalPages, total, limit, category, search }: any) {
  const buildHref = (newPage: number) => {
    const params = new URLSearchParams();
    params.set('page', newPage.toString());
    if (category !== 'all') params.set('category', category);
    if (search) params.set('search', search);
    return `/dashboard/blog?${params.toString()}`;
  };

  return (
    <div className="bg-white px-6 py-4 rounded-lg shadow-sm border border-gray-200">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-700">
          Showing <span className="font-medium">{(page - 1) * limit + 1}</span> to{' '}
          <span className="font-medium">{Math.min(page * limit, total)}</span>{' '}
          of <span className="font-medium">{total}</span> posts
        </div>
        <div className="flex space-x-2">
          {page > 1 && (
            <Link
              href={buildHref(page - 1)}
              prefetch={true}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Previous
            </Link>
          )}
          {page < totalPages && (
            <Link
              href={buildHref(page + 1)}
              prefetch={true}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Next
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ search, category }: { search: string; category: string }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
      <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
      <h3 className="mt-4 text-lg font-medium text-gray-900">No blog posts found</h3>
      <p className="mt-2 text-gray-500 max-w-md mx-auto">
        {search || category !== 'all' 
          ? 'Try adjusting your search terms or filters.' 
          : 'No blog posts have been published yet.'
        }
      </p>
      {(search || category !== 'all') && (
        <Link
          href="/dashboard/blog"
          className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors"
        >
          View All Posts
        </Link>
      )}
    </div>
  );
}

function ErrorFallback() {
  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm border border-red-200 p-8 text-center">
          <svg className="mx-auto h-16 w-16 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">Unable to load blog posts</h3>
          <p className="mt-2 text-gray-500">Please try refreshing the page.</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            Refresh Page
          </button>
        </div>
      </div>
    </div>
  );
}
