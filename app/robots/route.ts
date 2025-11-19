export async function GET() {
  const baseUrl = process.env.NEXTAUTH_URL || 'https://hustlehubafrica.com'
  
  const content = `# HustleHub Africa - Robots.txt
# ${baseUrl}/robots

# Allow all search engines
User-agent: *
Allow: /

# Disallow admin and private areas
Disallow: /admin/
Disallow: /api/
Disallow: /dashboard/private/
Disallow: /_next/
Disallow: /auth/

# Allow specific public pages
Allow: /auth/sign-up
Allow: /auth/login

# Crawl delay (optional, adjust based on server capacity)
Crawl-delay: 0.5

# Sitemap location
Sitemap: ${baseUrl}/sitemap
Sitemap: ${baseUrl}/sitemap-0.xml

# Specific search engine rules
User-agent: Googlebot
Allow: /
Crawl-delay: 0.2

User-agent: Bingbot
Allow: /
Crawl-delay: 0.5

User-agent: Slurp
Allow: /
Crawl-delay: 1

# Block bad bots
User-agent: AhrefsBot
Crawl-delay: 2

User-agent: SemrushBot
Crawl-delay: 2

# Block spam bots
User-agent: MJ12bot
Disallow: /

User-agent: dotbot
Disallow: /

User-agent: SeznamBot
Disallow: /`

  return new Response(content, {
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'public, max-age=86400',
    },
  })
}
