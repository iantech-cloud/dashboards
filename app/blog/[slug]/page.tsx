// app/blog/[slug]/page.tsx - CORRECTED VERSION WITH WRITER BIO
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { notFound } from 'next/navigation';
import { connectToDatabase, BlogPost } from '../../lib/models';
import Link from 'next/link';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import BlogContent from './BlogContent';
import ShareButton from './ShareButton';
import { WriterBio } from '../../components/writerbio';
import { ArrowLeft, Calendar, Clock, User, Tag, Bookmark, TrendingUp } from 'lucide-react';
import type { Metadata } from 'next';

interface BlogPostPageProps {
  params: Promise<{
    slug: string;
  }>;
}

// Generate metadata for SEO with dynamic canonical URLs
export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  try {
    const { slug } = await params;
    
    console.log('[Metadata] Generating metadata for slug:', slug);
    
    await connectToDatabase();
    const post = await BlogPost.findOne({ slug, status: 'published' })
      .populate('author', 'username name')
      .lean();

    if (!post) {
      console.log('[Metadata] Post not found:', slug);
      return {
        title: 'Post Not Found',
        description: 'The blog post you are looking for could not be found.',
      };
    }

    const authorDisplayName = post.author?.username || post.author?.name || 'Unknown Author';
    const title = post.meta_title || post.title || 'Blog Post';
    const description = post.meta_description || post.excerpt || post.title || 'Read our latest blog post';

    console.log('[Metadata] Successfully generated metadata for:', title);

    return {
      title,
      description,
      keywords: Array.isArray(post.tags) ? post.tags : [],
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
        publishedTime: post.published_at?.toISOString() || post.created_at?.toISOString() || new Date().toISOString(),
        modifiedTime: post.updated_at?.toISOString() || new Date().toISOString(),
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
  } catch (error) {
    console.error('[Metadata] Error generating metadata:', error);
    // Return default metadata instead of throwing
    return {
      title: 'Blog Post - Hustle Hub Africa',
      description: 'Read our latest blog post on Hustle Hub Africa',
    };
  }
}

// Generate static params for better performance
export async function generateStaticParams() {
  try {
    console.log('[StaticParams] Generating static params...');
    await connectToDatabase();
    const posts = await BlogPost.find({ status: 'published' }).select('slug').lean();
    
    console.log('[StaticParams] Found', posts.length, 'published posts');
    
    return posts.map((post) => ({
      slug: post.slug,
    }));
  } catch (error) {
    console.error('[StaticParams] Error generating static params:', error);
    // Return empty array to prevent build failure
    return [];
  }
}

// Writer information
const WRITER_INFO = {
  name: "Ian Omondi",
  bio: "Cybersecurity expert, C++ developer, data analyst, and emerging researcher with experience spanning software development, digital forensics, AI-driven systems, and full-stack web applications.",
  avatar: "/writer-avatar.png",
  expertise: [
    "Cybersecurity",
    "Software Development", 
    "Data Analysis",
    "AI Systems",
    "Full-Stack Development",
    "Digital Forensics",
    "Quantum Computing",
    "Biomedical Engineering",
    "C++ Programming",
    "Machine Learning",
    "Cloud Infrastructure",
    "DevOps"
  ],
  email: "waiganjoian51@gmail.com",
  twitter: "IanMuiruri15",
  facebook: "https://www.facebook.com/share/19qVdp7RGC/",
  tiktok: "i____devvs",
  website: "hustlehubafrica.com",
  phone: "+254748264231",
  linkedin: "",
  fullBio: `Ian Omondi is a cybersecurity expert, C++ developer, data analyst, and emerging researcher with experience spanning software development, digital forensics, AI-driven systems, and full-stack web applications. He has worked across education, SaaS, and enterprise environments, building secure backends, cloud-hosted platforms, and automation tools for data-driven decision-making.

With a strong foundation in mathematics, engineering, and advanced computing, Ian also contributes to projects in quantum mechanics, portfolio optimization, biomedical engineering, and architectural design. He is passionate about solving real-world technological challenges, creating human-centered digital experiences, and developing scalable solutions that empower businesses and communities across Africa.`
};

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  try {
    console.log('[Page] Starting to render blog post page...');
    
    const { slug } = await params;
    console.log('[Page] Slug:', slug);

    console.log('[Page] Connecting to database...');
    await connectToDatabase();
    console.log('[Page] Database connected successfully');
    
    // Find the blog post by slug and populate author info
    console.log('[Page] Querying for post...');
    const post = await BlogPost.findOne({ slug, status: 'published' })
      .populate('author', 'username name')
      .lean();

    console.log('[Page] Post found:', !!post);

    if (!post) {
      console.log('[Page] Post not found, returning 404');
      notFound();
    }

    console.log('[Page] Post title:', post.title);
    console.log('[Page] Post has author:', !!post.author);
    console.log('[Page] Post has content:', !!post.content);
    console.log('[Page] Post created_at:', post.created_at);

    // Safely format the date with proper error handling
    let formattedDate = 'Unknown date';
    try {
      if (post.created_at) {
        formattedDate = new Date(post.created_at).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      }
    } catch (dateError) {
      console.error('[Page] Error formatting date:', dateError);
    }

    console.log('[Page] Formatted date:', formattedDate);

    // Get author display name with multiple fallbacks
    const authorDisplayName = post.author?.username || post.author?.name || 'Unknown Author';
    console.log('[Page] Author display name:', authorDisplayName);

    // Get author's post count
    const authorPostsCount = await BlogPost.countDocuments({ 
      author: post.author?._id, 
      status: 'published' 
    });

    // Serialize the post data with comprehensive safety checks
    const serializedPost = {
      ...post,
      _id: post._id?.toString() || '',
      created_at: post.created_at?.toISOString() || new Date().toISOString(),
      updated_at: post.updated_at?.toISOString() || null,
      published_at: post.published_at?.toISOString() || null,
      title: post.title || 'Untitled Post',
      content: post.content || '<p>No content available.</p>',
      excerpt: post.excerpt || '',
      featured_image: post.featured_image || null,
      tags: Array.isArray(post.tags) ? post.tags : [],
      read_time: typeof post.read_time === 'number' ? post.read_time : 5,
      views: typeof post.views === 'number' ? post.views : 0,
      author: post.author || { username: 'Unknown', name: 'Unknown' },
    };

    console.log('[Page] Post serialized successfully');
    console.log('[Page] Content length:', serializedPost.content.length);
    console.log('[Page] Tags count:', serializedPost.tags.length);
    console.log('[Page] Rendering JSX...');

    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-blue-50/20 to-cyan-50/20 relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-blue-400/10 to-transparent rounded-full blur-3xl animate-pulse pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-cyan-400/10 to-transparent rounded-full blur-3xl animate-pulse delay-1000 pointer-events-none"></div>

        <Header />
        
        <main className="flex-grow py-8 relative z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              {/* Main Content - 3 columns */}
              <div className="lg:col-span-3">
                {/* Blog Post Article */}
                <article className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-white/50 animate-scaleIn">
                  {/* Featured Image */}
                  {serializedPost.featured_image && (
                    <div className="relative w-full h-64 md:h-[500px] bg-gradient-to-br from-slate-200 to-slate-300 overflow-hidden">
                      <img
                        src={serializedPost.featured_image}
                        alt={serializedPost.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
                      
                      {/* Floating stats badge */}
                      <div className="absolute bottom-6 right-6 flex gap-3">
                        <div className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-full shadow-lg border border-white/50 flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-blue-600" />
                          <span className="text-sm font-semibold text-slate-700">{serializedPost.views} views</span>
                        </div>
                        <div className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-full shadow-lg border border-white/50 flex items-center gap-2">
                          <Clock className="w-4 h-4 text-cyan-600" />
                          <span className="text-sm font-semibold text-slate-700">{serializedPost.read_time} min</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Post Content */}
                  <div className="p-6 md:p-10 lg:p-12">
                    {/* Title */}
                    <h1 className="text-3xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent mb-6 leading-tight">
                      {serializedPost.title}
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
                          className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-blue-600 transition-all duration-200 shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40"
                        />
                        <button 
                          className="p-2.5 bg-white hover:bg-cyan-50 rounded-xl border border-slate-200 hover:border-cyan-300 transition-all duration-200 group"
                          aria-label="Bookmark this post"
                        >
                          <Bookmark className="w-5 h-5 text-slate-600 group-hover:text-cyan-600 transition-colors duration-200" />
                        </button>
                      </div>
                    </div>

                    {/* Tags */}
                    {serializedPost.tags && serializedPost.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-8">
                        {serializedPost.tags.map((tag: string, index: number) => (
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
                    {serializedPost.excerpt && (
                      <div className="relative bg-gradient-to-r from-blue-50 via-cyan-50 to-blue-50 border-l-4 border-blue-500 p-6 mb-8 rounded-r-2xl shadow-md overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-blue-100/50 to-transparent rounded-full"></div>
                        <p className="text-lg text-slate-700 italic leading-relaxed relative z-10 font-medium">
                          "{serializedPost.excerpt}"
                        </p>
                      </div>
                    )}

                    {/* Divider */}
                    <div className="h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent mb-8"></div>

                    {/* Content - Use client component for MathJax rendering */}
                    <div className="prose prose-lg max-w-none">
                      <BlogContent content={serializedPost.content} />
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
                        <ShareButton 
                          title={serializedPost.title}
                          slug={slug}
                          className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-blue-600 transition-all duration-200 shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40"
                        />
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

              {/* Sidebar with Writer Bio - 1 column */}
              <div className="lg:col-span-1">
                <div className="sticky top-24 space-y-6">
                  {/* Writer Bio */}
                  <WriterBio 
                    name={WRITER_INFO.name}
                    bio={WRITER_INFO.bio}
                    avatar={WRITER_INFO.avatar}
                    expertise={WRITER_INFO.expertise}
                    email={WRITER_INFO.email}
                    twitter={WRITER_INFO.twitter}
                    facebook={WRITER_INFO.facebook}
                    tiktok={WRITER_INFO.tiktok}
                    website={WRITER_INFO.website}
                    phone={WRITER_INFO.phone}
                    linkedin={WRITER_INFO.linkedin}
                    postsCount={authorPostsCount}
                  />
                </div>
              </div>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    );
  } catch (error) {
    console.error('[Page] CRITICAL ERROR rendering blog post:');
    console.error('[Page] Error message:', error instanceof Error ? error.message : 'Unknown error');
    console.error('[Page] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('[Page] Error type:', error instanceof Error ? error.constructor.name : typeof error);
    
    // Re-throw to trigger Next.js error handling
    throw error;
  }
}
