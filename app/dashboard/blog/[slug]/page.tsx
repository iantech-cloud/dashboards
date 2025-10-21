// app/dashboard/blog/[slug]/page.tsx
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { connectToDatabase, BlogPost } from '../../../lib/models';

interface BlogPostPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function DashboardBlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;

  await connectToDatabase();

  const post = await BlogPost.findOne({ slug, status: 'published' })
    .populate('author', 'username name email')
    .lean();

  if (!post) {
    notFound();
  }

  const authorDisplayName = post.author?.username || post.author?.name || 'Unknown Author';
  const isUserSubmission = post.metadata?.submitted_via === 'user_content';
  
  // Format dates
  const publishedDate = new Date(post.published_at || post.created_at);
  const formattedDate = publishedDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <div className="mb-6">
          <Link
            href="/dashboard/blog"
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Blog Posts
          </Link>
        </div>

        <article className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {/* Featured Image */}
          {post.featured_image && (
            <div className="w-full h-64 sm:h-80 bg-gray-200">
              <img
                src={post.featured_image}
                alt={post.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          
          {/* Article Content */}
          <div className="p-6 sm:p-8">
            {/* Header */}
            <header className="mb-8">
              {/* Badges */}
              <div className="flex flex-wrap gap-2 mb-4">
                {isUserSubmission && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                    User Submission
                  </span>
                )}
                {post.category && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                    {post.category}
                  </span>
                )}
              </div>

              {/* Title */}
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                {post.title}
              </h1>

              {/* Meta Information */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-sm text-gray-500">
                <div className="flex items-center space-x-4 mb-2 sm:mb-0">
                  <div className="flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span>By {authorDisplayName}</span>
                  </div>
                  <div className="flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <time dateTime={publishedDate.toISOString()}>
                      {formattedDate}
                    </time>
                  </div>
                  <div className="flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{post.read_time || 5} min read</span>
                  </div>
                </div>

                {/* External Link to Public Blog */}
                <Link
                  href={`/blog/${post.slug}`}
                  className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors"
                  target="_blank"
                >
                  View on Public Blog
                  <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </Link>
              </div>
            </header>

            {/* Tags */}
            {post.tags && post.tags.length > 0 && (
              <div className="mb-8">
                <div className="flex flex-wrap gap-2">
                  {post.tags.map((tag: string, index: number) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Excerpt */}
            {post.excerpt && (
              <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-8">
                <p className="text-lg font-medium text-gray-800 italic">
                  {post.excerpt}
                </p>
              </div>
            )}

            {/* Content */}
            <div 
              className="prose prose-lg max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-li:text-gray-700 prose-strong:text-gray-900 prose-a:text-blue-600 hover:prose-a:text-blue-800 prose-blockquote:border-blue-400 prose-blockquote:bg-blue-50 prose-blockquote:text-gray-700"
              dangerouslySetInnerHTML={{ __html: post.content }}
            />

            {/* User Submission Metadata */}
            {isUserSubmission && post.metadata && (
              <div className="mt-12 p-6 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Submission Details</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  {post.metadata.original_submission_date && (
                    <div>
                      <span className="font-medium text-gray-700">Submitted:</span>{' '}
                      <span className="text-gray-600">
                        {new Date(post.metadata.original_submission_date).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  {post.metadata.payment_amount && (
                    <div>
                      <span className="font-medium text-gray-700">Payment:</span>{' '}
                      <span className="text-gray-600">
                        KES {(post.metadata.payment_amount / 100).toLocaleString()}
                      </span>
                    </div>
                  )}
                  {post.metadata.content_type && (
                    <div>
                      <span className="font-medium text-gray-700">Content Type:</span>{' '}
                      <span className="text-gray-600 capitalize">
                        {post.metadata.content_type.replace('_', ' ')}
                      </span>
                    </div>
                  )}
                  {post.metadata.task_category && (
                    <div>
                      <span className="font-medium text-gray-700">Task Category:</span>{' '}
                      <span className="text-gray-600">{post.metadata.task_category}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </article>

        {/* Navigation */}
        <div className="mt-8 flex justify-between">
          <Link
            href="/dashboard/blog"
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to All Posts
          </Link>
          
          <Link
            href={`/blog/${post.slug}`}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            target="_blank"
          >
            View Public Version
            <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}
