// app/blog/page.tsx - FULL OPTIMIZED VERSION
import Link from 'next/link';
import Image from 'next/image';
import { unstable_cache } from 'next/cache';
import { connectToDatabase, BlogPost } from '../lib/models';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Calendar, Clock, User, ArrowRight, Tag, BookOpen, TrendingUp } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Blog - Latest News & Updates',
  description: 'Read the latest news, updates, and insights from Hustle Hub Africa. Discover earning tips, platform updates, success stories, and more.',
  keywords: ['blog', 'news', 'updates', 'earning tips', 'kenya', 'online money'],
  alternates: {
    canonical: '/blog',
  },
  openGraph: {
    title: 'Blog',
    description: 'Latest news, updates, and insights about earning money online in Kenya.',
    type: 'website',
  },
};

// Cached database queries
const getCachedBlogPosts = unstable_cache(
  async (page: number, limit: number) => {
    await connectToDatabase();
    const skip = (page - 1) * limit;
    
    const posts = await BlogPost.find({ status: 'published' })
      .populate('author', 'username name')
      .sort({ published_at: -1, created_at: -1 })
      .skip(skip)
      .limit(limit)
      .select('_id title slug excerpt featured_image tags read_time created_at updated_at author status')
      .lean();

    return posts.map(post => ({
      ...post,
      _id: post._id.toString(),
      created_at: post.created_at?.toISOString(),
      updated_at: post.updated_at?.toISOString(),
    }));
  },
  ['blog-posts'],
  { revalidate: 3600 } // 1 hour
);

const getCachedTotalCount = unstable_cache(
  async () => {
    await connectToDatabase();
    return BlogPost.countDocuments({ status: 'published' });
  },
  ['blog-posts-count'],
  { revalidate: 3600 }
);

interface BlogPageProps {
  searchParams: Promise<{
    page?: string;
  }>;
}

// Generate static pages for first few pages
export async function generateStaticParams() {
  return [
    { page: '1' },
    { page: '2' },
    { page: '3' },
  ];
}

export default async function BlogPage({ searchParams }: BlogPageProps) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page || '1'));
  const limit = 9;

  // Parallel data fetching
  const [posts, total] = await Promise.all([
    getCachedBlogPosts(page, limit),
    getCachedTotalCount()
  ]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-blue-50/20 to-cyan-50/20">
      {/* Static background elements - reduced animation */}
      <div className="fixed top-0 right-0 w-96 h-96 bg-gradient-to-bl from-blue-400/5 to-transparent rounded-full blur-3xl pointer-events-none"></div>
      <div className="fixed bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-cyan-400/5 to-transparent rounded-full blur-3xl pointer-events-none"></div>

      <Header />
      
      <main className="flex-grow py-8 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 shadow-lg shadow-blue-500/30 mb-4">
              <BookOpen className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent mb-4">
              Our Blog Latest News & Updates
            </h1>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto mb-6">
              Latest news, updates, and insights from our team
            </p>
            
            {/* Stats */}
            <div className="inline-flex items-center gap-6 bg-white/80 backdrop-blur-sm px-6 py-3 rounded-xl shadow-lg border border-white/50">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-semibold text-slate-700">
                  {total} {total === 1 ? 'Article' : 'Articles'}
                </span>
              </div>
              <div className="w-px h-4 bg-slate-300"></div>
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-cyan-600" />
                <span className="text-sm font-semibold text-slate-700">
                  Page {page} of {totalPages}
                </span>
              </div>
            </div>
          </div>

          {/* Blog Posts Grid */}
          {posts.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                {posts.map((post, index) => (
                  <BlogPostCard key={post._id} post={post} index={index} />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <Pagination page={page} totalPages={totalPages} />
              )}
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

// Empty state component
function EmptyState() {
  return (
    <div className="text-center py-16">
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 p-12 max-w-md mx-auto">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center mx-auto mb-6">
          <BookOpen className="w-8 h-8 text-slate-400" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-2">No blog posts yet</h3>
        <p className="text-slate-500">Check back later for new content and insights.</p>
      </div>
    </div>
  );
}

// Blog post card component
function BlogPostCard({ post, index }: { post: any; index: number }) {
  const authorDisplayName = post.author?.username || post.author?.name || 'Unknown Author';
  
  return (
    <article 
      className="group bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/50 overflow-hidden hover:shadow-xl transition-all duration-300 hover:scale-105"
    >
      {/* Featured Image */}
      {post.featured_image ? (
        <div className="relative w-full h-48 bg-gradient-to-br from-slate-200 to-slate-300 overflow-hidden">
          <Image
            src={post.featured_image}
            alt={post.title}
            width={400}
            height={225}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            placeholder="blur"
            blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaUMk9fa&s"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        </div>
      ) : (
        <div className="w-full h-48 bg-gradient-to-br from-blue-100 via-cyan-50 to-blue-100 flex items-center justify-center">
          <BookOpen className="w-12 h-12 text-blue-300" />
        </div>
      )}
      
      {/* Content */}
      <div className="p-6">
        {/* Metadata */}
        <div className="flex items-center gap-3 text-sm text-slate-500 mb-3">
          <div className="flex items-center gap-1">
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
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4 text-cyan-500" />
            <span>{post.read_time || 5} min read</span>
          </div>
        </div>
        
        {/* Title */}
        <h2 className="text-lg font-bold text-slate-900 mb-3 line-clamp-2 group-hover:text-blue-600 transition-colors duration-300 leading-tight">
          <Link 
            href={`/blog/${post.slug}`}
            className="hover:underline decoration-2 underline-offset-2"
          >
            {post.title}
          </Link>
        </h2>
        
        {/* Excerpt */}
        {post.excerpt && (
          <p className="text-slate-600 mb-4 line-clamp-3 leading-relaxed text-sm">
            {post.excerpt}
          </p>
        )}
        
        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {post.tags.slice(0, 2).map((tag: string, tagIndex: number) => (
              <span
                key={tagIndex}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold bg-gradient-to-r from-blue-50 to-cyan-50 text-blue-700 border border-blue-200"
              >
                <Tag className="w-3 h-3" />
                {tag}
              </span>
            ))}
            {post.tags.length > 2 && (
              <span className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-600">
                +{post.tags.length - 2}
              </span>
            )}
          </div>
        )}
        
        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-md">
              <User className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-medium text-slate-700 truncate max-w-[100px]">
              {authorDisplayName}
            </span>
          </div>
          <Link 
            href={`/blog/${post.slug}`}
            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-semibold text-sm transition-all duration-200 group/link"
          >
            Read
            <ArrowRight className="w-4 h-4 group-hover/link:translate-x-0.5 transition-transform duration-200" />
          </Link>
        </div>
      </div>
    </article>
  );
}

// Pagination component
function Pagination({ page, totalPages }: { page: number; totalPages: number }) {
  const getVisiblePages = () => {
    const pages = [];
    const showPages = 5;
    let start = Math.max(1, page - Math.floor(showPages / 2));
    let end = Math.min(totalPages, start + showPages - 1);
    
    if (end - start + 1 < showPages) {
      start = Math.max(1, end - showPages + 1);
    }
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    
    return pages;
  };

  return (
    <div className="flex justify-center">
      <nav className="flex items-center gap-1 bg-white/80 backdrop-blur-sm px-3 py-2 rounded-xl shadow-lg border border-white/50">
        {/* Previous Button */}
        {page > 1 && (
          <Link
            href={`/blog?page=${page - 1}`}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-white text-slate-700 font-semibold hover:bg-slate-50 transition-all duration-200 border border-slate-200 hover:border-slate-300 text-sm"
            prefetch={false}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Prev
          </Link>
        )}

        {/* First Page */}
        {!getVisiblePages().includes(1) && (
          <>
            <Link
              href="/blog?page=1"
              className="min-w-[40px] px-3 py-2 rounded-lg font-semibold transition-all duration-200 text-sm bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 hover:border-slate-300"
              prefetch={false}
            >
              1
            </Link>
            <span className="px-2 text-slate-400">...</span>
          </>
        )}

        {/* Page Numbers */}
        {getVisiblePages().map((pageNum) => (
          <Link
            key={pageNum}
            href={`/blog?page=${pageNum}`}
            className={`min-w-[40px] px-3 py-2 rounded-lg font-semibold transition-all duration-200 text-sm ${
              pageNum === page
                ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-500/30'
                : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 hover:border-slate-300'
            }`}
            prefetch={pageNum === page || pageNum === page + 1 || pageNum === page - 1}
          >
            {pageNum}
          </Link>
        ))}

        {/* Last Page */}
        {!getVisiblePages().includes(totalPages) && totalPages > 0 && (
          <>
            <span className="px-2 text-slate-400">...</span>
            <Link
              href={`/blog?page=${totalPages}`}
              className="min-w-[40px] px-3 py-2 rounded-lg font-semibold transition-all duration-200 text-sm bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 hover:border-slate-300"
              prefetch={false}
            >
              {totalPages}
            </Link>
          </>
        )}

        {/* Next Button */}
        {page < totalPages && (
          <Link
            href={`/blog?page=${page + 1}`}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-white text-slate-700 font-semibold hover:bg-slate-50 transition-all duration-200 border border-slate-200 hover:border-slate-300 text-sm"
            prefetch={false}
          >
            Next
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        )}
      </nav>
    </div>
  );
}
