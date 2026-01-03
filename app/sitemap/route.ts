import { MetadataRoute } from 'next'

export async function GET() {
  const baseUrl = process.env.NEXTAUTH_URL || 'https://hustlehubafrica.com'
  const lastModDate = new Date('2026-01-03T13:17:43+00:00')
  
  const sitemap: MetadataRoute.Sitemap = [
    // Homepage
    {
      url: baseUrl,
      lastModified: lastModDate,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    // Main Pages
    {
      url: `${baseUrl}/blog`,
      lastModified: lastModDate,
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/refer-earn`,
      lastModified: lastModDate,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/dashboard`,
      lastModified: lastModDate,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/academic-writing`,
      lastModified: lastModDate,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/dashboard/surveys`,
      lastModified: lastModDate,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/dashboard/content`,
      lastModified: lastModDate,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/sales-marketing`,
      lastModified: lastModDate,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: lastModDate,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/faq`,
      lastModified: lastModDate,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: lastModDate,
      changeFrequency: 'yearly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: lastModDate,
      changeFrequency: 'yearly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/cookies`,
      lastModified: lastModDate,
      changeFrequency: 'yearly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: lastModDate,
      changeFrequency: 'monthly',
      priority: 0.64,
    },
    {
      url: `${baseUrl}/dashboard/soko`,
      lastModified: lastModDate,
      changeFrequency: 'weekly',
      priority: 0.51,
    },
    // Blog Posts
    {
      url: `${baseUrl}/blog/why-and-how-affiliate-marketing-is-the-future-of-earning-online`,
      lastModified: lastModDate,
      changeFrequency: 'monthly',
      priority: 0.64,
    },
    {
      url: `${baseUrl}/blog/quick-ways-to-make-money-online-in-kenya`,
      lastModified: lastModDate,
      changeFrequency: 'monthly',
      priority: 0.64,
    },
    {
      url: `${baseUrl}/blog/top-ai-tools-for-making-money-online-in-kenya`,
      lastModified: lastModDate,
      changeFrequency: 'monthly',
      priority: 0.64,
    },
    {
      url: `${baseUrl}/blog/a-guide-to-online-writing-jobs-in-kenya`,
      lastModified: lastModDate,
      changeFrequency: 'monthly',
      priority: 0.64,
    },
    {
      url: `${baseUrl}/blog/best-freelancing-websites-in-kenya`,
      lastModified: lastModDate,
      changeFrequency: 'monthly',
      priority: 0.64,
    },
    {
      url: `${baseUrl}/blog/how-to-make-money-on-fiverr-in-kenya`,
      lastModified: lastModDate,
      changeFrequency: 'monthly',
      priority: 0.64,
    },
    {
      url: `${baseUrl}/blog/how-to-make-money-on-tiktok-in-kenya`,
      lastModified: lastModDate,
      changeFrequency: 'monthly',
      priority: 0.64,
    },
    {
      url: `${baseUrl}/blog/how-much-can-you-earn-on-a-faceless-youtube-channel`,
      lastModified: lastModDate,
      changeFrequency: 'monthly',
      priority: 0.64,
    },
    {
      url: `${baseUrl}/blog/how-to-make-money-on-youtube-in-kenya`,
      lastModified: lastModDate,
      changeFrequency: 'monthly',
      priority: 0.64,
    },
    {
      url: `${baseUrl}/blog/affiliate-marketing-in-kenya`,
      lastModified: lastModDate,
      changeFrequency: 'monthly',
      priority: 0.51,
    },
    {
      url: `${baseUrl}/blog/how-to-get-additional-sources-of-income-in-kenya`,
      lastModified: lastModDate,
      changeFrequency: 'monthly',
      priority: 0.51,
    },
    {
      url: `${baseUrl}/blog/how-to-make-money-online-in-kenya-2025`,
      lastModified: lastModDate,
      changeFrequency: 'monthly',
      priority: 0.51,
    },
    {
      url: `${baseUrl}/blog/how-to-make-money-online-in-kenya-various-ways-2025-guide`,
      lastModified: lastModDate,
      changeFrequency: 'monthly',
      priority: 0.51,
    },
    {
      url: `${baseUrl}/blog/affiliate-marketing-in-kenya-2025-guide-how-to-get-started`,
      lastModified: lastModDate,
      changeFrequency: 'monthly',
      priority: 0.51,
    },
    {
      url: `${baseUrl}/blog/guidelines-on-how-to-register`,
      lastModified: lastModDate,
      changeFrequency: 'monthly',
      priority: 0.51,
    },
    // Blog Pagination
    {
      url: `${baseUrl}/blog?page=1`,
      lastModified: lastModDate,
      changeFrequency: 'daily',
      priority: 0.64,
    },
    {
      url: `${baseUrl}/blog?page=2`,
      lastModified: lastModDate,
      changeFrequency: 'daily',
      priority: 0.64,
    },
  ]

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" 
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9" 
        xmlns:xhtml="http://www.w3.org/1999/xhtml" 
        xmlns:mobile="http://www.google.com/schemas/sitemap-mobile/1.0" 
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" 
        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
  ${sitemap.map((item) => `
  <url>
    <loc>${item.url}</loc>
    <lastmod>${item.lastModified.toISOString()}</lastmod>
    <changefreq>${item.changeFrequency}</changefreq>
    <priority>${item.priority}</priority>
  </url>`).join('')}
</urlset>`

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
    },
  })
}
