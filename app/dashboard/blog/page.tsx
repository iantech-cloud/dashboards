// app/dashboard/blog/page.tsx
import Link from 'next/link';
import { connectToDatabase, BlogPost } from '../../lib/models';

interface DashboardBlogPageProps {
  searchParams: Promise<{
    page?: string;
    category?: string;
    search?: string;
  }>;
}

export default async function DashboardBlogPage({ searchParams }: DashboardBlogPageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || '1');
  const category = params.category || 'all';
  const search = params.search || '';
  const limit = 12;
  const skip = (page - 1) * limit;

  await connectToDatabase();

  // Build query
  const query: any = { status: 'published' };
  
  if (category !== 'all') {
    query.category = category;
  }

  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { excerpt: { $regex: search, $options: 'i' } },
      { content: { $regex: search, $options: 'i' } },
      { tags: { $in: [new RegExp(search, 'i')] } }
    ];
  }

  const [posts, total, categories] = await Promise.all([
    BlogPost.find(query)
      .populate('author', 'username name')
      .sort({ published_at: -1, created_at: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    BlogPost.countDocuments(query),
    BlogPost.distinct('category', { status: 'published' })
  ]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Blog Posts</h1>
              <p className="text-gray-600 mt-2">
                Read the latest articles and updates from our community
              </p>
            </div>
            <Link
              href="/blog"
              className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              View Public Blog
              <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </Link>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
          <form className="flex flex-col lg:flex-row gap-4" method="GET">
            {/* Search Input */}
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

            {/* Category Filter */}
            <div>
              <select
                name="category"
                defaultValue={category}
                className="w-full lg:w-auto px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Categories</option>
                {categories.filter(Boolean).map((cat: string) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Apply Filters
            </button>

            {/* Clear Filters */}
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

        {/* Blog Posts Grid */}
        {posts.length === 0 ? (
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
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {posts.map((post: any) => {
                const authorDisplayName = post.author?.username || post.author?.name || 'Unknown Author';
                const isUserSubmission = post.metadata?.submitted_via === 'user_content';
                
                return (
                  <article key={post._id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all">
                    {/* Featured Image */}
                    {post.featured_image && (
                      <div className="w-full h-48 bg-gray-200">
                        <img
                          src={post.featured_image}
                          alt={post.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    
                    {/* Content */}
                    <div className="p-6">
                      {/* Badge for user submissions */}
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
                      
                      {/* Category and Tags */}
                      <div className="space-y-2 mb-4">
                        {post.category && (
                          <div className="text-sm font-medium text-blue-600">
                            {post.category}
                          </div>
                        )}
                        
                        {post.tags && post.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {post.tags.slice(0, 3).map((tag: string, index: number) => (
                              <span
                                key={index}
                                className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800"
                              >
                                {tag}
                              </span>
                            ))}
                            {post.tags.length > 3 && (
                              <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                +{post.tags.length - 3} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-600">
                            By {authorDisplayName}
                          </span>
                        </div>
                        <Link 
                          href={`/dashboard/blog/${post.slug}`}
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
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="bg-white px-6 py-4 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Showing <span className="font-medium">{(page - 1) * limit + 1}</span> to{' '}
                    <span className="font-medium">
                      {Math.min(page * limit, total)}
                    </span>{' '}
                    of <span className="font-medium">{total}</span> posts
                  </div>
                  <div className="flex space-x-2">
                    {page > 1 && (
                      <Link
                        href={`/dashboard/blog?page=${page - 1}${category !== 'all' ? `&category=${category}` : ''}${search ? `&search=${search}` : ''}`}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        Previous
                      </Link>
                    )}
                    {page < totalPages && (
                      <Link
                        href={`/dashboard/blog?page=${page + 1}${category !== 'all' ? `&category=${category}` : ''}${search ? `&search=${search}` : ''}`}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        Next
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
