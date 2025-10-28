// app/blog/page.tsx
import Link from 'next/link';
import { connectToDatabase, BlogPost } from '../lib/models';
import Header from '../components/Header';
import Footer from '../components/Footer';

interface BlogPageProps {
  searchParams: Promise<{
    page?: string;
  }>;
}

export default async function BlogPage({ searchParams }: BlogPageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || '1');
  const limit = 9;
  const skip = (page - 1) * limit;

  await connectToDatabase();

  const [posts, total] = await Promise.all([
    BlogPost.find({ status: 'published' })
      .populate('author', 'username name') // Updated to use username
      .sort({ published_at: -1, created_at: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    BlogPost.countDocuments({ status: 'published' })
  ]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      
      <main className="flex-grow bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Blog</h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Latest news, updates, and insights from our team
            </p>
          </div>

          {/* Blog Posts Grid */}
          {posts.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <h3 className="mt-2 text-lg font-medium text-gray-900">No blog posts yet</h3>
              <p className="mt-1 text-gray-500">Check back later for new content.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
                {posts.map((post: any) => {
                  // Get author display name (username first, fallback to name)
                  const authorDisplayName = post.author?.username || post.author?.name || 'Unknown';
                  
                  return (
                    <article key={post._id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
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
                        <div className="flex items-center text-sm text-gray-500 mb-2">
                          <time dateTime={post.created_at}>
                            {new Date(post.created_at).toLocaleDateString()}
                          </time>
                          <span className="mx-2">•</span>
                          <span>{post.read_time} min read</span>
                        </div>
                        
                        <h2 className="text-xl font-bold text-gray-900 mb-3 line-clamp-2">
                          <Link 
                            href={`/blog/${post.slug}`}
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
                        
                        {/* Tags */}
                        {post.tags && post.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-4">
                            {post.tags.slice(0, 3).map((tag: string, index: number) => (
                              <span
                                key={index}
                                className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">
                            By {authorDisplayName}
                          </span>
                          <Link 
                            href={`/blog/${post.slug}`}
                            className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                          >
                            Read more →
                          </Link>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center">
                  <nav className="flex items-center space-x-2">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                      <Link
                        key={pageNum}
                        href={`/blog?page=${pageNum}`}
                        className={`px-4 py-2 border rounded-lg ${
                          pageNum === page
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                    </Link>
                    ))}
                  </nav>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
