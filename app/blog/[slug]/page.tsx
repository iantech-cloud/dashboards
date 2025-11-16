// app/blog/[slug]/page.tsx - FULL OPTIMIZED VERSION
export const dynamic = 'force-dynamic';
export const revalidate = 3600; // 1 hour cache

import { notFound } from 'next/navigation';
import Image from 'next/image';
import { unstable_cache } from 'next/cache';
import { connectToDatabase, BlogPost } from '../../lib/models';
import Link from 'next/link';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import BlogContent from './BlogContent';
import ShareButton from './ShareButton';
import { ArrowLeft, Calendar, Clock, User, Tag, Bookmark, TrendingUp } from 'lucide-react';
import type { Metadata } from 'next';

// Cached blog post query
const getCachedBlogPost = unstable_cache(
  async (slug: string) => {
    await connectToDatabase();
    const post = await BlogPost.findOne({ slug, status: 'published' })
      .populate('author', 'username name')
      .select('_id title slug content excerpt featured_image tags read_time views created_at updated_at published_at author meta_title meta_description status')
      .lean();

    if (!post) return null;

    return {
      ...post,
      _id: post._id.toString(),
      created_at: post.created_at?.toISOString(),
      updated_at: post.updated_at?.toISOString(),
      published_at: post.published_at?.toISOString(),
    };
  },
  ['blog-post'],
  { revalidate: 3600 }
);

// Cached static params
const getCachedStaticParams = unstable_cache(
  async () => {
    await connectToDatabase();
    const posts = await BlogPost.find({ status: 'published' })
      .select('slug')
      .limit(100) // Limit for build performance
      .lean();
    
    return posts.map((post) => ({
      slug: post.slug,
    }));
  },
  ['static-params'],
  { revalidate: 86400 } // 24 hours
);

interface BlogPostPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getCachedBlogPost(slug);

  if (!post) {
    return {
      title: 'Post Not Found - Hustle Hub Africa',
      description: 'The blog post you are looking for could not be found.',
    };
  }

  const authorDisplayName = post.author?.username || post.author?.name || 'Unknown Author';
  const title = post.meta_title || post.title || 'Blog Post';
  const description = post.meta_description || post.excerpt || post.title || 'Read our latest blog post';

  return {
    title,
    description,
    keywords: Array.isArray(post.tags) ? post.tags : [],
    authors: [{ name: authorDisplayName }],
    alternates: {
      canonical: `/blog/${slug}`,
    },
    openGraph: {
      title,
      description,
      type: 'article',
      publishedTime: post.published_at || post.created_at || new Date().toISOString(),
      modifiedTime: post.updated_at || new Date().toISOString(),
      authors: [authorDisplayName],
      tags: Array.isArray(post.tags) ? post.tags : [],
      images: post.featured_image ? [
        {
          url: post.featured_image,
          width: 1200,
          height: 630,
          alt: post.title || 'Blog post image',
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

export async function generateStaticParams() {
  return await getCachedStaticParams();
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = await getCachedBlogPost(slug);

  if (!post) {
    notFound();
  }

  const formattedDate = post.created_at 
    ? new Date(post.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : 'Unknown date';

  const authorDisplayName = post.author?.username || post.author?.name || 'Unknown Author';

  // Serialize post data
  const serializedPost = {
    ...post,
    title: post.title || 'Untitled Post',
    content: post.content || '<p>No content available.</p>',
    excerpt: post.excerpt || '',
    featured_image: post.featured_image || null,
    tags: Array.isArray(post.tags) ? post.tags : [],
    read_time: typeof post.read_time === 'number' ? post.read_time : 5,
    views: typeof post.views === 'number' ? post.views : 0,
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-blue-50/20 to-cyan-50/20">
      {/* Static background elements */}
      <div className="fixed top-0 right-0 w-96 h-96 bg-gradient-to-bl from-blue-400/5 to-transparent rounded-full blur-3xl pointer-events-none"></div>
      <div className="fixed bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-cyan-400/5 to-transparent rounded-full blur-3xl pointer-events-none"></div>

      <Header />
      
      <main className="flex-grow py-8 relative z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Back to Blogs Link */}
          <div className="mb-6">
            <Link 
              href="/blog" 
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-semibold transition-colors duration-200 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-xl border border-blue-200 hover:border-blue-300"
              prefetch={false}
            >
              <ArrowLeft className="w-5 h-5" />
              Back to All Posts
            </Link>
          </div>

          {/* Blog Post Article */}
          <article className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 overflow-hidden">
            {/* Featured Image */}
            {serializedPost.featured_image && (
              <div className="relative w-full h-64 md:h-80 bg-gradient-to-br from-slate-200 to-slate-300 overflow-hidden">
                <Image
                  src={serializedPost.featured_image}
                  alt={serializedPost.title}
                  width={1200}
                  height={600}
                  className="w-full h-full object-cover"
                  priority
                  placeholder="blur"
                  blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaUMk9fa&s"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent"></div>
                
                {/* Stats badges */}
                <div className="absolute bottom-4 right-4 flex gap-2">
                  <div className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full shadow-lg border border-white/50 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-semibold text-slate-700">{serializedPost.views} views</span>
                  </div>
                  <div className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full shadow-lg border border-white/50 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-cyan-600" />
                    <span className="text-sm font-semibold text-slate-700">{serializedPost.read_time} min</span>
                  </div>
                </div>
              </div>
            )}

            {/* Post Content */}
            <div className="p-6 md:p-8">
              {/* Title */}
              <h1 className="text-2xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent mb-4 leading-tight">
                {serializedPost.title}
              </h1>

              {/* Author Card */}
              <div className="flex items-center justify-between flex-wrap gap-4 mb-6 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border border-blue-200">
                <div className="flex items-center gap-3">
                  {/* Author Avatar */}
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/30">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  
                  {/* Author Info */}
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-base font-bold text-slate-900">{authorDisplayName}</span>
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
                        <span>{serializedPost.read_time} min read</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <ShareButton 
                    title={serializedPost.title}
                    slug={slug}
                    className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-blue-600 transition-all duration-200 shadow-lg shadow-blue-500/30 text-sm"
                  />
                  <button 
                    className="p-2 bg-white hover:bg-cyan-50 rounded-xl border border-slate-200 hover:border-cyan-300 transition-all duration-200"
                    aria-label="Bookmark this post"
                  >
                    <Bookmark className="w-5 h-5 text-slate-600 hover:text-cyan-600 transition-colors duration-200" />
                  </button>
                </div>
              </div>

              {/* Tags */}
              {serializedPost.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {serializedPost.tags.map((tag: string, index: number) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-blue-50 to-cyan-50 text-blue-700 border border-blue-200"
                    >
                      <Tag className="w-4 h-4" />
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Excerpt */}
              {serializedPost.excerpt && (
                <div className="bg-gradient-to-r from-blue-50 via-cyan-50 to-blue-50 border-l-4 border-blue-500 p-4 mb-6 rounded-r-xl">
                  <p className="text-slate-700 italic leading-relaxed font-medium">
                    "{serializedPost.excerpt}"
                  </p>
                </div>
              )}

              {/* Divider */}
              <div className="h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent mb-6"></div>

              {/* Content */}
              <div className="prose prose-lg max-w-none">
                <BlogContent content={serializedPost.content} />
              </div>

              {/* Post Footer */}
              <div className="mt-8 pt-6 border-t border-slate-200">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-lg">
                      <User className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">Written by</p>
                      <p className="font-bold text-slate-900">{authorDisplayName}</p>
                    </div>
                  </div>

                  <ShareButton 
                    title={serializedPost.title}
                    slug={slug}
                    className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-blue-600 transition-all duration-200 shadow-lg shadow-blue-500/30 text-sm"
                  />
                </div>
              </div>
            </div>
          </article>

          {/* Navigation */}
          <div className="mt-8 flex justify-center">
            <Link 
              href="/blog" 
              className="inline-flex items-center gap-2 px-6 py-3 bg-white/80 backdrop-blur-sm text-blue-600 hover:text-blue-800 font-bold rounded-xl border-2 border-blue-200 hover:border-blue-300 transition-all duration-200 shadow-lg"
              prefetch={false}
            >
              <ArrowLeft className="w-5 h-5" />
              Explore More Articles
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
