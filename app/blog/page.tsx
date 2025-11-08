// app/blog/page.tsx - WITH PROPER METADATA
import Link from 'next/link';
import { connectToDatabase, BlogPost } from '../lib/models';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Calendar, Clock, User, ArrowRight, Tag, BookOpen, TrendingUp } from 'lucide-react';
import type { Metadata } from 'next';

// Export metadata for SEO
export const metadata: Metadata = {
  title: 'Blog - Latest News & Updates',
  description: 'Read the latest news, updates, and insights from Hustle Hub Africa. Discover earning tips, platform updates, success stories, and more on our blog.',
  keywords: [
    'hustle hub africa blog',
    'make money online tips kenya',
    'earn online updates',
    'online earning blog kenya',
    'work from home tips',
    'freelance tips kenya',
  ],
  
  // Canonical URL - Next.js will combine with metadataBase
  alternates: {
    canonical: '/blog',
    languages: {
      'en-KE': '/blog',
      'sw-KE': '/sw/blog',
    },
  },
  
  openGraph: {
    title: 'Blog - Hustle Hub Africa',
    description: 'Latest news, updates, and insights about earning money online in Kenya.',
    url: 'https://hustlehubafrica.com/blog',
    type: 'website',
    images: [
      {
        url: '/og-image-blog.png',
        width: 1200,
        height: 630,
        alt: 'Hustle Hub Africa Blog',
      },
    ],
  },
  
  twitter: {
    card: 'summary_large_image',
    title: 'Blog - Hustle Hub Africa',
    description: 'Latest news and insights about earning money online in Kenya.',
    images: ['/og-image-blog.png'],
  },
};

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
      .populate('author', 'username name')
      .sort({ published_at: -1, created_at: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    BlogPost.countDocuments({ status: 'published' })
  ]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-blue-50/20 to-cyan-50/20 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-blue-400/10 to-transparent rounded-full blur-3xl animate-pulse pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-cyan-400/10 to-transparent rounded-full blur-3xl animate-pulse delay-1000 pointer-events-none"></div>

      <Header />
      
      <main className="flex-grow py-12 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header with Glassmorphism */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 shadow-lg shadow-blue-500/30 mb-6 animate-scaleIn">
              <BookOpen className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent mb-4 animate-slideUp">
              Blog
            </h1>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto animate-slideUp delay-100">
              Latest news, updates, and insights from our team
            </p>
            
            {/* Stats Bar */}
            <div className="mt-8 inline-flex items-center gap-6 bg-white/70 backdrop-blur-xl px-8 py-4 rounded-2xl shadow-lg border border-white/50">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-semibold text-slate-700">
                  {total} {total === 1 ? 'Article' : 'Articles'}
                </span>
              </div>
              <div className="w-px h-6 bg-slate-300"></div>
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-cyan-600" />
                <span className="text-sm font-semibold text-slate-700">
                  Page {page} of {totalPages}
                </span>
              </div>
            </div>
          </div>

          {/* Blog Posts Grid */}
          {posts.length === 0 ? (
            <div className="text-center py-20">
              <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-lg border border-white/50 p-12 max-w-md mx-auto">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center mx-auto mb-6">
                  <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">No blog posts yet</h3>
                <p className="text-slate-500">Check back later for new content and insights.</p>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
                {posts.map((post: any, index: number) => {
                  const authorDisplayName = post.author?.username || post.author?.name || 'Unknown';
                  
                  return (
                    <article 
                      key={post._id} 
                      className="group relative bg-white/70 backdrop-blur-xl rounded-3xl shadow-lg border border-white/50 overflow-hidden hover:shadow-2xl transition-all duration-300 hover:scale-105 hover:-translate-y-2 animate-slideUp"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      {/* Hover glow effect */}
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>

                      {/* Featured Image */}
                      {post.featured_image ? (
                        <div className="relative w-full h-56 bg-gradient-to-br from-slate-200 to-slate-300 overflow-hidden">
                          <img
                            src={post.featured_image}
                            alt={post.title}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                          
                          {/* Floating badge on hover */}
                          <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                            <div className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full shadow-lg border border-white/50">
                              <span className="text-xs font-semibold text-blue-600">Featured</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="w-full h-56 bg-gradient-to-br from-blue-100 via-cyan-50 to-blue-100 flex items-center justify-center">
                          <BookOpen className="w-16 h-16 text-blue-300" />
                        </div>
                      )}
                      
                      {/* Content */}
                      <div className="relative p-6">
                        {/* Metadata */}
                        <div className="flex items-center gap-3 text-sm text-slate-500 mb-3">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-4 h-4 text-blue-500" />
                            <time dateTime={post.created_at}>
                              {new Date(post.created_at).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </time>
                          </div>
                          <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-4 h-4 text-cyan-500" />
                            <span>{post.read_time} min read</span>
                          </div>
                        </div>
                        
                        {/* Title */}
                        <h2 className="text-xl font-bold text-slate-900 mb-3 line-clamp-2 group-hover:text-blue-600 transition-colors duration-300">
                          <Link 
                            href={`/blog/${post.slug}`}
                            className="hover:underline decoration-2 underline-offset-2"
                          >
                            {post.title}
                          </Link>
                        </h2>
                        
                        {/* Excerpt */}
                        {post.excerpt && (
                          <p className="text-slate-600 mb-4 line-clamp-3 leading-relaxed">
                            {post.excerpt}
                          </p>
                        )}
                        
                        {/* Tags */}
                        {post.tags && post.tags.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-4">
                            {post.tags.slice(0, 3).map((tag: string, tagIndex: number) => (
                              <span
                                key={tagIndex}
                                className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-blue-50 to-cyan-50 text-blue-700 border border-blue-200 hover:border-blue-300 transition-colors duration-200"
                              >
                                <Tag className="w-3 h-3" />
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                        
                        {/* Footer */}
                        <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-md">
                              <User className="w-4 h-4 text-white" />
                            </div>
                            <span className="text-sm font-medium text-slate-700">
                              {authorDisplayName}
                            </span>
                          </div>
                          <Link 
                            href={`/blog/${post.slug}`}
                            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-semibold text-sm group/link transition-all duration-200"
                          >
                            Read more
                            <ArrowRight className="w-4 h-4 group-hover/link:translate-x-1 transition-transform duration-200" />
                          </Link>
                        </div>
                      </div>

                      {/* Corner accent */}
                      <div className="absolute bottom-0 right-0 w-24 h-24 bg-gradient-to-tl from-blue-100/50 to-transparent rounded-tl-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                    </article>
                  );
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center">
                  <nav className="flex items-center gap-2 bg-white/70 backdrop-blur-xl px-4 py-3 rounded-2xl shadow-lg border border-white/50">
                    {/* Previous Button */}
                    {page > 1 && (
                      <Link
                        href={`/blog?page=${page - 1}`}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/50 text-slate-700 font-semibold hover:bg-white hover:text-blue-600 transition-all duration-200 border border-slate-200 hover:border-blue-300 hover:shadow-md"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Previous
                      </Link>
                    )}

                    {/* Page Numbers */}
                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                        // Show first page, last page, current page, and pages around current
                        const showPage = pageNum === 1 || 
                                        pageNum === totalPages || 
                                        (pageNum >= page - 1 && pageNum <= page + 1);
                        
                        // Show ellipsis
                        const showEllipsis = (pageNum === page - 2 && page > 3) || 
                                            (pageNum === page + 2 && page < totalPages - 2);

                        if (!showPage && !showEllipsis) return null;

                        if (showEllipsis) {
                          return (
                            <span key={pageNum} className="px-3 py-2 text-slate-400">
                              ...
                            </span>
                          );
                        }

                        return (
                          <Link
                            key={pageNum}
                            href={`/blog?page=${pageNum}`}
                            className={`min-w-[44px] px-4 py-2 rounded-xl font-semibold transition-all duration-200 ${
                              pageNum === page
                                ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-500/30 scale-105'
                                : 'bg-white/50 text-slate-700 hover:bg-white hover:text-blue-600 border border-slate-200 hover:border-blue-300 hover:shadow-md'
                            }`}
                          >
                            {pageNum}
                          </Link>
                        );
                      })}
                    </div>

                    {/* Next Button */}
                    {page < totalPages && (
                      <Link
                        href={`/blog?page=${page + 1}`}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/50 text-slate-700 font-semibold hover:bg-white hover:text-blue-600 transition-all duration-200 border border-slate-200 hover:border-blue-300 hover:shadow-md"
                      >
                        Next
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    )}
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
