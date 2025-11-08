// app/blog/[slug]/page.tsx - WITH PROPER METADATA
import { notFound } from 'next/navigation';
import { connectToDatabase, BlogPost } from '../../lib/models';
import Link from 'next/link';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import BlogContent from './BlogContent';
import { ArrowLeft, Calendar, Clock, User, Tag, Share2, Bookmark, TrendingUp } from 'lucide-react';
import type { Metadata } from 'next';

interface BlogPostPageProps {
  params: Promise<{
    slug: string;
  }>;
}

// Generate metadata for SEO with dynamic canonical URLs
export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  
  await connectToDatabase();
  const post = await BlogPost.findOne({ slug, status: 'published' })
    .populate('author', 'username name')
    .lean();

  if (!post) {
    return {
      title: 'Post Not Found',
      description: 'The blog post you are looking for could not be found.',
    };
  }

  const authorDisplayName = post.author?.username || post.author?.name || 'Unknown Author';
  const title = post.meta_title || post.title;
  const description = post.meta_description || post.excerpt || post.title;

  return {
    title,
    description,
    keywords: post.tags || [],
    authors: [{ name: authorDisplayName }],
    
    // Dynamic canonical URL based on slug
    alternates: {
      canonical: `/blog/${slug}`,
      languages: {
        'en-KE': `/blog/${slug}`,
        'sw-KE': `/sw/blog/${slug}`,
      },
    },
    
    openGraph: {
      title,
      description,
      url: `https://hustlehubafrica.com/blog/${slug}`,
      type: 'article',
      publishedTime: post.published_at?.toISOString() || post.created_at.toISOString(),
      modifiedTime: post.updated_at?.toISOString(),
      authors: [authorDisplayName],
      tags: post.tags || [],
      images: post.featured_image ? [
        {
          url: post.featured_image,
          width: 1200,
          height: 630,
          alt: post.title,
        }
      ] : [
        {
          url: '/og-image-blog.png',
          width: 1200,
          height: 630,
          alt: 'Hustle Hub Africa Blog',
        }
      ],
    },
    
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: post.featured_image ? [post.featured_image] : ['/og-image-blog.png'],
    },
  };
}

// Generate static params for better performance
export async function generateStaticParams() {
  await connectToDatabase();
  const posts = await BlogPost.find({ status: 'published' }).select('slug').lean();
  
  return posts.map((post) => ({
    slug: post.slug,
  }));
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;

  await connectToDatabase();
  
  // Find the blog post by slug and populate author info
  const post = await BlogPost.findOne({ slug, status: 'published' })
    .populate('author', 'username name')
    .lean();

  if (!post) {
    notFound();
  }

  // Format the date
  const formattedDate = new Date(post.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Get author display name (username first, fallback to name)
  const authorDisplayName = post.author?.username || post.author?.name || 'Unknown Author';

  // Serialize the post data
  const serializedPost = {
    ...post,
    _id: post._id.toString(),
    created_at: post.created_at.toISOString(),
    updated_at: post.updated_at?.toISOString(),
    published_at: post.published_at?.toISOString(),
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-blue-50/20 to-cyan-50/20 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-blue-400/10 to-transparent rounded-full blur-3xl animate-pulse pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-cyan-400/10 to-transparent rounded-full blur-3xl animate-pulse delay-1000 pointer-events-none"></div>

      <Header />
      
      <main className="flex-grow py-8 relative z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Back to Blogs Link */}
          <div className="mb-8 animate-slideUp">
            <Link 
              href="/blog" 
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-semibold transition-all duration-200 group bg-white/70 backdrop-blur-sm px-4 py-2 rounded-xl border border-blue-200 hover:border-blue-300 hover:shadow-md"
            >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform duration-200" />
              Back to All Posts
            </Link>
          </div>

          {/* Blog Post Article */}
          <article className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-white/50 animate-scaleIn">
            {/* Featured Image */}
            {post.featured_image && (
              <div className="relative w-full h-64 md:h-[500px] bg-gradient-to-br from-slate-200 to-slate-300 overflow-hidden">
                <img
                  src={post.featured_image}
                  alt={post.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
                
                {/* Floating stats badge */}
                <div className="absolute bottom-6 right-6 flex gap-3">
                  <div className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-full shadow-lg border border-white/50 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-semibold text-slate-700">{post.views || 0} views</span>
                  </div>
                  <div className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-full shadow-lg border border-white/50 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-cyan-600" />
                    <span className="text-sm font-semibold text-slate-700">{post.read_time} min</span>
                  </div>
                </div>
              </div>
            )}

            {/* Post Content */}
            <div className="p-6 md:p-10 lg:p-12">
              {/* Title */}
              <h1 className="text-3xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent mb-6 leading-tight">
                {post.title}
              </h1>

              {/* Author Card */}
              <div className="flex items-center justify-between flex-wrap gap-4 mb-8 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-2xl border border-blue-200">
                <div className="flex items-center gap-4">
                  {/* Author Avatar */}
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/30">
                    <User className="w-7 h-7 text-white" />
                  </div>
                  
                  {/* Author Info */}
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg font-bold text-slate-900">{authorDisplayName}</span>
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">Author</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-blue-500" />
                        <span>{formattedDate}</span>
                      </div>
                      <span className="w-1 h-1 rounded-full bg-slate-400"></span>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-cyan-500" />
                        <span>{post.read_time} min read</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <button 
                    className="p-2.5 bg-white hover:bg-blue-50 rounded-xl border border-slate-200 hover:border-blue-300 transition-all duration-200 group"
                    aria-label="Share this post"
                  >
                    <Share2 className="w-5 h-5 text-slate-600 group-hover:text-blue-600 transition-colors duration-200" />
                  </button>
                  <button 
                    className="p-2.5 bg-white hover:bg-cyan-50 rounded-xl border border-slate-200 hover:border-cyan-300 transition-all duration-200 group"
                    aria-label="Bookmark this post"
                  >
                    <Bookmark className="w-5 h-5 text-slate-600 group-hover:text-cyan-600 transition-colors duration-200" />
                  </button>
                </div>
              </div>

              {/* Tags */}
              {post.tags && post.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-8">
                  {post.tags.map((tag: string, index: number) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-blue-50 to-cyan-50 text-blue-700 border border-blue-200 hover:border-blue-300 transition-all duration-200 hover:shadow-md cursor-pointer"
                    >
                      <Tag className="w-4 h-4" />
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Excerpt */}
              {post.excerpt && (
                <div className="relative bg-gradient-to-r from-blue-50 via-cyan-50 to-blue-50 border-l-4 border-blue-500 p-6 mb-8 rounded-r-2xl shadow-md overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-blue-100/50 to-transparent rounded-full"></div>
                  <p className="text-lg text-slate-700 italic leading-relaxed relative z-10 font-medium">
                    "{post.excerpt}"
                  </p>
                </div>
              )}

              {/* Divider */}
              <div className="h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent mb-8"></div>

              {/* Content - Use client component for MathJax rendering */}
              <div className="prose prose-lg max-w-none">
                <BlogContent content={post.content} />
              </div>

              {/* Post Footer */}
              <div className="mt-12 pt-8 border-t-2 border-slate-200">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-lg">
                      <User className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-600 mb-1">Written by</p>
                      <p className="font-bold text-slate-900">{authorDisplayName}</p>
                    </div>
                  </div>

                  {/* Share Button */}
                  <div className="flex gap-2">
                    <button 
                      className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-blue-600 transition-all duration-200 shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 flex items-center gap-2"
                      aria-label="Share this post"
                    >
                      <Share2 className="w-4 h-4" />
                      Share
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </article>

          {/* Navigation */}
          <div className="mt-12 flex justify-center">
            <Link 
              href="/blog" 
              className="inline-flex items-center gap-3 px-8 py-4 bg-white/70 backdrop-blur-xl text-blue-600 hover:text-blue-800 font-bold rounded-2xl border-2 border-blue-200 hover:border-blue-300 transition-all duration-200 shadow-lg hover:shadow-xl group"
            >
              <ArrowLeft className="w-6 h-6 group-hover:-translate-x-2 transition-transform duration-200" />
              Explore More Articles
            </Link>
          </div>

          {/* Related Posts Section (Placeholder) */}
          <div className="mt-16 bg-white/70 backdrop-blur-xl rounded-3xl shadow-lg border border-white/50 p-8">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent mb-6">
              You might also like
            </h2>
            <div className="text-center text-slate-500 py-8">
              Related posts coming soon...
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
