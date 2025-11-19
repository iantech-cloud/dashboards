import { MetadataRoute } from 'next'

export async function GET() {
  const baseUrl = process.env.NEXTAUTH_URL || 'https://hustlehubafrica.com'
  
  const sitemap: MetadataRoute.Sitemap = [
    // Homepage
    {
      url: baseUrl,
      lastModified: new Date('2025-11-07'),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    // Main Pages
    {
      url: `${baseUrl}/about`,
      lastModified: new Date('2025-11-07'),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date('2025-11-07'),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    // Earning Methods
    {
      url: `${baseUrl}/refer-earn`,
      lastModified: new Date('2025-11-07'),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/spin-to-win`,
      lastModified: new Date('2025-11-07'),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/airtime`,
      lastModified: new Date('2025-11-07'),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/academic-writing`,
      lastModified: new Date('2025-11-07'),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/surveys`,
      lastModified: new Date('2025-11-07'),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/content-writing`,
      lastModified: new Date('2025-11-07'),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/sales-marketing`,
      lastModified: new Date('2025-11-07'),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/vouchers`,
      lastModified: new Date('2025-11-07'),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/leadership`,
      lastModified: new Date('2025-11-07'),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    // Support Pages
    {
      url: `${baseUrl}/help`,
      lastModified: new Date('2025-11-07'),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/faq`,
      lastModified: new Date('2025-11-07'),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date('2025-11-07'),
      changeFrequency: 'yearly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date('2025-11-07'),
      changeFrequency: 'yearly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/cookies`,
      lastModified: new Date('2025-11-07'),
      changeFrequency: 'yearly',
      priority: 0.4,
    },
    // Auth Pages (public)
    {
      url: `${baseUrl}/auth/sign-up`,
      lastModified: new Date('2025-11-07'),
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/auth/login`,
      lastModified: new Date('2025-11-07'),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    // Demo Page
    {
      url: `${baseUrl}/demo`,
      lastModified: new Date('2025-11-07'),
      changeFrequency: 'monthly',
      priority: 0.7,
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
    <lastmod>${item.lastModified.toISOString().split('T')[0]}</lastmod>
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
